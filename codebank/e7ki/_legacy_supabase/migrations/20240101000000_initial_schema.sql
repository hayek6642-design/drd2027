-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_status AS ENUM ('online', 'offline', 'away', 'busy');
CREATE TYPE message_type AS ENUM ('text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker');
CREATE TYPE chat_role AS ENUM ('admin', 'member');
CREATE TYPE subscription_plan AS ENUM ('free', 'premium', 'business');

-- Create e7ki_users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.e7ki_users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    about TEXT,
    phone TEXT,
    status user_status DEFAULT 'offline',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    subscription_plan subscription_plan DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    usage_messages INTEGER DEFAULT 0,
    usage_voice_minutes INTEGER DEFAULT 0,
    usage_video_minutes INTEGER DEFAULT 0,
    usage_storage_bytes BIGINT DEFAULT 0,
    usage_reset_date DATE DEFAULT CURRENT_DATE,
    privacy_profile_visible BOOLEAN DEFAULT true,
    privacy_last_seen_visible BOOLEAN DEFAULT true,
    privacy_read_receipts BOOLEAN DEFAULT true,
    privacy_typing_indicators BOOLEAN DEFAULT true,
    notifications_push BOOLEAN DEFAULT true,
    notifications_email BOOLEAN DEFAULT true,
    notifications_sound BOOLEAN DEFAULT true,
    notifications_vibration BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create e7ki_chats table
CREATE TABLE IF NOT EXISTS public.e7ki_chats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    is_group BOOLEAN DEFAULT false,
    title TEXT,
    description TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES public.e7ki_users(id) ON DELETE SET NULL,
    settings_public BOOLEAN DEFAULT false,
    settings_join_by_invite BOOLEAN DEFAULT true,
    settings_allow_member_invites BOOLEAN DEFAULT true,
    settings_max_participants INTEGER DEFAULT 100,
    encryption_enabled BOOLEAN DEFAULT true,
    encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
    encryption_key_version TEXT DEFAULT 'v1',
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT group_title_required CHECK (
        (is_group = false) OR (is_group = true AND title IS NOT NULL)
    )
);

-- Create e7ki_chat_members table
CREATE TABLE IF NOT EXISTS public.e7ki_chat_members (
    chat_id UUID REFERENCES public.e7ki_chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    role chat_role DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (chat_id, user_id)
);

-- Create e7ki_messages table
CREATE TABLE IF NOT EXISTS public.e7ki_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID REFERENCES public.e7ki_chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    content TEXT,
    message_type message_type DEFAULT 'text',
    media_url TEXT,
    media_filename TEXT,
    media_size BIGINT,
    media_mime_type TEXT,
    media_thumbnail_url TEXT,
    media_duration INTEGER, -- in seconds
    media_width INTEGER,
    media_height INTEGER,
    reply_to UUID REFERENCES public.e7ki_messages(id) ON DELETE SET NULL,
    encryption_enabled BOOLEAN DEFAULT false,
    encryption_key_version TEXT,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT message_content_required CHECK (
        (message_type = 'text' AND content IS NOT NULL) OR
        (message_type != 'text' AND media_url IS NOT NULL)
    )
);

-- Create e7ki_message_reactions table
CREATE TABLE IF NOT EXISTS public.e7ki_message_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.e7ki_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(message_id, user_id, emoji)
);

-- Create e7ki_message_reads table for read receipts
CREATE TABLE IF NOT EXISTS public.e7ki_message_reads (
    message_id UUID REFERENCES public.e7ki_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (message_id, user_id)
);

-- Create e7ki_typing_indicators table
CREATE TABLE IF NOT EXISTS public.e7ki_typing_indicators (
    chat_id UUID REFERENCES public.e7ki_chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (chat_id, user_id)
);

-- Create e7ki_presence table for online status
CREATE TABLE IF NOT EXISTS public.e7ki_presence (
    user_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE PRIMARY KEY,
    status user_status DEFAULT 'offline',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create e7ki_contacts table for friend requests
CREATE TABLE IF NOT EXISTS public.e7ki_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(requester_id, addressee_id)
);

-- Create e7ki_blocked_users table
CREATE TABLE IF NOT EXISTS public.e7ki_blocked_users (
    blocker_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    blocked_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (blocker_id, blocked_id)
);

-- Create e7ki_calls table for WebRTC call history
CREATE TABLE IF NOT EXISTS public.e7ki_calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chat_id UUID REFERENCES public.e7ki_chats(id) ON DELETE CASCADE,
    initiator_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    call_type TEXT CHECK (call_type IN ('voice', 'video')) NOT NULL,
    status TEXT CHECK (status IN ('ringing', 'connected', 'ended', 'missed')) DEFAULT 'ringing',
    participants UUID[] NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration INTEGER, -- in seconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_e7ki_users_username ON public.e7ki_users(username);
CREATE INDEX idx_e7ki_users_status ON public.e7ki_users(status);
CREATE INDEX idx_e7ki_users_subscription_plan ON public.e7ki_users(subscription_plan);
CREATE INDEX idx_e7ki_chats_created_by ON public.e7ki_chats(created_by);
CREATE INDEX idx_e7ki_chats_is_group ON public.e7ki_chats(is_group);
CREATE INDEX idx_e7ki_chats_last_message_at ON public.e7ki_chats(last_message_at DESC);
CREATE INDEX idx_e7ki_chat_members_user_id ON public.e7ki_chat_members(user_id);
CREATE INDEX idx_e7ki_messages_chat_id ON public.e7ki_messages(chat_id);
CREATE INDEX idx_e7ki_messages_sender_id ON public.e7ki_messages(sender_id);
CREATE INDEX idx_e7ki_messages_created_at ON public.e7ki_messages(created_at DESC);
CREATE INDEX idx_e7ki_messages_reply_to ON public.e7ki_messages(reply_to);
CREATE INDEX idx_e7ki_message_reactions_message_id ON public.e7ki_message_reactions(message_id);
CREATE INDEX idx_e7ki_message_reads_user_id ON public.e7ki_message_reads(user_id);
CREATE INDEX idx_e7ki_typing_indicators_chat_id ON public.e7ki_typing_indicators(chat_id);
CREATE INDEX idx_e7ki_contacts_requester_id ON public.e7ki_contacts(requester_id);
CREATE INDEX idx_e7ki_contacts_addressee_id ON public.e7ki_contacts(addressee_id);
CREATE INDEX idx_e7ki_contacts_status ON public.e7ki_contacts(status);
CREATE INDEX idx_e7ki_calls_chat_id ON public.e7ki_calls(chat_id);
CREATE INDEX idx_e7ki_calls_initiator_id ON public.e7ki_calls(initiator_id);
CREATE INDEX idx_e7ki_calls_status ON public.e7ki_calls(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_e7ki_users_updated_at BEFORE UPDATE ON public.e7ki_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_e7ki_chats_updated_at BEFORE UPDATE ON public.e7ki_chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_e7ki_messages_updated_at BEFORE UPDATE ON public.e7ki_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_e7ki_contacts_updated_at BEFORE UPDATE ON public.e7ki_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update chat message count
CREATE OR REPLACE FUNCTION update_e7ki_chat_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.e7ki_chats SET message_count = message_count + 1, last_message_at = NEW.created_at WHERE id = NEW.chat_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.e7ki_chats SET message_count = message_count - 1 WHERE id = OLD.chat_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for message count updates
CREATE TRIGGER trigger_update_e7ki_chat_message_count
    AFTER INSERT OR DELETE ON public.e7ki_messages
    FOR EACH ROW EXECUTE FUNCTION update_e7ki_chat_message_count();

-- Create function to update chat last_message_at
CREATE OR REPLACE FUNCTION update_e7ki_chat_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.e7ki_chats SET last_message_at = NEW.created_at WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for last message updates
CREATE TRIGGER trigger_update_e7ki_chat_last_message_at
    AFTER INSERT ON public.e7ki_messages
    FOR EACH ROW EXECUTE FUNCTION update_e7ki_chat_last_message_at();