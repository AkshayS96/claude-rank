-- Remove the unique constraint on twitter_handle
-- This allows multiple users to identical handles if they come from different providers or scenarios
-- Note: This implies lookup by handle might return multiple results

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_twitter_handle_key;
