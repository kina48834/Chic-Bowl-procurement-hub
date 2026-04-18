import { toSessionUser } from '@/auth/public-user'
import { clearSession, readSessionUserId, writeSessionUserId } from '@/auth/session-store'
import type { RoleId } from '@/shared/types/nav'
import type { SessionUser, UserRecord } from '@/auth/types'
import type { AdminUpdateUserInput } from '@/auth/admin-user-types'
import { findUserByEmail, loadUsersWithSeeds, writeUsers } from '@/auth/user-store'

export type RegisterInput = {
  email: string
  password: string
  displayName: string
  role: RoleId
}

let usersCache: UserRecord[] = loadUsersWithSeeds()
let sessionUserId: string | null = readSessionUserId()
if (sessionUserId && !usersCache.some((u) => u.id === sessionUserId)) {
  clearSession()
  sessionUserId = null
}

const listeners = new Set<() => void>()

export function localEmit() {
  for (const listener of listeners) listener()
}

export function localSubscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

let sessionSnapshotCache: SessionUser | null = null

function snapshotUser(): SessionUser | null {
  if (!sessionUserId) {
    sessionSnapshotCache = null
    return null
  }
  const hit = usersCache.find((u) => u.id === sessionUserId)
  if (!hit) {
    sessionSnapshotCache = null
    return null
  }
  const fresh = toSessionUser(hit)
  if (
    sessionSnapshotCache &&
    sessionSnapshotCache.id === fresh.id &&
    sessionSnapshotCache.accountRef === fresh.accountRef &&
    sessionSnapshotCache.email === fresh.email &&
    sessionSnapshotCache.role === fresh.role &&
    sessionSnapshotCache.displayName === fresh.displayName &&
    sessionSnapshotCache.createdAt === fresh.createdAt &&
    sessionSnapshotCache.source === fresh.source
  ) {
    return sessionSnapshotCache
  }
  sessionSnapshotCache = fresh
  return sessionSnapshotCache
}

export function localGetAuthUserSnapshot(): SessionUser | null {
  return snapshotUser()
}

function persistUsers(next: UserRecord[]) {
  usersCache = next
  writeUsers(next)
  localEmit()
}

function setSession(userId: string | null) {
  sessionUserId = userId
  if (userId) writeSessionUserId(userId)
  else clearSession()
  localEmit()
}

export function localGetAuthAccounts(): SessionUser[] {
  return usersCache.map((record) => toSessionUser(record))
}

export function localAuthLogin(
  email: string,
  password: string,
): { ok: true; user: SessionUser } | { ok: false; error: string } {
  const fresh = loadUsersWithSeeds()
  usersCache = fresh
  const found = findUserByEmail(fresh, email)
  if (!found || found.password !== password) {
    return { ok: false as const, error: 'Invalid email or password.' }
  }
  setSession(found.id)
  return { ok: true as const, user: toSessionUser(found) }
}

export function localAuthLogout() {
  setSession(null)
}

export function localAuthProvisionUser(
  input: RegisterInput,
): { ok: true } | { ok: false; error: string } {
  const fresh = loadUsersWithSeeds()
  usersCache = fresh
  if (findUserByEmail(fresh, input.email)) {
    return { ok: false as const, error: 'An account already exists for that email.' }
  }
  if (!input.password.trim()) {
    return { ok: false as const, error: 'Password is required.' }
  }
  const id = crypto.randomUUID()
  const record: UserRecord = {
    id,
    accountRef: id,
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: input.role,
    displayName: input.displayName.trim() || input.email.split('@')[0] || 'User',
    createdAt: new Date().toISOString(),
    source: 'provisioned',
  }
  persistUsers([...fresh, record])
  return { ok: true as const }
}

function countAdmins(records: UserRecord[]) {
  return records.filter((u) => u.role === 'admin').length
}

export function localAuthUpdateUser(
  input: AdminUpdateUserInput,
): { ok: true } | { ok: false; error: string } {
  const fresh = loadUsersWithSeeds()
  usersCache = fresh
  const index = fresh.findIndex((u) => u.id === input.userId)
  if (index === -1) {
    return { ok: false as const, error: 'User not found.' }
  }

  const emailNorm = input.email.trim().toLowerCase()
  if (!emailNorm) {
    return { ok: false as const, error: 'Email is required.' }
  }

  const duplicate = fresh.some(
    (u) => u.id !== input.userId && u.email.toLowerCase() === emailNorm,
  )
  if (duplicate) {
    return { ok: false as const, error: 'Another account already uses this email.' }
  }

  const displayTrim = input.displayName.trim()
  if (!displayTrim) {
    return { ok: false as const, error: 'Display name is required.' }
  }

  const pwd = input.newPassword?.trim() ?? ''

  const prev = fresh[index]
  const nextRecord: UserRecord = {
    ...prev,
    email: emailNorm,
    displayName: displayTrim,
    role: input.role,
    password: pwd.length > 0 ? pwd : prev.password,
  }

  const next = [...fresh]
  next[index] = nextRecord

  if (countAdmins(next) < 1) {
    return { ok: false as const, error: 'At least one admin account must remain.' }
  }

  persistUsers(next)
  return { ok: true as const }
}

export function localAuthRemoveUser(
  userId: string,
): { ok: true } | { ok: false; error: string } {
  if (userId === sessionUserId) {
    return { ok: false as const, error: 'You cannot delete the signed-in account.' }
  }
  const fresh = loadUsersWithSeeds()
  usersCache = fresh
  const target = fresh.find((u) => u.id === userId)
  if (!target) {
    return { ok: false as const, error: 'User not found.' }
  }
  if (target.role === 'admin' && countAdmins(fresh) <= 1) {
    return { ok: false as const, error: 'Cannot remove the last admin account.' }
  }
  const next = fresh.filter((u) => u.id !== userId)
  persistUsers(next)
  return { ok: true as const }
}

export function localAuthChangePassword(
  currentPassword: string,
  newPassword: string,
): { ok: true } | { ok: false; error: string } {
  if (!sessionUserId) {
    return { ok: false as const, error: 'Not signed in.' }
  }
  const neu = newPassword.trim()
  if (!neu) {
    return { ok: false as const, error: 'New password is required.' }
  }
  const fresh = loadUsersWithSeeds()
  usersCache = fresh
  const idx = fresh.findIndex((u) => u.id === sessionUserId)
  if (idx === -1) {
    return { ok: false as const, error: 'Session expired. Sign in again.' }
  }
  if (fresh[idx].password !== currentPassword) {
    return { ok: false as const, error: 'Current password is incorrect.' }
  }
  const next = [...fresh]
  next[idx] = { ...fresh[idx], password: neu }
  persistUsers(next)
  return { ok: true as const }
}

export function localGetSessionUserId(): string | null {
  return sessionUserId
}
