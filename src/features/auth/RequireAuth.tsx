import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'

export function RequireAuth({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user === undefined) return fallback
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}
