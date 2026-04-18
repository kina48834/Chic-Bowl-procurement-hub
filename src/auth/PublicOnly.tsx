import { Navigate, Outlet } from 'react-router-dom'
import { defaultDashboardPath } from '@/auth/role-access'
import { useAuth } from '@/auth/useAuth'

export function PublicOnly() {
  const { user } = useAuth()
  if (user) {
    return <Navigate to={defaultDashboardPath(user)} replace />
  }
  return <Outlet />
}
