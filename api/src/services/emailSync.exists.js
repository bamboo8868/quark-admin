import { simpleParser } from 'mailparser';
import emailAccountModel from '../models/email.model.js';
import emailMessageModel from '../models/emailMessage.model.js';
import { log } from '../utils/logger.js';

/**
 * Email Sync — Long-lived IMAP connection using EXISTS event
 *
 * Pattern (from test.js):
 *   1. Connect → open INBOX → imapflow auto-IDLE
 *   2. On 'exists' event → acquire lock → fetch new emails → release lock
 *   3. On 'close' event → auto-reconnect after 3 seconds
 *
 * No cron, no manual idle() call — imapflow auto-IDLEs when connection is idle.
 */

const activeConnections = new Map();

/**
 * Extract Steam account and verification code
 */
function extractSteamLoginInfo(subject, bodyHtml) {
    let gameAccount = null;
    let code = null;

    if (bodyHtml) {
        const accountMatch = bodyHtml.match(
            /<span[^>]*style="color:\s*#77b9ee;"[^>]*>(.+?)[，,]<\/span>/u
        );
        if (accountMatch && accountMatch[1]) {
            gameAccount = accountMatch[1].trim();
        }

        const codeMatch = bodyHtml.match(
            /<td\s+class="title-48\s+c-blue1\s+fw-b\s+a-center"[^>]*>\s*(\S+)\s*<\/td>/u
        );
        if (codeMatch && codeMatch[1]) {
            code = codeMatch[1].trim().toUpperCase();
        }
        if (!code) {
            if (subject.indexOf('Ubisoft') >= 0) {
                const m = bodyHtml.match(/\b\d{6}\b/g);
                if (m) code = m[0];
            }
        }
    }

    return { gameAccount, code };
}

/**
 * Fetch new emails for an account and persist to DB.
 * Uses getLastUid to only fetch emails newer than what we already have.
 */
async function fetchNewEmails(client, account) {
    const lock = await client.getMailboxLock('INBOX');
    try {

        const msg = await client.fetchOne('*', {
            envelope: true,
            source: true
        });
        
        let bodyText = null;
        let bodyHtml = null;
        if (msg.source) {
            try {
                const parsed = await simpleParser(msg.source);
                bodyText = parsed.text || null;
                bodyHtml = parsed.html || null;
            } catch (parseErr) {
                log.warn(`[emailExists] Failed to parse body for UID ${msg.uid}: ${parseErr.message}`);
            }
        }
        let emails = [];
        emails.push({
            uid: msg.uid,
            messageId: msg.envelope?.messageId || '',
            subject: msg.envelope?.subject || '(No Subject)',
            fromAddress: msg.envelope?.from?.map(f => ({
                name: f.name || '',
                address: f.address || ''
            })) || [],
            toAddress: msg.envelope?.to?.map(t => ({
                name: t.name || '',
                address: t.address || ''
            })) || [],
            mailDate: msg.envelope?.date || null,
            // flags: Array.from(msg.flags || []),
            // isRead: (msg.flags || []).has('\\Seen'),
            bodyText,
            bodyHtml,
            ...extractSteamLoginInfo(msg.envelope?.subject, bodyHtml)
        });


        if (emails.length > 0) {
            const result = await emailMessageModel.bulkUpsert(account.id, emails);
            log.info(
                `[emailExists] Account ${account.id} (${account.username}): ` +
                `+${result.inserted} new, ~${result.updated} updated`
            );
        }
    } finally {
        lock.release();
    }
}

/**
 * Connect and maintain a long-lived IMAP session for one account.
 * Uses exists event for real-time push, auto-reconnects on disconnect.
 */
async function connectAccount(account, stoppedRef) {
    const { ImapFlow } = await import('imapflow');

    const client = new ImapFlow({
        host: account.host,
        port: account.port,
        secure: account.tls,
        auth: {
            user: account.username,
            pass: account.password
        },
        clientInfo: {
            name: 'Mozilla Thunderbird',
            version: '115.0',
            vendor: 'Mozilla'
        },
        logger: false,
        emitLogs: false
    });

    // ====================== EXISTS event — new mail notification ======================
    client.on('exists', async (data) => {
        if (data.path !== 'INBOX') return;

        log.info(`[emailExists] Account ${account.id} (${account.username}): new mail EXISTS notification`);
        try {
            await fetchNewEmails(client, account);
        } catch (err) {
            log.error(`[emailExists] Account ${account.id} fetch error: ${err.message}`);
        }
    });

    // ====================== Error event ======================
    client.on('error', (err) => {
        if (!stoppedRef.stopped) {
            log.warn(`[emailExists] Account ${account.id} (${account.username}) error: ${err.message}`);
        }
    });

    // ====================== Close event — auto reconnect ======================
    client.on('close', () => {
        if (!stoppedRef.stopped) {
            log.info(`[emailExists] Account ${account.id} (${account.username}): connection closed, reconnecting in 3s...`);
            setTimeout(() => connectAndOpen(client, account, stoppedRef), 3000);
        }
    });

    // Initial connect
    await connectAndOpen(client, account, stoppedRef);

    return client;
}

/**
 * Connect, open INBOX, and do initial fetch.
 * imapflow auto-IDLEs when connection is idle — no manual idle() call needed.
 */
async function connectAndOpen(client, account, stoppedRef) {
    if (stoppedRef.stopped) return;

    try {
        await client.connect();
        log.info(`[emailExists] Account ${account.id} (${account.username}): connected`);

        await client.mailboxOpen('INBOX');
        log.info(`[emailExists] Account ${account.id} (${account.username}): INBOX opened`);

        // Initial fetch — sync any emails that arrived while we were disconnected
        await fetchNewEmails(client, account);

        // imapflow auto-IDLEs — no need to call client.idle()
        // The 'exists' event fires whenever new mail arrives
        log.info(`[emailExists] Account ${account.id} (${account.username}): listening for new mail (auto-IDLE)`);
    } catch (err) {
        if (!stoppedRef.stopped) {
            log.error(`[emailExists] Account ${account.id} (${account.username}) connect failed: ${err.message}`);
            log.info(`[emailExists] Account ${account.id}: retrying in 10s...`);
            setTimeout(() => connectAndOpen(client, account, stoppedRef), 10000);
        }
    }
}

/**
 * Start long-lived connections for all email accounts
 */
export async function startEmailExists() {
    const accounts = await emailAccountModel.query().select('*');

    if (accounts.length === 0) {
        log.warn('[emailExists] No email accounts found');
        return;
    }

    log.info(`[emailExists] Starting persistent connections for ${accounts.length} account(s)...`);

    for (const account of accounts) {
        const stoppedRef = { stopped: false };
        try {
            const client = await connectAccount(account, stoppedRef);
            activeConnections.set(account.id, { stoppedRef, client, account });
        } catch (err) {
            log.error(`[emailExists] Failed to start for account ${account.id}: ${err.message}`);
            const stoppedRef = { stopped: false };
            activeConnections.set(account.id, { stoppedRef, client: null, account });
        }
    }

    log.info(`[emailExists] ${activeConnections.size} connection(s) started`);
}

/**
 * Stop all connections
 */
export async function stopEmailExists() {
    log.info(`[emailExists] Stopping ${activeConnections.size} connection(s)...`);

    for (const [accountId, handle] of activeConnections) {
        handle.stoppedRef.stopped = true;
        if (handle.client) {
            try { await handle.client.logout(); } catch { /* ignore */ }
        }
    }

    activeConnections.clear();
    log.info('[emailExists] All connections stopped');
}