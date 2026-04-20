import { useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/useAuth'
import { getRoleLabel, roles } from '@/shared/roles/registry'
import { uiBtnPrimary, uiBtnSecondary } from '@/shared/ui/button'

function sourceLabel(source: 'seed' | 'registration' | 'provisioned') {
  if (source === 'seed') return 'Bootstrap account (SQL / local store)'
  if (source === 'provisioned') return 'Admin provisioned'
  return 'Self-registration'
}

export function WorkspaceProfilePage() {
  const { user, changePassword } = useAuth()
  const [currentPwd, setCurrentPwd] = useState('')
  const [nextPwd, setNextPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMessage, setPwdMessage] = useState<string | null>(null)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdBusy, setPwdBusy] = useState(false)

  if (!user) {
    return null
  }

  const roleMeta = roles.find((r) => r.id === user.role)
  const initial = user.displayName.trim().charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()
  const showAuthId = user.id !== user.accountRef

  const onPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPwdError(null)
    setPwdMessage(null)
    if (nextPwd !== confirmPwd) {
      setPwdError('New password and confirmation do not match.')
      return
    }
    setPwdBusy(true)
    try {
      const result = await changePassword(currentPwd, nextPwd)
      if (!result.ok) {
        setPwdError(result.error)
        return
      }
      setPwdMessage('Password updated successfully.')
      setCurrentPwd('')
      setNextPwd('')
      setConfirmPwd('')
    } finally {
      setPwdBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-4">
      <section className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-surface-card via-surface-card to-accent-muted/25 shadow-md ring-1 ring-border/40">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-accent text-2xl font-semibold text-on-accent shadow-lg ring-2 ring-border-strong/15 sm:size-24 sm:text-3xl"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Workspace profile</p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {user.displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {roleMeta ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-ink shadow-sm">
                  <span aria-hidden>{roleMeta.emoji}</span>
                  {getRoleLabel(user.role)}
                </span>
              ) : null}
              <span className="text-sm text-ink-muted">{user.email}</span>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-ink-muted">
              Your name and role are maintained by an{' '}
              <strong className="font-medium text-ink">admin</strong> in{' '}
              <span className="whitespace-nowrap font-medium text-ink">User management</span>.
              {' '}
              Passwords use Supabase Authentication.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="ui-panel flex flex-col p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-ink">Account details</h2>
          <p className="mt-1 text-xs text-ink-muted">Read-only identifiers and provisioning metadata.</p>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
                Account ID
              </dt>
              <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-ink">
                {user.accountRef}
              </dd>
            </div>
            {showAuthId ? (
              <div>
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
                  Auth user ID
                </dt>
                <dd className="mt-1 break-all font-mono text-[0.7rem] text-ink-muted">{user.id}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
                Source
              </dt>
              <dd className="mt-1 text-ink-muted">{sourceLabel(user.source)}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-ink-muted">
                Member since
              </dt>
              <dd className="mt-1 text-ink">
                {new Date(user.createdAt).toLocaleString(undefined, {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </dd>
            </div>
          </dl>
        </section>

        <section className="ui-panel flex flex-col p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-ink">Change password</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Confirm your current password, then choose a new one. This updates Supabase Auth.
          </p>
          <form className="mt-5 flex flex-col gap-4" onSubmit={onPasswordSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-muted" htmlFor="prof-cur-pwd">
                Current password
              </label>
              <input
                id="prof-cur-pwd"
                type="password"
                autoComplete="current-password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none ring-accent/25 focus:border-accent focus:ring-2"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-muted" htmlFor="prof-new-pwd">
                New password
              </label>
              <input
                id="prof-new-pwd"
                type="password"
                autoComplete="new-password"
                value={nextPwd}
                onChange={(e) => setNextPwd(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none ring-accent/25 focus:border-accent focus:ring-2"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-muted" htmlFor="prof-confirm-pwd">
                Confirm new password
              </label>
              <input
                id="prof-confirm-pwd"
                type="password"
                autoComplete="new-password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none ring-accent/25 focus:border-accent focus:ring-2"
                required
              />
            </div>
            {pwdError ? (
              <p className="rounded-xl border border-danger/25 bg-danger-muted px-3 py-2 text-sm text-danger-ink">
                {pwdError}
              </p>
            ) : null}
            {pwdMessage ? (
              <p className="rounded-xl border border-border bg-success-muted px-3 py-2 text-sm text-ink">
                {pwdMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={pwdBusy} className={`${uiBtnPrimary} min-w-[8rem]`}>
                {pwdBusy ? 'Saving…' : 'Update password'}
              </button>
              <button
                type="button"
                className={uiBtnSecondary}
                onClick={() => {
                  setCurrentPwd('')
                  setNextPwd('')
                  setConfirmPwd('')
                  setPwdError(null)
                  setPwdMessage(null)
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </section>
      </div>

      <p className="text-center text-xs leading-relaxed text-ink-muted">
        Need a different name or role? Ask an admin to update your account in{' '}
        <span className="font-medium text-ink">Admin → User management</span>.
      </p>
    </div>
  )
}
