
-- 1. Let SuperAdmins read all profiles (needed to display pending users)
DROP POLICY IF EXISTS "superadmin read all profiles" ON public.profiles;
CREATE POLICY "superadmin read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'SuperAdmin'::public.app_role));

-- 2. Block suspended shops from all member access (SuperAdmin bypasses)
CREATE OR REPLACE FUNCTION public.is_shop_member(_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'SuperAdmin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.shop_members sm
      JOIN public.shops s ON s.id = sm.shop_id
      WHERE sm.user_id = auth.uid()
        AND sm.shop_id = _shop_id
        AND s.is_active = true
    )
$$;

CREATE OR REPLACE FUNCTION public.is_shop_admin(_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'SuperAdmin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.shop_members sm
      JOIN public.shops s ON s.id = sm.shop_id
      WHERE sm.user_id = auth.uid()
        AND sm.shop_id = _shop_id
        AND sm.role = 'Admin'
        AND s.is_active = true
    )
$$;

CREATE OR REPLACE FUNCTION public.current_shop_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.shop_id
  FROM public.shop_members sm
  JOIN public.shops s ON s.id = sm.shop_id
  WHERE sm.user_id = auth.uid()
    AND s.is_active = true
  ORDER BY sm.created_at ASC
  LIMIT 1
$$;

-- 3. Helper: is current user pending (no membership, not SuperAdmin)
CREATE OR REPLACE FUNCTION public.my_assignment_status()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'SuperAdmin'::public.app_role) THEN 'superadmin'
    WHEN EXISTS (
      SELECT 1 FROM public.shop_members sm
      JOIN public.shops s ON s.id = sm.shop_id
      WHERE sm.user_id = auth.uid() AND s.is_active = true
    ) THEN 'active'
    WHEN EXISTS (
      SELECT 1 FROM public.shop_members sm
      JOIN public.shops s ON s.id = sm.shop_id
      WHERE sm.user_id = auth.uid() AND s.is_active = false
    ) THEN 'suspended'
    ELSE 'pending'
  END
$$;

GRANT EXECUTE ON FUNCTION public.my_assignment_status() TO authenticated;

-- 4. Helper view/function for SuperAdmin to list pending users
CREATE OR REPLACE FUNCTION public.list_pending_users()
RETURNS TABLE(id uuid, email text, name text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.name, p.created_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'SuperAdmin'::public.app_role)
    AND NOT EXISTS (SELECT 1 FROM public.shop_members sm WHERE sm.user_id = p.id)
    AND NOT public.has_role(p.id, 'SuperAdmin'::public.app_role)
  ORDER BY p.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.list_pending_users() TO authenticated;

-- 5. Ensure shop_members has unique (user_id) so a user belongs to at most one shop.
-- (Use partial constraint: drop existing if any then add)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shop_members_user_unique'
  ) THEN
    -- clean any duplicates keeping earliest
    DELETE FROM public.shop_members a USING public.shop_members b
      WHERE a.user_id = b.user_id AND a.created_at > b.created_at;
    ALTER TABLE public.shop_members ADD CONSTRAINT shop_members_user_unique UNIQUE (user_id);
  END IF;
END $$;
