'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Terminal, Cpu, Zap, Activity, BarChart3, TrendingUp, Github, LogOut } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { FloatingCode } from '@/components/FloatingCode';
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
}

interface Stats {
  peak_throughput: number;
  last_24h_tokens?: number;
  active_users_24h?: number;
  graph_data?: any[];
}

export default function LeaderboardPage() {
  console.log('LeaderboardPage rendering');
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

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Check authentication state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Auth check - Session:', session, 'Error:', error);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, 'User:', session?.user?.email);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        // Append new profiles
        if (data.users) {
          setProfiles(prev => {
            // Filter out duplicates just in case
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
    // Realtime updates disabled for paginated view to avoid complexity
  }, []);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!user) return; // Only for logged in users

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
    <main className="min-h-screen bg-[#faf9f6] text-zinc-800 font-mono p-4 md:p-8 relative selection:bg-[#EB5B39] selection:text-white">
      <FloatingCode side="left" />
      <FloatingCode side="right" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 border-b border-zinc-200 pb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#EB5B39] rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <Terminal className="w-6 h-6" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900">
                Claude Rank
              </h1>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-3 self-start">
              <a
                href="https://github.com/AkshayS96/claude-rank"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-all font-medium shadow-md shadow-zinc-200 flex items-center gap-2 text-sm"
              >
                <Github className="w-4 h-4" />
                {githubStars !== null ? (
                  <>
                    <span>Star</span>
                    <span className="bg-zinc-800 px-2 py-0.5 rounded-full text-xs font-mono ml-1">{formatCompactNumber(githubStars)}</span>
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
                  className="px-4 py-2 border border-zinc-200 bg-white text-zinc-600 hover:text-red-600 hover:border-red-200 rounded-lg transition-all font-medium text-sm flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <Link href="/auth/login" className="px-4 py-2 bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 rounded-lg transition-all font-medium text-sm">
                  Login
                </Link>
              )}
            </div>
          </div>

          <p className="text-zinc-500 text-lg max-w-2xl mb-8">
            Global telemetry for high-velocity engineering teams.
            Tracking <span className="text-[#EB5B39] font-bold">{profiles.reduce((acc, p) => acc + (p.total_tokens || 0), 0).toLocaleString()}</span> tokens shipped.
          </p>

          <div className="flex gap-4">
            {authLoading ? (
              <div className="px-6 py-3 bg-zinc-200 text-zinc-400 rounded-lg font-medium shadow-xl shadow-zinc-200 animate-pulse">
                Loading...
              </div>
            ) : user ? (
              <>
                <Link href={`/u/${user.user_metadata?.preferred_username || user.user_metadata?.user_name}`} className="px-6 py-3 bg-[#EB5B39] text-white hover:bg-[#d94e2f] rounded-lg transition-all font-medium shadow-xl shadow-orange-200">
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    const myProfile = profiles.find(p => p.id === user.id);
                    if (!myProfile) return;
                    const rank = profiles.findIndex(p => p.id === user.id) + 1;
                    const text = `I'm ranked #${rank} on the unofficial Claude Leaderboard ⚡️\n\nTotal Tokens: ${formatCompactNumber(myProfile.total_tokens)}\n\nTrack your stats:`;
                    const url = 'https://clauderank.vercel.app';
                    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-all font-medium shadow-xl shadow-zinc-200 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" /> Share Rank
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="px-6 py-3 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-all font-medium shadow-xl shadow-zinc-200">
                Join Network
              </Link>
            )}
            <Link href="/setup" className="px-6 py-3 border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 rounded-lg transition-all font-medium">
              How to Setup
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard label="Active Nodes (24h)" value={formatCompactNumber(stats.active_users_24h || profiles.length)} icon={<Cpu />} />
          <StatCard label="24h Volume" value={formatCompactNumber(stats.last_24h_tokens || 0)} icon={<TrendingUp />} />
          <StatCard label="Peak T/s" value={formatCompactNumber(stats.peak_throughput)} icon={<Zap />} />
          <StatCard label="System Status" value="ONLINE" icon={<Activity />} />
        </div>

        {/* Activity Graph */}
        {stats.graph_data && stats.graph_data.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 mb-12">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Network Activity (Last 12h)
              </h3>
              <span className="text-xs text-zinc-400 font-mono">
                Since {new Date(stats.graph_data[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.graph_data}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EB5B39" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#EB5B39" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', color: '#18181b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#ea580c' }}
                    labelStyle={{ color: '#71717a', marginBottom: '0.25rem', fontSize: '12px' }}
                    formatter={(value: number | undefined) => [formatCompactNumber(value || 0), 'Tokens']}
                    labelFormatter={(label) => new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="#EB5B39"
                    fillOpacity={1}
                    fill="url(#colorTokens)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-5 bg-zinc-50 border-b border-zinc-100 text-xs uppercase tracking-wider text-zinc-400 font-bold">
            <div className="col-span-1">#</div>
            <div className="col-span-4 pl-2">User</div>
            <div className="col-span-3 text-right">Tokens</div>
            <div className="col-span-2 text-right hidden md:block">Eff.</div>
            <div className="col-span-2 text-right hidden md:block">Cache</div>
          </div>

          <div className="divide-y divide-zinc-100">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 animate-pulse">Scanning network...</div>
            ) : (
              <>
                <AnimatePresence>
                  {profiles.slice(0, user ? undefined : 10).map((profile, index) => (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="grid grid-cols-12 gap-4 p-5 hover:bg-orange-50/50 transition-colors items-center group"
                    >
                      <div className="col-span-1 font-bold text-zinc-300 text-xl group-hover:text-[#EB5B39] transition-colors">{index + 1}</div>
                      <div className="col-span-4 flex items-center gap-4 pl-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Name Display */}
                          <div className="flex flex-col min-w-0 max-w-[150px] lg:max-w-[200px]">
                            <Link href={`/u/${profile.username}`} className="group-hover:text-[#EB5B39] transition-colors flex flex-col min-w-0">
                              <span className={`truncate leading-tight ${index === 0 ? 'text-yellow-500 font-black' :
                                index === 1 ? 'text-zinc-400 font-bold' :
                                  index === 2 ? 'text-amber-700 font-semibold' :
                                    'text-zinc-900 font-medium'
                                }`}>{profile.display_name || profile.username || profile.twitter_handle}</span>
                            </Link>
                          </div>

                          {/* Icons Display - Big and Cool */}
                          <div className="flex items-center gap-2">
                            {profile.twitter_handle && (
                              <a
                                href={`https://x.com/${profile.twitter_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-black transition-all duration-200 group/icon shadow-sm hover:shadow-md ring-1 ring-zinc-200/50 hover:ring-black"
                                title="View on X"
                              >
                                {/* Custom X Logo for better look */}
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
                                className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-[#24292e] transition-all duration-200 group/icon shadow-sm hover:shadow-md ring-1 ring-zinc-200/50 hover:ring-[#24292e]"
                                title="View on GitHub"
                              >
                                <Github className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3 text-right font-bold text-zinc-900 font-mono text-lg">
                        {formatCompactNumber(profile.total_tokens || 0)}
                      </div>
                      <div className="col-span-2 text-right hidden md:block text-zinc-500 font-mono">
                        {(profile.input_tokens + profile.cache_read_tokens) > 0
                          ? Math.round((profile.cache_read_tokens / (profile.input_tokens + profile.cache_read_tokens)) * 100)
                          : 0}%
                      </div>
                      <div className="col-span-2 text-right hidden md:block text-zinc-500 font-mono">
                        {formatCompactNumber(profile.cache_read_tokens || 0)}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {user && hasMore && (
                  <div ref={loaderRef} className="py-8 text-center text-zinc-400 font-mono text-sm animate-pulse">
                    {loadingMore ? 'Loading more agents...' : 'Scroll to load more'}
                  </div>
                )}

                {!user && profiles.length > 10 && (
                  <div className="relative">
                    {/* Blurred rows to tease */}
                    <div className="divide-y divide-zinc-100 opacity-30 blur-[2px] pointer-events-none select-none overflow-hidden">
                      {profiles.slice(10, 13).map((profile, index) => (
                        <div key={profile.id} className="grid grid-cols-12 gap-4 p-5 items-center">
                          <div className="col-span-1 text-zinc-400 font-bold text-xl">{11 + index}</div>
                          <div className="col-span-4 flex items-center gap-4 pl-2">
                            <div className="w-10 h-10 bg-zinc-100 rounded-lg"></div>
                            <div className="font-bold text-zinc-900">@{profile.twitter_handle}</div>
                          </div>
                          <div className="col-span-3 text-right font-mono text-lg text-zinc-900">{formatCompactNumber(profile.total_tokens)}</div>
                          <div className="col-span-2 text-right hidden md:block text-zinc-500">--%</div>
                          <div className="col-span-2 text-right hidden md:block text-zinc-500">-</div>
                        </div>
                      ))}
                    </div>

                    {/* CTA Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/80 to-transparent">
                      <Link
                        href="/auth/login"
                        className="px-8 py-4 bg-[#EB5B39] hover:bg-[#d94e2f] text-white font-bold rounded-xl shadow-2xl shadow-orange-500/30 transition-all transform hover:scale-105 flex items-center gap-3 text-lg"
                      >
                        <Terminal className="w-6 h-6" />
                        Connect Terminal to View Full Leaderboard
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-zinc-200 text-center text-sm text-zinc-400">
          <div className="flex justify-center gap-6">
            <Link href="/terms" className="hover:text-zinc-600 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-zinc-600 transition-colors">Privacy Policy</Link>
          </div>
          <p className="mt-4 text-xs">This is a community project and is not affiliated with or endorsed by any AI company.</p>
        </footer>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="p-5 border border-zinc-200 bg-white rounded-xl flex items-center gap-4 shadow-sm">
      <div className="p-3 bg-orange-50 text-[#EB5B39] rounded-lg">
        {icon}
      </div>
      <div>
        <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1 font-bold">{label}</div>
        <div className="text-2xl font-bold text-zinc-900">{value}</div>
      </div>
    </div>
  );
}
