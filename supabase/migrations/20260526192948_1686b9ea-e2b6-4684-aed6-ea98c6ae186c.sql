
-- 1. Privilege escalation: explicit restrictive deny on user_roles writes
CREATE POLICY "deny insert user_roles" ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "deny update user_roles" ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "deny delete user_roles" ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- 2. Revoke EXECUTE on SECURITY DEFINER functions from public/anon/authenticated.
-- They are used internally (RLS policies, triggers) and don't need to be callable via API.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_stock_on_item() FROM PUBLIC, anon, authenticated;

-- 3. Fix mutable search_path on init_remaining_stock
CREATE OR REPLACE FUNCTION public.init_remaining_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.remaining_stock IS NULL OR NEW.remaining_stock = 0 THEN
    NEW.remaining_stock := NEW.stock;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Tighten always-true insert policies: require authenticated user
DROP POLICY IF EXISTS "auth insert customers" ON public.customers;
CREATE POLICY "auth insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth insert orders" ON public.orders;
CREATE POLICY "auth insert orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth insert order_items" ON public.order_items
;
CREATE POLICY "auth insert order_items" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
