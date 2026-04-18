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
      'Purchase request management: create and submit requests (chicken, ingredients, packaging); view status (pending, approved, rejected).',
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
    path: 'profile',
    label: 'Profile',
    description:
      'Your account details as set by an admin in User management.',
  },
]
