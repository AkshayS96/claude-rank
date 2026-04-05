'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCompactNumber, formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Terminal, Cpu, DollarSign, Activity, Wallet, Box, Clock } from 'lucide-react';

const COLORS = ['#6366f1', '#818cf8', '#10b981', '#94a3b8', '#c084fc', '#f472b6'];

export default function SessionAnalytics({ userId }: { userId: string }) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [toolUsage, setToolUsage] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchSessions = async () => {
            const { data } = await supabase
                .from('usage_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('last_active', { ascending: false })
                .limit(10);

            if (data) {
                setSessions(data);
                if (data.length > 0) setSelectedSession(data[0]);
            }
            setLoading(false);
        };

        fetchSessions();
    }, [userId]);

    useEffect(() => {
        if (!selectedSession) return;

        const fetchToolUsage = async () => {
            const { data } = await supabase
                .from('tool_usage')
                .select('*')
                .eq('session_id', selectedSession.id)
                .order('call_count', { ascending: false });

            if (data) setToolUsage(data);
        };

        fetchToolUsage();
    }, [selectedSession]);

    if (loading) return <div className="p-12 text-slate-400 flex flex-col items-center gap-4 italic font-mono"><Clock className="w-6 h-6 animate-spin" /> Correlating session telemetry...</div>;
    
    if (sessions.length === 0) {
        return (
            <div className="mt-16 pt-16 border-t border-slate-200">
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 text-center">
                    <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-slate-900 mb-2">No Sessions Detected</h3>
                    <p className="text-slate-500 max-w-md mx-auto text-sm">
                        Individual session analytics and cost breakdowns will appear here once you start using Claude Code with your API key.
                    </p>
                </div>
            </div>
        );
    }

    const totalSessionTokens = (selectedSession?.total_input_tokens || 0) + (selectedSession?.total_output_tokens || 0);
    const moneySaved = (selectedSession?.total_cache_read || 0) * (2.70 / 1_000_000);

    const costData = [
        { name: 'Input', value: selectedSession?.total_input_tokens || 0, color: '#6366f1' },
        { name: 'Output', value: selectedSession?.total_output_tokens || 0, color: '#818cf8' },
        { name: 'Cache Read', value: selectedSession?.total_cache_read || 0, color: '#10b981' },
        { name: 'Cache Write', value: selectedSession?.total_cache_write || 0, color: '#cbd5e1' },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-10 mt-16 pt-16 border-t border-slate-200">
            <div className="flex flex-col lg:flex-row gap-10">
                {/* Session Sidebar */}
                <div className="w-full lg:w-80 space-y-4">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black flex items-center gap-2 px-2">
                        <Box className="w-3.5 h-3.5" /> Recent Registry
                    </h3>
                    <div className="space-y-2 max-h-[640px] overflow-y-auto pr-2 custom-scrollbar">
                        {sessions.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSelectedSession(s)}
                                className={`w-full text-left p-5 rounded-2xl border transition-all group relative overflow-hidden ${
                                    selectedSession?.id === s.id 
                                    ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50' 
                                    : 'bg-white/50 border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-white'
                                }`}
                            >
                                {selectedSession?.id === s.id && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600" />}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col min-w-0">
                                        <span className={`font-black truncate text-sm tracking-tight ${selectedSession?.id === s.id ? 'text-slate-900' : 'text-slate-500'}`}>
                                            {s.project_name || 'default'}
                                        </span>
                                        <span className="text-[10px] font-mono opacity-50 uppercase tracking-tighter">
                                            ID: {s.id.slice(0, 8)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300">
                                        {new Date(s.last_active).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.model?.split('-').slice(2, 3)}</span>
                                    <span className={`font-black text-sm ${selectedSession?.id === s.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {formatCurrency(s.total_cost || 0)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Session Dashboard */}
                <div className="flex-1 space-y-8">
                    {selectedSession && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <SummaryCard label="Model" value={selectedSession.model?.split('-').slice(0, 3).join('-') || 'Unknown'} icon={<Cpu className="w-4 h-4" />} color="indigo" />
                                <SummaryCard label="Total Tokens" value={formatCompactNumber(totalSessionTokens)} icon={<Activity className="w-4 h-4" />} color="slate" />
                                <SummaryCard label="Session Cost" value={formatCurrency(selectedSession.total_cost || 0)} icon={<DollarSign className="w-4 h-4" />} color="indigo" />
                                <SummaryCard label="Efficiency" value={`+${formatCurrency(moneySaved)}`} icon={<Wallet className="w-4 h-4" />} color="emerald" sub="Saved" />
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Token Breakdown Pie */}
                                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-8">Resource Distribution</h4>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={costData}
                                                    innerRadius={70}
                                                    outerRadius={90}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {costData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#f1f5f9', color: '#1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', border: '1px solid #f1f5f9' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-6">
                                        {costData.map((d, i) => (
                                            <div key={i} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                                                <span className="flex-1">{d.name}</span>
                                                <span className="text-slate-900 font-mono">{formatCompactNumber(d.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Tool Usage Bar */}
                                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-8">Tool Engagement</h4>
                                    {toolUsage.length === 0 ? (
                                        <div className="h-64 flex flex-col items-center justify-center text-slate-300 italic text-sm">
                                            No tool telemetry recorded.
                                        </div>
                                    ) : (
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={toolUsage} layout="vertical">
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="tool_name" type="category" width={90} fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} />
                                                    <RechartsTooltip 
                                                        contentStyle={{ backgroundColor: '#fff', borderColor: '#f1f5f9', color: '#1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', border: '1px solid #f1f5f9' }}
                                                    />
                                                    <Bar dataKey="call_count" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detailed Tool Table */}
                            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Surgical Tool Breakdown</h4>
                                    <Terminal className="w-4 h-4 text-slate-200" />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/50 text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4">Tool Identifier</th>
                                                <th className="px-6 py-4 text-right">Executions</th>
                                                <th className="px-6 py-4 text-right">Agg. Load</th>
                                                <th className="px-6 py-4 text-right">Unit In</th>
                                                <th className="px-6 py-4 text-right">Est. Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-600">
                                            {toolUsage.map((t, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-black text-slate-900">{t.tool_name}</td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold">{t.call_count}</td>
                                                    <td className="px-6 py-4 text-right font-mono">{formatCompactNumber(t.input_tokens + t.output_tokens)}</td>
                                                    <td className="px-6 py-4 text-right font-mono opacity-60">{formatCompactNumber(Math.round(t.input_tokens / t.call_count))}</td>
                                                    <td className="px-6 py-4 text-right text-indigo-600 font-black font-mono">{formatCurrency(t.cost || 0)}</td>
                                                </tr>
                                            ))}
                                            {toolUsage.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-300 italic">No surgical data available.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, icon, color, sub }: any) {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        slate: 'bg-slate-50 text-slate-600 border-slate-100'
    } as any;

    return (
        <div className={`p-5 rounded-2xl border transition-all hover:shadow-sm ${colors[color]}`}>
            <div className="flex items-center gap-2 mb-3 opacity-60">
                {icon}
                <span className="text-[10px] uppercase tracking-widest font-black">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-black tracking-tight truncate">{value}</span>
                {sub && <span className="text-[10px] font-bold opacity-60 lowercase">{sub}</span>}
            </div>
        </div>
    );
}
