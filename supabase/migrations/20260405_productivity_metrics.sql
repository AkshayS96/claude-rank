-- Migration: 20260405_productivity_metrics.sql
-- Description: Add productivity metrics like lines of code, commits, and PRs.

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_lines_changed BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_commits INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_prs INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_sessions INT DEFAULT 0;

-- Add columns to usage_sessions
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS lines_of_code BIGINT DEFAULT 0;
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS commit_count INT DEFAULT 0;
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS pr_count INT DEFAULT 0;
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS repository_name TEXT;
