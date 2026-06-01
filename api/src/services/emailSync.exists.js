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
 *   3. On 'close' event → create NEW client instance → reconnect
 *
 * Key: ImapFlow instances cannot be reused after close.
 *      Always create a new instance on reconnect.
 */

const activeConnections = new Map();

/**
 * Extract Steam account and verification code
 */
function extractSteamLoginInfo(subject, bodyHtml, toAddress) {
    let gameAccount = null;
    let code = null;

    if (bodyHtml) {
        const accountMatch = bodyHtml.match(
            /<span[^>]*style="color:\s*#77b9ee;"[^>]*>(.+?)[，, ：:]?<\/span>/u
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
                const m = bodyHtml.match(/<span[^>]*>(\d{6})<\/span>/i);
                if (m) code = m[1];
                gameAccount = toAddress[0].address || ''
            }

            if (subject.indexOf('EA') >= 0) {
                const m = subject.match(/(\d{6})/i);
                if (m) code = m[1];
                gameAccount = toAddress[0].address || ''
            }

            if (bodyHtml.indexOf('Epic') >= 0) {
                const m = bodyHtml.match(/<p[^>]*>\s*(\d+)\s*<\/p>/i);
                if (m) code = m[1];
                gameAccount = toAddress[0].address || ''
            }
        }
    }

    return { gameAccount, code };
}

/**
 * Fetch new emails for an account and persist to DB.
 */
async function fetchNewEmails(client, account) {
    const lock = await client.getMailboxLock('INBOX', { readOnly: true });
    try {
        let tenMinAgo = new Date(Date.now() - 600000);
        const messageIds = await client.search({ since: tenMinAgo }, { uid: true });
        console.log(messageIds);

        if (messageIds.length === 0 || messageIds === false) {
            log.info(`[emailSync] Account ${account.id} (${account.username}): inbox empty`);
            return;
        }

        // Take only the latest 50 to avoid pulling entire mailbox every cycle
        const latestIds = messageIds.slice(-50);
        console.log(latestIds);

        const emails = [];
        for await (const msg of client.fetch(latestIds, {
            envelope: true,
            flags: true,
            source: true,
        }, { uid: true })) {

            let bodyText = null;
            let bodyHtml = null;

            // Parse the raw email source to extract body content
            if (msg.source) {
                try {
                    const parsed = await simpleParser(msg.source);
                    bodyText = parsed.text || null;
                    bodyHtml = parsed.html || null;
                } catch (parseErr) {
                    log.warn(`[emailSync] Failed to parse body for UID ${msg.uid}: ${parseErr.message}`);
                }
            }

            let toAddress = msg.envelope?.to?.map(t => ({
                name: t.name || '',
                address: t.address || ''
            })) || [];

            emails.push({
                uid: msg.uid,
                messageId: msg.envelope?.messageId || '',
                subject: msg.envelope?.subject || '(No Subject)',
                fromAddress: msg.envelope?.from?.map(f => ({
                    name: f.name || '',
                    address: f.address || ''
                })) || [],
                toAddress: toAddress,
                mailDate: msg.envelope?.date || null,
                flags: Array.from(msg.flags || []),
                isRead: (msg.flags || []).has('\\Seen'),
                bodyText,
                bodyHtml,
                ...extractSteamLoginInfo(msg.envelope?.subject, bodyHtml, toAddress)
            });
        }

        // Bulk upsert into DB
        const result = await emailMessageModel.bulkUpsert(account.id, emails);
        if (result.inserted > 0 || result.updated > 0) {
            log.info(
                `[emailSync] Account ${account.id} (${account.username}): ` +
                `+${result.inserted} new, ~${result.updated} updated`)
        }


    } finally {
        lock.release();
    }
}

/**
 * Run the persistent connection loop for one account.
 * Creates a NEW ImapFlow instance on each connect/reconnect.
 */
async function runAccountLoop(account, stoppedRef) {
    const { ImapFlow } = await import('imapflow');


    let client = null;

    try {
        // Always create a fresh client instance
        client = new ImapFlow({
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
            disableAutoIdle: false, // 默认 false，必须保持关闭，否则不会自动 IDLE
            maxIdleTime: 25 * 60 * 1000,
            logger: false,
            emitLogs: false
        });

        // Wire up events BEFORE connecting
        client.on('exists', async (data) => {
            if (data.path !== 'INBOX') return;
            log.info(`[emailExists] Account ${account.id} (${account.username}): new mail EXISTS notification`);
            try {
                await fetchNewEmails(client, account);
            } catch (err) {
                log.error(`[emailExists] Account ${account.id} fetch error: ${err.message}`);
            }
        });

        client.on('error', async (err) => {
            log.warn(`[emailExists] Account ${account.id} (${account.username}) error: ${err.message}`);
        });

        client.on('close', async () => {
            console.log('连接关闭，3秒后重连...');
            setTimeout(() => runAccountLoop(account, stoppedRef), 3000);
        });

        // Connect
        await client.connect();
        log.info(`[emailExists] Account ${account.id} (${account.username}): connected`);

        await client.mailboxOpen('INBOX');
        log.info(`[emailExists] Account ${account.id} (${account.username}): INBOX opened`);

        // Initial fetch
        await fetchNewEmails(client, account);
        log.info(`[emailExists] Account ${account.id} (${account.username}): listening for new mail (auto-IDLE)`);

    } catch (err) {
        if (client) {
            try { await client.logout(); } catch { /* ignore */ }
            client = null;
        }


        log.error(`[emailExists] Account ${account.id} (${account.username}) error: ${err.message}`);
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
        const loopPromise = runAccountLoop(account, stoppedRef).catch(err => {
            log.error(`[emailExists] Account ${account.id} loop crashed: ${err.message}`);
        });
        activeConnections.set(account.id, { stoppedRef, loopPromise, account });
    }

    log.info(`[emailExists] ${activeConnections.size} connection(s) starting`);
}

/**
 * Stop all connections
 */
export async function stopEmailExists() {
    log.info(`[emailExists] Stopping ${activeConnections.size} connection(s)...`);

    for (const [accountId, handle] of activeConnections) {
        handle.stoppedRef.stopped = true;
    }

    await Promise.allSettled(
        [...activeConnections.values()].map(h =>
            Promise.race([
                h.loopPromise,
                new Promise(resolve => setTimeout(resolve, 5000))
            ])
        )
    );

    activeConnections.clear();
    log.info('[emailExists] All connections stopped');
}
