-- Fix Missing User Issue
-- This script creates the missing user record and sets up automatic user creation

-- Step 1: Create the missing user record for the current user
INSERT INTO public.users (id, email, full_name, username, role, created_at, last_login)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'User'),
    'user_' || substring(au.id::text, 1, 8),
    'self-learner',
    au.created_at,
    au.last_sign_in_at
FROM auth.users au
WHERE au.id = 'fcb972dd-2d7c-46a6-b2a1-1c19e1bf5f2d'
AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Step 2: Create a function to handle new user creation
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
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        last_login = EXCLUDED.last_login;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create a trigger to automatically create users when they sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Create a function to update user login time
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

-- Step 5: Create a trigger to update login time
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.update_user_login();

-- Step 6: Verify the fix worked
SELECT 
    'Missing user created' as status,
    u.id,
    u.email,
    u.full_name,
    u.username
FROM public.users u
WHERE u.id = 'fcb972dd-2d7c-46a6-b2a1-1c19e1bf5f2d';

-- Step 7: Check if there are any other missing users
SELECT 
    'Missing users found' as status,
    COUNT(*) as missing_count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
