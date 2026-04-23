import crypto from 'crypto';

class TransactionEngine {
  constructor(dbQuery) {
    this.dbQuery = dbQuery;
    this.RATE_LIMIT_WINDOW = 10; // seconds
    this.RATE_LIMIT_MAX = 20; // maximum transactions per window
  }

  /**
   * Generate a deterministic transaction ID using SHA-256
   * @param {Object} params 
   * @param {string} params.requestId - Client-generated request ID for idempotency
   * @param {string} params.fromUser - Sender user ID
   * @param {string} params.toUser - Receiver user ID
   * @param {string} params.assetId - Asset type (e.g., 'codes')
   * @param {number} params.amount - Transaction amount (must be positive)
   * @returns {string} SHA-256 hash as transaction ID
   */
  generateTxId({ requestId, fromUser, toUser, assetId, amount }) {
    const raw = `${requestId}:${fromUser}:${toUser}:${assetId}:${amount}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Generate cryptographic transaction fingerprint
   * @param {Object} data - Transaction details
   * @returns {string} SHA-256 hash of transaction details
   */
  generateTxHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Assert global financial invariant - system must always balance to zero
   * @param {Object} client - Database client
   */
  async assertGlobalInvariant(client) {
    const { rows } = await client.query(`
      SELECT COALESCE(SUM(
        CASE WHEN direction='credit' THEN amount ELSE -amount END
      ), 0) as total
      FROM ledger
    `);

    if (Number(rows[0].total) !== 0) {
      throw new Error('SYSTEM_INVARIANT_BROKEN');
    }
  }

  /**
   * Check replay attack - ensure request hasn't been processed before
   * @param {Object} client - Database client
   * @param {string} requestId - Client request ID
   */
  async checkReplayAttack(client, requestId) {
    // Create processed requests table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS processed_requests (
        request_id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const res = await client.query(`
      INSERT INTO processed_requests (request_id)
      VALUES ($1)
      ON CONFLICT DO NOTHING
    `, [requestId]);

    if (res.rowCount === 0) {
      throw new Error('REPLAY_ATTACK');
    }
  }

  /**
   * Check transaction rate limit
   * @param {Object} client - Database client
   * @param {string} userId - User ID
   */
  async checkRateLimit(client, userId) {
    const { rows } = await client.query(`
      SELECT COUNT(*) as count FROM ledger
      WHERE user_id = $1
      AND created_at > datetime('now', '-' || $2 || ' seconds')
    `, [userId, this.RATE_LIMIT_WINDOW]);

    if (Number(rows[0].count) > this.RATE_LIMIT_MAX) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
  }

  /**
   * Detect suspicious transactions (simple fraud detection)
   * @param {Object} client - Database client
   * @param {string} userId - User ID
   * @param {number} amount - Transaction amount
   */
  async detectFraud(client, userId, amount) {
    // Calculate user's average transaction amount
    const { rows } = await client.query(`
      SELECT COALESCE(AVG(amount), 0) as avg_amount
      FROM ledger
      WHERE user_id = $1
      AND created_at > datetime('now', '-24 hours')
    `, [userId]);

    const userAvg = Number(rows[0].avg_amount);
    
    // Suspect if transaction is 10x larger than average
    if (userAvg > 0 && amount > userAvg * 10) {
      // Freeze account for investigation
      await this.freezeAccount(client, userId);
      throw new Error('ACCOUNT_FROZEN_SUSPICIOUS_ACTIVITY');
    }
  }

  /**
   * Freeze user account
   * @param {Object} client - Database client
   * @param {string} userId - User ID
   */
  async freezeAccount(client, userId) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS frozen_accounts (
        user_id TEXT PRIMARY KEY,
        reason TEXT,
        frozen_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      INSERT INTO frozen_accounts (user_id, reason)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET reason = $2, frozen_at = CURRENT_TIMESTAMP
    `, [userId, 'SUSPICIOUS_ACTIVITY']);
  }

  /**
   * Unfreeze user account
   * @param {Object} client - Database client
   * @param {string} userId - User ID
   */
  async unfreezeAccount(client, userId) {
    await client.query(`
      DELETE FROM frozen_accounts WHERE user_id = $1
    `, [userId]);
  }

  /**
   * Check if account is frozen
   * @param {Object} client - Database client
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  async isAccountFrozen(client, userId) {
    const { rows } = await client.query(`
      SELECT 1 FROM frozen_accounts WHERE user_id = $1
    `, [userId]);

    return rows.length > 0;
  }

  /**
   * Get current balance for a user and asset from the ledger (inside transaction)
   * @param {Object} client - Database client with active transaction
   * @param {string} userId - User ID
   * @param {string} assetId - Asset type
   * @returns {number} Current balance
   */
  async getBalance(client, userId, assetId) {
    const res = await client.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN direction = 'credit' THEN amount
          ELSE -amount
        END
      ), 0) AS balance
      FROM ledger
      WHERE user_id = $1 AND asset_type = $2
    `, [userId, assetId]);

    return Number(res.rows[0].balance);
  }

  /**
   * Execute a deterministic, atomic, idempotent transaction with ultra security
   * @param {Object} params 
   * @param {string} params.requestId - Client-generated request ID for idempotency
   * @param {string} params.fromUser - Sender user ID
   * @param {string} params.toUser - Receiver user ID
   * @param {string} params.assetId - Asset type
   * @param {number} params.amount - Transaction amount
   * @param {Object} params.meta - Additional metadata (ip, device, userAgent, reason)
   * @returns {Object} Transaction result with success/failure status
   */
  async executeTransaction({ 
    requestId, 
    fromUser, 
    toUser, 
    assetId, 
    amount, 
    meta = {} 
  }) {
    if (!requestId || !fromUser || !toUser || !assetId || amount <= 0) {
      throw new Error('INVALID_INPUT');
    }

    // Generate deterministic transaction ID
    const txId = this.generateTxId({
      requestId,
      from: fromUser,
      to: toUser,
      assetId,
      amount
    });

    // Generate transaction hash for verification
    const txHash = this.generateTxHash({
      fromUser,
      toUser,
      assetId,
      amount,
      requestId
    });

    // Get database client from pool
    const client = await this.dbQuery.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      // 1. Acquire advisory lock for transaction
      await client.query(`
        SELECT pg_advisory_xact_lock(hashtext($1))
      `, [`${fromUser}:${assetId}`]);

      // 2. Check replay attack
      await this.checkReplayAttack(client, requestId);

      // 3. Check rate limit
      await this.checkRateLimit(client, fromUser);
      await this.checkRateLimit(client, toUser);

      // 4. Check if accounts are frozen
      if (await this.isAccountFrozen(client, fromUser) || 
          await this.isAccountFrozen(client, toUser)) {
        throw new Error('ACCOUNT_FROZEN');
      }

      // 5. Check sufficient funds
      const balance = await this.getBalance(client, fromUser, assetId);
      if (balance < amount) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // 6. Fraud detection
      await this.detectFraud(client, fromUser, amount);
      await this.detectFraud(client, toUser, amount);

      // 7. Insert debit entry (sender)
      await client.query(`
        INSERT INTO ledger (
          id,
          tx_id,
          tx_hash,
          user_id,
          asset_type,
          amount,
          direction,
          meta,
          created_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'debit', $6, NOW())
        ON CONFLICT (tx_id, user_id, direction) DO NOTHING
      `, [txId, txHash, fromUser, assetId, amount, meta]);

      // 8. Insert credit entry (receiver)
      await client.query(`
        INSERT INTO ledger (
          id,
          tx_id,
          tx_hash,
          user_id,
          asset_type,
          amount,
          direction,
          meta,
          created_at
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'credit', $6, NOW())
        ON CONFLICT (tx_id, user_id, direction) DO NOTHING
      `, [txId, txHash, toUser, assetId, amount, meta]);

      // 9. Assert global financial invariant
      await this.assertGlobalInvariant(client);

      // Commit transaction
      await client.query('COMMIT');

      client.release();

      return {
        success: true,
        txId,
        txHash
      };

    } catch (err) {
      // Rollback on any error
      await client.query('ROLLBACK');
      client.release();

      return {
        success: false,
        error: err.message,
        txId: txId || null
      };
    }
  }

  /**
   * Get transaction details by transaction ID
   * @param {string} txId - Transaction ID (SHA-256 hash)
   * @returns {Array} Transaction entries
   */
  async getTransaction(txId) {
    const res = await this.dbQuery(`
      SELECT * FROM ledger
      WHERE tx_id = $1
      ORDER BY direction, created_at
    `, [txId]);

    return res.rows;
  }

  /**
   * Get all transactions for a user and asset
   * @param {string} userId - User ID
   * @param {string} assetId - Asset type
   * @returns {Array} Transaction history
   */
  async getTransactionHistory(userId, assetId) {
    const res = await this.dbQuery(`
      SELECT * FROM ledger
      WHERE user_id = $1 AND asset_type = $2
      ORDER BY created_at DESC
    `, [userId, assetId]);

    return res.rows;
  }
}

export default TransactionEngine;
