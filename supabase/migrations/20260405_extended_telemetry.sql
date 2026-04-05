-- Migration: 20260405_extended_telemetry.sql
-- Description: Add columns for duration, latency, and error tracking.

-- Add columns to usage_sessions
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS duration_ms BIGINT DEFAULT 0;
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS avg_latency_ms INT DEFAULT 0;
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS error_count INT DEFAULT 0;
ALTER TABLE usage_sessions ADD COLUMN IF NOT EXISTS command TEXT;

-- Add columns to tool_usage
ALTER TABLE tool_usage ADD COLUMN IF NOT EXISTS avg_latency_ms INT DEFAULT 0;
ALTER TABLE tool_usage ADD COLUMN IF NOT EXISTS error_count INT DEFAULT 0;
