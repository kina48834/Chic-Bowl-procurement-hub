import { SESSION_STORAGE_KEY } from '@/auth/storage-keys'

export function readSessionUserId(): string | null {
  return localStorage.getItem(SESSION_STORAGE_KEY)
}

export function writeSessionUserId(userId: string) {
  localStorage.setItem(SESSION_STORAGE_KEY, userId)
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}
