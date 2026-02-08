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

    -- Fallback for twitter_handle to ensure unique constraint (it is NOT NULL in schema)
    IF twitter_handle IS NULL THEN
         -- try to fetch from existing profile if updating
         SELECT p.twitter_handle INTO twitter_handle FROM public.profiles p WHERE p.id = NEW.id;
         
         -- if still null, use username or generate one
         IF twitter_handle IS NULL THEN
            twitter_handle := username;
         END IF;
    END IF;


    INSERT INTO public.profiles (
        id, 
        twitter_handle, -- Used as primary handle/username
        github_handle,
        avatar_url, 
        provider,
        display_name,
        last_active
    )
    VALUES (
        NEW.id, 
        twitter_handle, 
        github_handle,
        avatar_url, 
        provider,
        display_name,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        twitter_handle = EXCLUDED.twitter_handle,
        github_handle = EXCLUDED.github_handle,
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
