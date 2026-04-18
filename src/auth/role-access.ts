import type { RoleId } from '@/shared/types/nav'
import type { SessionUser } from '@/auth/types'
import { getRoleMeta } from '@/shared/roles/registry'

export function canAccessWorkspace(
  user: SessionUser | null,
  workspaceRole: RoleId,
): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.role === workspaceRole
}

/**
 * Where to send the user after a successful sign-in.
 * Ignores stale `from` paths from RequireAuth (e.g. admin should not land on /inventory/dashboard).
 */
export function resolvePostLoginRedirect(
  user: SessionUser,
  from: string | undefined,
): string {
  const meta = getRoleMeta(user.role)
  const home = `${meta.basePath}/dashboard`

  if (!from || from === '/' || from === '/login') {
    return user.role === 'admin' ? '/app' : home
  }

  if (from === '/app') {
    return '/app'
  }

  if (user.role === 'admin') {
    if (from.startsWith('/admin')) return from
    return '/admin/dashboard'
  }

  if (from.startsWith(meta.basePath)) {
    return from === meta.basePath ? home : from
  }

  return home
}
