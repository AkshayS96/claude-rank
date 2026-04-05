'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCompactNumber, formatCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Github, Shield, ShieldOff, LayoutDashboard, Activity, Clock } from 'lucide-react';
import { FloatingCode } from '@/components/FloatingCode';
import SessionAnalytics from '@/components/SessionAnalytics';
import BadgeDisplay from '@/components/BadgeDisplay';
import type { User } from '@supabase/supabase-js';

export default function UserProfilePage() {
    const params = useParams();
    const handle = params.handle as string;

    const [profile, setProfile] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [updating, setUpdating] = useState(false);

    const togglePrivacy = async () => {
        if (!profile || updating) return;
        setUpdating(true);
        const nextValue = !profile.is_public;
        
        const { error } = await supabase
            .from('profiles')
            .update({ is_public: nextValue })
            .eq('id', profile.id);

        if (!error) {
            setProfile({ ...profile, is_public: nextValue });
        }
        setUpdating(false);
    };

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
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', decodedHandle)
                .single();

            if (data) {
                if (currentUser?.id !== data.id) {
                    setIsOwner(false);
                    return;
                }
                setIsOwner(true);
                setProfile(data);

                const { data: logs } = await supabase
                    .from('usage_logs')
                    .select('hour_bucket, token_count, meta')
                    .eq('user_id', data.id)
                    .eq('metric_type', 'aggregate')
                    .order('hour_bucket', { ascending: true })
                    .limit(48);

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

    if (authLoading) {
        return <div className="min-h-screen bg-slate-50 text-slate-400 p-8 font-mono animate-pulse flex items-center justify-center">Authenticating...</div>;
    }

    if (!currentUser) {
        return (
            <main className="min-h-screen bg-slate-50 grid place-items-center p-8 font-mono relative">
                <FloatingCode side="left" />
                <FloatingCode side="right" />
                <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-xl text-center max-w-md relative z-10">
                    <Lock className="w-16 h-12 text-slate-200 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h1>
                    <p className="text-slate-500 mb-8">Please sign in to view your detailed analytics.</p>
                    <Link href="/auth/login" className="px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-all font-bold block shadow-lg shadow-indigo-500/20">
                        Sign In to Network
                    </Link>
                </div>
            </main>
        );
    }

    if (!isOwner) {
        return (
            <main className="min-h-screen bg-slate-50 grid place-items-center p-8 font-mono relative">
                <FloatingCode side="left" />
                <FloatingCode side="right" />
                <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-xl text-center max-w-md relative z-10">
                    <Shield className="w-16 h-12 text-slate-200 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Private Dashboard</h1>
                    <p className="text-slate-500 mb-8">You can only access your own telemetry data.</p>
                    <Link href="/u/me" className="px-8 py-4 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all font-bold block">
                        Back to Public Grid
                    </Link>
                </div>
            </main>
        );
    }

    if (!profile) {
        return <div className="min-h-screen bg-slate-50 text-slate-400 p-8 font-mono flex items-center justify-center italic">Node not found in registry...</div>;
    }

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 font-mono p-4 md:p-8 relative selection:bg-indigo-600 selection:text-white">
            <FloatingCode side="left" />
            <FloatingCode side="right" />

            <div className="max-w-5xl mx-auto relative z-10 w-full">
                <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-10 uppercase text-[10px] tracking-[0.2em] font-black transition-colors group">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Return to Network
                </Link>

                <header className="flex flex-col md:flex-row items-center gap-8 mb-12 border-b border-slate-200 pb-10">
                    <div className="w-28 h-28 bg-white rounded-3xl border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0 p-1">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover rounded-2xl" alt={profile.display_name} />
                        ) : (
                            <span className="text-5xl text-slate-200 font-black">{(profile.display_name || profile.twitter_handle)?.[0]}</span>
                        )}
                    </div>
                    <div className="text-center md:text-left flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-4 mb-3">
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 truncate tracking-tight">{profile.display_name || profile.github_handle || profile.twitter_handle}</h1>

                            <div className="flex items-center justify-center gap-2">
                                {profile.twitter_handle && (
                                    <a
                                        href={`https://x.com/${profile.twitter_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all shadow-sm"
                                        title="View on X"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    </a>
                                )}

                                {profile.github_handle && (
                                    <a
                                        href={`https://github.com/${profile.github_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all shadow-sm"
                                        title="View on GitHub"
                                    >
                                        <Github className="w-4 h-4" />
                                    </a>
                                )}
                                
                                <button 
                                    onClick={togglePrivacy}
                                    disabled={updating}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                        profile.is_public 
                                        ? 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100' 
                                        : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200'
                                    }`}
                                >
                                    {profile.is_public ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                                    {profile.is_public ? 'Public' : 'Private'}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-5">
                            <p className="text-xl text-slate-400 font-medium font-mono">@{profile.username || profile.twitter_handle}</p>
                            <div className="hidden md:block w-1.5 h-1.5 bg-slate-200 rounded-full" />
                            <p className="text-slate-400 text-sm font-bold flex items-center gap-2">
                                <LayoutDashboard className="w-4 h-4" /> Node Dashboard
                            </p>
                        </div>
                        
                        <BadgeDisplay badges={profile.badges || []} />
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <StatBox label="Aggregate Load" value={formatCompactNumber(profile.total_tokens || 0)} color="indigo" />
                    <StatBox label="Lifetime Cost" value={formatCurrency(profile.total_cost || 0)} color="indigo" />
                    <StatBox label="Top Model" value="Sonnet 3.7" color="slate" />
                    <StatBox label="Total Input" value={formatCompactNumber(profile.input_tokens || 0)} color="slate" />
                    <StatBox label="Total Output" value={formatCompactNumber(profile.output_tokens || 0)} color="slate" />
                    <StatBox label="Cache Savings" value={formatCompactNumber(profile.cache_read_tokens || 0)} color="emerald" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <ProductivityBox label="Lines Changed" value={formatCompactNumber(profile.total_lines_changed || 0)} icon={<Activity className="w-4 h-4" />} />
                    <ProductivityBox label="Commits" value={String(profile.total_commits || 0)} icon={<Github className="w-4 h-4" />} />
                    <ProductivityBox label="Pull Requests" value={String(profile.total_prs || 0)} icon={<LayoutDashboard className="w-4 h-4" />} />
                    <ProductivityBox label="Sessions" value={String(profile.total_sessions || 0)} icon={<Clock className="w-4 h-4" />} />
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm mb-10">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-black">Temporal Load Analysis</h3>
                        <span className="text-[10px] font-mono text-slate-300">48 Hour Window</span>
                    </div>
                    {chartData.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-300 italic border-2 border-dashed border-slate-100 rounded-xl">
                            <Activity className="w-8 h-8 mb-2 opacity-20" />
                            No telemetry detected
                        </div>
                    ) : (
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <XAxis
                                        dataKey="time"
                                        stroke="#cbd5e1"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        stroke="#cbd5e1"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => formatCompactNumber(value)}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            borderColor: '#f1f5f9',
                                            color: '#1e293b',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            border: '1px solid #f1f5f9'
                                        }}
                                        formatter={(value: number | undefined) => [formatCompactNumber(value || 0), '']}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                                    <Line type="monotone" dataKey="input" name="Input" stroke="#6366f1" strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="output" name="Output" stroke="#94a3b8" strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="cache_read" name="Cache" stroke="#10b981" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <SessionAnalytics userId={profile.id} />
            </div>
        </main>
    );
}

function StatBox({ label, value, color }: { label: string, value: string, color: 'indigo' | 'emerald' | 'slate' }) {
    const colors = {
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        slate: 'text-slate-600 bg-slate-50 border-slate-100'
    };
    
    return (
        <div className={`p-6 border rounded-2xl transition-all hover:scale-[1.02] hover:shadow-md ${colors[color]}`}>
            <span className="block font-black text-3xl mb-1 tracking-tighter">{value}</span>
            <span className="text-[10px] uppercase tracking-widest font-black opacity-60">{label}</span>
        </div>
    );
}

function ProductivityBox({ label, value, icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="p-4 border border-slate-200 bg-white rounded-2xl flex items-center gap-4 transition-all hover:shadow-sm">
            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
                {icon}
            </div>
            <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">{label}</div>
                <div className="text-xl font-black text-slate-900">{value}</div>
            </div>
        </div>
    );
}
