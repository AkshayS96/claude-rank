-- Create a function to handle new user creation and updates
-- This function will be called by a trigger on auth.users
-- It syncs user data to public.profiles

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
    v_avatar_url TEXT;
    v_provider TEXT;
    v_display_name TEXT;
    v_github_handle TEXT;
    v_twitter_handle TEXT;
    identity RECORD;
BEGIN
    -- unique handle generation
    v_username := COALESCE(
        NEW.raw_user_meta_data->>'user_name',
        NEW.raw_user_meta_data->>'preferred_username',
        NEW.raw_user_meta_data->>'name',
        'user_' || substr(md5(random()::text), 1, 8)
    );

    v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    v_provider := NEW.raw_app_meta_data->>'provider';
    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'name',
        v_username
    );
    
    -- Initialize handles based on current provider
    IF v_provider = 'github' THEN
        v_github_handle := v_username;
    ELSIF v_provider = 'twitter' OR v_provider = 'x' THEN
        v_twitter_handle := v_username;
    END IF;

    -- If existing profile, try to keep existing handles if not null
    FOR identity IN SELECT * FROM auth.identities WHERE user_id = NEW.id LOOP
        IF identity.provider = 'github' THEN
            v_github_handle := COALESCE(identity.identity_data->>'user_name', identity.identity_data->>'preferred_username', v_github_handle);
        ELSIF identity.provider = 'twitter' OR identity.provider = 'x' THEN
            v_twitter_handle := COALESCE(identity.identity_data->>'user_name', identity.identity_data->>'preferred_username', v_twitter_handle);
        END IF;
    END LOOP;

    -- Fallback for username (ensure it's not null)
    IF v_username IS NULL THEN
        v_username := 'user_' || substr(md5(random()::text), 1, 8);
    END IF;

    -- Ensure unique username with suffix if needed
    -- Using table qualification to avoid ambiguity: public.profiles.username vs v_username
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.username = v_username AND id != NEW.id) LOOP
        v_username := substr(v_username, 1, 58) || '_' || substr(md5(random()::text), 1, 4);
    END LOOP;

    INSERT INTO public.profiles (
        id, 
        username,
        twitter_handle, 
        github_handle,
        avatar_url, 
        provider,
        display_name,
        last_active,
        api_key_hash
    )
    VALUES (
        NEW.id, 
        v_username,
        v_twitter_handle, 
        v_github_handle,
        v_avatar_url, 
        v_provider,
        v_display_name,
        NOW(),
        md5(random()::text) 
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        twitter_handle = EXCLUDED.twitter_handle,
        github_handle = EXCLUDED.github_handle,
        avatar_url = EXCLUDED.avatar_url,
        provider = EXCLUDED.provider,
        display_name = EXCLUDED.display_name,
        last_active = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for UPDATE
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
