
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;

CREATE SEQUENCE IF NOT EXISTS public.shops_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_shop_code(_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  prefix text;
  candidate text;
  n bigint;
BEGIN
  prefix := upper(regexp_replace(COALESCE(_name,''), '[^A-Za-z]', '', 'g'));
  IF length(prefix) < 3 THEN
    prefix := rpad(prefix, 3, 'X');
  ELSE
    prefix := substr(prefix, 1, 3);
  END IF;
  LOOP
    n := nextval('public.shops_code_seq');
    candidate := prefix || lpad(n::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.shops WHERE code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.shops_autofill_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR length(trim(NEW.code)) = 0 THEN
    NEW.code := public.generate_shop_code(NEW.name);
  ELSE
    NEW.code := upper(trim(NEW.code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shops_autofill_code ON public.shops;
CREATE TRIGGER trg_shops_autofill_code
  BEFORE INSERT ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.shops_autofill_code();

-- Backfill existing shops
UPDATE public.shops
   SET code = public.generate_shop_code(name)
 WHERE code IS NULL OR length(trim(code)) = 0;

ALTER TABLE public.shops
  ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shops_code_key ON public.shops (code);
