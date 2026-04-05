-- Migration: 20260405_profile_cost.sql
-- Description: Add aggregate cost tracking to the main profile.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10, 5) DEFAULT 0;
