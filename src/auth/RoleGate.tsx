import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import type { RoleId } from '@/shared/types/nav'

type RoleGateProps = {
  allow: RoleId[]
  children: ReactNode
}

export function RoleGate({ allow, children }: RoleGateProps) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (user.role === 'admin' || allow.includes(user.role)) {
    return <>{children}</>
  }
  return <Navigate to="/" replace />
}
