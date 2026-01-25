import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import { hashApiKey } from '@/lib/utils';

// Initialize Supabase Admin client (Service Role)
// Initialize Supabase Admin client (Service Role)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Extract Resource Attributes
        const resourceMetrics = body.resourceMetrics || []; // OTLP JSON format usually has this
        if (!resourceMetrics.length) return NextResponse.json({ processed: 0 });

        const firstResource = resourceMetrics[0].resource;
        const attributes = firstResource.attributes || [];

        let twitterHandle = '';
        let apiKey = '';

        for (const attr of attributes) {
            if (attr.key === 'twitter_handle') twitterHandle = attr.value.stringValue;
            if (attr.key === 'cr_api_key') apiKey = attr.value.stringValue; // Updated to cr_api_key
        }

        // 2. Validate Credentials
        if (!twitterHandle || !apiKey) {
            // Some spans might be internal? But for this agent, we expect them.
            return NextResponse.json({ error: 'Missing Resource Attributes' }, { status: 401 });
        }

        // Ideally verify key against DB. For speed we might cache valid keys in Redis?
        // Let's do a quick DB check.
        // We need the user ID for usage_logs.

        // Hash incoming key
        const hashedKey = await hashApiKey(apiKey);

        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, api_key_hash')
            .eq('twitter_handle', twitterHandle.replace('@', '')) // Handle @ or not
            .single();

        if (userError || !user || user.api_key_hash !== hashedKey) {
            console.warn(`Invalid auth for ${twitterHandle}`);
            return NextResponse.json({ error: 'Invalid Credentials' }, { status: 403 });
        }

        const userId = user.id;

        // 3. Process Metrics
        let totalTokens = 0;
        let inputTokens = 0;
        let outputTokens = 0;
        let cacheTokens = 0;

        // We'll iterate and sum up.
        // OTLP structure: resourceMetrics -> scopeMetrics -> metrics -> dataPoints
        for (const rm of resourceMetrics) {
            for (const sm of rm.scopeMetrics || []) {
                for (const metric of sm.metrics || []) {
                    // We look for 'claude_code.token.usage' ideally, or we parse from span attributes if using Traces?
                    // The prompt said: "Logic: Listen for the metric claude_code.token.usage".

                    if (metric.name === 'claude_code.token.usage') {
                        // Sum data points
                        for (const dp of metric.sum?.dataPoints || []) {
                            const val = dp.asInt || 0;
                            // We need to know which type it is. 
                            // Attributes on the data point?
                            const typeAttr = dp.attributes?.find((a: any) => a.key === 'token_type');
                            const type = typeAttr?.value?.stringValue;

                            if (type === 'input') inputTokens += val;
                            else if (type === 'output') outputTokens += val;
                            else if (type === 'cache_read') cacheTokens += val;

                            totalTokens += val;
                        }
                    }
                }
            }
        }

        if (totalTokens === 0) {
            return NextResponse.json({ processed: 0, reason: 'No tokens found' });
        }

        const now = Date.now();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const currentWeek = getWeekNumber(new Date());

        // 4. Redis Aggregation (ZINCRBY)
        const pipeline = redis.pipeline();

        // Rank: All Time
        pipeline.zincrby('rank:all_time', totalTokens, twitterHandle);

        // Rank: Daily
        pipeline.zincrby(`rank:daily:${today}`, totalTokens, twitterHandle);

        // Rank: Weekly
        pipeline.zincrby(`rank:weekly:${currentWeek}`, totalTokens, twitterHandle);

        // Update User Details (Optional, for fast retrieval)
        pipeline.hincrby(`user:${twitterHandle}`, 'total_tokens', totalTokens);

        await pipeline.exec();

        // 5. Postgres Persistence (Async/Await but fast)
        // Update User Profile totals
        await supabase.rpc('increment_tokens', {
            target_user_id: userId,
            inc_input: inputTokens,
            inc_output: outputTokens,
            inc_cache: cacheTokens
        });

        // Insert Log
        await supabase.from('usage_logs').insert({
            user_id: userId,
            twitter_handle: twitterHandle,
            token_count: totalTokens,
            metric_type: 'mixed', // Simplified logging
            meta: { input: inputTokens, output: outputTokens, cache: cacheTokens }
        });

        return NextResponse.json({ success: true, tokens: totalTokens });

    } catch (e: any) {
        console.error('Ingest Error', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

function getWeekNumber(d: Date) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
}
