'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Terminal, Cpu, Zap, Activity, BarChart3, TrendingUp, Github, LogOut, ChevronRight } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { FloatingCode } from '@/components/FloatingCode';
import BadgeDisplay from '@/components/BadgeDisplay';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  username: string;
  twitter_handle?: string;
  avatar_url: string;
  provider?: string;
  github_handle?: string;
  display_name?: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  last_active: string;
  badges?: string[];
}

interface Stats {
  peak_throughput: number;
  last_24h_tokens?: number;
  active_users_24h?: number;
  graph_data?: any[];
}

export default function LeaderboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({ peak_throughput: 0 });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [githubStars, setGithubStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/AkshayS96/claude-rank')
      .then(res => res.json())
      .then(data => {
        if (data.stargazers_count) {
          setGithubStars(data.stargazers_count);
        }
      })
      .catch(err => console.error('Failed to fetch github stars', err));
  }, []);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setMyProfile(data);
        });
    }
  }, [user]);

  const fetchLeaderboard = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(`/api/leaderboard?page=${pageNum}&limit=50`, { cache: 'no-store' });
      const data = await res.json();

      if (pageNum === 1) {
        if (data.users) setProfiles(data.users);
        if (data.stats) setStats(data.stats);
      } else {
        if (data.users) {
          setProfiles(prev => {
            const newIds = new Set(data.users.map((u: Profile) => u.id));
            return [...prev.filter(p => !newIds.has(p.id)), ...data.users];
          });
        }
      }
      if (!data.users || data.users.length < 50) setHasMore(false);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    } finally {
      if (pageNum === 1) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(1);
  }, []);

  useEffect(() => {
    if (!user) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        setPage(prev => {
          const nextPage = prev + 1;
          fetchLeaderboard(nextPage);
          return nextPage;
        });
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [user, hasMore, loadingMore, loading]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-mono p-4 md:p-8 relative selection:bg-indigo-600 selection:text-white">
      <FloatingCode side="left" />
      <FloatingCode side="right" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 border-b border-slate-200 pb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                <Terminal className="w-6 h-6" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
                Crank
              </h1>
            </div>

            <div className="flex items-center gap-3 self-start">
              <a
                href="https://github.com/AkshayS96/crank"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300 rounded-xl transition-all font-bold border border-slate-200 flex items-center gap-2 text-sm shadow-sm"
              >
                <Github className="w-4 h-4" />
                {githubStars !== null ? (
                  <>
                    <span>Star</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs font-mono ml-1">{formatCompactNumber(githubStars)}</span>
                  </>
                ) : (
                  'Star'
                )}
              </a>

              {user ? (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-100 rounded-xl transition-all font-bold text-sm flex items-center gap-2 shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <Link href="/auth/login" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 rounded-xl transition-all font-bold text-sm shadow-sm">
                  Login
                </Link>
              )}
            </div>
          </div>

          <p className="text-slate-500 text-lg max-w-2xl mb-8 leading-relaxed">
            Global telemetry for high-velocity engineering teams.
            Tracking <span className="text-indigo-600 font-bold">{profiles.reduce((acc, p) => acc + (p.total_tokens || 0), 0).toLocaleString()}</span> tokens shipped.
          </p>

          <div className="flex flex-wrap gap-4">
            {authLoading ? (
              <div className="px-6 py-3 bg-white text-slate-400 rounded-xl font-bold border border-slate-100 animate-pulse shadow-sm">
                Scanning...
              </div>
            ) : user ? (
              <>
                <Link href={`/u/${myProfile?.username || myProfile?.twitter_handle || user.user_metadata?.preferred_username}`} className="px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl transition-all font-bold shadow-xl shadow-indigo-500/20 flex items-center gap-2">
                  My Dashboard <ChevronRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => {
                    const myProfile = profiles.find(p => p.id === user.id);
                    if (!myProfile) return;
                    const rank = profiles.findIndex(p => p.id === user.id) + 1;
                    const text = `I'm ranked #${rank} on Crank ⚡️\n\nTotal Tokens: ${formatCompactNumber(myProfile.total_tokens)}\n\nTrack your stats:`;
                    const url = 'https://crank.sh'; 
                    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="px-6 py-3 bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-100 rounded-xl transition-all font-bold border border-slate-200 shadow-sm flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" /> Share Rank
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all font-bold shadow-xl shadow-slate-900/10">
                Join Network
              </Link>
            )}
            <Link href="/setup" className="px-6 py-3 border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 rounded-xl transition-all font-bold shadow-sm">
              Setup Guide
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <StatCard label="Active Nodes" value={formatCompactNumber(stats.active_users_24h || profiles.length)} icon={<Cpu className="w-5 h-5" />} />
          <StatCard label="24h Volume" value={formatCompactNumber(stats.last_24h_tokens || 0)} icon={<TrendingUp className="w-5 h-5" />} />
          <StatCard label="Peak T/s" value={formatCompactNumber(stats.peak_throughput)} icon={<Zap className="w-5 h-5" />} />
          <StatCard label="Network" value="ONLINE" icon={<Activity className="w-5 h-5" />} />
        </div>

        {stats.graph_data && stats.graph_data.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-12">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Network Activity (12h)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Real-time feed
              </span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.graph_data}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#4F46E5' }}
                    labelStyle={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '12px' }}
                    formatter={(value: number | undefined) => [formatCompactNumber(value || 0), 'Tokens']}
                    labelFormatter={(label) => new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="#4F46E5"
                    fillOpacity={1}
                    fill="url(#colorTokens)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-5 bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-bold">
            <div className="col-span-1">#</div>
            <div className="col-span-5 md:col-span-4 pl-2">User</div>
            <div className="col-span-3 text-right">Tokens</div>
            <div className="col-span-2 text-right hidden md:block">Efficiency</div>
            <div className="col-span-2 text-right hidden lg:block">Cache</div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center text-slate-400 animate-pulse">Scanning network...</div>
            ) : (
              <>
                <AnimatePresence>
                  {profiles.slice(0, user ? undefined : 10).map((profile, index) => (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-12 gap-4 p-5 hover:bg-slate-50/80 transition-colors items-center group"
                    >
                      <div className="col-span-1 font-bold text-slate-300 text-xl group-hover:text-indigo-600 transition-colors">{index + 1}</div>
                      <div className="col-span-5 md:col-span-4 flex items-center gap-4 pl-2">
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex flex-col min-w-0">
                              <Link href={`/u/${profile.username}`} className="group-hover:text-indigo-600 transition-colors flex flex-col min-w-0">
                                <span className={`truncate leading-tight font-bold ${index === 0 ? 'text-indigo-600' : 'text-slate-900'}`}>
                                  {profile.display_name || profile.username || profile.twitter_handle}
                                </span>
                              </Link>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {profile.twitter_handle && (
                                <a
                                  href={`https://x.com/${profile.twitter_handle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                                  title="View on X"
                                >
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                  </svg>
                                </a>
                              )}
                              {profile.github_handle && (
                                <a
                                  href={`https://github.com/${profile.github_handle}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                                  title="View on GitHub"
                                >
                                  <Github className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                          <BadgeDisplay badges={profile.badges || []} />
                        </div>
                      </div>
                      <div className="col-span-3 text-right font-bold text-slate-900 font-mono text-lg">
                        {formatCompactNumber(profile.total_tokens || 0)}
                      </div>
                      <div className="col-span-2 text-right hidden md:block text-slate-500 font-mono text-sm">
                        {(profile.input_tokens + profile.cache_read_tokens) > 0
                          ? Math.round((profile.cache_read_tokens / (profile.input_tokens + profile.cache_read_tokens)) * 100)
                          : 0}%
                      </div>
                      <div className="col-span-2 text-right hidden lg:block text-slate-400 font-mono text-sm">
                        {formatCompactNumber(profile.cache_read_tokens || 0)}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {user && hasMore && (
                  <div ref={loaderRef} className="py-8 text-center text-slate-400 font-mono text-xs animate-pulse">
                    {loadingMore ? 'Loading more nodes...' : 'Scroll to discover'}
                  </div>
                )}

                {!user && profiles.length > 10 && (
                  <div className="relative">
                    <div className="divide-y divide-slate-100 opacity-20 blur-[1px] pointer-events-none select-none overflow-hidden">
                      {profiles.slice(10, 13).map((p, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 p-5 items-center">
                          <div className="col-span-1 text-slate-300 font-bold text-xl">{11 + i}</div>
                          <div className="col-span-5 flex items-center gap-4 pl-2">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                            <div className="font-bold text-slate-400">••••••••</div>
                          </div>
                          <div className="col-span-3 text-right font-mono text-lg text-slate-300">000.0k</div>
                          <div className="col-span-2 text-right hidden md:block text-slate-200">--%</div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/90 to-transparent">
                      <Link
                        href="/auth/login"
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all transform hover:scale-105 flex items-center gap-3 text-lg"
                      >
                        <Terminal className="w-6 h-6" />
                        Connect to View All
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-200 text-center text-sm text-slate-400">
          <div className="flex justify-center gap-6 mb-4">
            <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy</Link>
          </div>
          <p className="text-xs">Community project. Not affiliated with Anthropic.</p>
        </footer>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="p-5 border border-slate-200 bg-white rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5 font-bold">{label}</div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}
