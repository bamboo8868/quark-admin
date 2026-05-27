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

        const emails = [{
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
            bodyText,
            bodyHtml,
            ...extractSteamLoginInfo(msg.envelope?.subject, bodyHtml)
        }];

        const result = await emailMessageModel.bulkUpsert(account.id, emails);
        log.info(
            `[emailExists] Account ${account.id} (${account.username}): ` +
            `+${result.inserted} new, ~${result.updated} updated`
        );
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

    while (!stoppedRef.stopped) {
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

            client.on('error', (err) => {
                if (!stoppedRef.stopped) {
                    log.warn(`[emailExists] Account ${account.id} (${account.username}) error: ${err.message}`);
                }
            });

            // Connect
            await client.connect();
            log.info(`[emailExists] Account ${account.id} (${account.username}): connected`);

            await client.mailboxOpen('INBOX');
            log.info(`[emailExists] Account ${account.id} (${account.username}): INBOX opened`);

            // Initial fetch
            await fetchNewEmails(client, account);
            log.info(`[emailExists] Account ${account.id} (${account.username}): listening for new mail (auto-IDLE)`);

            // Wait for connection to close (imapflow auto-IDLEs)
            // The 'close' event resolves this promise pattern
            await new Promise((resolve) => {
                client.on('close', () => {
                    log.info(`[emailExists] Account ${account.id} (${account.username}): connection closed`);
                    resolve();
                });

                // Also resolve if stopped externally
                const checkStopped = setInterval(() => {
                    if (stoppedRef.stopped) {
                        clearInterval(checkStopped);
                        resolve();
                    }
                }, 1000);
            });

            // Clean up this client instance
            try { await client.logout(); } catch { /* ignore */ }
            client = null;

        } catch (err) {
            if (client) {
                try { await client.logout(); } catch { /* ignore */ }
                client = null;
            }

            if (stoppedRef.stopped) break;

            log.error(`[emailExists] Account ${account.id} (${account.username}) error: ${err.message}`);
        }

        // If not stopped, wait and reconnect with a NEW client
        if (!stoppedRef.stopped) {
            log.info(`[emailExists] Account ${account.id} (${account.username}): reconnecting in 5s...`);
            await new Promise(resolve => {
                const timer = setTimeout(resolve, 5000);
                const check = setInterval(() => {
                    if (stoppedRef.stopped) {
                        clearTimeout(timer);
                        clearInterval(check);
                        resolve();
                    }
                }, 500);
            });
        }
    }

    log.info(`[emailExists] Account ${account.id} (${account.username}): loop ended`);
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
