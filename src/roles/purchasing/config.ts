import type { NavItem } from '@/shared/types/nav'
import { roles } from '@/shared/roles/registry'

export const purchasingMeta = roles.find((r) => r.id === 'purchasing')!

export const purchasingNav: NavItem[] = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    description: 'Procurement overview with quick paths into sourcing and PO execution.',
  },
  {
    path: 'suppliers',
    label: 'Suppliers',
    description:
      'Supplier management: add, update, or remove suppliers; maintain pricing and reliability records.',
  },
  {
    path: 'quotations',
    label: 'Quotations',
    description:
      'Supplier quotations: request quotes; compare suppliers (price, quality, delivery terms).',
  },
  {
    path: 'purchase-orders',
    label: 'Purchase orders',
    description:
      'PO generation: create POs from approved requests; send the PO to the selected supplier.',
  },
  {
    path: 'order-tracking',
    label: 'Order tracking',
    description:
      'Order tracking: follow PO status from pending through shipped to completed.',
  },
  {
    path: 'profile',
    label: 'Profile',
    description:
      'Your account details as set by an admin in User management.',
  },
]
