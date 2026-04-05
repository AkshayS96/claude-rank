import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatTokens(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
}

export function formatCompactNumber(num: number): string {
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
}

export const PRICING: Record<string, { input: number; output: number; cache_read: number; cache_write: number }> = {
    'claude-3-7-sonnet-20250219': {
        input: 3.00, // per million
        output: 15.00,
        cache_read: 0.30,
        cache_write: 3.75
    },
    'claude-3-5-sonnet-20241022': {
        input: 3.00,
        output: 15.00,
        cache_read: 0.30,
        cache_write: 3.75
    },
    'claude-3-5-haiku-20241022': {
        input: 0.80,
        output: 4.00,
        cache_read: 0.08,
        cache_write: 1.00
    },
    'claude-3-opus-20240229': {
        input: 15.00,
        output: 75.00,
        cache_read: 1.50,
        cache_write: 18.75
    }
};

export function calculateCost(model: string, tokens: { input?: number; output?: number; cache_read?: number; cache_write?: number }): number {
    const rates = PRICING[model] || PRICING['claude-3-7-sonnet-20250219'];
    const input = (tokens.input || 0) * (rates.input / 1_000_000);
    const output = (tokens.output || 0) * (rates.output / 1_000_000);
    const cacheRead = (tokens.cache_read || 0) * (rates.cache_read / 1_000_000);
    const cacheWrite = (tokens.cache_write || 0) * (rates.cache_write / 1_000_000);
    return input + output + cacheRead + cacheWrite;
}

export function formatCurrency(num: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 5
    }).format(num);
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const BADGE_DEFINITIONS: Record<string, Badge> = {
    TOKEN_10K: { id: 'TOKEN_10K', name: 'Token Scout', description: 'Shipped 10k tokens', icon: '🔍', rarity: 'common' },
    TOKEN_50K: { id: 'TOKEN_50K', name: 'Token Pilot', description: 'Shipped 50k tokens', icon: '✈️', rarity: 'uncommon' },
    TOKEN_100K: { id: 'TOKEN_100K', name: 'Token Veteran', description: 'Shipped 100k tokens', icon: '🎖️', rarity: 'rare' },
    TOKEN_500K: { id: 'TOKEN_500K', name: 'Token Commander', description: 'Shipped 500k tokens', icon: '🚀', rarity: 'rare' },
    TOKEN_1M: { id: 'TOKEN_1M', name: 'Token Legend', description: 'Shipped 1M+ tokens', icon: '👑', rarity: 'legendary' },
    CACHE_50: { id: 'CACHE_50', name: 'Cache Sorcerer', description: '50%+ Cache Efficiency', icon: '🧙', rarity: 'uncommon' },
    CACHE_80: { id: 'CACHE_80', name: 'Cache Master', description: '80%+ Cache Efficiency', icon: '🔮', rarity: 'rare' },
    SAVINGS_100: { id: 'SAVINGS_100', name: 'Smart Spender', description: 'Saved $100+ via cache', icon: '💰', rarity: 'rare' },
    BASH_WARRIOR: { id: 'BASH_WARRIOR', name: 'Bash Warrior', description: '100+ Bash calls', icon: '⚔️', rarity: 'uncommon' },
    BASH_GOD: { id: 'BASH_GOD', name: 'Bash God', description: '1000+ Bash calls', icon: '⚡', rarity: 'legendary' },
    NIGHT_OWL: { id: 'NIGHT_OWL', name: 'Night Owl', description: 'Active during the witching hour', icon: '🦉', rarity: 'uncommon' },
    EARLY_BIRD: { id: 'EARLY_BIRD', name: 'Early Bird', description: 'Coding before sunrise', icon: '🌅', rarity: 'uncommon' },
    WEEKEND_WARRIOR: { id: 'WEEKEND_WARRIOR', name: 'Weekend Warrior', description: 'Coding through the weekend', icon: '🍕', rarity: 'uncommon' },
    STREAK_7: { id: 'STREAK_7', name: 'Week on Fire', description: '7 day coding streak', icon: '🔥', rarity: 'rare' },
};

export function calculateBadges(profile: any, toolStats: any[] = [], logs: any[] = []): string[] {
    const earned: string[] = [];
    const totalTokens = Number(profile.total_tokens || 0);
    const inputPlusCache = Number(profile.input_tokens || 0) + Number(profile.cache_read_tokens || 0);
    const cacheEff = inputPlusCache > 0 ? (Number(profile.cache_read_tokens || 0) / inputPlusCache) : 0;
    
    // Token Milestones
    if (totalTokens >= 10000) earned.push('TOKEN_10K');
    if (totalTokens >= 50000) earned.push('TOKEN_50K');
    if (totalTokens >= 100000) earned.push('TOKEN_100K');
    if (totalTokens >= 500000) earned.push('TOKEN_500K');
    if (totalTokens >= 1000000) earned.push('TOKEN_1M');

    // Efficiency
    if (cacheEff >= 0.5) earned.push('CACHE_50');
    if (cacheEff >= 0.8) earned.push('CACHE_80');

    // Tool Mastery
    const bashCalls = toolStats.find(t => t.tool_name === 'bash')?.call_count || 0;
    if (bashCalls >= 100) earned.push('BASH_WARRIOR');
    if (bashCalls >= 1000) earned.push('BASH_GOD');

    // Time-based (simplified for now based on last_active)
    const hour = new Date(profile.last_active).getHours();
    if (hour >= 0 && hour <= 5) earned.push('NIGHT_OWL');
    if (hour >= 5 && hour <= 9) earned.push('EARLY_BIRD');

    const day = new Date(profile.last_active).getDay();
    if (day === 0 || day === 6) earned.push('WEEKEND_WARRIOR');

    return earned;
}

export async function hashApiKey(key: string): Promise<string> {
    const trimmedKey = key.trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(trimmedKey);
    
    // Use globalThis.crypto for cross-environment compatibility (Node, Edge, Browser)
    const cryptoObj = globalThis.crypto;
    if (!cryptoObj || !cryptoObj.subtle) {
        throw new Error('Crypto Subtle API not available in this environment');
    }
    
    const hash = await cryptoObj.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

