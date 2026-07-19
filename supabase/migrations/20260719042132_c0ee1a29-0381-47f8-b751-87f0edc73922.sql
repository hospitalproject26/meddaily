
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['inventory','customers','distributors','orders','order_items','distributor_bills','distributor_bill_items']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN shop_id SET DEFAULT public.current_shop_id()', t);
  END LOOP;
END $$;
