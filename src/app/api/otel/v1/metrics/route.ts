import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashApiKey, calculateCost, calculateBadges } from '@/lib/utils';

// POST: Receive OTel metrics from Claude Code
export async function POST(req: NextRequest) {
    try {
        // Extract auth from headers
        const authHeader = req.headers.get('Authorization');
        const twitterHandle = req.headers.get('X-Twitter-Handle');

        if (!authHeader || !twitterHandle) {
            console.log('Missing auth headers');
            return NextResponse.json({ error: 'Missing auth headers' }, { status: 401 });
        }

        const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

        // Parse OTLP metrics payload
        const body = await req.json();
        console.log('Received OTel metrics:', JSON.stringify(body).slice(0, 500));

        // Validate API key against stored hash
        const apiKeyHash = await hashApiKey(apiKey);
        const { rows } = await db.query(
            'SELECT id FROM profiles WHERE api_key_hash = $1',
            [apiKeyHash]
        );

        if (rows.length === 0) {
            console.log('Invalid API key for handle:', twitterHandle);
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        const profile = rows[0];

        // Process OTLP metrics - extract token counts
        // The OTLP format sends metrics in resourceMetrics array
        const resourceMetrics = body.resourceMetrics || [];

        let inputTokens = 0;
        let outputTokens = 0;
        let cacheReadTokens = 0;
        let cacheWriteTokens = 0;
        let sessionCount = 0;
        let linesOfCode = 0;
        let commitCount = 0;
        let prCount = 0;

        const sessionStats: Record<string, { 
            model: string, 
            projectName: string, 
            input: number, 
            output: number, 
            cacheRead: number, 
            cacheCreation: number,
            durationMs: number,
            latencyMs: number,
            command?: string,
            repositoryName?: string,
            linesOfCode: number,
            commitCount: number,
            prCount: number
        }> = {};

        for (const rm of resourceMetrics) {
            const projectName = rm.resource?.attributes?.find((a: any) => a.key === 'service.name' || a.key === 'project.name')?.value?.stringValue || 'default';
            const repoName = rm.resource?.attributes?.find((a: any) => a.key === 'repository.name')?.value?.stringValue;
            
            const scopeMetrics = rm.scopeMetrics || [];
            for (const sm of scopeMetrics) {
                const metrics = sm.metrics || [];
                for (const metric of metrics) {
                    if (metric.name === 'claude_code.token.usage' || 
                        metric.name === 'claude_code.tool_use.count' || 
                        metric.name === 'claude_code.session.duration' ||
                        metric.name === 'claude_code.command.execution_time' ||
                        metric.name === 'claude_code.session.count' ||
                        metric.name === 'claude_code.lines_of_code.count' ||
                        metric.name === 'claude_code.commit.count' ||
                        metric.name === 'claude_code.pull_request.count') {
                        
                        const dataPoints = metric.sum?.dataPoints || metric.histogram?.dataPoints || [];
                        for (const dp of dataPoints) {
                            const tokenType = dp.attributes?.find((a: any) => a.key === 'type')?.value?.stringValue;
                            const model = dp.attributes?.find((a: any) => a.key === 'model')?.value?.stringValue || 'claude-3-7-sonnet-20250219';
                            const traceId = dp.attributes?.find((a: any) => a.key === 'trace_id')?.value?.stringValue || 'manual-' + Date.now();
                            const command = dp.attributes?.find((a: any) => a.key === 'command')?.value?.stringValue;
                            const value = Number(dp.asInt || dp.asDouble || dp.sum || 0);

                            if (!sessionStats[traceId]) {
                                sessionStats[traceId] = { model, projectName, input: 0, output: 0, cacheRead: 0, cacheCreation: 0, durationMs: 0, latencyMs: 0, linesOfCode: 0, commitCount: 0, prCount: 0, repositoryName: repoName };
                            }
                            
                            if (command) sessionStats[traceId].command = command;
                            if (repoName) sessionStats[traceId].repositoryName = repoName;

                            if (metric.name === 'claude_code.token.usage') {
                                switch (tokenType) {
                                    case 'input': inputTokens += value; sessionStats[traceId].input += value; break;
                                    case 'output': outputTokens += value; sessionStats[traceId].output += value; break;
                                    case 'cacheRead': cacheReadTokens += value; sessionStats[traceId].cacheRead += value; break;
                                    case 'cacheCreation': cacheWriteTokens += value; sessionStats[traceId].cacheCreation += value; break;
                                }
                            }

                            if (metric.name === 'claude_code.session.count') sessionCount += value;
                            if (metric.name === 'claude_code.lines_of_code.count') {
                                linesOfCode += value;
                                sessionStats[traceId].linesOfCode += value;
                            }
                            if (metric.name === 'claude_code.commit.count') {
                                commitCount += value;
                                sessionStats[traceId].commitCount += value;
                            }
                            if (metric.name === 'claude_code.pull_request.count') {
                                prCount += value;
                                sessionStats[traceId].prCount += value;
                            }

                            if (metric.name === 'claude_code.session.duration') {
                                sessionStats[traceId].durationMs += value;
                            }

                            if (metric.name === 'claude_code.command.execution_time') {
                                sessionStats[traceId].latencyMs = value; // Treat as latest command latency
                            }

                            if (metric.name === 'claude_code.tool_use.count') {
                                const toolName = dp.attributes?.find((a: any) => a.key === 'tool_name')?.value?.stringValue;
                                if (toolName && value > 0) {
                                    await db.query(`
                                        INSERT INTO tool_usage (session_id, tool_name, call_count)
                                        VALUES ($1, $2, $3)
                                        ON CONFLICT (session_id, tool_name)
                                        DO UPDATE SET call_count = tool_usage.call_count + EXCLUDED.call_count, last_called = NOW()
                                    `, [traceId, toolName, value]);
                                }
                            }
                        }
                    }
                }
            }
        }

        const totalTokens = inputTokens + outputTokens;
        if (totalTokens > 0 || cacheReadTokens > 0 || cacheWriteTokens > 0 || Object.keys(sessionStats).length > 0) {
            // Calculate total cost for this chunk
            let chunkCost = 0;
            for (const stats of Object.values(sessionStats)) {
                chunkCost += calculateCost(stats.model, { 
                    input: stats.input, 
                    output: stats.output, 
                    cache_read: stats.cacheRead, 
                    cache_write: stats.cacheCreation 
                });
            }

            await db.query(`
                UPDATE profiles 
                SET 
                    input_tokens = COALESCE(input_tokens, 0) + $1,
                    output_tokens = COALESCE(output_tokens, 0) + $2,
                    cache_read_tokens = COALESCE(cache_read_tokens, 0) + $3,
                    cache_write_tokens = COALESCE(cache_write_tokens, 0) + $4,
                    total_cost = COALESCE(total_cost, 0) + $5,
                    total_sessions = COALESCE(total_sessions, 0) + $6,
                    total_lines_changed = COALESCE(total_lines_changed, 0) + $7,
                    total_commits = COALESCE(total_commits, 0) + $8,
                    total_prs = COALESCE(total_prs, 0) + $9,
                    last_active = NOW()
                WHERE id = $10
            `, [inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, chunkCost, sessionCount, linesOfCode, commitCount, prCount, profile.id]);

            // Update individual sessions
            for (const [traceId, stats] of Object.entries(sessionStats)) {
                const cost = calculateCost(stats.model, { 
                    input: stats.input, 
                    output: stats.output, 
                    cache_read: stats.cacheRead, 
                    cache_write: stats.cacheCreation 
                });
                
                await db.query(`
                    INSERT INTO usage_sessions (id, user_id, model, project_name, total_input_tokens, total_output_tokens, total_cache_read, total_cache_write, total_cost, last_active, duration_ms, avg_latency_ms, command, lines_of_code, commit_count, pr_count, repository_name)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14, $15, $16)
                    ON CONFLICT (id) DO UPDATE SET 
                        project_name = EXCLUDED.project_name,
                        total_input_tokens = usage_sessions.total_input_tokens + EXCLUDED.total_input_tokens,
                        total_output_tokens = usage_sessions.total_output_tokens + EXCLUDED.total_output_tokens,
                        total_cache_read = usage_sessions.total_cache_read + EXCLUDED.total_cache_read,
                        total_cache_write = usage_sessions.total_cache_write + EXCLUDED.total_cache_write,
                        total_cost = usage_sessions.total_cost + EXCLUDED.total_cost,
                        duration_ms = usage_sessions.duration_ms + EXCLUDED.duration_ms,
                        avg_latency_ms = (usage_sessions.avg_latency_ms + EXCLUDED.avg_latency_ms) / 2,
                        command = COALESCE(EXCLUDED.command, usage_sessions.command),
                        lines_of_code = usage_sessions.lines_of_code + EXCLUDED.lines_of_code,
                        commit_count = usage_sessions.commit_count + EXCLUDED.commit_count,
                        pr_count = usage_sessions.pr_count + EXCLUDED.pr_count,
                        repository_name = COALESCE(EXCLUDED.repository_name, usage_sessions.repository_name),
                        last_active = NOW()
                `, [traceId, profile.id, stats.model, stats.projectName, stats.input, stats.output, stats.cacheRead, stats.cacheCreation, cost, stats.durationMs, stats.latencyMs, stats.command, stats.linesOfCode, stats.commitCount, stats.prCount, stats.repositoryName]);
            }

            // Calculate and Update Badges
            const { rows: updatedProfileRows } = await db.query('SELECT * FROM profiles WHERE id = $1', [profile.id]);
            const updatedProfile = updatedProfileRows[0];
            const { rows: toolStatsRows } = await db.query('SELECT tool_name, SUM(call_count) as call_count FROM tool_usage WHERE session_id IN (SELECT id FROM usage_sessions WHERE user_id = $1) GROUP BY tool_name', [profile.id]);
            const badges = calculateBadges(updatedProfile, toolStatsRows.map(r => ({ tool_name: r.tool_name, call_count: Number(r.call_count) })));
            
            await db.query('UPDATE profiles SET badges = $1 WHERE id = $2', [JSON.stringify(badges), profile.id]);
            const hourBucket = new Date();
            hourBucket.setMinutes(0, 0, 0); // Truncate to hour

            const allTokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
            const meta = JSON.stringify({ input: inputTokens, output: outputTokens, cache_read: cacheReadTokens, cache_write: cacheWriteTokens });
            try {
                await db.query(`
                    INSERT INTO usage_logs (user_id, token_count, metric_type, timestamp, hour_bucket, meta)
                    VALUES ($1, $2, 'aggregate', NOW(), $3, $4::jsonb)
                    ON CONFLICT (user_id, hour_bucket) WHERE metric_type = 'aggregate'
                    DO UPDATE SET 
                        token_count = usage_logs.token_count + EXCLUDED.token_count,
                        meta = jsonb_build_object(
                            'input', COALESCE((usage_logs.meta->>'input')::int, 0) + (EXCLUDED.meta->>'input')::int,
                            'output', COALESCE((usage_logs.meta->>'output')::int, 0) + (EXCLUDED.meta->>'output')::int,
                            'cache_read', COALESCE((usage_logs.meta->>'cache_read')::int, 0) + (EXCLUDED.meta->>'cache_read')::int,
                            'cache_write', COALESCE((usage_logs.meta->>'cache_write')::int, 0) + (EXCLUDED.meta->>'cache_write')::int
                        )
                `, [profile.id, allTokens, hourBucket, meta]);
                console.log('usage_logs INSERT successful');
            } catch (logErr: any) {
                console.error('usage_logs INSERT failed:', logErr.message);
            }
        }

        return NextResponse.json({ success: true, processed: totalTokens });
    } catch (e: any) {
        console.error('OTel metrics error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
