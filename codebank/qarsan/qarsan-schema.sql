-- Qarsan System Database Schema
-- Enhanced with email tracking for better identity management

-- Qarsan state table (existing)
CREATE TABLE IF NOT EXISTS qarsan_state (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    qarsan_mode VARCHAR(20) NOT NULL DEFAULT 'OFF' CHECK (qarsan_mode IN ('OFF', 'RANGED', 'EXPOSURE')),
    qarsan_wallet INTEGER NOT NULL DEFAULT 0 CHECK (qarsan_wallet >= 0),
    steal_scope VARCHAR(30) NOT NULL DEFAULT 'NONE' CHECK (steal_scope IN ('NONE', 'QARSAN_WALLET_ONLY', 'ALL_ASSETS')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qarsan_state_mode ON qarsan_state(qarsan_mode);
CREATE INDEX IF NOT EXISTS idx_qarsan_state_wallet ON qarsan_state(qarsan_wallet);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_qarsan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_qarsan_updated_at_trigger ON qarsan_state;
CREATE TRIGGER update_qarsan_updated_at_trigger
    BEFORE UPDATE ON qarsan_state
    FOR EACH ROW
    EXECUTE FUNCTION update_qarsan_updated_at();

-- Enhanced ledger entries with email tracking
-- The ledger table already exists, but we ensure meta column exists for email tracking
ALTER TABLE ledger ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

-- Function to get user email by ID (for internal use)
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    user_email TEXT;
BEGIN
    SELECT email INTO user_email FROM users WHERE id = user_uuid;
    RETURN user_email;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Enhanced audit log function for Qarsan operations
CREATE OR REPLACE FUNCTION log_qarsan_operation(
    operation_type TEXT,
    user_id UUID,
    target_user_id UUID DEFAULT NULL,
    amount INTEGER DEFAULT NULL,
    operation_mode TEXT DEFAULT NULL,
    additional_data JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
    user_email TEXT;
    target_email TEXT;
    log_payload JSONB;
BEGIN
    -- Get user emails
    user_email := get_user_email(user_id);
    IF target_user_id IS NOT NULL THEN
        target_email := get_user_email(target_user_id);
    END IF;
    
    -- Build comprehensive log payload
    log_payload := jsonb_build_object(
        'operation', operation_type,
        'userId', user_id,
        'userEmail', user_email,
        'targetUserId', target_user_id,
        'targetEmail', target_email,
        'amount', amount,
        'mode', operation_mode,
        'timestamp', NOW(),
        'additional', additional_data
    );
    
    -- Insert into audit log
    INSERT INTO audit_log (type, payload) VALUES ('QARSAN_' || operation_type, log_payload);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the operation
        RAISE WARNING 'Failed to log Qarsan operation: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Sample virtual users for testing (these would be created programmatically)
-- INSERT INTO users (id, email, name, password_hash) VALUES 
--     ('bot1-uuid', 'bot1@qarsan.ai', 'Qarsan Bot 1', 'hashed_password'),
--     ('bot2-uuid', 'bot2@qarsan.ai', 'Qarsan Bot 2', 'hashed_password'),
--     ('trap1-uuid', 'trap.user@qarsan.ai', 'Trap User', 'hashed_password'),
--     ('decoy1-uuid', 'decoy@qarsan.ai', 'Decoy Account', 'hashed_password'),
--     ('honeypot1-uuid', 'honeypot@qarsan.ai', 'Honey Pot', 'hashed_password');

-- Grant necessary permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON qarsan_state TO your_app_user;
-- GRANT SELECT ON users TO your_app_user; -- For email lookups
-- GRANT SELECT, INSERT ON ledger TO your_app_user;
-- GRANT SELECT, INSERT ON audit_log TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_user_email TO your_app_user;
-- GRANT EXECUTE ON FUNCTION log_qarsan_operation TO your_app_user;