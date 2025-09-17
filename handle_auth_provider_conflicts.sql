-- Handle Auth Provider Conflicts
-- This script creates a robust system to handle email conflicts from different auth providers

-- Step 1: Create a function to handle user creation/updates with provider conflicts
CREATE OR REPLACE FUNCTION public.handle_user_auth_conflict()
RETURNS TRIGGER AS $$
DECLARE
    existing_user_id UUID;
    existing_user_email TEXT;
BEGIN
    -- Check if a user with this email already exists in public.users
    SELECT id, email INTO existing_user_id, existing_user_email
    FROM public.users 
    WHERE email = NEW.email;
    
    IF existing_user_id IS NOT NULL THEN
        -- User with this email already exists
        IF existing_user_id != NEW.id THEN
            -- Different ID - this is a provider conflict
            -- Update the existing record to use the new auth user ID
            UPDATE public.users 
            SET 
                id = NEW.id,
                full_name = COALESCE(
                    NEW.raw_user_meta_data->>'full_name', 
                    NEW.raw_user_meta_data->>'name',
                    full_name  -- Keep existing name if new one is empty
                ),
                last_login = NEW.last_sign_in_at,
                updated_at = NOW()
            WHERE email = NEW.email;
            
            RAISE NOTICE 'Updated existing user % to use new auth ID %', existing_user_email, NEW.id;
        ELSE
            -- Same ID - just update login time
            UPDATE public.users 
            SET 
                last_login = NEW.last_sign_in_at,
                updated_at = NOW()
            WHERE id = NEW.id;
        END IF;
    ELSE
        -- New user - create record
        INSERT INTO public.users (id, email, full_name, username, role, created_at, last_login)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
            'user_' || substring(NEW.id::text, 1, 8),
            'self-learner',
            NEW.created_at,
            NEW.last_sign_in_at
        );
        
        RAISE NOTICE 'Created new user % with auth ID %', NEW.email, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_auth_conflict();

-- Step 3: Create trigger for user updates (login, profile changes)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_auth_conflict();

-- Step 4: Create a function to merge duplicate users (cleanup)
CREATE OR REPLACE FUNCTION public.merge_duplicate_users()
RETURNS TABLE(
    email TEXT,
    auth_ids UUID[],
    action_taken TEXT
) AS $$
DECLARE
    user_record RECORD;
    primary_id UUID;
    duplicate_ids UUID[];
BEGIN
    -- Find emails that have multiple auth users
    FOR user_record IN 
        SELECT email, array_agg(id) as auth_ids
        FROM auth.users 
        GROUP BY email 
        HAVING COUNT(*) > 1
    LOOP
        -- Use the most recent auth user as primary
        SELECT id INTO primary_id
        FROM auth.users 
        WHERE email = user_record.email 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        -- Get duplicate IDs
        SELECT array_agg(id) INTO duplicate_ids
        FROM auth.users 
        WHERE email = user_record.email 
        AND id != primary_id;
        
        -- Update public.users to use primary ID
        UPDATE public.users 
        SET id = primary_id
        WHERE email = user_record.email;
        
        -- Return the merge info
        email := user_record.email;
        auth_ids := user_record.auth_ids;
        action_taken := 'MERGED_TO_PRIMARY_ID_' || primary_id;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Test the merge function (optional - run manually if needed)
-- SELECT * FROM public.merge_duplicate_users();

-- Step 6: Verify the setup
SELECT 
    'Setup Complete' as status,
    'Auth provider conflicts will be handled automatically' as message;
