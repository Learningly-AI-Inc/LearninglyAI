-- Fix OAuth Linking Issue
-- This handles the case where users sign up with email then link OAuth

-- Step 1: Check the current situation
SELECT 
    'Current Auth User' as status,
    id,
    email,
    raw_app_meta_data->>'provider' as primary_provider,
    raw_app_meta_data->>'providers' as all_providers,
    created_at
FROM auth.users 
WHERE email = 'anonymous21120620@gmail.com';

-- Step 2: Check if there's a public.users record for the old ID
SELECT 
    'Public Users Check' as status,
    id,
    email,
    full_name,
    created_at
FROM public.users 
WHERE email = 'anonymous21120620@gmail.com';

-- Step 3: The solution is to update the public.users record to use the current auth user ID
-- This happens when a user links OAuth to their existing email account
UPDATE public.users 
SET 
    id = 'fcb972dd-2d7c-46a6-b2a1-1c19e1bf5f2d',  -- Current auth user ID
    full_name = 'Abtahi Rafi',  -- From OAuth metadata
    last_login = NOW()
WHERE email = 'anonymous21120620@gmail.com'
AND id = 'd8ec3157-6c68-4453-8ca7-c71da61fffa4';  -- Old auth user ID

-- Step 4: Verify the fix
SELECT 
    'After Fix' as status,
    'auth.users' as table_name,
    id,
    email,
    raw_app_meta_data->>'provider' as provider
FROM auth.users 
WHERE email = 'anonymous21120620@gmail.com'
UNION ALL
SELECT 
    'After Fix' as status,
    'public.users' as table_name,
    id,
    email,
    full_name as provider
FROM public.users 
WHERE email = 'anonymous21120620@gmail.com';

-- Step 5: Create a robust user creation function that handles OAuth linking
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update user in public.users table
    -- This handles both new users and OAuth linking scenarios
    INSERT INTO public.users (id, email, full_name, username, role, created_at, last_login)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name', 
            NEW.raw_user_meta_data->>'name', 
            'User'
        ),
        'user_' || substring(NEW.id::text, 1, 8),
        'self-learner',
        NEW.created_at,
        NEW.last_sign_in_at
    )
    ON CONFLICT (email) DO UPDATE SET
        -- When OAuth linking happens, update the ID to the new auth user ID
        id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        last_login = EXCLUDED.last_login,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Create login update function
CREATE OR REPLACE FUNCTION public.update_user_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users 
    SET last_login = NEW.last_sign_in_at
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create login update trigger
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.update_user_login();

-- Step 9: Final verification
SELECT 
    'Fix Complete' as status,
    'User ID mismatch resolved for OAuth linking scenario' as message;
