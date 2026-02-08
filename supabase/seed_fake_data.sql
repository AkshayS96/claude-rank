-- ============================================
-- FAKE DATA SEED SCRIPT (MULTI-USER)
-- Replace the usernames in the array below with your actual users
-- Run this in Supabase SQL Editor
-- ============================================

DO $$
DECLARE
    -- REPLACE THESE WITH YOUR 5 USERNAMES
    -- Example: ARRAY['akshay', 'rahul', 'sakshi', 'adesh', 'rob']
    usernames TEXT[] := ARRAY['user_1', 'user_2', 'user_3', 'user_4', 'user_5'];
    
    target_username TEXT;
    target_user_id UUID;
    
    -- Variables for variations
    base_input BIGINT;
    base_output BIGINT;
    rank INT := 1;
    h INT;
BEGIN
    FOREACH target_username IN ARRAY usernames
    LOOP
        -- 1. Get User ID
        SELECT id INTO target_user_id FROM profiles WHERE username = target_username;
        
        IF target_user_id IS NULL THEN
            RAISE NOTICE 'User % not found, skipping.', target_username;
            -- Increment rank anyway to keep spacing
            rank := rank + 1;
            CONTINUE;
        END IF;

        -- 2. Calculate decreasing token counts based on loop index (Simulate Rank 1 to 5)
        -- Rank 1: ~110M total
        -- Rank 5: ~20M total
        -- Formula: (6 - rank) * Factor
        
        base_input := (6 - rank) * 8000000;  -- 40M, 32M, 24M...
        base_output := (6 - rank) * 10000000; -- 50M, 40M, 30M...
        
        -- Add randomness
        base_input := base_input + floor(random() * 5000000)::int;
        base_output := base_output + floor(random() * 5000000)::int;

        UPDATE profiles SET
            input_tokens = base_input,
            output_tokens = base_output,
            cache_read_tokens = floor(base_input * 0.8)::bigint,
            cache_write_tokens = floor(base_input * 0.2)::bigint,
            last_active = NOW()
        WHERE id = target_user_id;
        
        RAISE NOTICE 'Updated % (Rank %) with ~% tokens', target_username, rank, (base_input + base_output);
        
        -- 3. Delete existing logs
        DELETE FROM usage_logs WHERE user_id = target_user_id;

        -- 4. Generate 48 hours of history
        FOR h IN 0..47 LOOP
            INSERT INTO usage_logs (
                user_id, token_count, metric_type, timestamp, hour_bucket, meta
            )
            VALUES (
                target_user_id,
                -- Hourly volume relative to total
                floor((base_input + base_output) / 1000) + floor(random() * 50000)::int,
                'aggregate',
                NOW() - (h || ' hours')::interval,
                date_trunc('hour', NOW() - (h || ' hours')::interval),
                jsonb_build_object(
                    'input', floor(base_input / 1000),
                    'output', floor(base_output / 1000),
                    'cache_read', floor((base_input * 0.8) / 1000),
                    'cache_write', floor((base_input * 0.2) / 1000)
                )
            );
        END LOOP;
        
        rank := rank + 1;
    END LOOP;
END $$;
