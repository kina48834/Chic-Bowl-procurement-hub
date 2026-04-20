import type { RoleId } from '@/shared/types/nav'

/** Typical responsibilities per role (admin user-management reference). */
export const ROLE_CAPABILITIES: Record<RoleId, string[]> = {
  'inventory-staff': [
    'Profile: view your display name, email, and role as set in Admin → User management.',
    'Stock catalog: maintain the fixed master list, quantities, and reorder thresholds (low-stock alerts on the dashboard).',
    'Purchase requests: submit requests with a required reason; track pending and approved (Manager approves only—no reject action).',
    'Receiving: inspect quantity and condition; full accept, partial accept/reject, or full reject with a rejection report; Finance holds payment on rejects.',
    'Inventory integration: view levels and adjust only for justified exceptions (cycle count, spoilage).',
  ],
  purchasing: [
    'Profile: view your display name, email, and role as set in Admin → User management.',
    'Supplier management: add, update, or remove suppliers; maintain pricing and reliability.',
    'Supplier quotations: request and compare quotes (price, quality, delivery terms).',
    'Purchase orders: draft POs from approved requests; submit to Finance; revise and resubmit if Finance returns the PO with a note; send after Finance approval.',
    'Order tracking: follow PO status through shipment and receiving.',
  ],
  manager: [
    'Profile: view your display name, email, and role as set in Admin → User management.',
    'Purchase requests: approve Inventory requests so Purchasing can source (no reject in this workflow).',
    'Reporting: spending, supplier performance, and request history.',
    'Order monitoring: read-only visibility across orders, catalog links, and statuses.',
  ],
  finance: [
    'Profile: view your display name, email, and role as set in Admin → User management.',
    'Purchase orders: approve or return POs to Purchasing before they are sent to suppliers.',
    'Budgets: review requests; approve or deny funding for purchases.',
    'Payments: pay supplier payables; on-hold payables when receiving is rejected or awaiting replacement.',
    'Reporting: financial views (expenses, payments, liabilities).',
  ],
  admin: [
    'Profile: view your own account details (same fields managed under User management).',
    'User and role management (Inventory, Purchasing, Manager, Finance, Admin).',
    'System settings: company, system notes, and override log.',
    'Stock catalog: same rules as Inventory Staff; delete blocked while a PO references an item.',
    'Full access to suppliers, executive reports, and the audit log.',
  ],
}
