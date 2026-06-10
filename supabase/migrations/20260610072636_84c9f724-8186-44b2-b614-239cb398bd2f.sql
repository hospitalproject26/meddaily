
-- Trigger / system-only functions: revoke from PUBLIC, anon, authenticated.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deduct_stock_on_item() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.init_remaining_stock() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_purchase_to_inventory() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_autofill_per_tablet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_autoinvoice() FROM PUBLIC, anon, authenticated;

-- Role-check helpers: keep usable for authenticated (needed by RLS policies), block anon.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
