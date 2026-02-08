'use client';

import { motion } from 'framer-motion';
import { LeaderboardUser } from '@/lib/types';
import { cn, formatCompactNumber, formatTokens } from '@/lib/utils';
import { Trophy, Zap, Terminal } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardTableProps {
    users: LeaderboardUser[];
}

export default function LeaderboardTable({ users }: LeaderboardTableProps) {
    return (
        <div className="w-full max-w-5xl mx-auto overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-5 md:col-span-4">User</div>
                <div className="col-span-3 text-right">Tokens</div>
                <div className="col-span-3 md:col-span-2 text-right">Savings</div>
                <div className="hidden md:block col-span-2 text-center">Status</div>
            </div>

            <div className="flex flex-col">
                {users.map((user, index) => {
                    const isTop3 = index < 3;
                    // Mock status logic based on last_active
                    const lastActive = new Date(user.last_active);
                    const now = new Date();
                    const isOnline = (now.getTime() - lastActive.getTime()) < 5 * 60 * 1000; // 5 mins

                    return (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            className="group grid grid-cols-12 gap-4 p-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center relative"
                        >
                            {/* Rank */}
                            <div className="col-span-1 flex justify-center">
                                {isTop3 ? (
                                    <span className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded font-bold text-black",
                                        index === 0 ? "bg-yellow-400" : index === 1 ? "bg-zinc-300" : "bg-amber-600"
                                    )}>
                                        {user.rank}
                                    </span>
                                ) : (
                                    <span className="text-zinc-500 font-mono">#{user.rank}</span>
                                )}
                            </div>

                            {/* User */}
                            <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border border-zinc-600">
                                    <span className="text-xs font-bold text-zinc-300">
                                        {(user.username || user.twitter_handle || "??").substring(0, 2).toUpperCase()}
                                    </span>
                                </div>
                                <Link href={`/u/${user.username}`} className="flex flex-col">
                                    <span className="text-sm font-semibold text-zinc-200 group-hover:text-claude transition-colors">
                                        @{user.username || user.twitter_handle}
                                    </span>
                                </Link>
                            </div>

                            {/* Tokens */}
                            <div className="col-span-3 text-right font-mono text-zinc-300">
                                <span className="md:hidden">{formatCompactNumber(user.total_tokens)}</span>
                                <span className="hidden md:inline">{formatTokens(user.total_tokens)}</span>
                            </div>

                            {/* Savings */}
                            <div className="col-span-3 md:col-span-2 text-right">
                                <div className="flex items-center justify-end gap-1 text-green-400">
                                    <Zap className="w-3 h-3" />
                                    <span className="font-mono">{user.savings_score?.toFixed(1)}%</span>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="hidden md:block col-span-2 text-center">
                                {isOnline ? (
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-900/20 border border-green-800 text-[10px] text-green-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        CODING
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-500">
                                        OFFLINE
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
