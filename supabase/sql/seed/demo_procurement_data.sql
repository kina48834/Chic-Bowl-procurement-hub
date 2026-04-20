-- seed/demo_procurement_data.sql — demo procurement rows (mirrors src/procurement/seed.ts).
-- Run after core schema (supabase/sql/01–16). Safe to re-run: truncates operational tables only.
--
-- SPA alignment:
--   • Fixed stock catalog + low-stock thresholds: /inventory/catalog
--   • Finance PO approval: /finance/po-approvals
--   • Manager PR approval (approve only): /manager/approvals/requests

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
Demo sign-in — Hosted: run seed/demo_accounts.sql after schema (creates auth.users + identities + profiles; passwords match src/auth/seed-users.ts). The /login page is email + password only (no on-screen credential list).
Data — When using Supabase, operational data lives in Postgres; configure RLS for your environment.
Currency — Amounts display with consistent formatting across workspaces.
Stock catalog — Fixed master list in inventory_lines; low-stock alerts use reorder_threshold.
Workflow — Manager approves purchase requests only (no reject). Finance approves POs. Purchasing revises POs returned by Finance.
Reports — Admin executive snapshot: /admin/reports (PO book, suppliers, audit peek, governance tiles).
',
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

INSERT INTO public.purchase_requests (id, category, description, request_reason, quantity, unit, status, requested_by_email, created_at, reviewed_at, review_note) VALUES
  ('seed-pr-pending', 'chicken', 'Chicken breast — weekly production', 'Forecasted demand for grill line; current stock below reorder threshold.', 120, 'kg', 'pending', 'inventorystaff@gmail.com', '2026-04-18T12:00:00.000Z', NULL, NULL),
  ('seed-pr-approved', 'packaging', 'Paper bowls — retail line', 'Low stock alert from catalog; need buffer before weekend rush.', 800, 'units', 'approved', 'inventorystaff@gmail.com', '2026-04-18T12:00:00.000Z', '2026-04-18T12:00:00.000Z', 'Approved for sourcing.');

INSERT INTO public.quotations (id, supplier_id, title, price, quality_note, delivery_terms, created_at) VALUES
  ('seed-qt-1', 'seed-supplier-2', 'Eco trays RFQ', 1840, 'Food-grade certified; samples on file.', 'FOB hub; 5 business days', '2026-04-18T12:00:00.000Z'),
  ('seed-qt-2', 'seed-supplier-1', 'Alternate tray quote', 2100, 'Heavier gauge', '2-week lead', '2026-04-18T12:00:00.000Z');

INSERT INTO public.purchase_orders (id, purchase_request_id, supplier_id, items_summary, total, status, created_at, sent_at, shipped_at, completed_at, manager_note, finance_note, inventory_catalog_id) VALUES
  ('seed-po-draft', 'seed-pr-approved', 'seed-supplier-2', 'Paper bowls × 800', 1840, 'draft', '2026-04-18T12:00:00.000Z', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO public.inventory_lines (id, name, category, quantity, unit, last_updated, reorder_threshold, source_delivery_id) VALUES
  ('cat-chicken-breast', 'Chicken breast', 'chicken', 80, 'kg', '2026-04-18T12:00:00.000Z', 25, NULL),
  ('cat-flour', 'Flour', 'ingredients', 120, 'kg', '2026-04-18T12:00:00.000Z', 30, NULL),
  ('cat-cornstarch', 'Cornstarch', 'ingredients', 40, 'kg', '2026-04-18T12:00:00.000Z', 15, NULL),
  ('cat-fish-sauce', 'Fish sauce', 'ingredients', 24, 'L', '2026-04-18T12:00:00.000Z', 8, NULL),
  ('cat-oil', 'Cooking oil', 'ingredients', 60, 'L', '2026-04-18T12:00:00.000Z', 20, NULL),
  ('cat-pepper', 'Pepper', 'ingredients', 5, 'kg', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-soda', 'Soda (club / baking)', 'ingredients', 10, 'kg', '2026-04-18T12:00:00.000Z', 4, NULL),
  ('cat-nata', 'Nata de coco', 'ingredients', 15, 'kg', '2026-04-18T12:00:00.000Z', 5, NULL),
  ('cat-rice', 'Rice', 'ingredients', 200, 'kg', '2026-04-18T12:00:00.000Z', 50, NULL),
  ('cat-breadcrumbs', 'Breadcrumbs', 'ingredients', 25, 'kg', '2026-04-18T12:00:00.000Z', 10, NULL),
  ('cat-honey-butter', 'Honey butter sauce', 'ingredients', 8, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-teriyaki', 'Teriyaki sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-buffalo', 'Buffalo sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-soygarlic', 'Soy garlic sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-sweet-chili', 'Sweet chili sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-barbeque', 'Barbecue sauce', 'ingredients', 10, 'L', '2026-04-18T12:00:00.000Z', 3, NULL),
  ('cat-parsley', 'Parsley', 'ingredients', 3, 'kg', '2026-04-18T12:00:00.000Z', 1, NULL),
  ('cat-green-apple', 'Green apple syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-lychee', 'Lychee syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-blueberry', 'Blueberry syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-strawberry', 'Strawberry syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-mango', 'Mango syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-lemon', 'Lemon syrup', 'beverages', 6, 'L', '2026-04-18T12:00:00.000Z', 2, NULL),
  ('cat-yakult', 'Yakult', 'beverages', 200, 'bottles', '2026-04-18T12:00:00.000Z', 48, NULL),
  ('cat-gloves', 'Disposable gloves', 'packaging', 40, 'boxes', '2026-04-18T12:00:00.000Z', 10, NULL),
  ('cat-plastic-wrap', 'Plastic wrap', 'packaging', 12, 'rolls', '2026-04-18T12:00:00.000Z', 4, NULL),
  ('cat-paper-bowl', 'Paper bowl', 'packaging', 2000, 'units', '2026-04-18T12:00:00.000Z', 400, NULL),
  ('cat-cup-12oz', '12 oz plastic cup', 'packaging', 3000, 'units', '2026-04-18T12:00:00.000Z', 600, NULL),
  ('cat-cup-16oz', '16 oz plastic cup', 'packaging', 2500, 'units', '2026-04-18T12:00:00.000Z', 500, NULL),
  ('cat-cup-22oz', '22 oz plastic cup', 'packaging', 2000, 'units', '2026-04-18T12:00:00.000Z', 400, NULL),
  ('cat-straw', 'Straws', 'packaging', 10000, 'units', '2026-04-18T12:00:00.000Z', 2000, NULL),
  ('cat-tape', 'Packaging tape', 'packaging', 24, 'rolls', '2026-04-18T12:00:00.000Z', 6, NULL),
  ('cat-gas', 'LPG / cooking gas', 'equipment', 4, 'tanks', '2026-04-18T12:00:00.000Z', 1, NULL);

INSERT INTO public.budget_requests (id, title, amount, purchase_request_id, status, notes, created_at, reviewed_at) VALUES
  ('seed-budget-1', 'Q2 packaging envelope', 25000, 'seed-pr-approved', 'pending', 'Rolling commitment for retail packaging.', '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.payments (id, supplier_id, purchase_order_id, amount, status, reference, hold_reason, created_at, paid_at) VALUES
  ('seed-pay-1', 'seed-supplier-1', NULL, 4200, 'pending', 'INV-FV-1044', NULL, '2026-04-18T12:00:00.000Z', NULL);

INSERT INTO public.audit_log (id, at, actor_email, action, detail) VALUES
  ('seed-audit-1', '2026-04-18T12:00:00.000Z', 'system@seed', 'Seed', 'Demo procurement dataset loaded.');

COMMIT;
