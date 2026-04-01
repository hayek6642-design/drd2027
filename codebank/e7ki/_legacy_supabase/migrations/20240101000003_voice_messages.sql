-- Add voice message support
-- Add 'voice' to message_type enum
ALTER TYPE message_type ADD VALUE 'voice';

-- Create e7ki_voice_messages table for voice message metadata
CREATE TABLE IF NOT EXISTS public.e7ki_voice_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.e7ki_messages(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(message_id)
);

-- Add indexes for performance
CREATE INDEX idx_e7ki_voice_messages_message_id ON public.e7ki_voice_messages(message_id);
CREATE INDEX idx_e7ki_voice_messages_created_at ON public.e7ki_voice_messages(created_at);

-- Enable RLS
ALTER TABLE public.e7ki_voice_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice messages
DROP POLICY IF EXISTS "Users can view voice messages in their chats" ON public.e7ki_voice_messages;
CREATE POLICY "Users can view voice messages in their chats" ON public.e7ki_voice_messages
    FOR SELECT USING (
        message_id IN (
            SELECT id FROM public.e7ki_messages
            WHERE chat_id IN (
                SELECT chat_id FROM public.e7ki_chat_members
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert voice messages in their chats" ON public.e7ki_voice_messages;
CREATE POLICY "Users can insert voice messages in their chats" ON public.e7ki_voice_messages
    FOR INSERT WITH CHECK (
        message_id IN (
            SELECT id FROM public.e7ki_messages
            WHERE chat_id IN (
                SELECT chat_id FROM public.e7ki_chat_members
                WHERE user_id = auth.uid()
            ) AND sender_id = auth.uid()
        )
    );

-- Update storage policies for voice files (chat_media bucket)
-- Voice files are stored under chat_media/{chat_id}/voice/ path
-- Existing policies already cover this, but adding specific mention for clarity