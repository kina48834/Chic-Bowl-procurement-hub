export type NavItem = {
  path: string
  label: string
  description: string
}

export type RoleId =
  | 'admin'
  | 'finance'
  | 'manager'
  | 'inventory-staff'
  | 'purchasing'

export type RoleMeta = {
  id: RoleId
  label: string
  emoji: string
  basePath: string
  focus: string
}
