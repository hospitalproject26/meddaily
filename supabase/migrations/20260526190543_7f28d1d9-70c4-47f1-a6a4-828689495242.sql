
-- Roles
CREATE TYPE public.app_role AS ENUM ('Owner', 'Staff');
CREATE TYPE public.customer_type AS ENUM ('Home Delivery', 'Ordinary');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Auto-create profile + role on signup (first user = Owner)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));

  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    assigned_role := 'Owner';
  ELSE
    assigned_role := 'Staff';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Distributors
CREATE TABLE public.distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_name TEXT NOT NULL,
  mobile_number TEXT,
  address TEXT,
  medicines_available TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributors TO authenticated;
GRANT ALL ON public.distributors TO service_role;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage distributors" ON public.distributors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Owner')) WITH CHECK (public.has_role(auth.uid(), 'Owner'));

-- Inventory
CREATE TABLE public.inventory (
  serial_number BIGSERIAL PRIMARY KEY,
  id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  medicine_name TEXT NOT NULL,
  batch_no TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE,
  remaining_stock INTEGER NOT NULL DEFAULT 0,
  mrp_per_strip NUMERIC NOT NULL DEFAULT 0,
  mrp_per_tablet NUMERIC NOT NULL DEFAULT 0,
  ptr_per_strip NUMERIC NOT NULL DEFAULT 0,
  ptr_per_tablet NUMERIC NOT NULL DEFAULT 0,
  distributor_id UUID REFERENCES public.distributors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
-- Staff and Owner can read inventory (Staff needs it for billing)
CREATE POLICY "auth read inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "owners insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'Owner'));
CREATE POLICY "owners update inventory" ON public.inventory FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Owner'));
CREATE POLICY "owners delete inventory" ON public.inventory FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Owner'));

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_type public.customer_type NOT NULL DEFAULT 'Ordinary',
  customer_name TEXT NOT NULL,
  phone_number TEXT,
  address TEXT,
  next_refill_date DATE,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "owners update customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Owner'));
CREATE POLICY "owners delete customers" ON public.customers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Owner'));

-- Orders (Order Master)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  mobile_number TEXT,
  address TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_rate NUMERIC NOT NULL DEFAULT 0,
  total_discount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "owners delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Owner'));

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  medicine_name TEXT NOT NULL,
  quantity_sold INTEGER NOT NULL,
  mrp NUMERIC NOT NULL,
  discount_per_medicine NUMERIC NOT NULL DEFAULT 0,
  final_item_total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read order_items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert order_items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (true);

-- Stock deduction trigger
CREATE OR REPLACE FUNCTION public.deduct_stock_on_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT remaining_stock INTO current_stock FROM public.inventory WHERE id = NEW.inventory_id FOR UPDATE;
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
  IF NEW.quantity_sold > current_stock THEN
    RAISE EXCEPTION 'Insufficient stock for %: only % available', NEW.medicine_name, current_stock;
  END IF;
  UPDATE public.inventory SET remaining_stock = remaining_stock - NEW.quantity_sold WHERE id = NEW.inventory_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_stock
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_item();

-- Default remaining_stock = stock when inserting inventory if not provided
CREATE OR REPLACE FUNCTION public.init_remaining_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.remaining_stock IS NULL OR NEW.remaining_stock = 0 THEN
    NEW.remaining_stock := NEW.stock;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_init_remaining_stock
BEFORE INSERT ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.init_remaining_stock();
