import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
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
  whenCloudAuthHydrated,
} from '@/auth/auth-store'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, accounts } = useSyncExternalStore(
    subscribeAuth,
    getAuthUiSnapshot,
    getAuthUiSnapshot,
  )

  const [authBootstrapped, setAuthBootstrapped] = useState(false)

  useEffect(() => {
    let cancelled = false
    void whenCloudAuthHydrated().finally(() => {
      if (!cancelled) setAuthBootstrapped(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      accounts,
      usesSupabase: true,
      authBootstrapped,
      login: authLogin,
      provisionUser: authProvisionUser,
      updateUser: authUpdateUser,
      removeUser: authRemoveUser,
      changePassword: authChangePassword,
      logout: authLogout,
    }),
    [user, accounts, authBootstrapped],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
