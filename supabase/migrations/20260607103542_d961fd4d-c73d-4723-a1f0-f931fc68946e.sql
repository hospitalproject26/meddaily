
-- ============ INVENTORY enhancements ============
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS pack_size integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'strip',
  ADD COLUMN IF NOT EXISTS gst_percent numeric NOT NULL DEFAULT 0;

-- Auto-fill mrp_per_tablet / ptr_per_tablet from per-strip values when missing
CREATE OR REPLACE FUNCTION public.inventory_autofill_per_tablet()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pack_size IS NULL OR NEW.pack_size <= 0 THEN NEW.pack_size := 10; END IF;
  IF (NEW.mrp_per_tablet IS NULL OR NEW.mrp_per_tablet = 0) AND NEW.mrp_per_strip > 0 THEN
    NEW.mrp_per_tablet := ROUND((NEW.mrp_per_strip / NEW.pack_size)::numeric, 4);
  END IF;
  IF (NEW.ptr_per_tablet IS NULL OR NEW.ptr_per_tablet = 0) AND NEW.ptr_per_strip > 0 THEN
    NEW.ptr_per_tablet := ROUND((NEW.ptr_per_strip / NEW.pack_size)::numeric, 4);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_autofill ON public.inventory;
CREATE TRIGGER trg_inventory_autofill
  BEFORE INSERT OR UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.inventory_autofill_per_tablet();

-- Backfill existing rows
UPDATE public.inventory
SET mrp_per_tablet = ROUND((mrp_per_strip / NULLIF(pack_size,0))::numeric, 4)
WHERE (mrp_per_tablet IS NULL OR mrp_per_tablet = 0) AND mrp_per_strip > 0;
UPDATE public.inventory
SET ptr_per_tablet = ROUND((ptr_per_strip / NULLIF(pack_size,0))::numeric, 4)
WHERE (ptr_per_tablet IS NULL OR ptr_per_tablet = 0) AND ptr_per_strip > 0;

-- ============ ORDER_ITEMS enhancements ============
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'strip',
  ADD COLUMN IF NOT EXISTS batch_no text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount numeric NOT NULL DEFAULT 0;

-- ============ ORDERS enhancements ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS received_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'Cash',
  ADD COLUMN IF NOT EXISTS gst_amount numeric NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS orders_invoice_number_unique
  ON public.orders(invoice_number) WHERE invoice_number IS NOT NULL;

-- Auto-generate invoice number if not provided
CREATE OR REPLACE FUNCTION public.orders_autoinvoice()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_val bigint;
BEGIN
  IF NEW.invoice_number IS NULL OR length(trim(NEW.invoice_number)) = 0 THEN
    seq_val := nextval('public.inventory_serial_number_seq'); -- reuse existing seq for uniqueness
    NEW.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_autoinvoice ON public.orders;
CREATE TRIGGER trg_orders_autoinvoice
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_autoinvoice();

-- ============ Stock deduction (unit-aware) ============
CREATE OR REPLACE FUNCTION public.deduct_stock_on_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv_row RECORD;
  deduct_strips numeric;
BEGIN
  SELECT * INTO inv_row FROM public.inventory WHERE id = NEW.inventory_id FOR UPDATE;
  IF inv_row.id IS NULL THEN RAISE EXCEPTION 'Inventory item not found'; END IF;

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
END;
$$;
