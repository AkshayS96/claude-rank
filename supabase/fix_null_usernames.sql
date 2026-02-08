-- Fix script for NULL usernames
-- Run this if you have users with no username (resulting in 'undefined' links)

-- 1. Try to backfill from twitter_handle if available
UPDATE profiles 
SET username = twitter_handle 
WHERE username IS NULL AND twitter_handle IS NOT NULL;

-- 2. If still null, try github_handle
UPDATE profiles 
SET username = github_handle 
WHERE username IS NULL AND github_handle IS NOT NULL;

-- 3. If still null, try display_name (sanitize it first)
-- This is risky so maybe skip, or just do a simple replace
-- UPDATE profiles SET username = lower(regexp_replace(display_name, '\s+', '', 'g')) WHERE username IS NULL;

-- 4. Final fallback: Generate user_ID
UPDATE profiles 
SET username = 'user_' || substr(md5(random()::text), 1, 8)
WHERE username IS NULL;

-- 5. Re-apply the trigger function (Important! You must run the updated function definition first)
-- The file supabase/migrations/20260208_handle_new_user.sql contains the updated function.
