import type { NavItem } from '@/shared/types/nav'
import { roles } from '@/shared/roles/registry'

export const inventoryStaffMeta = roles.find((r) => r.id === 'inventory-staff')!

export const inventoryStaffNav: NavItem[] = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    description: 'Operational overview and shortcuts into inventory staff workflows.',
  },
  {
    path: 'purchase-requests',
    label: 'Purchase requests',
    description:
      'Purchase request management: create and submit requests with a required reason; view pending and approved (Manager approves only).',
  },
  {
    path: 'receiving',
    label: 'Receiving & verification',
    description:
      'Receiving and verification: check delivered items (quantity and quality); accept or reject deliveries.',
  },
  {
    path: 'levels',
    label: 'Inventory integration',
    description:
      'Inventory integration: confirm stock after receiving; view levels (edit manually only when needed).',
  },
  {
    path: 'catalog',
    label: 'Stock catalog',
    description:
      'Add, edit, or remove master stock items used by Purchasing and manager monitoring.',
  },
  {
    path: 'profile',
    label: 'Profile',
    description:
      'Your account details as set by an admin in User management.',
  },
]
