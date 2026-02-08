-- Migration: Separate Username from Twitter Handle (Fixed for Duplicates)
-- 1. Add username column
-- 2. Backfill username from twitter_handle, handling duplicates and nulls
-- 3. Make twitter_handle nullable
-- 4. Clean up invalid twitter_handles

-- Step 1: Add username column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Step 2: Backfill username
-- First pass: Copy twitter_handle
UPDATE profiles SET username = twitter_handle WHERE username IS NULL;

-- Second pass: If username is still NULL (was null twitter_handle), generate "user_ID"
UPDATE profiles 
SET username = 'user_' || substr(md5(random()::text), 1, 8)
WHERE username IS NULL;

-- Step 3: Handle Duplicates BEFORE creating unique index
-- Append a random suffix to any username that appears more than once
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, username 
        FROM (
            SELECT id, username, 
                   ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
            FROM profiles
        ) t
        WHERE rn > 1
    LOOP
        UPDATE profiles 
        SET username = r.username || '_' || substr(md5(random()::text), 1, 4)
        WHERE id = r.id;
    END LOOP;
END $$;

-- Step 4: Add unique constraint to username
DROP INDEX IF EXISTS profiles_username_key;
CREATE UNIQUE INDEX profiles_username_key ON profiles (username);

-- Step 5: Make twitter_handle nullable
ALTER TABLE profiles ALTER COLUMN twitter_handle DROP NOT NULL;

-- Step 6: Cleanup - Remove twitter_handle for non-Twitter users
UPDATE profiles 
SET twitter_handle = NULL 
WHERE (provider NOT ILIKE 'twitter' AND provider NOT ILIKE 'x')
  AND twitter_handle = username;
