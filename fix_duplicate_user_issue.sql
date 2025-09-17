-- Fix Duplicate User Issue
-- This script handles the case where the same email exists with different IDs

-- Step 1: Check the current situation
SELECT 
    'Current situation' as status,
    'auth.users' as table_name,
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    created_at
FROM auth.users 
WHERE email = 'anonymous21120620@gmail.com'
UNION ALL
SELECT 
    'Current situation' as status,
    'public.users' as table_name,
    id,
    email,
    full_name,
    created_at
FROM public.users 
WHERE email = 'anonymous21120620@gmail.com';

-- Step 2: Update the existing public.users record to match the auth.users ID
-- This will fix the mismatch between the two tables
UPDATE public.users 
SET 
    id = 'fcb972dd-2d7c-46a6-b2a1-1c19e1bf5f2d',
    full_name = 'Abtahi Rafi',
    last_login = NOW()
WHERE email = 'anonymous21120620@gmail.com'
AND id = 'd8ec3157-6c68-4453-8ca7-c71da61fffa4';

-- Step 3: Verify the fix
SELECT 
    'After fix' as status,
    'public.users' as table_name,
    id,
    email,
    full_name,
    created_at,
    last_login
FROM public.users 
WHERE email = 'anonymous21120620@gmail.com';

-- Step 4: Check if there are any foreign key references to the old ID that need updating
-- (This is important to maintain data integrity)
SELECT 
    'Foreign key references to check' as status,
    table_name,
    column_name,
    constraint_name
FROM information_schema.key_column_usage 
WHERE referenced_table_name = 'users' 
AND referenced_column_name = 'id'
AND table_schema = 'public';

-- Step 5: Create the user creation function (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the new user into the public.users table
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
        id = EXCLUDED.id,
        full_name = EXCLUDED.full_name,
        last_login = EXCLUDED.last_login;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create the trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Create login update function
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

-- Step 8: Create login update trigger
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.update_user_login();

-- Step 9: Final verification
SELECT 
    'Final verification' as status,
    'auth.users' as table_name,
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name
FROM auth.users 
WHERE email = 'anonymous21120620@gmail.com'
UNION ALL
SELECT 
    'Final verification' as status,
    'public.users' as table_name,
    id,
    email,
    full_name
FROM public.users 
WHERE email = 'anonymous21120620@gmail.com';
