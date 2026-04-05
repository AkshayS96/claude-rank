'use client';

import { motion } from 'framer-motion';
import { formatCompactNumber } from '@/lib/utils';
import { Terminal } from 'lucide-react';
import Link from 'next/link';

interface HeroSectionProps {
    totalTokens: number;
}

export default function HeroSection({ totalTokens }: HeroSectionProps) {
    return (
        <div className="relative w-full py-16 md:py-24 flex flex-col items-center justify-center overflow-hidden bg-white">
            {/* Background Decor */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/[0.03] rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 text-center space-y-6"
            >
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Terminal className="w-5 h-5 text-indigo-600" />
                    <span className="text-indigo-600 font-mono text-sm tracking-[0.2em] font-black uppercase">Network Online</span>
                </div>

                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900">
                    Crank
                </h1>

                <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed font-medium">
                    High-fidelity telemetry for AI-native engineering teams.
                </p>

                <div className="py-8">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-300 uppercase tracking-[0.3em] mb-4 font-black">Global Throughput</span>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-7xl md:text-9xl font-black text-slate-900 tracking-tighter font-mono"
                        >
                            {formatCompactNumber(totalTokens)}
                        </motion.div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link href="/auth/login" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-500/25 transform hover:scale-105">
                        Join the Registry
                    </Link>
                    <Link href="/setup" className="px-8 py-4 border border-slate-200 bg-white text-slate-600 rounded-2xl font-black transition-all hover:border-slate-300 hover:text-slate-900 shadow-sm">
                        Setup Guide
                    </Link>
                </div>
            </motion.div>

            {/* Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-[0.4] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>
    );
}
