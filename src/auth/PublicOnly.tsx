import { Navigate, Outlet } from 'react-router-dom'
import { defaultDashboardPath } from '@/auth/role-access'
import { useAuth } from '@/auth/useAuth'

export function PublicOnly() {
  const { user, authBootstrapped } = useAuth()
  if (!authBootstrapped) {
    return <Outlet />
  }
  if (user) {
    return <Navigate to={defaultDashboardPath(user)} replace />
  }
  return <Outlet />
}
