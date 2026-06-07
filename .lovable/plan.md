
This is a large multi-part request. I'll break it into shippable phases so you can verify each one before the next. Confirm scope or pick a subset, and I'll start.

## Phase 1 — Inventory: per-tablet pricing
- Add `pack_size` (tablets per strip) column to `inventory` via migration.
- Auto-compute `mrp_per_tablet = mrp_per_strip / pack_size` (DB generated column + trigger fallback so legacy rows still work).
- Inventory UI: add Pack Size + Unit Type fields; display MRP/strip and MRP/tablet side by side.

## Phase 2 — Billing line items: unit-aware
- Add `unit_type` (strip/tablet/bottle/tube/injection/other) and `batch_no` to `order_items` via migration.
- When picking a medicine, auto-fill batch, MRP/strip, MRP/tablet, available stock.
- Switching unit recomputes rate; stock deduction trigger updated to deduct in tablets when unit=tablet (qty / pack_size strip equivalent).

## Phase 3 — Discounts (% or amount), live totals
- Each row supports either discount % or discount ₹ (toggle); editable inline.
- Recalculate row total + bill subtotal + GST + grand total + profit on every keystroke.
- Bill summary panel: Subtotal, Discount, Tax, Grand Total, Received, Balance, Profit.

## Phase 4 — Print / PDF / WhatsApp / Share
- Add "Print", "Download PDF", "Share", "WhatsApp" buttons.
- Print-friendly invoice template (pharmacy name, address, GSTIN, invoice #, customer, itemized table, totals). Works for thermal (80mm) and A4 via CSS `@media print`.
- PDF via `jspdf` + `jspdf-autotable`. WhatsApp via `wa.me` link with bill summary text.

## Phase 5 — OCR improvements
- Strengthen `scanPrescription` prompt + add fuzzy match (token overlap + ilike on multiple words, not just first word).
- Return confidence per item; if <80% show confirmation dialog before adding to bill.

## Phase 6 — Validation & sales history
- Client + DB checks: no negative stock, no blank medicine, no qty > stock, unique invoice numbers (add column + unique index on orders).
- Sales history page: search, filter by date/customer, export CSV (PDF later if needed).

## Technical notes
- Migrations: alter `inventory` (add `pack_size int default 10`, `unit_type text default 'strip'`), alter `order_items` (add `unit_type`, `batch_no`), alter `orders` (add `invoice_number` unique, `received_amount`, `payment_method`). Update `deduct_stock_on_item` trigger to handle tablet-unit sales.
- New deps: `jspdf`, `jspdf-autotable`.
- Existing data: defaults keep current rows working (pack_size=10, unit_type='strip').

## Suggested order
Phases 1→2→3 are the core "fix billing". 4 (print) and 5 (OCR) are independent and can ship after. 6 last.

**Question:** Ship all 6 phases sequentially in one go, or start with Phases 1–3 (core billing fix) and review before continuing?
