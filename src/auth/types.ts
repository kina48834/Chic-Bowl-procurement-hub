import type { RoleId } from '@/shared/types/nav'

export type UserRecord = {
  id: string
  /** Random public id for display (matches Supabase profiles.account_ref). */
  accountRef: string
  email: string
  password: string
  role: RoleId
  displayName: string
  createdAt: string
  source: 'seed' | 'registration' | 'provisioned'
}

export type SessionUser = Omit<UserRecord, 'password'>
