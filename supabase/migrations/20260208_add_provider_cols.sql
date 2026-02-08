-- Add provider and display_name columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'twitter',
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing rows to have provider = 'twitter'
UPDATE profiles SET provider = 'twitter' WHERE provider IS NULL;

-- Make twitter_handle nullable if it's currently NOT NULL
-- (It is defined as UNIQUE NOT NULL in schema.sql)
-- We might want to keep it NOT NULL but use a fallback for other providers like 'github:username'
-- For now, let's keep it NOT NULL and rely on the sync logic to generate a handle.
