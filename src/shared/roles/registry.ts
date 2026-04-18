import type { RoleId, RoleMeta } from '@/shared/types/nav'

export const roles: RoleMeta[] = [
  {
    id: 'inventory-staff',
    label: 'Inventory Staff',
    emoji: '🧑‍🏭',
    basePath: '/inventory',
    focus: 'Identify needs + receive goods',
  },
  {
    id: 'purchasing',
    label: 'Purchasing Staff',
    emoji: '🛒',
    basePath: '/purchasing',
    focus: 'Sourcing + supplier coordination',
  },
  {
    id: 'manager',
    label: 'Manager',
    emoji: '👨‍💼',
    basePath: '/manager',
    focus: 'Control + approvals',
  },
  {
    id: 'finance',
    label: 'Finance Staff',
    emoji: '💰',
    basePath: '/finance',
    focus: 'Budget + payments',
  },
  {
    id: 'admin',
    label: 'Admin',
    emoji: '🧑‍💻',
    basePath: '/admin',
    focus: 'System management + security',
  },
]

export function getRoleMeta(id: RoleId): RoleMeta {
  const meta = roles.find((role) => role.id === id)
  if (!meta) {
    throw new Error(`Unknown role: ${id}`)
  }
  return meta
}

/** Safe for UI when `id` might be missing or stale in local data. */
export function getRoleLabel(id: RoleId | string): string {
  const meta = roles.find((role) => role.id === id)
  return meta?.label ?? id
}
