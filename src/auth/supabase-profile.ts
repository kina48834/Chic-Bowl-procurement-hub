import type { RoleId } from '@/shared/types/nav'
import type { SessionUser } from '@/auth/types'

export function sessionUserFromProfileRow(row: Record<string, unknown>): SessionUser {
  const role = row.role as RoleId
  const src = row.source as string
  const id = String(row.id)
  const accountRaw = row.account_ref
  const accountRef =
    typeof accountRaw === 'string' && accountRaw.trim() !== '' ? accountRaw.trim() : id
  return {
    id,
    accountRef,
    email: String(row.email ?? ''),
    displayName: String(row.display_name ?? ''),
    role,
    createdAt: String(row.created_at ?? ''),
    source:
      src === 'seed' || src === 'registration' || src === 'provisioned' ? src : 'provisioned',
  }
}
