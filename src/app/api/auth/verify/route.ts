import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashApiKey } from '@/lib/utils';

export async function POST(req: NextRequest) {
    try {
        const { api_key } = await req.json();
        if (!api_key) return NextResponse.json({ error: 'API Key required' }, { status: 400 });

        const hashedKey = await hashApiKey(api_key);

        const { rows } = await db.query(
            `SELECT username, twitter_handle FROM profiles WHERE api_key_hash = $1`,
            [hashedKey]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
        }

        const user = rows[0];
        return NextResponse.json({ 
            success: true, 
            handle: user.twitter_handle || user.username 
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
