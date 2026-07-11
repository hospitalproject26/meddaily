-- Metadata-only checks for orders / order_items UPDATE + DELETE RLS policies.
-- Confirms the policies exist with the expected command, role, and qualifier.
-- Safe to run with any read-capable role (no SET ROLE, no writes).
--
-- Usage: psql -v ON_ERROR_STOP=1 -f scripts/verify-rls-policies-metadata.sql

\set ON_ERROR_STOP on

DO $$
DECLARE
  r RECORD;
  expected CONSTANT text[][] := ARRAY[
    ARRAY['orders',      'UPDATE', 'Owners can update orders'],
    ARRAY['order_items', 'UPDATE', 'Owners can update order items'],
    ARRAY['order_items', 'DELETE', 'Owners can delete order items']
  ];
  i int;
  tbl text; cmd text; pol text;
  pol_row RECORD;
BEGIN
  FOR i IN 1 .. array_length(expected, 1) LOOP
    tbl := expected[i][1]; cmd := expected[i][2]; pol := expected[i][3];

    SELECT p.policyname, p.cmd, p.roles, p.qual, p.with_check
      INTO found
      FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = tbl AND p.policyname = pol;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'FAIL: policy "%" on public.% is missing', pol, tbl;
    END IF;
    IF found.cmd <> cmd THEN
      RAISE EXCEPTION 'FAIL: policy "%" on public.% has cmd=% (expected %)',
        pol, tbl, found.cmd, cmd;
    END IF;
    IF NOT ('authenticated' = ANY (found.roles)) THEN
      RAISE EXCEPTION 'FAIL: policy "%" on public.% is not scoped to authenticated (roles=%)',
        pol, tbl, found.roles;
    END IF;
    IF position('has_role' IN COALESCE(found.qual, '')) = 0 THEN
      RAISE EXCEPTION 'FAIL: policy "%" on public.% USING clause does not reference has_role: %',
        pol, tbl, found.qual;
    END IF;
    IF position('Owner' IN COALESCE(found.qual, '')) = 0 THEN
      RAISE EXCEPTION 'FAIL: policy "%" on public.% USING clause does not gate on Owner: %',
        pol, tbl, found.qual;
    END IF;
    IF cmd = 'UPDATE' AND position('has_role' IN COALESCE(found.with_check, '')) = 0 THEN
      RAISE EXCEPTION 'FAIL: policy "%" on public.% WITH CHECK clause missing has_role: %',
        pol, tbl, found.with_check;
    END IF;

    RAISE NOTICE 'PASS: %.% % policy "%"', 'public', tbl, cmd, pol;
  END LOOP;

  -- Also confirm RLS is enabled on both tables.
  FOR r IN
    SELECT c.relname, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN ('orders','order_items')
  LOOP
    IF NOT r.relrowsecurity THEN
      RAISE EXCEPTION 'FAIL: RLS is not enabled on public.%', r.relname;
    END IF;
    RAISE NOTICE 'PASS: RLS enabled on public.%', r.relname;
  END LOOP;

  RAISE NOTICE '=== ALL RLS METADATA CHECKS PASSED ===';
END $$;
