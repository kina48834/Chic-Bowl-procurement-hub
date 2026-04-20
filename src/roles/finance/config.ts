import type { NavItem } from '@/shared/types/nav'
import { roles } from '@/shared/roles/registry'

export const financeMeta = roles.find((r) => r.id === 'finance')!

export const financeNav: NavItem[] = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    description: 'Finance overview with quick access to budget, payables, and reporting.',
  },
  {
    path: 'budget',
    label: 'Budget review',
    description:
      'Finance integration: review budget requests; approve or deny funding for purchases.',
  },
  {
    path: 'po-approvals',
    label: 'PO approval',
    description:
      'Approve purchase orders before Purchasing sends them to suppliers, or return with a note for revision.',
  },
  {
    path: 'payments',
    label: 'Supplier payments',
    description:
      'Process supplier payments against approved payables and PO context.',
  },
  {
    path: 'reports',
    label: 'Financial reports',
    description:
      'Audit trail and reporting: expenses, payments, and liabilities.',
  },
  {
    path: 'profile',
    label: 'Profile',
    description:
      'Your account details as set by an admin in User management.',
  },
]
