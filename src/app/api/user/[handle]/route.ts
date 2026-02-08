import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LeaderboardUser } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: Promise<any> }) {
    const { handle } = await params;

    try {
        const { rows } = await db.query(
            `SELECT id, username, twitter_handle, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_tokens, last_active, created_at FROM profiles WHERE username = $1`,
            [handle]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = rows[0];
        const input = Number(user.input_tokens);
        const output = Number(user.output_tokens);
        const cacheRead = Number(user.cache_read_tokens);
        const cacheWrite = Number(user.cache_write_tokens);
        const total = Number(user.total_tokens); // input + output (for ranking)
        const totalInput = input + cacheRead; // Tokens that could be input
        const savingsScore = totalInput > 0 ? (cacheRead / totalInput) * 100 : 0;

        // Get Rank: Count users with more tokens
        const result = await db.query(
            `SELECT count(*) as rank_above FROM profiles WHERE total_tokens > $1`,
            [total]
        );
        const rankAbove = Number(result.rows[0].rank_above);

        const response: LeaderboardUser = {
            ...user,
            input_tokens: input,
            output_tokens: output,
            cache_read_tokens: cacheRead,
            cache_write_tokens: cacheWrite,
            total_tokens: total,
            savings_score: savingsScore,
            rank: rankAbove + 1
        };

        return NextResponse.json(response);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
