import { createContext } from 'react'
import type { AdminUpdateUserInput } from '@/auth/admin-user-types'
import type { RegisterInput } from '@/auth/auth-store'
import type { SessionUser } from '@/auth/types'

export type AuthContextValue = {
  user: SessionUser | null
  accounts: SessionUser[]
  /** When true, sign-in uses Supabase Auth and procurement data uses Postgres. */
  usesSupabase: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }>
  provisionUser: (
    input: RegisterInput,
  ) => Promise<
    | { ok: true; reauthRequired?: boolean }
    | { ok: false; error: string }
  >
  updateUser: (
    input: AdminUpdateUserInput,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  removeUser: (userId: string) => Promise<{ ok: true } | { ok: false; error: string }>
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
