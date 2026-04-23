-- ============================================================
-- ZAGEL COMMAND WHEEL - Database Schema
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS zagel_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS zagel_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES zagel_users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

-- Channels for SSE streaming
CREATE TABLE IF NOT EXISTS zagel_channels (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    created_by TEXT NOT NULL REFERENCES zagel_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Channel subscriptions
CREATE TABLE IF NOT EXISTS zagel_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES zagel_users(id),
    channel_id TEXT NOT NULL REFERENCES zagel_channels(id),
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, channel_id)
);

-- SSE events log
CREATE TABLE IF NOT EXISTS zagel_sse_events (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES zagel_channels(id),
    event_type TEXT NOT NULL,
    payload JSONB,
    created_by TEXT REFERENCES zagel_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_channel_created (channel_id, created_at)
);

-- Zagel commands log
CREATE TABLE IF NOT EXISTS zagel_commands (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES zagel_users(id),
    command TEXT NOT NULL,
    parameters JSONB,
    status TEXT DEFAULT 'pending',
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_status (status)
);

-- Notifications queue
CREATE TABLE IF NOT EXISTS zagel_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES zagel_users(id),
    channel_id TEXT REFERENCES zagel_channels(id),
    type TEXT NOT NULL,
    title TEXT,
    message TEXT,
    payload JSONB,
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_delivered (user_id, delivered)
);

-- Activity audit trail
CREATE TABLE IF NOT EXISTS zagel_activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES zagel_users(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, created_at),
    INDEX idx_resource (resource_type, resource_id)
);

-- Zagel system settings
CREATE TABLE IF NOT EXISTS zagel_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user ON zagel_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON zagel_sessions(token);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON zagel_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_channel ON zagel_subscriptions(channel_id);
