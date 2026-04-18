import type { RoleId } from '@/shared/types/nav'

export type AdminUpdateUserInput = {
  userId: string
  displayName: string
  email: string
  role: RoleId
  /** Omit or empty to keep the current password. */
  newPassword?: string
}
