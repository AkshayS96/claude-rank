'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Authenticating...');

    useEffect(() => {
        const handleAuth = async () => {
            // Supabase client handles the code exchange automatically if it detects 'code' in URL
            // and we access getSession().
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                setStatus('Authentication failed: ' + error.message);
                return;
            }

            if (!session) {
                // Sometimes the code exchange takes a moment or needs explicit handling if autoRefreshToken is off
                // But typically on redirect back, the URL contains the code.
                // We might need to exchange it manually if we were using 'api' route before,
                // but for client-side redirect, supabase-js should pick it up.
                // Let's try explicit exchange if session is null but code exists?
                // Actually, let's just listen for the state change.
                return;
            }

            // Redirect to dashboard/home
            const params = new URLSearchParams(window.location.search);
            const next = params.get('next') || '/';
            router.push(next);
        };

        // We can also subscribe to auth state changes which might fire after code exchange
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                handleAuth();
            }
        });

        // Initial check in case we are already handled
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) handleAuth();
        });

        return () => subscription.unsubscribe();
    }, [router]);

    return (
        <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center text-zinc-900 relative overflow-hidden">
            <div className="w-full h-full absolute top-0 left-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="relative z-10 flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#EB5B39] mb-4" />
                <p className="text-zinc-500 font-mono text-sm">{status}</p>
            </div>
        </div>
    );
}
