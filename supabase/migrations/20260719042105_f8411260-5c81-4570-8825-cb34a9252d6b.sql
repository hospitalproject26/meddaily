
-- SHOPS table
CREATE TABLE IF NOT EXISTS public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT ALL ON public.shops TO service_role;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- SHOP MEMBERS table
CREATE TABLE IF NOT EXISTS public.shop_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Staff' CHECK (role IN ('Admin','Staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);
CREATE INDEX IF NOT EXISTS shop_members_user_idx ON public.shop_members(user_id);
CREATE INDEX IF NOT EXISTS shop_members_shop_idx ON public.shop_members(shop_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_members TO authenticated;
GRANT ALL ON public.shop_members TO service_role;
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;

-- Security-definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_shop_member(_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_members
    WHERE user_id = auth.uid() AND shop_id = _shop_id
  ) OR public.has_role(auth.uid(), 'SuperAdmin'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_shop_admin(_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_members
    WHERE user_id = auth.uid() AND shop_id = _shop_id AND role = 'Admin'
  ) OR public.has_role(auth.uid(), 'SuperAdmin'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.current_shop_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT shop_id FROM public.shop_members WHERE user_id = auth.uid() ORDER BY created_at ASC LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.is_shop_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shop_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_shop_id() TO authenticated;

-- RLS on shops & shop_members
DROP POLICY IF EXISTS "members read shops" ON public.shops;
CREATE POLICY "members read shops" ON public.shops FOR SELECT TO authenticated
  USING (public.is_shop_member(id));
DROP POLICY IF EXISTS "admins update shops" ON public.shops;
CREATE POLICY "admins update shops" ON public.shops FOR UPDATE TO authenticated
  USING (public.is_shop_admin(id)) WITH CHECK (public.is_shop_admin(id));
DROP POLICY IF EXISTS "superadmin manage shops" ON public.shops;
CREATE POLICY "superadmin manage shops" ON public.shops FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'SuperAdmin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'SuperAdmin'::public.app_role));

DROP POLICY IF EXISTS "members read own membership" ON public.shop_members;
CREATE POLICY "members read own membership" ON public.shop_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_shop_admin(shop_id));
DROP POLICY IF EXISTS "admins manage members" ON public.shop_members;
CREATE POLICY "admins manage members" ON public.shop_members FOR ALL TO authenticated
  USING (public.is_shop_admin(shop_id)) WITH CHECK (public.is_shop_admin(shop_id));

-- BACKFILL: create Default Pharmacy for existing Owner, add all existing role-holders as members
DO $$
DECLARE
  v_owner uuid;
  v_shop uuid;
  r RECORD;
BEGIN
  SELECT user_id INTO v_owner FROM public.user_roles WHERE role = 'Owner' ORDER BY 1 LIMIT 1;

  IF v_owner IS NULL THEN
    SELECT id INTO v_owner FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;

  IF v_owner IS NOT NULL THEN
    INSERT INTO public.shops (name, owner_user_id) VALUES ('Default Pharmacy', v_owner) RETURNING id INTO v_shop;

    FOR r IN SELECT user_id, role FROM public.user_roles LOOP
      INSERT INTO public.shop_members (shop_id, user_id, role)
      VALUES (v_shop, r.user_id, CASE WHEN r.role = 'Owner' THEN 'Admin' ELSE 'Staff' END)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Add shop_id to all business tables (nullable → backfill → NOT NULL)
DO $$
DECLARE
  v_shop uuid;
  t text;
BEGIN
  SELECT id INTO v_shop FROM public.shops ORDER BY created_at LIMIT 1;

  FOREACH t IN ARRAY ARRAY['inventory','customers','distributors','orders','order_items','distributor_bills','distributor_bill_items']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE', t);
    IF v_shop IS NOT NULL THEN
      EXECUTE format('UPDATE public.%I SET shop_id = %L WHERE shop_id IS NULL', t, v_shop);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN shop_id SET NOT NULL', t);
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(shop_id)', t||'_shop_idx', t);
  END LOOP;
END $$;

-- Auto-stamp shop_id trigger
CREATE OR REPLACE FUNCTION public.autofill_shop_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.current_shop_id();
  END IF;
  IF NEW.shop_id IS NULL THEN
    RAISE EXCEPTION 'No shop assigned for user %; must be a member of a shop before creating records', auth.uid();
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['inventory','customers','distributors','orders','order_items','distributor_bills','distributor_bill_items']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_autofill_shop_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_autofill_shop_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.autofill_shop_id()', t);
  END LOOP;
END $$;

-- Cascade shop_id from parent into stock-deduction trigger; enforce same-shop
CREATE OR REPLACE FUNCTION public.deduct_stock_on_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv_row RECORD;
  deduct_strips numeric;
BEGIN
  SELECT * INTO inv_row FROM public.inventory WHERE id = NEW.inventory_id FOR UPDATE;
  IF inv_row.id IS NULL THEN RAISE EXCEPTION 'Inventory item not found'; END IF;

  IF inv_row.shop_id IS DISTINCT FROM NEW.shop_id THEN
    RAISE EXCEPTION 'Inventory item belongs to another shop';
  END IF;

  IF NEW.unit_type = 'tablet' THEN
    deduct_strips := NEW.quantity_sold::numeric / GREATEST(inv_row.pack_size, 1);
  ELSE
    deduct_strips := NEW.quantity_sold::numeric;
  END IF;

  IF deduct_strips > inv_row.remaining_stock THEN
    RAISE EXCEPTION 'Insufficient stock for %: only % available', NEW.medicine_name, inv_row.remaining_stock;
  END IF;

  UPDATE public.inventory
    SET remaining_stock = remaining_stock - CEIL(deduct_strips)::integer
    WHERE id = inv_row.id;
  RETURN NEW;
END $$;

-- Purchase-to-inventory: scope inventory upsert to same shop
CREATE OR REPLACE FUNCTION public.apply_purchase_to_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
  add_qty INTEGER;
  v_shop uuid;
  v_dist uuid;
BEGIN
  add_qty := COALESCE(NEW.quantity, 0) + COALESCE(NEW.free_quantity, 0);
  SELECT shop_id, distributor_id INTO v_shop, v_dist FROM public.distributor_bills WHERE id = NEW.bill_id;
  NEW.shop_id := v_shop;

  IF NEW.inventory_id IS NOT NULL THEN
    SELECT * INTO inv FROM public.inventory WHERE id = NEW.inventory_id AND shop_id = v_shop FOR UPDATE;
  END IF;

  IF inv.id IS NULL AND NEW.medicine_name IS NOT NULL THEN
    SELECT * INTO inv FROM public.inventory
      WHERE shop_id = v_shop
        AND lower(medicine_name) = lower(NEW.medicine_name)
        AND (NEW.batch_no IS NULL OR batch_no IS NOT DISTINCT FROM NEW.batch_no)
      ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  END IF;

  IF inv.id IS NULL THEN
    INSERT INTO public.inventory (medicine_name, batch_no, expiry_date, stock, remaining_stock, mrp_per_strip, ptr_per_strip, distributor_id, shop_id)
    VALUES (NEW.medicine_name, NEW.batch_no, NEW.expiry_date, add_qty, add_qty, NEW.mrp_per_strip, NEW.ptr_per_strip, v_dist, v_shop)
    RETURNING * INTO inv;
  ELSE
    UPDATE public.inventory SET
      stock = stock + add_qty,
      remaining_stock = remaining_stock + add_qty,
      mrp_per_strip = COALESCE(NULLIF(NEW.mrp_per_strip,0), mrp_per_strip),
      ptr_per_strip = COALESCE(NULLIF(NEW.ptr_per_strip,0), ptr_per_strip),
      expiry_date = COALESCE(NEW.expiry_date, expiry_date),
      batch_no = COALESCE(NEW.batch_no, batch_no)
    WHERE id = inv.id;
  END IF;

  NEW.inventory_id := inv.id;
  RETURN NEW;
END $$;

-- Replace RLS policies with shop-scoped versions
-- INVENTORY
DROP POLICY IF EXISTS "auth read inventory" ON public.inventory;
DROP POLICY IF EXISTS "owners insert inventory" ON public.inventory;
DROP POLICY IF EXISTS "owners update inventory" ON public.inventory;
DROP POLICY IF EXISTS "owners delete inventory" ON public.inventory;
CREATE POLICY "shop read inventory" ON public.inventory FOR SELECT TO authenticated USING (public.is_shop_member(shop_id));
CREATE POLICY "shop insert inventory" ON public.inventory FOR INSERT TO authenticated
  WITH CHECK (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));
CREATE POLICY "shop update inventory" ON public.inventory FOR UPDATE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role))
  WITH CHECK (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));
CREATE POLICY "shop delete inventory" ON public.inventory FOR DELETE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));

-- CUSTOMERS
DROP POLICY IF EXISTS "auth read customers" ON public.customers;
DROP POLICY IF EXISTS "auth insert customers" ON public.customers;
DROP POLICY IF EXISTS "owners update customers" ON public.customers;
DROP POLICY IF EXISTS "owners delete customers" ON public.customers;
CREATE POLICY "shop read customers" ON public.customers FOR SELECT TO authenticated USING (public.is_shop_member(shop_id));
CREATE POLICY "shop insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "shop update customers" ON public.customers FOR UPDATE TO authenticated
  USING (public.is_shop_member(shop_id)) WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "shop delete customers" ON public.customers FOR DELETE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));

-- DISTRIBUTORS
DROP POLICY IF EXISTS "owners manage distributors" ON public.distributors;
CREATE POLICY "shop read distributors" ON public.distributors FOR SELECT TO authenticated USING (public.is_shop_member(shop_id));
CREATE POLICY "shop manage distributors" ON public.distributors FOR ALL TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role))
  WITH CHECK (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));

-- ORDERS
DROP POLICY IF EXISTS "auth read orders" ON public.orders;
DROP POLICY IF EXISTS "auth insert orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can update orders" ON public.orders;
DROP POLICY IF EXISTS "owners delete orders" ON public.orders;
CREATE POLICY "shop read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_shop_member(shop_id));
CREATE POLICY "shop insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "shop update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role))
  WITH CHECK (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));
CREATE POLICY "shop delete orders" ON public.orders FOR DELETE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));

-- ORDER_ITEMS
DROP POLICY IF EXISTS "auth read order_items" ON public.order_items;
DROP POLICY IF EXISTS "auth insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Owners can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Owners can delete order items" ON public.order_items;
CREATE POLICY "shop read order_items" ON public.order_items FOR SELECT TO authenticated USING (public.is_shop_member(shop_id));
CREATE POLICY "shop insert order_items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "shop update order_items" ON public.order_items FOR UPDATE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role))
  WITH CHECK (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));
CREATE POLICY "shop delete order_items" ON public.order_items FOR DELETE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));

-- DISTRIBUTOR_BILLS
DROP POLICY IF EXISTS "auth read bills" ON public.distributor_bills;
DROP POLICY IF EXISTS "auth insert bills" ON public.distributor_bills;
DROP POLICY IF EXISTS "owners update bills" ON public.distributor_bills;
DROP POLICY IF EXISTS "owners delete bills" ON public.distributor_bills;
CREATE POLICY "shop read bills" ON public.distributor_bills FOR SELECT TO authenticated USING (public.is_shop_member(shop_id));
CREATE POLICY "shop insert bills" ON public.distributor_bills FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "shop update bills" ON public.distributor_bills FOR UPDATE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role))
  WITH CHECK (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));
CREATE POLICY "shop delete bills" ON public.distributor_bills FOR DELETE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));

-- DISTRIBUTOR_BILL_ITEMS
DROP POLICY IF EXISTS "auth read bill items" ON public.distributor_bill_items;
DROP POLICY IF EXISTS "auth insert bill items" ON public.distributor_bill_items;
DROP POLICY IF EXISTS "owners update bill items" ON public.distributor_bill_items;
DROP POLICY IF EXISTS "owners delete bill items" ON public.distributor_bill_items;
CREATE POLICY "shop read bill items" ON public.distributor_bill_items FOR SELECT TO authenticated USING (public.is_shop_member(shop_id));
CREATE POLICY "shop insert bill items" ON public.distributor_bill_items FOR INSERT TO authenticated WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "shop update bill items" ON public.distributor_bill_items FOR UPDATE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role))
  WITH CHECK (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));
CREATE POLICY "shop delete bill items" ON public.distributor_bill_items FOR DELETE TO authenticated
  USING (public.is_shop_admin(shop_id) OR public.has_role(auth.uid(),'Owner'::public.app_role));

-- Invite-only signups: only create profile (no shop, no legacy role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
