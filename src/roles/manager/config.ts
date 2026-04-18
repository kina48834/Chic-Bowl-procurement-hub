import type { NavItem } from '@/shared/types/nav'
import { roles } from '@/shared/roles/registry'

export const managerMeta = roles.find((r) => r.id === 'manager')!

export const managerNav: NavItem[] = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    description: 'Leadership snapshot with links into approvals, reporting, and monitoring.',
  },
  {
    path: 'approvals/requests',
    label: 'Approve requests',
    description:
      'Approval workflow: approve or reject purchase requests before sourcing.',
  },
  {
    path: 'approvals/orders',
    label: 'Approve purchase orders',
    description:
      'Approval workflow: approve or reject purchase orders before they are sent.',
  },
  {
    path: 'reports',
    label: 'Reports & audit',
    description:
      'Audit trail and reporting: spending, supplier performance, request history.',
  },
  {
    path: 'orders',
    label: 'Order monitoring',
    description:
      'Order monitoring: view all orders and statuses (read-only in this workspace).',
  },
  {
    path: 'inventory',
    label: 'Stock catalog',
    description:
      'Add, edit, or remove master stock items—linked to purchase orders and tracking for all roles.',
  },
  {
    path: 'profile',
    label: 'Profile',
    description:
      'Your account details as set by an admin in User management.',
  },
]
