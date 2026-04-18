import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

export function PublicOnly() {
  const { user } = useAuth()
  if (user) {
    return <Navigate to="/app" replace />
  }
  return <Outlet />
}
