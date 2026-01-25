'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Terminal, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { FloatingCode } from '@/components/FloatingCode';

function DeviceAuthContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Auto-fill from URL if present
    useEffect(() => {
        const codeParam = searchParams.get('user_code');
        if (codeParam) setCode(codeParam);

        // Check auth status
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [searchParams]);

    const handleLogin = async () => {
        setLoading(true);
        // Redirect back here after login
        const next = `/auth/device?user_code=${code}`;
        await supabase.auth.signInWithOAuth({
            provider: 'x',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
            }
        });
    };

    const handleVerify = async () => {
        if (!code || code.length !== 6) return;
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("Please sign in first");
                setLoading(false);
                return;
            }

            const res = await fetch('/api/auth/device', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ code })
            });

            const data = await res.json();

            if (data.success) {
                alert("Device Verified! check your terminal.");
                router.push('/');
            } else {
                alert("Error: " + (data.error || 'Verification failed'));
                setLoading(false);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-zinc-200 shadow-xl relative z-10">
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center border border-orange-100">
                    <Lock className="w-6 h-6 text-[#EB5B39]" />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 mb-2">Connect Device</h1>
                    <p className="text-zinc-500 text-sm">
                        Enter the 6-character code displayed in your terminal to authenticate.
                    </p>
                </div>

                <div className="space-y-4 w-full">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="XXXXXX"
                        maxLength={6}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-4 text-center text-3xl font-mono tracking-[0.5em] text-zinc-900 focus:outline-none focus:border-[#EB5B39] focus:ring-1 focus:ring-orange-200 transition-all uppercase placeholder-zinc-300"
                    />

                    {user ? (
                        <div className="space-y-3">
                            <p className="text-sm text-zinc-600 bg-zinc-50 py-2 rounded">
                                Signed in as <span className="font-bold text-zinc-900">{user.user_metadata?.preferred_username || user.email}</span>
                            </p>
                            <button
                                onClick={handleVerify}
                                disabled={loading || code.length !== 6}
                                className="w-full py-3 bg-[#EB5B39] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-md hover:shadow-lg"
                            >
                                {loading ? 'Verifying...' : 'Authorize Device'}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-all shadow-md"
                        >
                            Sign in to Authorize
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DeviceAuthPage() {
    return (
        <main className="min-h-screen bg-[#faf9f6] grid place-items-center p-4 relative overflow-hidden">
            <FloatingCode side="left" />
            <FloatingCode side="right" />

            <Suspense fallback={<div className="text-zinc-500">Loading...</div>}>
                <DeviceAuthContent />
            </Suspense>
        </main>
    )
}
