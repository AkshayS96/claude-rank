-- Migration: 20260405_usage_sessions.sql
-- Description: Add support for session-based analytics and tool usage tracking.

-- usage_sessions table to group usage by OTel trace_id or generated UUID
CREATE TABLE IF NOT EXISTS usage_sessions (
    id TEXT PRIMARY KEY, -- Use trace_id or generated UUID
    user_id UUID REFERENCES profiles(id),
    start_time TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    model TEXT,
    project_name TEXT,
    total_input_tokens BIGINT DEFAULT 0,
    total_output_tokens BIGINT DEFAULT 0,
    total_cache_read BIGINT DEFAULT 0,
    total_cache_write BIGINT DEFAULT 0,
    total_cost NUMERIC(10, 5) DEFAULT 0
);

-- tool_usage table for granular tracking of tool calls within a session
CREATE TABLE IF NOT EXISTS tool_usage (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT REFERENCES usage_sessions(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    call_count INT DEFAULT 1,
    input_tokens BIGINT DEFAULT 0,
    output_tokens BIGINT DEFAULT 0,
    cost NUMERIC(10, 5) DEFAULT 0,
    last_called TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, tool_name)
);

-- Update usage_logs to link to a session
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS session_id TEXT REFERENCES usage_sessions(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_usage_sessions_user_id ON usage_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_session_id ON tool_usage(session_id);

-- RLS Policies
ALTER TABLE usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read usage_sessions" ON usage_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read tool_usage" ON tool_usage FOR SELECT USING (true);
