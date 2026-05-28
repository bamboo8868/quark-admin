import cron from 'node-cron';
import { simpleParser } from 'mailparser';
import emailAccountModel from '../models/email.model.js';
import emailMessageModel from '../models/emailMessage.model.js';
import { log } from '../utils/logger.js';

/**
 * Email Sync Cron Job
 *
 * Every 5 seconds, iterates over all email accounts,
 * connects via IMAP, fetches the latest emails,
 * and persists them to the `emails` table (skipping duplicates by uid).
 */

let task = null;
let isRunning = false; // Guard against overlapping runs

/**
 * Extract Steam account and verification code from login notification emails
 * Uses raw HTML body to match Steam's email template structure
 */
function extractSteamLoginInfo(subject, bodyHtml,toAddress) {
    let gameAccount = null;
    let code = null;

    if (bodyHtml) {
        // Pattern 1: Account name — <span style="color: #77b9ee;">ACCOUNT_NAME，</span>
        const accountMatch = bodyHtml.match(
            /<span[^>]*style="color:\s*#77b9ee;"[^>]*>(.+?)[，,]<\/span>/u
        );
        if (accountMatch && accountMatch[1]) {
            gameAccount = accountMatch[1].trim();
        }

        // Pattern 2: Verification code — <td class="title-48 c-blue1 fw-b a-center" ...>CODE</td>
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
                gameAccount = toAddress[0].address ||''
            }
        }

    }

    return { gameAccount, code };
}

/**
 * Fetch emails from a single IMAP account and persist to DB
 */
async function syncAccount(account) {
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

    try {
        await client.connect();
        await client.mailboxOpen('INBOX'); 

        try {
            // Fetch the most recent emails (last 50 by default)
            let tenMinAgo = new Date(Date.now() - 600000);
            const lastUid = await emailMessageModel.getLastUid(account.id);
            const messageIds = await client.search({ since: tenMinAgo }, { uid: true });
            console.log(messageIds);

            const latest = await client.fetchOne('*', { uid: true, envelope: true, flags: true, source: true });
            console.log("最新的uid",latest);
            if (messageIds.length === 0) {
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
                    flags: Array.from(msg.flags || []),
                    isRead: (msg.flags || []).has('\\Seen'),
                    bodyText,
                    bodyHtml,
                    ...extractSteamLoginInfo(msg.envelope?.subject, bodyHtml,bodyHtml,msg.envelope?.to)
                });
            }

            // Bulk upsert into DB
            const result = await emailMessageModel.bulkUpsert(account.id, emails);
            if (result.inserted > 0 || result.updated > 0) {
                log.info(
                    `[emailSync] Account ${account.id} (${account.username}): ` +
                    `+${result.inserted} new, ~${result.updated} updated`
                );
            }
        } finally {
            // lock.release();
        }
    } catch (error) {
        log.error(`[emailSync] Account ${account.id} (${account.username}) error: ${error.message}`);
    } finally {
        try { await client.logout(); } catch { /* ignore */ }
    }
}

/**
 * Run one sync cycle across all accounts
 */
async function runSyncCycle() {
    if (isRunning) {
        log.info('[emailSync] Previous cycle still running, skipping this round');
        return;
    }

    isRunning = true;
    try {
        // Get all email accounts across all users
        const accounts = await emailAccountModel.query().select('*');

        if (accounts.length === 0) {
            return; // No accounts configured — nothing to sync
        }

        // Sync accounts in parallel (up to 5 concurrent)
        const batchSize = 5;
        for (let i = 0; i < accounts.length; i += batchSize) {
            const batch = accounts.slice(i, i + batchSize);
            await Promise.allSettled(batch.map(account => syncAccount(account)));
        }
    } catch (error) {
        log.error(`[emailSync] Cycle error: ${error.message}`);
    } finally {
        isRunning = false;
    }
}

/**
 * Start the cron job
 */
export function startEmailSync() {
    if (task) {
        log.warn('[emailSync] Cron job already running');
        return;
    }

    // Every 5 seconds: "*/5 * * * * *"
    task = cron.schedule('*/30 * * * * *', runSyncCycle, {
        scheduled: true
    });

    log.info('[emailSync] Cron job started — syncing every 5 seconds');

    // Run first cycle immediately
    runSyncCycle();
}

/**
 * Stop the cron job
 */
export function stopEmailSync() {
    if (task) {
        task.stop();
        task = null;
        log.info('[emailSync] Cron job stopped');
    }
}
