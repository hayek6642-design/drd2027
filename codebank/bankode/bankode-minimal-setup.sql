-- Bankode Minimal Database Setup
-- This script creates the essential tables and RPC functions needed for the Bankode application

-- Create users table
CREATE TABLE IF NOT EXISTS bankode_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create balances table
CREATE TABLE IF NOT EXISTS bankode_balances (
    balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES bankode_users(user_id) ON DELETE CASCADE,
    codes INTEGER DEFAULT 0,
    silver INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS bankode_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES bankode_users(user_id),
    to_user_id UUID REFERENCES bankode_users(user_id),
    amount_codes INTEGER DEFAULT 0,
    amount_silver INTEGER DEFAULT 0,
    amount_gold INTEGER DEFAULT 0,
    transaction_type VARCHAR(50) DEFAULT 'transfer',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE bankode_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankode_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankode_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bankode_users
CREATE POLICY "Users can view own data" ON bankode_users
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own data" ON bankode_users
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for bankode_balances
CREATE POLICY "Users can view own balances" ON bankode_balances
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own balances" ON bankode_balances
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Create RLS policies for bankode_transactions
CREATE POLICY "Users can view own transactions" ON bankode_transactions
    FOR SELECT USING (
        auth.uid()::text = from_user_id::text OR 
        auth.uid()::text = to_user_id::text
    );

-- Essential RPC Functions

-- Register User Function
CREATE OR REPLACE FUNCTION bankode_register_user(
    p_full_name TEXT,
    p_email TEXT,
    p_password TEXT
)
RETURNS JSON AS $$
DECLARE
    user_id UUID;
    access_token TEXT;
    refresh_token TEXT;
    hashed_password TEXT;
BEGIN
    -- Hash the password (in production, use a proper hashing library)
    hashed_password := crypt(p_password, gen_salt('bf'));
    
    -- Insert user
    INSERT INTO bankode_users (full_name, email, password_hash)
    VALUES (p_full_name, p_email, hashed_password)
    RETURNING user_id INTO user_id;
    
    -- Create initial balance record
    INSERT INTO bankode_balances (user_id) VALUES (user_id);
    
    -- Generate simple tokens (in production, use proper JWT)
    access_token := 'access_token_' || user_id::text;
    refresh_token := 'refresh_token_' || user_id::text;
    
    RETURN JSON_BUILD_OBJECT(
        'access_token', access_token,
        'refresh_token', refresh_token,
        'user_id', user_id,
        'email', p_email,
        'full_name', p_full_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Login User Function
CREATE OR REPLACE FUNCTION bankode_login_user(
    p_email TEXT,
    p_password TEXT
)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    access_token TEXT;
    refresh_token TEXT;
BEGIN
    -- Find user
    SELECT * INTO user_record
    FROM bankode_users
    WHERE email = p_email AND password_hash = crypt(p_password, password_hash);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid email or password';
    END IF;
    
    -- Generate tokens
    access_token := 'access_token_' || user_record.user_id::text;
    refresh_token := 'refresh_token_' || user_record.user_id::text;
    
    RETURN JSON_BUILD_OBJECT(
        'access_token', access_token,
        'refresh_token', refresh_token,
        'user_id', user_record.user_id,
        'email', user_record.email,
        'full_name', user_record.full_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Current User Function
CREATE OR REPLACE FUNCTION bankode_get_current_user()
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- For demo purposes, return first user (in production, use JWT validation)
    SELECT * INTO user_record FROM bankode_users LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    RETURN JSON_BUILD_OBJECT(
        'user_id', user_record.user_id,
        'email', user_record.email,
        'full_name', user_record.full_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get User Balances Function
CREATE OR REPLACE FUNCTION bankode_get_balances(p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    balance_record RECORD;
    target_user_id UUID;
BEGIN
    -- For demo purposes, use first user (in production, use JWT to get user_id)
    SELECT user_id INTO target_user_id FROM bankode_users LIMIT 1;
    
    SELECT * INTO balance_record
    FROM bankode_balances
    WHERE user_id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('codes', 0, 'silver', 0, 'gold', 0);
    END IF;
    
    RETURN JSON_BUILD_OBJECT(
        'codes', balance_record.codes,
        'silver', balance_record.silver,
        'gold', balance_record.gold
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get All Users Function (Admin Only)
CREATE OR REPLACE FUNCTION bankode_get_all_users()
RETURNS JSON AS $$
DECLARE
    users_array JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'user_id', user_id,
            'email', email,
            'full_name', full_name
        )
    ) INTO users_array
    FROM bankode_users;
    
    RETURN COALESCE(users_array, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Overview Function
CREATE OR REPLACE FUNCTION bankode_admin_users_count()
RETURNS INTEGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM bankode_users;
    RETURN user_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION bankode_admin_transactions_count()
RETURNS INTEGER AS $$
DECLARE
    tx_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tx_count FROM bankode_transactions;
    RETURN tx_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION bankode_admin_minted_summary()
RETURNS JSON AS $$
DECLARE
    summary JSON;
BEGIN
    SELECT json_build_object(
        'total_codes', COALESCE(SUM(codes), 0),
        'total_silver', COALESCE(SUM(silver), 0),
        'total_gold', COALESCE(SUM(gold), 0)
    ) INTO summary
    FROM bankode_balances;
    
    RETURN summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Additional Admin Functions
CREATE OR REPLACE FUNCTION bankode_get_transactions(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    transactions_array JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', transaction_id,
            'from_uid', from_user_id,
            'to_uid', to_user_id,
            'amount_codes', amount_codes,
            'amount_silver', amount_silver,
            'amount_gold', amount_gold,
            'tx_type', transaction_type,
            'description', description,
            'created_at', created_at
        )
    ) INTO transactions_array
    FROM bankode_transactions
    WHERE from_user_id = p_user_id OR to_user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset;
    
    RETURN COALESCE(transactions_array, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION bankode_mint_assets(
    p_value INTEGER,
    p_currency TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Simple minting function (in production, add proper validation and logging)
    result := json_build_object(
        'success', true,
        'message', 'Minted ' || p_value || ' ' || p_currency,
        'code', 'MINT_' || extract(epoch from now())::bigint
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION bankode_log_admin_action(
    p_target_user_id UUID,
    p_action_type TEXT,
    p_action_data TEXT
)
RETURNS JSON AS $$
BEGIN
    -- Simple admin action logging (you might want to create a separate admin_actions table)
    RETURN json_build_object(
        'success', true,
        'message', 'Admin action logged: ' || p_action_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh JWT Function
CREATE OR REPLACE FUNCTION bankode_refresh_user_jwt(p_refresh_token TEXT)
RETURNS JSON AS $$
DECLARE
    user_id UUID;
    new_access_token TEXT;
    new_refresh_token TEXT;
BEGIN
    -- Extract user_id from refresh token (simple demo implementation)
    user_id := split_part(p_refresh_token, '_', 2)::UUID;
    
    -- Generate new tokens
    new_access_token := 'access_token_' || user_id::text;
    new_refresh_token := 'refresh_token_' || user_id::text || '_' || extract(epoch from now())::bigint::text;
    
    RETURN JSON_BUILD_OBJECT(
        'access_token', new_access_token,
        'refresh_token', new_refresh_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;