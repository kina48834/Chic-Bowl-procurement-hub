import { useMemo, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from '@/auth/auth-context'
import {
  authChangePassword,
  authLogin,
  authLogout,
  authProvisionUser,
  authRemoveUser,
  authUpdateUser,
  getAuthUiSnapshot,
  subscribeAuth,
} from '@/auth/auth-store'
import { isSupabaseConfigured } from '@/lib/supabaseClient'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, accounts } = useSyncExternalStore(
    subscribeAuth,
    getAuthUiSnapshot,
    getAuthUiSnapshot,
  )

  const value = useMemo(
    () => ({
      user,
      accounts,
      usesSupabase: isSupabaseConfigured(),
      login: authLogin,
      provisionUser: authProvisionUser,
      updateUser: authUpdateUser,
      removeUser: authRemoveUser,
      changePassword: authChangePassword,
      logout: authLogout,
    }),
    [user, accounts],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
