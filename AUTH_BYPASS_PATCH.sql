-- Auth Bypass & Optimization Patch for Development
-- Disables email verification and auto-confirms existing and new users

-- 1. Auto-confirm all existing users in auth.users
UPDATE auth.users 
SET email_confirmed_at = now(), 
    last_sign_in_at = now()
WHERE email_confirmed_at IS NULL;

-- 2. Create a trigger to auto-confirm new users (Safe for Dev/Staging only)
CREATE OR REPLACE FUNCTION public.handle_auto_confirm()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = now();
  -- NEW.confirmed_at = now(); -- Removed as it's a generated column in some environments
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auto_confirm();

-- 3. Ensure profiles are always active
UPDATE public.profiles SET account_status = 'active';

-- 4. Set roles for the test accounts if they exist (forcing consistency)
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@university.edu';
UPDATE public.profiles SET role = 'coordinator' WHERE email = 'coord@test.com';
UPDATE public.profiles SET role = 'student' WHERE email = 'student@test.com';

-- 5. Link coord@test.com to the newly created 'Tech Club' if it exists
DO $$
DECLARE
    v_club_id UUID;
    v_coord_id UUID;
BEGIN
    SELECT id INTO v_club_id FROM public.clubs WHERE name = 'Tech Club' LIMIT 1;
    SELECT id INTO v_coord_id FROM public.profiles WHERE email = 'coord@test.com' LIMIT 1;
    
    IF v_club_id IS NOT NULL AND v_coord_id IS NOT NULL THEN
        UPDATE public.profiles SET club_id = v_club_id WHERE id = v_coord_id;
        UPDATE public.clubs SET coordinator_id = v_coord_id WHERE id = v_club_id;
    END IF;
END $$;
