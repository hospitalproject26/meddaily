#!/usr/bin/env bash
# Automated RLS policy checks for orders + order_items.
#
# Runs two layers:
#   1. Metadata check (works with any read role) — asserts each Owner-only
#      UPDATE/DELETE policy exists with the right command, role, and clause.
#   2. Behavioral check (needs a role that can SET ROLE authenticated —
#      e.g. postgres / service role connection) — impersonates one real
#      Owner user and one Staff user, asserts Owner writes succeed and
#      Staff writes are silently blocked by RLS. Rolled back at the end.
#
# Requires: psql on PATH and PG* env vars (PGHOST, PGUSER, PGPASSWORD, ...).
set -u
here="$(cd "$(dirname "$0")" && pwd)"

if [ -z "${PGHOST:-}" ]; then
  echo "ERROR: PG* env vars not set; cannot run checks." >&2
  exit 2
fi

fail=0

echo "── Metadata checks ─────────────────────────────────────────"
if ! psql -v ON_ERROR_STOP=1 -f "$here/verify-rls-policies-metadata.sql"; then
  echo "Metadata checks FAILED" >&2
  fail=1
fi

echo
echo "── Behavioral checks (Owner allowed / Staff blocked) ───────"
out=$(psql -v ON_ERROR_STOP=1 -f "$here/verify-rls-policies.sql" 2>&1)
status=$?
echo "$out"
if [ $status -ne 0 ]; then
  if echo "$out" | grep -q 'permission denied to set role'; then
    echo
    echo "NOTE: current DB role cannot SET ROLE authenticated, so the"
    echo "behavioral layer was skipped. Re-run this script with a"
    echo "privileged connection (postgres / service_role) to exercise it."
  else
    fail=1
  fi
fi

if [ $fail -ne 0 ]; then
  echo "RLS checks FAILED" >&2
  exit 1
fi
echo "All available RLS checks passed."
