-- Simple Fix: Delete the conflicting user record
-- This will allow the auth user to be created properly

-- Step 1: Delete the conflicting user record from public.users
DELETE FROM public.users 
WHERE email = 'anonymous21120620@gmail.com' 
AND id = 'd8ec3157-6c68-4453-8ca7-c71da61fffa4';

-- Step 2: Verify the deletion
SELECT 
    'User deleted' as status,
    COUNT(*) as remaining_users_with_email
FROM public.users 
WHERE email = 'anonymous21120620@gmail.com';

-- Step 3: Set up automatic user creation for future users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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

-- Step 4: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Test - the user should now be created automatically when they access the search
SELECT 'Fix complete - user will be created automatically on next login' as status;
