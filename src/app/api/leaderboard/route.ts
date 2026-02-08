import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LeaderboardUser } from '@/lib/types';

export const revalidate = 30; // 30s cache

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        const { rows } = await db.query(`
        SELECT id, username, twitter_handle, github_handle, avatar_url, provider, display_name, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_tokens, last_active, created_at
        FROM profiles
        ORDER BY total_tokens DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

        const users: LeaderboardUser[] = rows.map((row: any, i: number) => {
            const input = Number(row.input_tokens);
            const output = Number(row.output_tokens);
            const cacheRead = Number(row.cache_read_tokens);
            const cacheWrite = Number(row.cache_write_tokens);
            const total = Number(row.total_tokens); // input + output (for ranking)
            const totalInput = input + cacheRead;
            const savingsScore = totalInput > 0 ? (cacheRead / totalInput) * 100 : 0;

            return {
                ...row,
                input_tokens: input,
                output_tokens: output,
                cache_read_tokens: cacheRead,
                cache_write_tokens: cacheWrite,
                total_tokens: total,
                savings_score: savingsScore,
                rank: offset + i + 1
            };
        });

        // Only fetch heavy stats on first page load
        let stats = {};
        if (page === 1) {
            // Calculate 24h stats and Peak T/s
            const { rows: statsRows } = await db.query(`
                SELECT 
                    hour_bucket,
                    SUM(token_count) as total_tokens,
                    COUNT(DISTINCT user_id) as active_users
                FROM usage_logs
                WHERE metric_type = 'aggregate' 
                AND hour_bucket >= NOW() - INTERVAL '24 hours'
                GROUP BY hour_bucket
                ORDER BY hour_bucket DESC
            `);

            const { rows: peakRows } = await db.query(`
                 SELECT SUM(token_count) as total FROM usage_logs 
                 WHERE metric_type = 'aggregate' 
                 GROUP BY hour_bucket 
                 ORDER BY total DESC LIMIT 1
            `);
            const peakThroughput = peakRows.length > 0 ? Math.round(Number(peakRows[0].total) / 3600) : 0;

            const last24hTokens = statsRows.reduce((acc, row) => acc + Number(row.total_tokens), 0);

            const { rows: activeUsersRows } = await db.query(`
                SELECT COUNT(DISTINCT user_id) as count 
                FROM usage_logs 
                WHERE timestamp >= NOW() - INTERVAL '24 hours'
            `);
            const activeUsers24h = Number(activeUsersRows[0]?.count || 0);

            const graphData = statsRows
                .map(row => ({
                    time: row.hour_bucket,
                    tokens: Number(row.total_tokens),
                    active_users: Number(row.active_users)
                }))
                .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

            stats = {
                peak_throughput: peakThroughput,
                last_24h_tokens: last24hTokens,
                active_users_24h: activeUsers24h,
                graph_data: graphData
            };
        }

        return NextResponse.json({
            users,
            stats
        });
    } catch (e: any) {
        console.log(e)
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
