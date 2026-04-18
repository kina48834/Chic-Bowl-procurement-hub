import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

export function CatchAllRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? '/app' : '/'} replace />
}
