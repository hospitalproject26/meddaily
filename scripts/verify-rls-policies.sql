-- Automated checks for orders / order_items UPDATE + DELETE RLS policies.
-- Verifies an Owner is allowed and a Staff user is denied.
-- Runs inside a single transaction and ROLLBACKs at the end so no data changes.
--
-- Requires at least one user with role 'Owner' and one with 'Staff' in public.user_roles.
-- Usage: psql -v ON_ERROR_STOP=1 -f scripts/verify-rls-policies.sql

\set ON_ERROR_STOP on
BEGIN;

-- Pick a real Owner and a real Staff user (has_role reads public.user_roles by user_id).
SELECT user_id AS owner_id FROM public.user_roles WHERE role = 'Owner' LIMIT 1 \gset
SELECT user_id AS staff_id FROM public.user_roles WHERE role = 'Staff' LIMIT 1 \gset

\if :{?owner_id}
\else
  \echo 'FAIL: no Owner user_role exists to test with'
  \q
\endif
\if :{?staff_id}
\else
  \echo 'FAIL: no Staff user_role exists to test with'
  \q
\endif

-- Seed a throwaway order + two order_items scoped to this transaction.
WITH inv AS (SELECT id FROM public.inventory LIMIT 1),
     o AS (
       INSERT INTO public.orders (customer_name, total_amount)
       VALUES ('RLS-TEST', 0) RETURNING id
     ),
     i AS (
       INSERT INTO public.order_items
         (order_id, inventory_id, medicine_name, mrp, quantity_sold, final_item_total)
       SELECT o.id, inv.id, 'RLS-TEST-A', 0, 1, 0 FROM o, inv
       UNION ALL
       SELECT o.id, inv.id, 'RLS-TEST-B', 0, 1, 0 FROM o, inv
       RETURNING id, medicine_name
     )
SELECT
  (SELECT id FROM o)                                  AS order_id,
  (SELECT id FROM i WHERE medicine_name='RLS-TEST-A') AS item_a,
  (SELECT id FROM i WHERE medicine_name='RLS-TEST-B') AS item_b
\gset

CREATE OR REPLACE FUNCTION pg_temp.expect(label text, got int, want int) RETURNS void AS $$
BEGIN
  IF got <> want THEN
    RAISE EXCEPTION 'FAIL [%]: expected % row(s), got %', label, want, got;
  END IF;
  RAISE NOTICE 'PASS [%]: % row(s)', label, got;
END $$ LANGUAGE plpgsql;

-- ============================================================
-- OWNER: UPDATE + DELETE must affect the row
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', :'owner_id', 'role', 'authenticated')::text, true);

WITH u AS (
  UPDATE public.orders SET customer_name = 'RLS-TEST-OWNER'
   WHERE id = :'order_id'::uuid RETURNING 1
) SELECT pg_temp.expect('owner update orders', (SELECT count(*)::int FROM u), 1);

WITH u AS (
  UPDATE public.order_items SET medicine_name = 'RLS-TEST-OWNER'
   WHERE id = :'item_a'::uuid RETURNING 1
) SELECT pg_temp.expect('owner update order_items', (SELECT count(*)::int FROM u), 1);

WITH d AS (
  DELETE FROM public.order_items WHERE id = :'item_a'::uuid RETURNING 1
) SELECT pg_temp.expect('owner delete order_items', (SELECT count(*)::int FROM d), 1);

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);

-- ============================================================
-- STAFF: UPDATE + DELETE must be blocked (0 rows affected)
-- ============================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', :'staff_id', 'role', 'authenticated')::text, true);

WITH u AS (
  UPDATE public.orders SET customer_name = 'RLS-TEST-STAFF'
   WHERE id = :'order_id'::uuid RETURNING 1
) SELECT pg_temp.expect('staff update orders blocked', (SELECT count(*)::int FROM u), 0);

WITH u AS (
  UPDATE public.order_items SET medicine_name = 'RLS-TEST-STAFF'
   WHERE id = :'item_b'::uuid RETURNING 1
) SELECT pg_temp.expect('staff update order_items blocked', (SELECT count(*)::int FROM u), 0);

WITH d AS (
  DELETE FROM public.order_items WHERE id = :'item_b'::uuid RETURNING 1
) SELECT pg_temp.expect('staff delete order_items blocked', (SELECT count(*)::int FROM d), 0);

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);

-- Confirm the Owner-side UPDATE actually persisted (checked as superuser).
SELECT pg_temp.expect(
  'owner update persisted (orders)',
  (SELECT count(*)::int FROM public.orders
     WHERE id = :'order_id'::uuid AND customer_name = 'RLS-TEST-OWNER'),
  1);

SELECT '=== ALL RLS CHECKS PASSED ===' AS result;

ROLLBACK;
