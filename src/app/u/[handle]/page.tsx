'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCompactNumber } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Github } from 'lucide-react';
import { FloatingCode } from '@/components/FloatingCode';
import type { User } from '@supabase/supabase-js';

export default function UserProfilePage() {
    const params = useParams();
    const handle = params.handle as string;

    const [profile, setProfile] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);

    // Check authentication
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setCurrentUser(session?.user ?? null);
            setAuthLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!handle || authLoading) return;

        const fetchData = async () => {
            const decodedHandle = decodeURIComponent(handle);

            // Fetch Profile first to verify ownership via ID
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', decodedHandle)
                .single();

            if (data) {
                // Verify ownership by checking user ID match
                if (currentUser?.id !== data.id) {
                    setIsOwner(false);
                    return;
                }

                setIsOwner(true);
                setProfile(data);
            }

            if (data) {
                const { data: logs } = await supabase
                    .from('usage_logs')
                    .select('hour_bucket, token_count, meta')
                    .eq('user_id', data.id)
                    .eq('metric_type', 'aggregate')
                    .order('hour_bucket', { ascending: true })
                    .limit(48); // Last 48 hours

                if (logs) {
                    const mapped = logs.map(l => ({
                        time: new Date(l.hour_bucket).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit'
                        }),
                        input: l.meta?.input || 0,
                        output: l.meta?.output || 0,
                        cache_read: l.meta?.cache_read || 0,
                        cache_write: l.meta?.cache_write || 0,
                        total: l.token_count || 0
                    }));
                    setChartData(mapped);
                }
            }
        };

        fetchData();
    }, [handle, currentUser, authLoading]);

    // Loading state
    if (authLoading) {
        return <div className="min-h-screen bg-[#faf9f6] text-zinc-500 p-8 font-mono">Checking access...</div>;
    }

    // Not logged in
    if (!currentUser) {
        return (
            <main className="min-h-screen bg-[#faf9f6] grid place-items-center p-8 font-mono relative">
                <FloatingCode side="left" />
                <FloatingCode side="right" />
                <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm text-center max-w-md relative z-10">
                    <Lock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-zinc-900 mb-2">Login Required</h1>
                    <p className="text-zinc-500 mb-6">Please sign in to view your dashboard.</p>
                    <Link href="/auth/login" className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-all font-medium inline-block">
                        Sign In
                    </Link>
                </div>
            </main>
        );
    }

    // Not the owner
    if (!isOwner) {
        return (
            <main className="min-h-screen bg-[#faf9f6] grid place-items-center p-8 font-mono relative">
                <FloatingCode side="left" />
                <FloatingCode side="right" />
                <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm text-center max-w-md relative z-10">
                    <Lock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-zinc-900 mb-2">Access Denied</h1>
                    <p className="text-zinc-500 mb-6">You can only view your own dashboard.</p>
                    <Link href="/" className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-all font-medium inline-block">
                        Back to Leaderboard
                    </Link>
                </div>
            </main>
        );
    }

    // Loading profile data
    if (!profile) {
        return <div className="min-h-screen bg-[#faf9f6] text-zinc-500 p-8 font-mono">Loading profile data...</div>;
    }

    return (
        <main className="min-h-screen bg-[#faf9f6] text-zinc-800 font-mono p-4 md:p-8 relative selection:bg-[#EB5B39] selection:text-white">
            <FloatingCode side="left" />
            <FloatingCode side="right" />

            <div className="max-w-4xl mx-auto relative z-10 w-full">
                <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 uppercase text-xs tracking-widest font-bold transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Grid
                </Link>

                <header className="flex flex-col md:flex-row items-center gap-6 mb-12 border-b border-zinc-200 pb-8">
                    <div className="w-24 h-24 bg-white rounded-full border border-zinc-200 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.display_name} />
                        ) : (
                            <span className="text-4xl text-zinc-300 font-bold">{(profile.display_name || profile.twitter_handle)?.[0]}</span>
                        )}
                    </div>
                    <div className="text-center md:text-left flex-1 min-w-0">
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                            <h1 className="text-4xl font-bold text-zinc-900 truncate">{profile.display_name || profile.github_handle || profile.twitter_handle}</h1>

                            {/* Social Icons */}
                            <div className="flex items-center gap-2">
                                {profile.twitter_handle && profile.twitter_handle.indexOf('@') === -1 && (
                                    <a
                                        href={`https://x.com/${profile.twitter_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-black transition-all duration-200 group/icon shadow-sm hover:shadow-md ring-1 ring-zinc-200/50 hover:ring-black"
                                        title="View on X"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    </a>
                                )}

                                {profile.github_handle && (
                                    <a
                                        href={`https://github.com/${profile.github_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-[#24292e] transition-all duration-200 group/icon shadow-sm hover:shadow-md ring-1 ring-zinc-200/50 hover:ring-[#24292e]"
                                        title="View on GitHub"
                                    >
                                        <Github className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>

                        <p className="text-xl text-zinc-500 font-medium mb-2">@{profile.username || profile.twitter_handle || profile.display_name}</p>
                        <p className="text-zinc-400 text-sm">Dashboard &bull; Last active {new Date(profile.last_active).toLocaleDateString()}</p>
                    </div>
                </header>

                {/* Stats Table */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm mb-8">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-400 mb-6 font-bold">Token Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                            <span className="block text-[#EB5B39] font-bold text-2xl mb-1">{formatCompactNumber(profile.total_tokens || 0)}</span>
                            <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Total (Rank)</span>
                        </div>
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                            <span className="block text-orange-600 font-bold text-2xl mb-1">{formatCompactNumber(profile.input_tokens || 0)}</span>
                            <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Input</span>
                        </div>
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                            <span className="block text-orange-400 font-bold text-2xl mb-1">{formatCompactNumber(profile.output_tokens || 0)}</span>
                            <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Output</span>
                        </div>
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                            <span className="block text-emerald-600 font-bold text-2xl mb-1">{formatCompactNumber(profile.cache_read_tokens || 0)}</span>
                            <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Cache Read</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100">
                            <span className="block text-blue-600 font-bold text-2xl mb-1">{formatCompactNumber(profile.cache_write_tokens || 0)}</span>
                            <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Cache Write</span>
                        </div>
                        <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-100 col-span-1 md:col-span-3">
                            <span className="block text-zinc-700 font-bold text-2xl mb-1">
                                {profile.input_tokens + profile.cache_read_tokens > 0
                                    ? Math.round((profile.cache_read_tokens / (profile.input_tokens + profile.cache_read_tokens)) * 100)
                                    : 0}%
                            </span>
                            <span className="text-xs uppercase tracking-widest text-zinc-500 font-medium">Cache Efficiency</span>
                        </div>
                    </div>
                </div>

                {/* Line Chart */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-xs uppercase tracking-widest text-zinc-400 mb-6 font-bold">Hourly Token Usage (Last 48h)</h3>
                    {chartData.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-zinc-400">
                            No usage data yet. Start using Claude Code to see your stats!
                        </div>
                    ) : (
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <XAxis
                                        dataKey="time"
                                        stroke="#a1a1aa"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        stroke="#a1a1aa"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => formatCompactNumber(value)}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            borderColor: '#e4e4e7',
                                            color: '#18181b',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                        }}
                                        formatter={(value: number | undefined) => {
                                            if (value === undefined) return '0';
                                            return formatCompactNumber(value);
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="input"
                                        name="Input"
                                        stroke="#ea580c"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="output"
                                        name="Output"
                                        stroke="#fdba74"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cache_read"
                                        name="Cache Read"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cache_write"
                                        name="Cache Write"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
