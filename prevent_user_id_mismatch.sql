-- Prevent User ID Mismatch Issues
-- This script sets up proper user creation and prevents future conflicts

-- Step 1: Create a proper user creation function that handles conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert the new user, but handle conflicts gracefully
    INSERT INTO public.users (id, email, full_name, username, role, created_at, last_login)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
        'user_' || substring(NEW.id::text, 1, 8),
        'self-learner',
        NEW.created_at,
        NEW.last_sign_in_at
    )
    ON CONFLICT (email) DO UPDATE SET
        -- If email conflict, update the existing record to use the new auth ID
        id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        last_login = EXCLUDED.last_login,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger to automatically create users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Create a function to update login times
CREATE OR REPLACE FUNCTION public.update_user_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the last_login timestamp in public.users when user signs in
    UPDATE public.users 
    SET last_login = NEW.last_sign_in_at
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the login update trigger
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.update_user_login();

-- Step 5: Add a unique constraint on email to prevent duplicates
-- (This will prevent manual creation of users with existing emails)
ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Step 6: Create a function to clean up orphaned records
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_users()
RETURNS TABLE(
    orphaned_id UUID,
    orphaned_email TEXT,
    action_taken TEXT
) AS $$
BEGIN
    -- Find and delete users in public.users that don't exist in auth.users
    RETURN QUERY
    DELETE FROM public.users pu
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.users au WHERE au.id = pu.id
    )
    RETURNING pu.id, pu.email, 'DELETED_ORPHANED_RECORD'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Verify the setup
SELECT 
    'Setup Complete' as status,
    'Triggers and functions created to prevent user ID mismatches' as message;
