
-- 1) is_active on shops
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2) Auto-promote bootstrap SuperAdmin on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  IF lower(NEW.email) = 'umarsa0510@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'SuperAdmin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

-- 3) If user already exists, promote now
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'SuperAdmin'::public.app_role
FROM auth.users
WHERE lower(email) = 'umarsa0510@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
