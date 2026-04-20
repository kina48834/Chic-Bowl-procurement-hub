import { Navigate } from 'react-router-dom'
import { defaultDashboardPath } from '@/auth/role-access'
import { useAuth } from '@/auth/useAuth'

export function CatchAllRedirect() {
  const { user, authBootstrapped } = useAuth()
  if (!authBootstrapped) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    )
  }
  return <Navigate to={user ? defaultDashboardPath(user) : '/'} replace />
}
