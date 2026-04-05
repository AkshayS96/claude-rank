'use client';

import { BADGE_DEFINITIONS } from '@/lib/utils';

export default function BadgeDisplay({ badges }: { badges: string[] }) {
    if (!badges || badges.length === 0) return null;

    const rarityStyles = {
        legendary: 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm shadow-amber-100',
        rare: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        uncommon: 'bg-slate-50 border-slate-200 text-slate-700',
        common: 'bg-slate-50 border-slate-100 text-slate-500'
    };

    return (
        <div className="flex flex-wrap gap-1.5">
            {badges.map(badgeId => {
                const badge = BADGE_DEFINITIONS[badgeId];
                if (!badge) return null;
                
                return (
                    <div 
                        key={badgeId}
                        className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all cursor-default ${rarityStyles[badge.rarity] || rarityStyles.common}`}
                    >
                        <span className="text-xs grayscale-[0.5] group-hover:grayscale-0 transition-all">{badge.icon}</span>
                        <span>{badge.name}</span>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white rounded-xl text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30 shadow-xl translate-y-1 group-hover:translate-y-0">
                            <p className="font-bold mb-0.5">{badge.name}</p>
                            <p className="opacity-70 font-medium">{badge.description}</p>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
