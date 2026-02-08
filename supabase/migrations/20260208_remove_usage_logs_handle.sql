-- Migration: Remove twitter_handle from usage_logs
-- It is redundant (we track user_id) and problematic for non-Twitter users

ALTER TABLE usage_logs DROP COLUMN IF EXISTS twitter_handle;
