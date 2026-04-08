-- OneWorld Anonymous Platform Database Schema
-- Run this in your Supabase SQL editor

-- Simple posts table for anonymous platform
CREATE TABLE IF NOT EXISTS posts (
  id uuid primary key default gen_random_uuid(),
  anon_id uuid not null,
  message text not null,
  country text,
  language text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies - allow anyone to read and insert
CREATE POLICY "Allow read" ON posts
FOR SELECT USING (true);

CREATE POLICY "Allow insert" ON posts
FOR INSERT WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);