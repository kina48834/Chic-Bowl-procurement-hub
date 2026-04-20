import type { NavItem } from '@/shared/types/nav'
import { roles } from '@/shared/roles/registry'

export const adminMeta = roles.find((r) => r.id === 'admin')!

export const adminNav: NavItem[] = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    description:
      'Snapshot of user distribution and shortcuts into administration tools.',
  },
  {
    path: 'user-management',
    label: 'User management',
    description:
      'Manage users and roles: Inventory Staff, Purchasing, Manager, Finance, and Admin.',
  },
  {
    path: 'settings',
    label: 'System settings',
    description:
      'Company name, system notes, and override log.',
  },
  {
    path: 'inventory',
    label: 'Stock catalog',
    description:
      'Add, edit, or remove master inventory lines (shared with Inventory Staff; delete blocked when a PO references a line).',
  },
  {
    path: 'suppliers',
    label: 'Suppliers (full access)',
    description:
      'Full access to supplier master data (admin break-glass and maintenance).',
  },
  {
    path: 'reports',
    label: 'Reports (full access)',
    description:
      'Executive reports and cross-cutting analytics without role filters.',
  },
  {
    path: 'audit-log',
    label: 'Audit log',
    description:
      'Audit trail: immutable history of sensitive procurement and configuration actions.',
  },
  {
    path: 'profile',
    label: 'Profile',
    description:
      'Your account details: display name, email, role, and provisioning source (managed in User management).',
  },
]
