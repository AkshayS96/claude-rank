import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashApiKey } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// POST: Generate a new device code (Public)
export async function POST() {
    try {
        const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        console.log('Creating device code:', code);

        const { error } = await supabase
            .from('device_codes')
            .insert({ code, expires_at: expiresAt });

        if (error) {
            console.error('Device code DB error:', error);
            return NextResponse.json({ error: 'Failed to generate code: ' + error.message }, { status: 500 });
        }

        return NextResponse.json({
            device_code: code,
            verification_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/device`,
            expires_in: 600,
            interval: 5
        });
    } catch (e: any) {
        console.error('Device code error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PUT: Verify a device code (Authenticated)
export async function PUT(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Missing token' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');

        const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        const { data: { user }, error: authError } = await client.auth.getUser();
        if (authError || !user) {
            console.error('Auth error:', authError);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const body = await req.json();
        const code = body?.code;
        if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

        console.log('Verifying device code:', code, 'for user:', user.id);

        // Generate NEW API Key for the user (Resetting old one)
        const apiKey = 'sk_airank_' + crypto.randomBytes(16).toString('hex');
        const apiKeyHash = await hashApiKey(apiKey);

        // Upsert profile (create if doesn't exist, update if it does)
        // Note: we don't set username/handles here, the trigger handles that
        const { error: lbError } = await client
            .from('profiles')
            .upsert({
                id: user.id,
                api_key_hash: apiKeyHash,
                avatar_url: user.user_metadata?.avatar_url,
                last_active: new Date().toISOString()
            }, { onConflict: 'id' });

        if (lbError) {
            console.error('Profile upsert error:', lbError);
            return NextResponse.json({ error: 'Failed to update profile: ' + lbError.message }, { status: 500 });
        }

        // Update Device Code
        const { error: dcError } = await client
            .from('device_codes')
            .update({
                verified: true,
                user_id: user.id,
                temp_api_key: apiKey
            })
            .eq('code', code);

        if (dcError) {
            console.error('Device code update error:', dcError);
            return NextResponse.json({ error: 'Failed to verify code: ' + dcError.message }, { status: 500 });
        }

        console.log('Device verified successfully for user:', user.id);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('PUT device error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// GET: Poll for status (Public)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Code required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('device_codes')
        // Join with profiles to get handle
        .select('verified, user_id, temp_api_key, profiles(username)')
        .eq('code', code)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
    }

    if (data.verified) {
        return NextResponse.json({
            status: 'complete',
            // @ts-ignore
            twitter_handle: data.profiles?.username,
            api_key: data.temp_api_key
        });
    }

    return NextResponse.json({ status: 'pending' });
}
