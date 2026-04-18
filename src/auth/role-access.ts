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

/** Primary dashboard URL for the signed-in profile (e.g. `/admin/dashboard`, `/purchasing/dashboard`). */
export function defaultDashboardPath(user: SessionUser): string {
  const meta = getRoleMeta(user.role)
  return `${meta.basePath}/dashboard`
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
  const home = defaultDashboardPath(user)

  if (!from || from === '/' || from === '/login' || from === '/app') {
    return home
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
