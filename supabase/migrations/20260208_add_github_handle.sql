-- Add github_handle column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS github_handle TEXT;
