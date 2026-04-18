import { Navigate } from 'react-router-dom'
import { defaultDashboardPath } from '@/auth/role-access'
import { useAuth } from '@/auth/useAuth'

export function CatchAllRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? defaultDashboardPath(user) : '/'} replace />
}
