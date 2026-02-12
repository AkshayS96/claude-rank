'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Terminal, Lock, Github, Twitter } from 'lucide-react';
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

    const handleLogin = async (provider: 'twitter' | 'github' | 'google') => {
        setLoading(true);
        // Redirect back here after login
        const next = `/auth/device?user_code=${code}`;
        await supabase.auth.signInWithOAuth({
            provider: provider === 'twitter' ? 'x' : provider,
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
                        <div className="space-y-3">
                            <button
                                onClick={() => handleLogin('twitter')}
                                disabled={loading}
                                className="flex items-center gap-3 px-6 py-3 bg-black hover:bg-zinc-800 text-white rounded-lg font-medium transition-all w-full justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            >
                                <Twitter className="w-5 h-5" fill="currentColor" />
                                Sign in with X
                            </button>
                            <button
                                onClick={() => handleLogin('github')}
                                disabled={loading}
                                className="flex items-center gap-3 px-6 py-3 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-lg font-medium transition-all w-full justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            >
                                <Github className="w-5 h-5" />
                                Sign in with GitHub
                            </button>
                            <button
                                onClick={() => handleLogin('google')}
                                disabled={loading}
                                className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 rounded-lg font-medium transition-all w-full justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.21.81-.63z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Sign in with Google
                            </button>
                        </div>
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
