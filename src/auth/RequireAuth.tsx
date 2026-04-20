import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

export function RequireAuth() {
  const { user, authBootstrapped } = useAuth()
  const location = useLocation()
  if (!authBootstrapped) {
    return (
      <div className="flex min-h-dvh min-h-svh items-center justify-center px-4 text-center text-sm text-ink-muted">
        Restoring your session…
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
