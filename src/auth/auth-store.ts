import type { AdminUpdateUserInput } from '@/auth/admin-user-types'
import type { RegisterInput } from '@/auth/auth-store-local'
import { sessionUserFromProfileRow } from '@/auth/supabase-profile'
import type { SessionUser } from '@/auth/types'
import { supabase } from '@/lib/supabaseClient'

export type { RegisterInput } from '@/auth/auth-store-local'

const cloudListeners = new Set<() => void>()
let cloudSessionUser: SessionUser | null = null
let cloudAccounts: SessionUser[] = []
let supabaseListenerStarted = false

/** First `refreshRemoteSession()` after load / pipeline start — await before REST calls that need RLS as `authenticated`. */
let cloudAuthBootstrapOnce: Promise<void> | null = null

function emitCloud() {
  for (const listener of cloudListeners) listener()
}

async function refreshRemoteAccounts() {
  if (!supabase) return
  const { data, error } = await supabase.from('profiles').select('*').order('email')
  if (error) {
    console.error(error)
    cloudAccounts = []
    return
  }
  cloudAccounts = (data ?? []).map((r) =>
    sessionUserFromProfileRow(r as Record<string, unknown>),
  )
}

export async function refreshRemoteSession(): Promise<void> {
  if (!supabase) return
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    cloudSessionUser = null
    cloudAccounts = []
    emitCloud()
    return
  }
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()
  if (error) {
    console.error(error)
    cloudSessionUser = null
    emitCloud()
    return
  }
  if (!profile) {
    cloudSessionUser = null
    emitCloud()
    return
  }
  cloudSessionUser = sessionUserFromProfileRow(profile as Record<string, unknown>)
  await refreshRemoteAccounts()
  emitCloud()
}

export function whenCloudAuthHydrated(): Promise<void> {
  if (!supabase) return Promise.resolve()
  cloudAuthBootstrapOnce ??= refreshRemoteSession()
  return cloudAuthBootstrapOnce
}

function ensureSupabaseAuthPipeline() {
  if (!supabase || supabaseListenerStarted) return
  supabaseListenerStarted = true
  void whenCloudAuthHydrated()
  supabase.auth.onAuthStateChange(() => {
    void refreshRemoteSession()
  })
}

export function subscribeAuth(listener: () => void) {
  cloudListeners.add(listener)
  ensureSupabaseAuthPipeline()
  return () => {
    cloudListeners.delete(listener)
  }
}

export function getAuthUserSnapshot(): SessionUser | null {
  return cloudSessionUser
}

export function getAuthAccounts(): SessionUser[] {
  return cloudAccounts
}

type AuthUiSnap = {
  user: SessionUser | null
  accountIds: string
  accounts: SessionUser[]
}
let authUiSnapCache: AuthUiSnap | null = null

/** Stable snapshot for useSyncExternalStore so the accounts list updates when only `accounts` changes. */
export function getAuthUiSnapshot(): AuthUiSnap {
  const user = getAuthUserSnapshot()
  const accounts = getAuthAccounts()
  const accountIds = accounts
    .map((a) => a.id)
    .sort()
    .join(',')
  if (
    authUiSnapCache &&
    authUiSnapCache.user === user &&
    authUiSnapCache.accountIds === accountIds
  ) {
    return authUiSnapCache
  }
  authUiSnapCache = { user, accountIds, accounts }
  return authUiSnapCache
}

export async function authLogin(
  email: string,
  password: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  if (!supabase) {
    return { ok: false, error: 'Supabase client is not available.' }
  }
  const emailNorm = email.trim().toLowerCase()
  const { error } = await supabase.auth.signInWithPassword({
    email: emailNorm,
    password,
  })
  if (error) {
    const msg = error.message
    const code = (error as { code?: string }).code ?? ''
    if (code === 'email_not_confirmed' || /email not confirmed|confirm your email/i.test(msg)) {
      return {
        ok: false,
        error:
          'Confirm your email address before signing in. Check your inbox or ask your administrator for help.',
      }
    }
    const invalid =
      /invalid login credentials/i.test(msg) ||
      msg.toLowerCase().includes('invalid login')
    if (invalid) {
      return { ok: false, error: 'Invalid email or password.' }
    }
    return { ok: false, error: msg }
  }
  cloudAuthBootstrapOnce = null
  await refreshRemoteSession()
  if (!cloudSessionUser) {
    return {
      ok: false,
      error:
        'No profile row in the database for this user. Run `supabase/sql/seed/demo_accounts.sql` (or ask an admin to add you under User management) so `public.profiles` matches your Auth account.',
    }
  }
  return { ok: true, user: cloudSessionUser }
}

export async function authLogout(): Promise<void> {
  cloudAuthBootstrapOnce = null
  await supabase?.auth.signOut()
  cloudSessionUser = null
  cloudAccounts = []
  emitCloud()
}

export async function authProvisionUser(
  input: RegisterInput,
): Promise<{ ok: true; reauthRequired?: boolean } | { ok: false; error: string }> {
  if (!supabase) {
    return { ok: false, error: 'Supabase client is not available.' }
  }

  const emailNorm = input.email.trim().toLowerCase()
  const displayTrim = input.displayName.trim()
  if (!emailNorm) {
    return { ok: false, error: 'Email is required.' }
  }
  if (!displayTrim) {
    return { ok: false, error: 'Display name is required.' }
  }
  if (!input.password.trim()) {
    return { ok: false, error: 'Password is required.' }
  }

  const {
    data: { session: sessionBefore },
  } = await supabase.auth.getSession()
  if (!sessionBefore || !sessionBefore.user.id) {
    return { ok: false, error: 'You must be signed in as an admin to add users.' }
  }
  const adminId = sessionBefore.user.id

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle()
  if (adminProfile?.role !== 'admin') {
    return { ok: false, error: 'Only admins can provision users.' }
  }

  const accessTokenBefore = sessionBefore.access_token
  const refreshTokenBefore = sessionBefore.refresh_token
  if (!accessTokenBefore || !refreshTokenBefore) {
    return {
      ok: false,
      error: 'Could not read admin session tokens. Sign out and sign in again, then retry.',
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: emailNorm,
    password: input.password,
    options: {
      data: {
        display_name: displayTrim,
        role: input.role,
      },
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  if (!data.user?.id) {
    return {
      ok: false,
      error:
        'Sign up did not return a user. In Supabase → Authentication → Providers, enable Email and allow new users to sign up.',
    }
  }

  const newUserId = data.user.id

  const { error: restoreErr } = await supabase.auth.setSession({
    access_token: accessTokenBefore,
    refresh_token: refreshTokenBefore,
  })

  if (restoreErr) {
    console.error(restoreErr)
    await supabase.auth.signOut()
    cloudSessionUser = null
    cloudAccounts = []
    emitCloud()
    return {
      ok: true,
      reauthRequired: true,
    }
  }

  const {
    data: { session: verify },
  } = await supabase.auth.getSession()
  if (verify?.user.id !== adminId) {
    await supabase.auth.signOut()
    cloudSessionUser = null
    cloudAccounts = []
    emitCloud()
    return {
      ok: true,
      reauthRequired: true,
    }
  }

  const { data: updatedRows, error: upErr } = await supabase
    .from('profiles')
    .update({
      display_name: displayTrim,
      role: input.role,
      source: 'provisioned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', newUserId)
    .select('id')

  if (upErr) {
    return {
      ok: false,
      error: `User exists in Auth but profile update failed: ${upErr.message}`,
    }
  }
  if (!updatedRows?.length) {
    return {
      ok: false,
      error:
        'No profile row for the new user. Ensure supabase/sql (handle_new_user trigger on auth.users) is applied.',
    }
  }

  await refreshRemoteSession()
  await refreshRemoteAccounts()
  emitCloud()
  return { ok: true }
}

export async function authUpdateUser(
  input: AdminUpdateUserInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) {
    return { ok: false, error: 'Supabase client is not available.' }
  }

  const emailNorm = input.email.trim().toLowerCase()
  if (!emailNorm) {
    return { ok: false, error: 'Email is required.' }
  }

  const { data: targetRow, error: loadErr } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', input.userId)
    .maybeSingle()
  if (loadErr || !targetRow) {
    return { ok: false, error: 'User not found.' }
  }

  if (String(targetRow.email).toLowerCase() !== emailNorm) {
    return {
      ok: false,
      error:
        'Changing the sign-in email must be done in Supabase → Authentication. You can still edit display name and role here.',
    }
  }

  const displayTrim = input.displayName.trim()
  if (!displayTrim) {
    return { ok: false, error: 'Display name is required.' }
  }

  if (input.newPassword?.trim()) {
    return {
      ok: false,
      error:
        'Password updates are not available from the browser with the publishable key. Use Supabase Auth or the password reset email flow.',
    }
  }

  const { data: profiles } = await supabase.from('profiles').select('id, role')
  const list = profiles ?? []
  const adminCount = list.filter((p) => p.role === 'admin').length
  const targetWasAdmin = targetRow.role === 'admin'
  if (targetWasAdmin && input.role !== 'admin' && adminCount <= 1) {
    return { ok: false, error: 'Cannot demote the last admin account.' }
  }

  const { error: upErr } = await supabase
    .from('profiles')
    .update({
      display_name: displayTrim,
      role: input.role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.userId)

  if (upErr) {
    return { ok: false, error: upErr.message }
  }

  await refreshRemoteSession()
  return { ok: true }
}

export async function authRemoveUser(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  void userId
  return {
    ok: false,
    error:
      'Remove users in Supabase → Authentication. You can change roles from the table above.',
  }
}

export async function authChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) {
    return { ok: false, error: 'Supabase client is not available.' }
  }
  const {
    data: { user: u },
  } = await supabase.auth.getUser()
  const email = u?.email
  if (!email) {
    return { ok: false, error: 'No active session.' }
  }
  const neu = newPassword.trim()
  if (!neu) {
    return { ok: false, error: 'New password is required.' }
  }
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (verifyErr) {
    return { ok: false, error: 'Current password is incorrect.' }
  }
  const { error: upErr } = await supabase.auth.updateUser({ password: neu })
  if (upErr) {
    return { ok: false, error: upErr.message }
  }
  await refreshRemoteSession()
  return { ok: true }
}
