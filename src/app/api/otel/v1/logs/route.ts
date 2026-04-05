import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashApiKey, calculateCost } from '@/lib/utils';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        const twitterHandle = req.headers.get('X-Twitter-Handle');

        if (!authHeader || !twitterHandle) {
            return NextResponse.json({ error: 'Missing auth headers' }, { status: 401 });
        }

        const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
        const apiKeyHash = await hashApiKey(apiKey);
        const { rows } = await db.query(
            'SELECT id FROM profiles WHERE api_key_hash = $1',
            [apiKeyHash]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        const profile = rows[0];
        const body = await req.json();

        const resourceLogs = body.resourceLogs || [];
        for (const rl of resourceLogs) {
            const scopeLogs = rl.scopeLogs || [];
            for (const sl of scopeLogs) {
                const logRecords = sl.logRecords || [];
                for (const log of logRecords) {
                    const eventName = log.attributes?.find((a: any) => a.key === 'event.name')?.value?.stringValue;
                    
                    if (eventName === 'api_request') {
                        const traceId = log.traceId;
                        const model = log.attributes?.find((a: any) => a.key === 'model')?.value?.stringValue;
                        const toolName = log.attributes?.find((a: any) => a.key === 'tool_name')?.value?.stringValue;
                        const repoName = log.attributes?.find((a: any) => a.key === 'repository.name')?.value?.stringValue;

                        const input = Number(log.attributes?.find((a: any) => a.key === 'input_tokens')?.value?.intValue || 0);
                        const output = Number(log.attributes?.find((a: any) => a.key === 'output_tokens')?.value?.intValue || 0);
                        const cacheRead = Number(log.attributes?.find((a: any) => a.key === 'cache_read_tokens')?.value?.intValue || 0);
                        const cacheWrite = Number(log.attributes?.find((a: any) => a.key === 'cache_creation_tokens')?.value?.intValue || 0);
                        const latency = Number(log.attributes?.find((a: any) => a.key === 'latency_ms')?.value?.intValue || 0);
                        const isError = log.attributes?.find((a: any) => a.key === 'error')?.value?.stringValue === 'true' || !!log.attributes?.find((a: any) => a.key === 'error_message');

                        if (traceId && model) {
                            const cost = calculateCost(model, { input, output, cache_read: cacheRead, cache_write: cacheWrite });

                            // Update session total cost and metrics
                            await db.query(`
                                INSERT INTO usage_sessions (id, user_id, model, total_cost, last_active, avg_latency_ms, error_count, repository_name)
                                VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
                                ON CONFLICT (id) DO UPDATE SET 
                                    total_cost = usage_sessions.total_cost + EXCLUDED.total_cost,
                                    avg_latency_ms = (usage_sessions.avg_latency_ms + EXCLUDED.avg_latency_ms) / 2,
                                    error_count = usage_sessions.error_count + EXCLUDED.error_count,
                                    repository_name = COALESCE(EXCLUDED.repository_name, usage_sessions.repository_name),
                                    last_active = NOW()
                            `, [traceId, profile.id, model, cost, latency, isError ? 1 : 0, repoName]);


                            // If tool_name is present in the request log, update tool_usage tokens
                            if (toolName) {
                                await db.query(`
                                    INSERT INTO tool_usage (session_id, tool_name, input_tokens, output_tokens, cost, avg_latency_ms, error_count)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                                    ON CONFLICT (session_id, tool_name)
                                    DO UPDATE SET 
                                        input_tokens = tool_usage.input_tokens + EXCLUDED.input_tokens,
                                        output_tokens = tool_usage.output_tokens + EXCLUDED.output_tokens,
                                        cost = tool_usage.cost + EXCLUDED.cost,
                                        avg_latency_ms = (tool_usage.avg_latency_ms + EXCLUDED.avg_latency_ms) / 2,
                                        error_count = tool_usage.error_count + EXCLUDED.error_count
                                `, [traceId, toolName, input, output, cost, latency, isError ? 1 : 0]);
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('OTel logs error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
