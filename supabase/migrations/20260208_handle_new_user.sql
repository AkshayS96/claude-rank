-- Create a function to handle new user creation and updates
-- This function will be called by a trigger on auth.users
-- It syncs user data to public.profiles

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    username TEXT;
    avatar_url TEXT;
    provider TEXT;
    display_name TEXT;
    github_handle TEXT;
    twitter_handle TEXT;
    identity RECORD;
BEGIN
    -- unique handle generation
    username := COALESCE(
        NEW.raw_user_meta_data->>'user_name',
        NEW.raw_user_meta_data->>'preferred_username',
        NEW.raw_user_meta_data->>'name',
        'user_' || substr(md5(random()::text), 1, 8)
    );

    avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    provider := NEW.raw_app_meta_data->>'provider';
    display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'name',
        username
    );
    
    -- Initialize handles based on current provider
    IF provider = 'github' THEN
        github_handle := username;
    ELSIF provider = 'twitter' OR provider = 'x' THEN
        twitter_handle := username;
    END IF;

    -- If existing profile, try to keep existing handles if not null
    -- We can fetch associated identities from auth.identities to be sure
    -- note: security definer allows accessing auth schema
    
    FOR identity IN SELECT * FROM auth.identities WHERE user_id = NEW.id LOOP
        IF identity.provider = 'github' THEN
            github_handle := COALESCE(identity.identity_data->>'user_name', identity.identity_data->>'preferred_username', github_handle);
        ELSIF identity.provider = 'twitter' OR identity.provider = 'x' THEN
            twitter_handle := COALESCE(identity.identity_data->>'user_name', identity.identity_data->>'preferred_username', twitter_handle);
        END IF;
    END LOOP;

    -- Fallback: If username is null, generate one
    IF username IS NULL THEN
        username := 'user_' || substr(md5(random()::text), 1, 8);
    END IF;

    -- Ensure username is unique (simple check, append random if needed)
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = username AND id != NEW.id) LOOP
        username := substr(username, 1, 58) || '_' || substr(md5(random()::text), 1, 4);
    END LOOP;

    INSERT INTO public.profiles (
        id, 
        username, -- New primary handle
        twitter_handle, -- Only if actually connected
        github_handle,
        avatar_url, 
        provider,
        display_name,
        last_active,
        api_key_hash
    )
    VALUES (
        NEW.id, 
        username,
        twitter_handle, -- Will be NULL if not explicitly set
        github_handle,
        avatar_url, 
        provider,
        display_name,
        NOW(),
        md5(random()::text)
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username, -- Update username if it changed? Maybe better to keep original? 
        -- Actually, usually we don't want to change username on login unless we have a reason.
        -- But for now let's update it to ensure sync with auth.
        twitter_handle = COALESCE(EXCLUDED.twitter_handle, profiles.twitter_handle), -- Keep existing if new is null
        github_handle = COALESCE(EXCLUDED.github_handle, profiles.github_handle),
        avatar_url = EXCLUDED.avatar_url,
        provider = EXCLUDED.provider,
        display_name = EXCLUDED.display_name,
        last_active = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Security Defines allows accessing auth.identities

-- Trigger for INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for UPDATE (e.g. when last_sign_in_at updates, or metadata updates)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
