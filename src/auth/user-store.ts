import { SEED_USERS } from '@/auth/seed-users'
import { USERS_STORAGE_KEY } from '@/auth/storage-keys'
import type { UserRecord } from '@/auth/types'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function migrateUserRecords(users: UserRecord[]): { users: UserRecord[]; changed: boolean } {
  let changed = false
  const out = users.map((u) => {
    const legacyId = u.id.startsWith('seed-')
    const missingRef = !u.accountRef || u.accountRef.trim() === ''
    if (!legacyId && !missingRef) return u
    changed = true
    if (legacyId) {
      const ref = crypto.randomUUID()
      return { ...u, id: ref, accountRef: ref }
    }
    return { ...u, accountRef: crypto.randomUUID() }
  })
  return { users: out, changed }
}

export function readUsers(): UserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as UserRecord[]) : []
    if (!Array.isArray(parsed)) return []
    const mig = migrateUserRecords(parsed as UserRecord[])
    if (mig.changed) writeUsers(mig.users)
    return mig.users
  } catch {
    return []
  }
}

export function writeUsers(users: UserRecord[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

/** Ensures seed accounts exist without overwriting registrations that reuse the same email. */
export function mergeSeedUsers(existing: UserRecord[]): {
  users: UserRecord[]
  changed: boolean
} {
  const map = new Map<string, UserRecord>()
  for (const user of existing) {
    map.set(normalizeEmail(user.email), user)
  }
  let changed = false
  for (const seed of SEED_USERS) {
    const key = normalizeEmail(seed.email)
    if (!map.has(key)) {
      map.set(key, seed)
      changed = true
    }
  }
  return { users: [...map.values()], changed }
}

export function loadUsersWithSeeds(): UserRecord[] {
  const { users, changed } = mergeSeedUsers(readUsers())
  const mig = migrateUserRecords(users)
  if (changed || mig.changed) writeUsers(mig.users)
  return mig.users
}

export function findUserByEmail(users: UserRecord[], email: string) {
  const key = normalizeEmail(email)
  return users.find((u) => normalizeEmail(u.email) === key)
}
