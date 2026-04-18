-- seed/demo_procurement_data.sql — demo procurement rows (mirrors src/procurement/seed.ts).
-- Run after core schema (supabase/sql/01–13). Safe to re-run: truncates operational tables only.
--
-- SPA alignment (same bundle as npm run dev):
--   • Stock catalog CRUD: /manager/inventory and /admin/inventory (shared inventory_lines).
--   • Executive KPIs / spend / governance: /admin/reports.
--   • inventory_lines.category values must satisfy 09_inventory_lines.sql (same list as purchase_requests).

BEGIN;

TRUNCATE TABLE
  public.audit_log,
  public.payments,
  public.deliveries,
  public.purchase_orders,
  public.quotations,
  public.budget_requests,
  public.purchase_requests,
  public.inventory_lines,
  public.suppliers
CASCADE;

INSERT INTO public.app_settings (id, company_name, system_notes, last_override_note)
VALUES (
  1,
  'Chic Bowl by 3rd Jen Kitchens',
  'Access — New accounts are created only in Admin → User management (email + initial password). There is no public self-service registration; visiting /register redirects to Sign in.
Demo sign-in — Hosted: passwords per email are in seed/demo_accounts.sql STEP 1 (same as src/auth/seed-users.ts). The /login page is email + password only (no on-screen credential list). Create or reset Auth users, then run that file for profiles.
Data — When using Supabase, operational data lives in Postgres; configure RLS for your environment.
Currency — Amounts display with consistent formatting across workspaces.
Stock catalog — Master SKUs: /manager/inventory and /admin/inventory (shared data; delete blocked while a PO references a line). Categories match purchase_requests.
Reports — Admin executive snapshot: /admin/reports (PO book, suppliers, audit peek, governance tiles).
Support — Each workspace page includes an embedded process guide for the end-to-end flow.',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  system_notes = EXCLUDED.system_notes,
  last_override_note = EXCLUDED.last_override_note,
  updated_at = now();

INSERT INTO public.suppliers (id, name, contact, email, phone, pricing_notes, reliability, active) VALUES
  ('seed-supplier-1', 'Fresh Valley Poultry', 'Sam Rivera', 'orders@freshvalley.example', '+63 917 555 0101', 'Whole chicken tier pricing; weekly index.', 4, true),
  ('seed-supplier-2', 'PackRight Supplies', 'Jordan Lee', 'sales@packright.example', '+63 917 555 0102', 'Biodegradable trays — MOQ 500.', 5, true);

INSERT INTO public.purchase_requests (id, category, description, quantity, unit, status, requested_by_email, created_at, reviewed_at, review_note) VALUES
  ('seed-pr-pending', 'chicken', 'Whole chicken — weekly kitchen run', 120, 'kg', 'pending', 'inventorystaff@gmail.com', '2026-04-18T12:00:00.000Z', NULL, NULL),
  ('seed-pr-approved', 'packaging', 'Eco trays for retail line', 800, 'units', 'approved', 'inventorystaff@gmail.com', '2026-04-18T12:00:00.000Z', '2026-04-18T12:00:00.000Z', 'Approved for sourcing.');

INSERT INTO public.quotations (id, supplier_id, title, price, quality_note, delivery_terms, created_at) VALUES
  ('seed-qt-1', 'seed-supplier-2', 'Eco trays RFQ', 1840, 'Food-grade certified; samples on file.', 'FOB hub; 5 business days', '2026-04-18T12:00:00.000Z'),
  ('seed-qt-2', 'seed-supplier-1', 'Alternate tray quote', 2100, 'Heavier gauge', '2-week lead', '2026-04-18T12:00:00.000Z');

INSERT INTO public.purchase_orders (id, purchase_request_id, supplier_id, items_summary, total, status, created_at, sent_at, shipped_at, completed_at, manager_note, inventory_catalog_id) VALUES
  ('seed-po-draft', 'seed-pr-approved', 'seed-supplier-2', 'Eco trays × 800', 1840, 'draft', '2026-04-18T12:00:00.000Z', NULL, NULL, NULL, NULL, NULL);

INSERT INTO public.inventory_lines (id, name, category, quantity, unit, last_updated, source_delivery_id) VALUES
  ('inv-1', 'Frozen chicken portions', 'chicken', 340, 'kg', '2026-04-18T12:00:00.000Z', NULL),
  ('inv-2', 'Spice blend A', 'ingredients', 45, 'kg', '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.budget_requests (id, title, amount, purchase_request_id, status, notes, created_at, reviewed_at) VALUES
  ('seed-budget-1', 'Q2 packaging envelope', 25000, 'seed-pr-approved', 'pending', 'Rolling commitment for retail packaging.', '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.payments (id, supplier_id, purchase_order_id, amount, status, reference, created_at, paid_at) VALUES
  ('seed-pay-1', 'seed-supplier-1', NULL, 4200, 'pending', 'INV-FV-1044', '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.audit_log (id, at, actor_email, action, detail) VALUES
  ('seed-audit-1', '2026-04-18T12:00:00.000Z', 'system@seed', 'Seed', 'Demo procurement dataset loaded.');

COMMIT;
