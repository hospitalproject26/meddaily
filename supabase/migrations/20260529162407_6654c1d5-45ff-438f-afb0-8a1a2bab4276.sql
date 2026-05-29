
-- Distributor billing / purchase entry
CREATE TABLE public.distributor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID REFERENCES public.distributors(id) ON DELETE SET NULL,
  distributor_name TEXT,
  invoice_number TEXT,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX distributor_bills_unique_invoice ON public.distributor_bills(distributor_id, invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX distributor_bills_date_idx ON public.distributor_bills(bill_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_bills TO authenticated;
GRANT ALL ON public.distributor_bills TO service_role;

ALTER TABLE public.distributor_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read bills" ON public.distributor_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert bills" ON public.distributor_bills FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "owners update bills" ON public.distributor_bills FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Owner'::app_role));
CREATE POLICY "owners delete bills" ON public.distributor_bills FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Owner'::app_role));

CREATE TABLE public.distributor_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.distributor_bills(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  batch_no TEXT,
  expiry_date DATE,
  quantity INTEGER NOT NULL DEFAULT 0,
  free_quantity INTEGER NOT NULL DEFAULT 0,
  ptr_per_strip NUMERIC NOT NULL DEFAULT 0,
  mrp_per_strip NUMERIC NOT NULL DEFAULT 0,
  gst_percent NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX distributor_bill_items_bill_idx ON public.distributor_bill_items(bill_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_bill_items TO authenticated;
GRANT ALL ON public.distributor_bill_items TO service_role;

ALTER TABLE public.distributor_bill_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read bill items" ON public.distributor_bill_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert bill items" ON public.distributor_bill_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "owners update bill items" ON public.distributor_bill_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Owner'::app_role));
CREATE POLICY "owners delete bill items" ON public.distributor_bill_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'Owner'::app_role));

-- Trigger: when a bill item is inserted, upsert/update the inventory row
CREATE OR REPLACE FUNCTION public.apply_purchase_to_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  add_qty INTEGER;
BEGIN
  add_qty := COALESCE(NEW.quantity, 0) + COALESCE(NEW.free_quantity, 0);

  IF NEW.inventory_id IS NOT NULL THEN
    SELECT * INTO inv FROM public.inventory WHERE id = NEW.inventory_id FOR UPDATE;
  END IF;

  IF inv.id IS NULL AND NEW.medicine_name IS NOT NULL THEN
    SELECT * INTO inv FROM public.inventory
      WHERE lower(medicine_name) = lower(NEW.medicine_name)
        AND (NEW.batch_no IS NULL OR batch_no IS NOT DISTINCT FROM NEW.batch_no)
      ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  END IF;

  IF inv.id IS NULL THEN
    INSERT INTO public.inventory (medicine_name, batch_no, expiry_date, stock, remaining_stock, mrp_per_strip, ptr_per_strip, distributor_id)
    VALUES (NEW.medicine_name, NEW.batch_no, NEW.expiry_date, add_qty, add_qty, NEW.mrp_per_strip, NEW.ptr_per_strip,
      (SELECT distributor_id FROM public.distributor_bills WHERE id = NEW.bill_id))
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
END;
$$;

CREATE TRIGGER trg_apply_purchase_to_inventory
BEFORE INSERT ON public.distributor_bill_items
FOR EACH ROW EXECUTE FUNCTION public.apply_purchase_to_inventory();
