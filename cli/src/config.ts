import path from 'path';
import os from 'os';

// ============================================
// CENTRALIZED URL CONFIGURATION
// Change API_BASE_URL to update all endpoints
// ============================================

export const API_BASE_URL = 'https://clauderank.vercel.app/';

// Derived URLs - automatically use the base URL
export const urls = {
    // API endpoints
    AUTH_DEVICE: `${API_BASE_URL}/api/auth/device`,
    USER: (handle: string) => `${API_BASE_URL}/api/user/${handle}`,
    OTEL: `${API_BASE_URL}/otel`,

    // Web pages
    VERIFY: `${API_BASE_URL}/auth/verify`,
};

// Config file path
export const CONFIG_PATH = path.join(os.homedir(), '.claude-rank.json');
