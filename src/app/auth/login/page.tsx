'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Twitter, Terminal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FloatingCode } from '@/components/FloatingCode';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'x',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                alert('Error logging in: ' + error.message);
                setLoading(false);
            }
        } catch (e: any) {
            alert('Login failed: ' + e.message);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-4 relative overflow-hidden">
            <FloatingCode side="left" />
            <FloatingCode side="right" />

            <div className="max-w-md w-full bg-white p-8 rounded-xl border border-zinc-200 shadow-xl relative z-10">
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#EB5B39] rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 text-white">
                        <Terminal className="w-8 h-8" />
                    </div>

                    <h1 className="text-3xl font-bold text-zinc-900 mb-2">Welcome to Claude Rank</h1>
                    <p className="text-zinc-500 mb-8">Sign in to sync your CLI with the global leaderboard.</p>

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="flex items-center gap-3 px-6 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-all w-full justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        {loading ? 'Connecting...' : (
                            <>
                                <Twitter className="w-5 h-5" fill="currentColor" />
                                Sign in with X
                            </>
                        )}
                    </button>

                    <p className="mt-6 text-xs text-zinc-400">
                        Join high-velocity engineering teams tracking their AI usage.
                    </p>
                </div>
            </div>
        </main>
    );
}
