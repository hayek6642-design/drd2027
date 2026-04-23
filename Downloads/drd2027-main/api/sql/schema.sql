-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users and Profiles
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  language TEXT,
  religion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users_profiles (
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  language TEXT,
  religion TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS users_profiles ALTER COLUMN username SET DEFAULT 'anonymous';
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  jwt_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Assets / Wallet (Setta)
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  codes BIGINT NOT NULL DEFAULT 0,
  silver_bars BIGINT NOT NULL DEFAULT 0,
  gold_bars BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS setta_wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  codes BIGINT NOT NULL DEFAULT 0,
  silver_bars BIGINT NOT NULL DEFAULT 0,
  gold_bars BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS setta_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(18,6) NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(18,6) NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farragna videos
CREATE TABLE IF NOT EXISTS farragna_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stream_uid TEXT,
  status TEXT DEFAULT 'processing',
  cloud_public_id TEXT,
  url TEXT NOT NULL,
  playback_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  category TEXT,
  duration INTEGER,
  size BIGINT,
  bytes BIGINT,
  views_count INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  rewards_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS farragna_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES farragna_videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS farragna_likes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES farragna_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);
CREATE TABLE IF NOT EXISTS farragna_follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, followed_id)
);
CREATE TABLE IF NOT EXISTS farragna_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES farragna_videos(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (video_id, viewer_id)
);
CREATE TABLE IF NOT EXISTS farragna_search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shots (photos)
CREATE TABLE IF NOT EXISTS shots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cloud_public_id TEXT,
  url TEXT NOT NULL,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS shots_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cloud_public_id TEXT,
  url TEXT NOT NULL,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E7ki chat
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  is_group BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E7ki message reactions
CREATE TABLE IF NOT EXISTS e7ki_message_reactions (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- E7ki message read receipts
CREATE TABLE IF NOT EXISTS e7ki_message_reads (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- E7ki typing indicators
CREATE TABLE IF NOT EXISTS e7ki_typing_indicators (
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- E7ki presence
CREATE TABLE IF NOT EXISTS e7ki_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS game_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Corsa codes
CREATE TABLE IF NOT EXISTS corsa_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  value NUMERIC(18,6) NOT NULL,
  redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS corsa_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code_id UUID REFERENCES corsa_codes(id) ON DELETE CASCADE,
  amount NUMERIC(18,6) NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  amount NUMERIC(18,6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Assets media registry
CREATE TABLE IF NOT EXISTS assets_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  cloud_public_id TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
ALTER TABLE IF EXISTS setta_transactions ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_setta_tx_user ON setta_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_owner ON farragna_videos(owner_id);
CREATE INDEX IF NOT EXISTS idx_farragna_status ON farragna_videos(status);
CREATE INDEX IF NOT EXISTS idx_shots_owner ON shots(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON e7ki_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reads_message ON e7ki_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_typing_chat ON e7ki_typing_indicators(chat_id);
CREATE INDEX IF NOT EXISTS idx_presence_status ON e7ki_presence(status);
CREATE INDEX IF NOT EXISTS idx_scores_game ON game_scores(game_name);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON users_profiles(username);

-- Ensure FK constraints are deferrable for transactional inserts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_profiles_user_id_fkey'
      AND table_name = 'users_profiles'
  ) THEN
    ALTER TABLE users_profiles DROP CONSTRAINT users_profiles_user_id_fkey;
  END IF;
END$$;

ALTER TABLE users_profiles
  ADD CONSTRAINT users_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- Nostaglia tables
CREATE TABLE IF NOT EXISTS nostaglia_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cloud_public_id TEXT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  memory_note TEXT,
  admin_assigned_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nostaglia_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID REFERENCES nostaglia_uploads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nostaglia_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID REFERENCES nostaglia_uploads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nostaglia_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID REFERENCES nostaglia_uploads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nostaglia_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Nostaglia
CREATE INDEX IF NOT EXISTS idx_nostaglia_uploads_user ON nostaglia_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_nostaglia_uploads_date ON nostaglia_uploads(admin_assigned_date);
CREATE INDEX IF NOT EXISTS idx_nostaglia_reactions_upload ON nostaglia_reactions(upload_id);
CREATE INDEX IF NOT EXISTS idx_nostaglia_reactions_user ON nostaglia_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_nostaglia_comments_upload ON nostaglia_comments(upload_id);
CREATE INDEX IF NOT EXISTS idx_nostaglia_shares_upload ON nostaglia_shares(upload_id);

-- ============================================================
-- CRITICAL PERFORMANCE INDEXES (added to keep row-reads inside
-- Turso free-tier quota at scale)
-- ============================================================

-- Auth: every authenticated request looks up token first
CREATE INDEX IF NOT EXISTS idx_sessions_token    ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user     ON auth_sessions(user_id);

-- Wallets: user balance lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user      ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_setta_wallets_user ON setta_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_corsa_codes_user  ON corsa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_corsa_tx_user     ON corsa_transactions(user_id);

-- Farragna: high-frequency social queries
CREATE INDEX IF NOT EXISTS idx_farragna_likes_video   ON farragna_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_farragna_likes_user    ON farragna_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_farragna_comments_video ON farragna_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_farragna_follows_follower   ON farragna_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_farragna_follows_following  ON farragna_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_farragna_views_video   ON farragna_views(video_id);
CREATE INDEX IF NOT EXISTS idx_farragna_views_user    ON farragna_views(user_id);
CREATE INDEX IF NOT EXISTS idx_farragna_search_user   ON farragna_search_history(user_id);

-- Battalooda
CREATE INDEX IF NOT EXISTS idx_battalooda_rec_user   ON battalooda_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_battalooda_likes_rec  ON battalooda_likes(recording_id);
CREATE INDEX IF NOT EXISTS idx_battalooda_likes_user ON battalooda_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_battalooda_cmts_rec   ON battalooda_comments(recording_id);
CREATE INDEX IF NOT EXISTS idx_battalooda_fav_user   ON battalooda_favorite_tracks(user_id);

-- Chat / E7ki
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created  ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_reads_user        ON e7ki_message_reads(user_id);

-- Rewards / assets
CREATE INDEX IF NOT EXISTS idx_rewards_user      ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user       ON assets_media(user_id);

-- Dr.D-mail
CREATE INDEX IF NOT EXISTS idx_drmail_recipient  ON drmail_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_drmail_sender     ON drmail_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_drmail_thread     ON drmail_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_drmail_read       ON drmail_messages(is_read);

-- Pebalaash Wallet Items: tracks items pending shipping after purchase, and gifts
CREATE TABLE IF NOT EXISTS pebalaash_wallet_items (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  order_id     TEXT NOT NULL,
  product_id   INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  image_url    TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  from_gift    INTEGER NOT NULL DEFAULT 0,
  gifted_from  TEXT,
  gift_note    TEXT,
  acquired_at  TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  updated_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS idx_pb_wallet_user   ON pebalaash_wallet_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pb_wallet_status ON pebalaash_wallet_items(user_id, status);

-- Pebalaash
CREATE INDEX IF NOT EXISTS idx_pebalaash_orders_user ON pebalaash_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pebalaash_ratings_product ON pebalaash_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_pebalaash_ratings_user    ON pebalaash_ratings(user_id);
