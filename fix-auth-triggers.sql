-- Fix Authentication Triggers for user_data Table
-- This script updates the database triggers to work with the consolidated user_data table

-- Step 1: Drop existing triggers that reference public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

-- Step 2: Drop existing functions that reference public.users
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_auth_conflict();
DROP FUNCTION IF EXISTS public.update_user_login();

-- Step 3: Create new function to handle user creation in user_data table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the new user into the public.user_data table
    INSERT INTO public.user_data (user_id, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Create function to handle user updates (login, profile changes)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user_data table when user signs in
    UPDATE public.user_data 
    SET updated_at = NOW()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger for user updates
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Step 7: Create function to update login times
CREATE OR REPLACE FUNCTION public.update_user_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp in public.user_data when user signs in
    UPDATE public.user_data 
    SET updated_at = NOW()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create the login update trigger
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.update_user_login();

-- Step 9: Verify the setup
SELECT 
    'Setup Complete' as status,
    'Triggers and functions updated to use user_data table' as message;
