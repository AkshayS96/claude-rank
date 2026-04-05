-- Migration: 20260405_gamification_and_privacy.sql
-- Description: Add privacy controls and badge system for gamification.

-- Add columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Ensure project_name exists in usage_sessions (it should from previous migration, but being safe)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_sessions' AND column_name='project_name') THEN
        ALTER TABLE usage_sessions ADD COLUMN project_name TEXT;
    END IF;
END $$;
