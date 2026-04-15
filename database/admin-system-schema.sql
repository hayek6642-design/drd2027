-- =====================================================
-- Centralized Admin System Database Schema
-- CodeBank - All Services Administration
-- =====================================================

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
    permissions JSONB DEFAULT '[]',
    two_factor_enabled BOOLEAN DEFAULT false,
    otp_secret VARCHAR(255),
    otp_backup VARCHAR(255),
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

-- Admin Roles Table
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    level INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Permissions Table
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    service VARCHAR(50) NOT NULL,
    description TEXT,
    allowed_actions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(name, service)
);

-- Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW()
);

-- Admin Audit Log Table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Services Registry
CREATE TABLE IF NOT EXISTS admin_services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rate Limiting for Admins
CREATE TABLE IF NOT EXISTS admin_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_duration INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT NOW()
);

-- IP Whitelist for Admin Access
CREATE TABLE IF NOT EXISTS admin_ip_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default roles
INSERT INTO admin_roles (name, level, description, permissions) VALUES
    ('SUPER_ADMIN', 3, 'Full access to all services and settings', '["*"]'),
    ('SERVICE_ADMIN', 2, 'Admin access to specific service', '["manage_users", "view_analytics", "manage_assets"]'),
    ('ANALYST', 1, 'Read-only access with audit log viewing', '["view_analytics", "view_audit"]'),
    ('VIEWER', 0, 'Basic dashboard access only', '["view_dashboard"]')
ON CONFLICT (name) DO NOTHING;

-- Insert default admin (password: admin123)
INSERT INTO admin_users (email, password_hash, name, role, permissions) 
SELECT 'admin@codebank.app', '$2a$10$rVnKk.1Jj5qVxHnKk5XxOeU5GxK5XxOeU5GxK5XxOeU5GxK5XxO', 'Super Admin', 'SUPER_ADMIN', '["*"]'
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE email = 'admin@codebank.app');

-- Insert default services
INSERT INTO admin_services (id, name, icon, description, status) VALUES
    ('safecode', 'Safecode', '🔐', 'Code storage and management service', 'active'),
    ('cottery', 'Cottery', '🎯', 'Prediction and betting service', 'active'),
    ('farragna', 'Farragna', '🎬', 'Video content platform', 'active'),
    ('pebalaash', 'Pebalaash', '🎨', 'Creative content service', 'active'),
    ('samma3ny', 'Samma3ny', '📺', 'Streaming service', 'active'),
    ('e7ki', 'E7ki', '💬', 'Consultation service', 'active'),
    ('battalooda', 'Battalooda', '🔥', 'Viral content engagement', 'active')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_user ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_rate_limits_user ON admin_rate_limits(user_id, endpoint);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_user_id UUID,
    p_action VARCHAR,
    p_target_type VARCHAR,
    p_target_id VARCHAR,
    p_details JSONB DEFAULT '{}',
    p_ip VARCHAR
) RETURNS VOID AS $$
BEGIN
    INSERT INTO admin_audit_log (user_id, action, target_type, target_id, details, ip_address, user_agent)
    VALUES (p_user_id, p_action, p_target_type, p_target_id, p_details, p_ip, current_setting('app.user_agent', true));
END;
$$ LANGUAGE plpgsql;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_admin_permissions(p_role VARCHAR)
RETURNS JSONB AS $$
DECLARE
    perms JSONB := '[]';
BEGIN
    SELECT permissions INTO perms FROM admin_roles WHERE name = p_role;
    RETURN COALESCE(perms, '[]');
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS VOID AS $$
BEGIN
    DELETE FROM admin_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE admin_users IS 'Centralized admin users for all CodeBank services';
COMMENT ON TABLE admin_roles IS 'RBAC roles with permission levels';
COMMENT ON TABLE admin_permissions IS 'Granular permissions per service';
COMMENT ON TABLE admin_sessions IS 'Active admin sessions with JWT-style tokens';
COMMENT ON TABLE admin_audit_log IS 'Comprehensive audit log of all admin actions';
COMMENT ON TABLE admin_services IS 'Registry of all CodeBank services';
COMMENT ON TABLE admin_ip_whitelist IS 'IP-based access control for admin panel';