import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { UserRole } from '../types/roles'
import RMLoader from './RMLoader'

type ProtectedRouteProps = {
  children: React.ReactNode
  allowedRole: UserRole
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <RMLoader />
  }

  // 1. Si pas connecté ou si le rôle ne correspond pas
  if (!user || (role && role !== allowedRole)) {
    const loginPath = allowedRole === UserRole.CLIENT ? '/auth/client' : '/auth/freelance'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  // 2. Si connecté avec le bon rôle
  return <>{children}</>
}
