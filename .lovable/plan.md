# Smart Pharmacy Hub → Multi-Tenant SaaS Upgrade

This is a very large scope. To ship safely without breaking your live data, I'll split it into **5 phases**. Each phase is independently shippable, reviewed, and reversible. You approve one at a time.

## Phase 1 — Multi-tenancy foundation (data + RLS) [SHIP FIRST]

Goal: every row belongs to a shop; users only see their shop's data. Zero data loss.

**Database migration (single transaction):**
1. Create `shops` table (name, owner_user_id, plan, created_at).
2. Create `shop_members` table (shop_id, user_id, role: 'Admin' | 'Staff') — replaces reliance on `user_roles` for shop scope. Keep existing `user_roles` for the new `SuperAdmin` role.
3. Add `SuperAdmin` to the `app_role` enum.
4. Backfill: create ONE shop for the existing Owner, add all current users as members of it, stamp `shop_id` on every existing row in inventory / customers / distributors / orders / order_items / distributor_bills / distributor_bill_items.
5. Add `shop_id uuid NOT NULL` (after backfill) + FK to `shops` on all 8 business tables + indexes.
6. Update `handle_new_user` trigger: new signups create their own shop and become its Admin (or join via invite — Phase 4).
7. Rewrite RLS policies on all business tables: `USING (shop_id IN (SELECT shop_id FROM shop_members WHERE user_id = auth.uid())) OR has_role(auth.uid(),'SuperAdmin')`.
8. Update stock/purchase triggers to preserve `shop_id` on cascaded inserts.

**Code changes:** add `shop_id` to every insert in billing / inventory / customers / distributors / purchases; reads stay the same (RLS filters).

**Verification:** psql checks that row counts pre/post match and every row has a shop_id.

## Phase 2 — SuperAdmin console

- `/admin` route gated to `SuperAdmin` role
- Shops list, per-shop analytics, user management (invite/remove/change role), impersonate-shop toggle (sets an admin-only shop filter override), global KPIs.

## Phase 3 — UI polish pass

Applied consistently across existing tabs (no feature removal):
- Sticky headers + horizontal scroll on all tables (already done on Inventory — extend to Sales, Purchases, Customers, Distributors)
- Column visibility toggle, sort, search, filters on each table
- KPI cards refresh on Dashboard (Sales, Profit, Low Stock, Expiry) with skeletons
- Dark mode toggle, refined tokens in `styles.css` (Apple/Stripe-inspired: neutral surfaces, single accent, tighter type scale)
- Loading skeletons + toast standardisation
- Fix remaining flicker: remove any leftover GPU-composite hacks, memoize heavy rows, virtualize long tables
- Keyboard shortcuts (`/` search, `g i` inventory, `g b` billing, etc.)

## Phase 4 — Roles, invites, audit

- Owner / Admin / Staff permissions enforced by RLS + UI gates
- Invite-by-email flow (magic link → auto-join shop)
- `audit_logs` table + trigger on business tables (who/what/when)

## Phase 5 — Ops & future-ready

- Vercel deploy config (already on Cloudflare via Lovable — I'll document, not migrate, unless you confirm Vercel)
- Expiry alerts (daily cron via `pg_cron` → server route)
- Barcode scan input on Billing (uses existing camera → decode with `@zxing/browser`)
- WhatsApp/PDF share polish (already partly built)
- Offline-ready scaffolding: IndexedDB queue for Billing writes (opt-in flag, real sync is a separate large project)
- Subscription plans: `shops.plan` column + gating hooks, Stripe wiring only when you're ready

---

## Technical notes

- Existing `user_roles` table stays. We add `SuperAdmin` to the enum and a `shop_members` table for per-shop membership; `has_role` keeps working.
- RLS uses a `SECURITY DEFINER` helper `is_shop_member(shop_id)` to avoid recursion.
- All migrations wrap in `BEGIN`/`COMMIT`; backfill runs before `NOT NULL` is enforced.
- GitHub sync: this project's GitHub connection is triggered from the Lovable UI (+ menu → GitHub); I can't do it from here. Once connected, every change I make pushes automatically.
- Vercel: your app currently deploys via Lovable's hosting (Cloudflare Workers). Moving to Vercel is possible but changes the server runtime — confirm before I do it, or I'll leave hosting as-is and it stays production-ready.

---

## What I need from you

1. **Approve Phase 1** so I can run the multi-tenant migration on your live data (safe, backfilled, reversible). Reply "go phase 1".
2. Confirm: **first existing Owner** becomes SuperAdmin of the platform + Admin of the default shop? (Recommended.)
3. **Vercel**: actually migrate hosting, or keep Lovable hosting and just make the code Vercel-compatible?
4. Should new signups **auto-create their own shop** (self-serve SaaS) or **only join via invite** (closed beta)?

Once you answer, I'll execute Phase 1 end-to-end in the next turn.
