import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashApiKey } from '@/lib/utils';

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

        const apiKey = authHeader.replace('Bearer ', '');

        // Parse OTLP metrics payload
        const body = await req.json();
        console.log('Received OTel metrics:', JSON.stringify(body).slice(0, 500));

        // Validate API key against stored hash
        const apiKeyHash = await hashApiKey(apiKey);
        const { rows } = await db.query(
            'SELECT id, twitter_handle FROM profiles WHERE api_key_hash = $1',
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

        for (const rm of resourceMetrics) {
            const scopeMetrics = rm.scopeMetrics || [];
            for (const sm of scopeMetrics) {
                const metrics = sm.metrics || [];
                for (const metric of metrics) {
                    if (metric.name === 'claude_code.token.usage') {
                        // Sum type metric has dataPoints
                        const dataPoints = metric.sum?.dataPoints || [];
                        for (const dp of dataPoints) {
                            const tokenType = dp.attributes?.find((a: any) => a.key === 'type')?.value?.stringValue;
                            const value = Number(dp.asInt || dp.asDouble || 0);

                            switch (tokenType) {
                                case 'input':
                                    inputTokens += value;
                                    break;
                                case 'output':
                                    outputTokens += value;
                                    break;
                                case 'cacheRead':
                                    cacheReadTokens += value;
                                    break;
                                case 'cacheCreation':
                                    cacheWriteTokens += value;
                                    break;
                            }
                        }
                    }
                }
            }
        }

        const totalTokens = inputTokens + outputTokens; // For ranking: actual API work
        // Update profile with new token counts (atomic increment)
        // Note: total_tokens is a generated column = input + output
        if (totalTokens > 0 || cacheReadTokens > 0 || cacheWriteTokens > 0) {
            await db.query(`
                UPDATE profiles 
                SET 
                    input_tokens = COALESCE(input_tokens, 0) + $1,
                    output_tokens = COALESCE(output_tokens, 0) + $2,
                    cache_read_tokens = COALESCE(cache_read_tokens, 0) + $3,
                    cache_write_tokens = COALESCE(cache_write_tokens, 0) + $4,
                    last_active = NOW()
                WHERE id = $5
            `, [inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, profile.id]);

            // Insert/update hourly usage log for activity chart (1 row per user per hour)
            const hourBucket = new Date();
            hourBucket.setMinutes(0, 0, 0); // Truncate to hour

            const allTokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
            const meta = JSON.stringify({ input: inputTokens, output: outputTokens, cache_read: cacheReadTokens, cache_write: cacheWriteTokens });
            try {
                await db.query(`
                    INSERT INTO usage_logs (user_id, twitter_handle, token_count, metric_type, timestamp, hour_bucket, meta)
                    VALUES ($1, $2, $3, 'aggregate', NOW(), $4, $5::jsonb)
                    ON CONFLICT (user_id, hour_bucket) WHERE metric_type = 'aggregate'
                    DO UPDATE SET 
                        token_count = usage_logs.token_count + EXCLUDED.token_count,
                        meta = jsonb_build_object(
                            'input', COALESCE((usage_logs.meta->>'input')::int, 0) + (EXCLUDED.meta->>'input')::int,
                            'output', COALESCE((usage_logs.meta->>'output')::int, 0) + (EXCLUDED.meta->>'output')::int,
                            'cache_read', COALESCE((usage_logs.meta->>'cache_read')::int, 0) + (EXCLUDED.meta->>'cache_read')::int,
                            'cache_write', COALESCE((usage_logs.meta->>'cache_write')::int, 0) + (EXCLUDED.meta->>'cache_write')::int
                        )
                `, [profile.id, profile.twitter_handle, allTokens, hourBucket, meta]);
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
