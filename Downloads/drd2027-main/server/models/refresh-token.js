/**
 * ============================================================================
 * Refresh Token Model & Database Schema
 * ============================================================================
 * 
 * This module defines the database schema for storing refresh tokens.
 * Refresh tokens enable users to obtain new access tokens without
 * requiring re-authentication.
 * 
 * KEY SECURITY FEATURES:
 * - Tokens are revoked (soft delete) when used/refreshed
 * - Expired tokens are cleaned up periodically
 * - Reuse detection: If a revoked token is used, entire session is invalidated
 * 
 * ============================================================================
 */

/**
 * ============================================================================
 * Database Schema (SQL)
 * ============================================================================
 * 
 * Copy and paste this into your database initialization script.
 * Supports PostgreSQL (recommended) and MySQL.
 */

// ============================================================================
// OPTION A: PostgreSQL (Recommended)
// ============================================================================

const postgresSchema = `
-- Users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Refresh tokens table
-- This table stores refresh tokens and tracks their lifecycle
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to users
  user_id UUID NOT NULL,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- The actual refresh token (JWT string)
  token TEXT NOT NULL,
  CONSTRAINT unique_refresh_token UNIQUE (token),
  
  -- When this token expires
  expires_at TIMESTAMP NOT NULL,
  
  -- When this token was revoked (NULL = still valid)
  -- Token rotation: Old token is revoked, new one is issued
  revoked_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id 
  ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token 
  ON refresh_tokens(token);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at 
  ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at 
  ON refresh_tokens(revoked_at);

-- Cleanup view (optional): Find expired tokens to delete
CREATE OR REPLACE VIEW expired_tokens AS
SELECT * FROM refresh_tokens
WHERE expires_at < NOW();
`;

// ============================================================================
// OPTION B: MySQL
// ============================================================================

const mysqlSchema = `
-- Users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  
  -- Foreign key to users
  user_id CHAR(36) NOT NULL,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- The actual refresh token (JWT string)
  token LONGTEXT NOT NULL,
  CONSTRAINT unique_refresh_token UNIQUE (token(255)),
  
  -- When this token expires
  expires_at TIMESTAMP NOT NULL,
  
  -- When this token was revoked (NULL = still valid)
  revoked_at TIMESTAMP NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  KEY idx_user_id (user_id),
  KEY idx_expires_at (expires_at),
  KEY idx_revoked_at (revoked_at)
);
`;

/**
 * ============================================================================
 * Node.js Usage Examples
 * ============================================================================
 */

// ============================================================================
// USING WITH pg (PostgreSQL)
// ============================================================================

export async function initRefreshTokenTable(pool) {
  const schema = `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
  `;

  try {
    await pool.query(schema);
    console.log('[DB] Refresh tokens table initialized');
  } catch (error) {
    console.error('[DB] Error initializing refresh tokens table:', error);
    throw error;
  }
}

// ============================================================================
// USING WITH Sequelize (ORM)
// ============================================================================

export default (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define(
    'RefreshToken',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'user_id'
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
        comment: 'The JWT refresh token'
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
        comment: 'When this token expires'
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        field: 'revoked_at',
        comment: 'When this token was revoked (token rotation)'
      }
    },
    {
      tableName: 'refresh_tokens',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['user_id']
        },
        {
          fields: ['token']
        },
        {
          fields: ['expires_at']
        },
        {
          fields: ['revoked_at']
        }
      ]
    }
  );

  // Association
  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // Instance methods
  RefreshToken.prototype.isValid = function() {
    return !this.revokedAt && this.expiresAt > new Date();
  };

  RefreshToken.prototype.revoke = async function() {
    this.revokedAt = new Date();
    return this.save();
  };

  // Class methods
  RefreshToken.revokeAllForUser = async function(userId) {
    return this.update(
      { revokedAt: new Date() },
      {
        where: {
          userId,
          revokedAt: null
        }
      }
    );
  };

  RefreshToken.cleanupExpired = async function() {
    const result = await this.destroy({
      where: {
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
    console.log(`[DB] Cleaned up ${result} expired refresh tokens`);
    return result;
  };

  return RefreshToken;
};

// ============================================================================
// USING WITH Raw SQL / Node-Postgres
// ============================================================================

export class RefreshTokenRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Store a new refresh token
   */
  async create(userId, token, expiresAt) {
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token, expires_at, revoked_at
    `;
    const result = await this.pool.query(query, [userId, token, expiresAt]);
    return result.rows[0];
  }

  /**
   * Find token and check if valid
   */
  async findValid(token) {
    const query = `
      SELECT id, user_id, token, expires_at, revoked_at
      FROM refresh_tokens
      WHERE token = $1 
        AND revoked_at IS NULL 
        AND expires_at > NOW()
      LIMIT 1
    `;
    const result = await this.pool.query(query, [token]);
    return result.rows[0] || null;
  }

  /**
   * Revoke a token (token rotation)
   */
  async revoke(token) {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token = $1
      RETURNING id, revoked_at
    `;
    const result = await this.pool.query(query, [token]);
    return result.rows[0];
  }

  /**
   * Revoke all tokens for a user (logout)
   */
  async revokeAll(userId) {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
      RETURNING COUNT(*) as revoked_count
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Clean up expired tokens (run periodically)
   */
  async cleanupExpired() {
    const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW()
      RETURNING id
    `;
    const result = await this.pool.query(query);
    console.log(`[DB] Deleted ${result.rowCount} expired tokens`);
    return result.rowCount;
  }

  /**
   * Detect token reuse (security check)
   * If a revoked token is used, invalidate entire session
   */
  async detectReuse(token) {
    const query = `
      SELECT user_id, revoked_at
      FROM refresh_tokens
      WHERE token = $1
      LIMIT 1
    `;
    const result = await this.pool.query(query, [token]);
    
    if (result.rows.length > 0) {
      const record = result.rows[0];
      
      if (record.revoked_at) {
        console.warn('[Auth] SECURITY: Revoked token reuse detected for user:', record.user_id);
        // Revoke all tokens for this user as security measure
        await this.revokeAll(record.user_id);
        return {
          reused: true,
          userId: record.user_id
        };
      }
    }
    
    return { reused: false };
  }
}

// ============================================================================
// Setup & Initialization
// ============================================================================

export async function setupRefreshTokens(pool) {
  console.log('[Auth] Setting up refresh token system...');
  
  // Initialize table
  await initRefreshTokenTable(pool);
  
  // Setup periodic cleanup (every 6 hours)
  const refreshRepo = new RefreshTokenRepository(pool);
  setInterval(async () => {
    try {
      await refreshRepo.cleanupExpired();
    } catch (error) {
      console.error('[Auth] Cleanup error:', error);
    }
  }, 6 * 60 * 60 * 1000);
  
  console.log('[Auth] Refresh token system ready');
  
  return refreshRepo;
}

/**
 * ============================================================================
 * Migration for existing databases
 * ============================================================================
 * 
 * If you have an existing auth system, add this migration:
 * 
 * 1. Create refresh_tokens table
 * 2. Migrate any existing sessions to refresh tokens
 * 3. Clean up old session storage
 */

export const migrationScript = `
-- Step 1: Create new refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Step 2: Create indexes
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Step 3: (Optional) Migrate existing session tokens if needed
-- INSERT INTO refresh_tokens (user_id, token, expires_at)
-- SELECT user_id, token, expires_at FROM old_sessions
-- WHERE active = true;

-- Step 4: (Optional) Drop old session storage
-- DROP TABLE IF EXISTS old_sessions;
`;
