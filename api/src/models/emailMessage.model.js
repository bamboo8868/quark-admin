import { BaseModel } from './base.model.js';

/**
 * Email Message Model — persisted emails synced from IMAP
 */
export class EmailMessageModel extends BaseModel {
    constructor() {
        super('emails');
    }

    /**
     * Find all emails for a given account, with optional search & pagination
     */
    async findByAccountId(accountId, options = {}) {
        const { limit = 50, page = 1, subject, gameAccount } = options;
        const offset = (page - 1) * limit;

        let query = this.query()
            .where('account_id', accountId);

        // Search filters
        if (subject) {
            query = query.where('subject', 'like', `%${subject}%`);
        }
        if (gameAccount) {
            query = query.where('game_account', 'like', `%${gameAccount}%`);
        }

        // Count total
        const countQuery = query.clone();
        const [{ count }] = await countQuery.count('* as count');
        const total = parseInt(count, 10);

        // Paginate — newest first, exclude body columns for list performance
        const data = await query
            .clone()
            .select(['id', 'account_id', 'uid', 'message_id', 'subject', 'from_address', 'to_address', 'mail_date', 'flags', 'is_read', 'game_account', 'code', 'created_at'])
            .orderBy('mail_date', 'desc')
            .limit(limit)
            .offset(offset);

        return {
            list: data.map(row => this.formatEmail(row)),
            total,
            pageSize: limit,
            currentPage: page
        };
    }

    /**
     * Find all emails across multiple account IDs, with optional search & pagination
     */
    async findByAccountIds(accountIds, options = {}) {
        const { limit = 50, page = 1, subject, gameAccount } = options;
        const offset = (page - 1) * limit;

        let query = this.query()
            .whereIn('account_id', accountIds);

        // Search filters
        if (subject) {
            query = query.where('subject', 'like', `%${subject}%`);
        }
        if (gameAccount) {
            query = query.where('game_account', 'like', `%${gameAccount}%`);
        }

        // Count total
        const countQuery = query.clone();
        const [{ count }] = await countQuery.count('* as count');
        const total = parseInt(count, 10);

        // Paginate — newest first, exclude body columns for list performance
        const data = await query
            .clone()
            .select(['id', 'account_id', 'uid', 'message_id', 'subject', 'from_address', 'to_address', 'mail_date', 'flags', 'is_read', 'game_account', 'code', 'created_at'])
            .orderBy('mail_date', 'desc')
            .limit(limit)
            .offset(offset);

        return {
            list: data.map(row => this.formatEmail(row)),
            total,
            pageSize: limit,
            currentPage: page
        };
    }

    /**
     * Upsert a single email by (account_id, uid).
     * Returns true if inserted, false if skipped (duplicate).
     */
    async upsertByEmail(accountId, uid, data) {
        const existing = await this.query()
            .where('account_id', accountId)
            .where('uid', uid)
            .first();

        if (existing) {
            // Update flags if they changed
            if (data.flags !== undefined) {
                await this.query()
                    .where('id', existing.id)
                    .update({
                        flags: data.flags,
                        is_read: data.is_read,
                        updated_at: new Date()
                    });
            }
            return false; // not newly inserted
        }

        await this.query().insert({
            account_id: accountId,
            uid: String(uid),
            message_id: data.messageId || null,
            subject: data.subject || null,
            from_address: data.fromAddress || null,
            to_address: data.toAddress || null,
            mail_date: data.mailDate || null,
            flags: data.flags || null,
            is_read: data.isRead || false,
            body_text: data.bodyText || null,
            body_html: data.bodyHtml || null,
            game_account: data.gameAccount || null,
            code: data.code || null
        });
        return true; // newly inserted
    }

    /**
     * Bulk upsert — given an array of emails for one account,
     * insert only those whose uid doesn't exist yet.
     */
    async bulkUpsert(accountId, emails) {
        if (!emails.length) return { inserted: 0, updated: 0 };

        // Fetch existing UIDs for this account
        const existingRows = await this.query()
            .where('account_id', accountId)
            .select('uid', 'id', 'flags', 'is_read');

        const existingMap = new Map();
        for (const row of existingRows) {
            existingMap.set(row.uid, row);
        }

        const toInsert = [];
        const toUpdate = [];

        for (const email of emails) {
            const uidStr = String(email.uid);
            const existing = existingMap.get(uidStr);
            if (existing) {
                // Check if flags changed
                const newFlags = JSON.stringify(email.flags || []);
                const oldFlags = existing.flags || '[]';
                if (newFlags !== oldFlags) {
                    toUpdate.push({
                        id: existing.id,
                        flags: newFlags,
                        is_read: email.flags?.includes('\\Seen') ? 1 : 0
                    });
                }
            } else {
                toInsert.push({
                    account_id: accountId,
                    uid: uidStr,
                    message_id: email.messageId || null,
                    subject: email.subject || null,
                    from_address: email.fromAddress ? JSON.stringify(email.fromAddress) : null,
                    to_address: email.toAddress ? JSON.stringify(email.toAddress) : null,
                    mail_date: email.mailDate || null,
                    flags: JSON.stringify(email.flags || []),
                    is_read: email.flags?.includes('\\Seen') ? 1 : 0,
                    body_text: email.bodyText || null,
                    body_html: email.bodyHtml || null,
                    game_account: email.gameAccount || null,
                    code: email.code || null
                });
            }
        }

        // Batch insert new emails
        if (toInsert.length > 0) {
            await this.query().insert(toInsert);
        }

        // Batch update changed flags
        for (const item of toUpdate) {
            await this.query()
                .where('id', item.id)
                .update({
                    flags: item.flags,
                    is_read: item.is_read,
                    updated_at: new Date()
                });
        }

        return { inserted: toInsert.length, updated: toUpdate.length };
    }

    /**
     * Find single email by ID (includes body content)
     */
    async findByIdWithBody(id) {
        const row = await this.query()
            .where('id', id)
            .first();
        if (!row) return null;
        return this.formatEmail(row, true);
    }

    /**
     * Format email row for API response
     */
    formatEmail(row, includeBody = false) {
        let from = [];
        let to = [];
        try { from = JSON.parse(row.from_address || '[]'); } catch { from = []; }
        try { to = JSON.parse(row.to_address || '[]'); } catch { to = []; }

        let flags = [];
        try { flags = JSON.parse(row.flags || '[]'); } catch { flags = []; }

        const result = {
            id: row.id,
            accountId: row.account_id,
            uid: row.uid,
            messageId: row.message_id,
            subject: row.subject || '(No Subject)',
            from,
            to,
            date: row.mail_date ? new Date(row.mail_date).getTime() : null,
            flags,
            isRead: !!row.is_read,
            gameAccount: row.game_account || null,
            code: row.code || null,
            createTime: new Date(row.created_at).getTime()
        };

        if (includeBody) {
            result.bodyText = row.body_text || null;
            result.bodyHtml = row.body_html || null;
        }

        return result;
    }

    async getLastUid(id) {
        let res = await this.query()
            .select('uid')
            .where('account_id', id)
            .orderBy('uid', 'desc')
            .first();
        if (res) return res.uid;
        return 0;
    }
}

export default new EmailMessageModel();
