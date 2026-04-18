import type { SessionUser, UserRecord } from '@/auth/types'

export function toSessionUser(record: UserRecord): SessionUser {
  return {
    id: record.id,
    accountRef: record.accountRef,
    email: record.email,
    role: record.role,
    displayName: record.displayName,
    createdAt: record.createdAt,
    source: record.source,
  }
}
