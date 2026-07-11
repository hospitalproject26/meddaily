-- Automated checks for orders / order_items UPDATE + DELETE RLS policies.
-- Verifies Owner is allowed and Staff is denied.
-- Runs inside a single transaction and ROLLBACKs at the end so no data changes.
--
-- Usage: psql -v ON_ERROR_STOP=1 -f scripts/verify-rls-policies.sql

\set ON_ERROR_STOP on
BEGIN;

-- Fixed UUIDs for reproducible assertions.
\set owner_id   '11111111-1111-1111-1111-1111111111aa'
\set staff_id   '22222222-2222-2222-2222-2222222222bb'
\set order_id   '33333333-3333-3333-3333-3333333333cc'
\set item_id_a  '44444444-4444-4444-4444-4444444444dd'
\set item_id_b  '55555555-5555-5555-5555-5555555555ee'

-- Seed roles. Bypasses FK to auth.users by disabling triggers on user_roles for this tx only.
SET LOCAL session_replication_role = replica;
INSERT INTO public.user_roles (user_id, role) VALUES
  (:'owner_id'::uuid, 'Owner'),
  (:'staff_id'::uuid, 'Staff');
SET LOCAL session_replication_role = origin;

-- Seed an order + two items to update/delete against.
INSERT INTO public.orders (id, customer_name, total_amount)
  VALUES (:'order_id'::uuid, 'RLS-TEST', 0);

INSERT INTO public.order_items
  (id, order_id, inventory_id, medicine_name, mrp, quantity_sold, final_item_total)
VALUES
  (:'item_id_a'::uuid, :'order_id'::uuid,
   (SELECT id FROM public.inventory LIMIT 1), 'RLS-TEST-A', 0, 1, 0),
  (:'item_id_b'::uuid, :'order_id'::uuid,
   (SELECT id FROM public.inventory LIMIT 1), 'RLS-TEST-B', 0, 1, 0);

-- Helper: raise if a count doesn't match expected.
CREATE OR REPLACE FUNCTION pg_temp.expect(label text, got int, want int) RETURNS void AS $$
BEGIN
  IF got <> want THEN
    RAISE EXCEPTION 'FAIL [%]: expected % row(s), got %', label, want, got;
  END IF;
  RAISE NOTICE 'PASS [%]: % row(s)', label, got;
END $$ LANGUAGE plpgsql;

-- ============================================================
-- OWNER: UPDATE + DELETE should affect the row
-- ============================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"11111111-1111-1111-1111-1111111111aa","role":"authenticated"}';

WITH u AS (
  UPDATE public.orders SET customer_name = 'RLS-TEST-OWNER'
   WHERE id = '33333333-3333-3333-3333-3333333333cc'::uuid
  RETURNING 1
) SELECT pg_temp.expect('owner update orders', (SELECT count(*)::int FROM u), 1);

WITH u AS (
  UPDATE public.order_items SET medicine_name = 'RLS-TEST-OWNER'
   WHERE id = '44444444-4444-4444-4444-4444444444dd'::uuid
  RETURNING 1
) SELECT pg_temp.expect('owner update order_items', (SELECT count(*)::int FROM u), 1);

WITH d AS (
  DELETE FROM public.order_items
   WHERE id = '44444444-4444-4444-4444-4444444444dd'::uuid
  RETURNING 1
) SELECT pg_temp.expect('owner delete order_items', (SELECT count(*)::int FROM d), 1);

RESET ROLE;
RESET "request.jwt.claims";

-- ============================================================
-- STAFF: UPDATE + DELETE should be blocked (0 rows affected)
-- ============================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"22222222-2222-2222-2222-2222222222bb","role":"authenticated"}';

WITH u AS (
  UPDATE public.orders SET customer_name = 'RLS-TEST-STAFF'
   WHERE id = '33333333-3333-3333-3333-3333333333cc'::uuid
  RETURNING 1
) SELECT pg_temp.expect('staff update orders blocked', (SELECT count(*)::int FROM u), 0);

WITH u AS (
  UPDATE public.order_items SET medicine_name = 'RLS-TEST-STAFF'
   WHERE id = '55555555-5555-5555-5555-5555555555ee'::uuid
  RETURNING 1
) SELECT pg_temp.expect('staff update order_items blocked', (SELECT count(*)::int FROM u), 0);

WITH d AS (
  DELETE FROM public.order_items
   WHERE id = '55555555-5555-5555-5555-5555555555ee'::uuid
  RETURNING 1
) SELECT pg_temp.expect('staff delete order_items blocked', (SELECT count(*)::int FROM d), 0);

RESET ROLE;
RESET "request.jwt.claims";

-- Confirm the Owner-side changes were actually visible (as superuser again).
SELECT pg_temp.expect(
  'owner update persisted (orders)',
  (SELECT count(*)::int FROM public.orders
    WHERE id = :'order_id'::uuid AND customer_name = 'RLS-TEST-OWNER'),
  1
);

SELECT '=== ALL RLS CHECKS PASSED ===' AS result;

ROLLBACK;
