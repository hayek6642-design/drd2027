-- Enable Row Level Security on all tables
ALTER TABLE public.e7ki_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e7ki_calls ENABLE ROW LEVEL SECURITY;

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.e7ki_users;
CREATE POLICY "Users can view their own profile" ON public.e7ki_users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.e7ki_users;
CREATE POLICY "Users can update their own profile" ON public.e7ki_users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view other users profiles" ON public.e7ki_users;
CREATE POLICY "Users can view other users profiles" ON public.e7ki_users
    FOR SELECT USING (privacy_profile_visible = true);

-- Chats table policies
DROP POLICY IF EXISTS "Users can view chats they are members of" ON public.e7ki_chats;
CREATE POLICY "Users can view chats they are members of" ON public.e7ki_chats
    FOR SELECT USING (
        id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create chats" ON public.e7ki_chats;
CREATE POLICY "Users can create chats" ON public.e7ki_chats
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Chat admins can update their chats" ON public.e7ki_chats;
CREATE POLICY "Chat admins can update their chats" ON public.e7ki_chats
    FOR UPDATE USING (
        created_by = auth.uid() OR
        id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Chat admins can delete their chats" ON public.e7ki_chats;
CREATE POLICY "Chat admins can delete their chats" ON public.e7ki_chats
    FOR DELETE USING (
        created_by = auth.uid() OR
        id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Chat members policies
DROP POLICY IF EXISTS "Users can view chat members for chats they belong to" ON public.e7ki_chat_members;
CREATE POLICY "Users can view chat members for chats they belong to" ON public.e7ki_chat_members
    FOR SELECT USING (
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Chat admins can add members" ON public.e7ki_chat_members;
CREATE POLICY "Chat admins can add members" ON public.e7ki_chat_members
    FOR INSERT WITH CHECK (
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can update their own membership" ON public.e7ki_chat_members;
CREATE POLICY "Users can update their own membership" ON public.e7ki_chat_members
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Chat admins can update member roles" ON public.e7ki_chat_members;
CREATE POLICY "Chat admins can update member roles" ON public.e7ki_chat_members
    FOR UPDATE USING (
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can leave chats, admins can remove members" ON public.e7ki_chat_members;
CREATE POLICY "Users can leave chats, admins can remove members" ON public.e7ki_chat_members
    FOR DELETE USING (
        user_id = auth.uid() OR
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in chats they belong to" ON public.e7ki_messages;
CREATE POLICY "Users can view messages in chats they belong to" ON public.e7ki_messages
    FOR SELECT USING (
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        ) AND is_deleted = false
    );

DROP POLICY IF EXISTS "Users can send messages to chats they belong to" ON public.e7ki_messages;
CREATE POLICY "Users can send messages to chats they belong to" ON public.e7ki_messages
    FOR INSERT WITH CHECK (
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        ) AND sender_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can edit their own messages" ON public.e7ki_messages;
CREATE POLICY "Users can edit their own messages" ON public.e7ki_messages
    FOR UPDATE USING (
        sender_id = auth.uid() AND
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their own messages, admins can delete any" ON public.e7ki_messages;
CREATE POLICY "Users can delete their own messages, admins can delete any" ON public.e7ki_messages
    FOR DELETE USING (
        sender_id = auth.uid() OR
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Message reactions policies
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

-- Message reads policies
DROP POLICY IF EXISTS "Users can view read receipts in their chats" ON public.e7ki_message_reads;
CREATE POLICY "Users can view read receipts in their chats" ON public.e7ki_message_reads
    FOR SELECT USING (
        message_id IN (
            SELECT id FROM public.e7ki_messages
            WHERE chat_id IN (
                SELECT chat_id FROM public.e7ki_chat_members
                WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can mark messages as read in their chats" ON public.e7ki_message_reads;
CREATE POLICY "Users can mark messages as read in their chats" ON public.e7ki_message_reads
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

-- Typing indicators policies
DROP POLICY IF EXISTS "Users can view typing indicators in their chats" ON public.e7ki_typing_indicators;
CREATE POLICY "Users can view typing indicators in their chats" ON public.e7ki_typing_indicators
    FOR SELECT USING (
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can set their own typing indicators" ON public.e7ki_typing_indicators;
CREATE POLICY "Users can set their own typing indicators" ON public.e7ki_typing_indicators
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can remove their own typing indicators" ON public.e7ki_typing_indicators;
CREATE POLICY "Users can remove their own typing indicators" ON public.e7ki_typing_indicators
    FOR DELETE USING (user_id = auth.uid());

-- Presence policies
DROP POLICY IF EXISTS "Users can view presence of users they can contact" ON public.e7ki_presence;
CREATE POLICY "Users can view presence of users they can contact" ON public.e7ki_presence
    FOR SELECT USING (
        user_id IN (
            SELECT addressee_id FROM public.e7ki_contacts
            WHERE requester_id = auth.uid() AND status = 'accepted'
        ) OR
        user_id IN (
            SELECT requester_id FROM public.e7ki_contacts
            WHERE addressee_id = auth.uid() AND status = 'accepted'
        ) OR
        user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update their own presence (insert)" ON public.e7ki_presence;
CREATE POLICY "Users can update their own presence (insert)" ON public.e7ki_presence
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own presence (update)" ON public.e7ki_presence;
CREATE POLICY "Users can update their own presence (update)" ON public.e7ki_presence
    FOR UPDATE USING (user_id = auth.uid());

-- Contacts policies
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.e7ki_contacts;
CREATE POLICY "Users can view their own contacts" ON public.e7ki_contacts
    FOR SELECT USING (
        requester_id = auth.uid() OR addressee_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can send contact requests" ON public.e7ki_contacts;
CREATE POLICY "Users can send contact requests" ON public.e7ki_contacts
    FOR INSERT WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Users can update contact requests they received" ON public.e7ki_contacts;
CREATE POLICY "Users can update contact requests they received" ON public.e7ki_contacts
    FOR UPDATE USING (addressee_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own contact relationships" ON public.e7ki_contacts;
CREATE POLICY "Users can delete their own contact relationships" ON public.e7ki_contacts
    FOR DELETE USING (
        requester_id = auth.uid() OR addressee_id = auth.uid()
    );

-- Blocked users policies
DROP POLICY IF EXISTS "Users can view their own blocked users" ON public.e7ki_blocked_users;
CREATE POLICY "Users can view their own blocked users" ON public.e7ki_blocked_users
    FOR SELECT USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can block other users" ON public.e7ki_blocked_users;
CREATE POLICY "Users can block other users" ON public.e7ki_blocked_users
    FOR INSERT WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can unblock users they blocked" ON public.e7ki_blocked_users;
CREATE POLICY "Users can unblock users they blocked" ON public.e7ki_blocked_users
    FOR DELETE USING (blocker_id = auth.uid());

-- Calls policies
DROP POLICY IF EXISTS "Users can view calls in chats they belong to" ON public.e7ki_calls;
CREATE POLICY "Users can view calls in chats they belong to" ON public.e7ki_calls
    FOR SELECT USING (
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create calls in chats they belong to" ON public.e7ki_calls;
CREATE POLICY "Users can create calls in chats they belong to" ON public.e7ki_calls
    FOR INSERT WITH CHECK (
        initiator_id = auth.uid() AND
        chat_id IN (
            SELECT chat_id FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Call participants can update call status" ON public.e7ki_calls;
CREATE POLICY "Call participants can update call status" ON public.e7ki_calls
    FOR UPDATE USING (
        initiator_id = auth.uid() OR
        auth.uid() = ANY(participants)
    );

-- Storage policies for Supabase Storage
-- These would be set up in the Supabase dashboard or via SQL
-- For avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;
CREATE POLICY "Users can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- For chat_media bucket
DROP POLICY IF EXISTS "Chat members can upload media to their chats" ON storage.objects;
CREATE POLICY "Chat members can upload media to their chats" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat_media' AND
        (storage.foldername(name))[1] IN (
            SELECT chat_id::text FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Chat members can view chat media" ON storage.objects;
CREATE POLICY "Chat members can view chat media" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'chat_media' AND
        (storage.foldername(name))[1] IN (
            SELECT chat_id::text FROM public.e7ki_chat_members
            WHERE user_id = auth.uid()
        )
    );

-- For call_recordings bucket (future feature)
DROP POLICY IF EXISTS "Call participants can upload recordings" ON storage.objects;
CREATE POLICY "Call participants can upload recordings" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'call_recordings' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.e7ki_calls
            WHERE auth.uid() = ANY(participants)
        )
    );

DROP POLICY IF EXISTS "Call participants can view recordings" ON storage.objects;
CREATE POLICY "Call participants can view recordings" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'call_recordings' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.e7ki_calls
            WHERE auth.uid() = ANY(participants)
        )
    );