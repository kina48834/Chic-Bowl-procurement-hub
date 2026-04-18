import type { RoleId } from '@/shared/types/nav'

/** Allowed functions per role — aligns onboarding with workspace behavior. */
export const ROLE_CAPABILITIES: Record<RoleId, string[]> = {
  'inventory-staff': [
    'Profile: view your display name, email, and role as set in Admin → User management.',
    'Purchase request management: create and submit requests (expanded categories aligned with the manager stock catalog); view status (pending, approved, rejected).',
    'Receiving and verification: check quantity and quality; accept or reject deliveries.',
    'Inventory integration: confirm stock after receiving; view levels; adjust only when an exception is justified.',
  ],
  purchasing: [
    'Profile: view your display name, email, and role as set in Admin → User management.',
    'Supplier management: add, update, or remove suppliers; maintain pricing and reliability.',
    'Supplier quotations: request and compare quotes (price, quality, delivery terms).',
    'Purchase orders: create POs from approved requests; optionally link a manager stock catalog line; send PO to the selected supplier.',
    'Order tracking: follow PO status from pending through shipped to completed.',
  ],
  manager: [
    'Profile: view your display name, email, and role as set in Admin → User management.',
    'Stock catalog: add, edit, or delete master inventory lines used across POs and tracking (delete blocked while a PO references an item).',
    'Approvals: approve or reject purchase requests and purchase orders.',
    'Reporting: spending, supplier performance, and request history.',
    'Order monitoring: read-only visibility across orders, catalog links, and statuses.',
  ],
  finance: [
    'Profile: view your display name, email, and role as set in Admin → User management.',
    'Budgets: review requests; approve or deny funding for purchases.',
    'Payments: process supplier payments.',
    'Reporting: financial views (expenses, payments, liabilities).',
  ],
  admin: [
    'Profile: view your own account details (same fields managed under User management).',
    'User and role management (Inventory, Purchasing, Manager, Finance, Admin).',
    'System settings: company, system notes, and override log.',
    'Stock catalog: add, edit, or delete master inventory lines (same rules as Manager; delete blocked while a PO references an item).',
    'Full access to suppliers, executive reports, and the audit log.',
  ],
}
