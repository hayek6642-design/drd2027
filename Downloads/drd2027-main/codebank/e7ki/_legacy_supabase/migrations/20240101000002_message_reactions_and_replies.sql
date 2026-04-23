-- Add message reactions and replies functionality

-- Add parent_message_id to e7ki_messages for reply threads
ALTER TABLE public.e7ki_messages
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.e7ki_messages(id) ON DELETE SET NULL;

-- Create index for reply threads
CREATE INDEX IF NOT EXISTS idx_e7ki_messages_parent_message_id ON public.e7ki_messages(parent_message_id);

-- Create e7ki_message_reactions table
CREATE TABLE IF NOT EXISTS public.e7ki_message_reactions (
    message_id UUID REFERENCES public.e7ki_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.e7ki_users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_e7ki_message_reactions_message_id ON public.e7ki_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_e7ki_message_reactions_user_id ON public.e7ki_message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_e7ki_message_reactions_emoji ON public.e7ki_message_reactions(emoji);

-- Enable RLS on message reactions
ALTER TABLE public.e7ki_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for message reactions
DROP POLICY IF EXISTS "Users can view reactions in their chats" ON public.e7ki_message_reactions;
CREATE POLICY "Users can view reactions in their chats" ON public.e7ki_message_reactions
    FOR SELECT USING (
        message_id IN (
            SELECT id FROM public.e7ki_messages
            WHERE chat_id IN (
                SELECT chat_id FROM public.e7ki_chat_members
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can add reactions to messages in their chats" ON public.e7ki_message_reactions;
CREATE POLICY "Users can add reactions to messages in their chats" ON public.e7ki_message_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        message_id IN (
            SELECT id FROM public.e7ki_messages
            WHERE chat_id IN (
                SELECT chat_id FROM public.e7ki_chat_members
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.e7ki_message_reactions;
CREATE POLICY "Users can remove their own reactions" ON public.e7ki_message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Update existing RLS policies to include parent_message_id access
DROP POLICY IF EXISTS "Users can view messages in chats they belong to" ON public.e7ki_messages;
CREATE POLICY "Users can view messages in chats they belong to" ON public.e7ki_messages
    FOR SELECT USING (
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        ) AND is_deleted = false
    );

-- Allow users to see parent messages for replies (even if they're not direct members)
DROP POLICY IF EXISTS "Users can view parent messages for replies" ON public.e7ki_messages;
CREATE POLICY "Users can view parent messages for replies" ON public.e7ki_messages
    FOR SELECT USING (
        id IN (
            SELECT parent_message_id FROM public.e7ki_messages
            WHERE chat_id IN (
                SELECT chat_id FROM public.e7ki_chat_members
                WHERE user_id = auth.uid()
            ) AND parent_message_id IS NOT NULL
        ) AND is_deleted = false
    );