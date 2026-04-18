import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resolvePostLoginRedirect } from '@/auth/role-access'
import { useAuth } from '@/auth/useAuth'
import { uiBtnBlock, uiBtnPrimary } from '@/shared/ui/button'

const fieldClass =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-[0.9375rem] text-ink shadow-inner shadow-black/[0.02] outline-none transition-[border-color,box-shadow] placeholder:text-ink-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string; message?: string } | undefined
  const candidate = state?.from
  const flashMessage = state?.message
  const from =
    candidate && candidate !== '/login' && candidate !== '/'
      ? candidate
      : undefined

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const result = await login(email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(resolvePostLoginRedirect(result.user, from), { replace: true })
  }

  return (
    <div className="w-full">
      <div className="rounded-3xl border border-border/80 bg-surface-card/95 p-8 shadow-[0_24px_60px_-16px_oklch(0.35_0.04_85_/_0.14)] ring-1 ring-border/50 backdrop-blur-[2px] sm:p-10">
        <div className="space-y-2 text-center">
          <h1 className="text-[1.625rem] font-semibold tracking-tight text-ink sm:text-3xl">Sign in</h1>
          <p className="text-sm leading-relaxed text-ink-muted sm:text-base">
            Use your work email and password.
          </p>
        </div>

        {flashMessage ? (
          <p className="mt-6 rounded-xl border border-accent/35 bg-accent-muted/50 px-4 py-3 text-sm leading-relaxed text-ink">
            {flashMessage}
          </p>
        ) : null}

        <form className={flashMessage ? 'mt-6 space-y-5' : 'mt-8 space-y-5'} onSubmit={handleSubmit}>
          <div className="space-y-2 text-left">
            <label className="text-sm font-medium text-ink" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm font-medium text-ink" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
              placeholder="••••••••"
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-danger/25 bg-danger-muted px-4 py-3 text-sm leading-relaxed text-danger-ink">
              {error}
            </p>
          ) : null}
          <button type="submit" className={`${uiBtnPrimary} ${uiBtnBlock} mt-1 rounded-xl py-3.5 text-base font-semibold`}>
            Sign in
          </button>
        </form>
      </div>
      <p className="mt-8 text-center text-xs text-ink-muted">
        Chic Bowl by 3rd Jen Kitchens
      </p>
    </div>
  )
}
