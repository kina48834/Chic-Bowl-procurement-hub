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
      'Approve purchase requests from Inventory so Purchasing can source (no reject action in this workflow).',
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
    path: 'profile',
    label: 'Profile',
    description:
      'Your account details as set by an admin in User management.',
  },
]
