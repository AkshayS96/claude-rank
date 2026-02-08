export interface LeaderboardUser {
    id: string;
    twitter_handle: string;
    github_handle?: string;
    // api_key_hash is not exposed to frontend
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    total_tokens: number; // input + output (for ranking)
    last_active: string;
    created_at: string;
    savings_score?: number; // Calculated field
    rank?: number; // Calculated field
}

export interface DeviceCode {
    code: string;
    user_id: string | null;
    expires_at: string;
    verified: boolean;
    created_at: string;
}

export interface OTelPayload {
    resourceSpans: {
        resource: {
            attributes: {
                key: string;
                value: { stringValue?: string; intValue?: number };
            }[];
        };
        scopeSpans: {
            spans: {
                name: string;
                attributes: {
                    key: string;
                    value: { intValue?: number; stringValue?: string };
                }[];
            }[];
        }[];
    }[];
}

export interface UserStats {
    period: '24h' | '7d' | '30d' | 'all';
    data: {
        timestamp: string;
        tokens: number;
    }[];
    totals: {
        input: number;
        output: number;
        cache: number;
    };
}
