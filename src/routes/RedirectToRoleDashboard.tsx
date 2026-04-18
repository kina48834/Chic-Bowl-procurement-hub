import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { defaultDashboardPath } from '@/auth/role-access'

/** Replaces the old `/app` role-picker: send signed-in users straight to their workspace dashboard. */
export function RedirectToRoleDashboard() {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={defaultDashboardPath(user)} replace />
}
