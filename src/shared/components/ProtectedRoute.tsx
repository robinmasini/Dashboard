import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { UserRole } from '../types/roles'

type ProtectedRouteProps = {
  children: React.ReactNode
  allowedRole: UserRole
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #1a1447, #05060d 60%)'
      }}>
        <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
      </div>
    )
  }

  // 1. Si pas connecté, redirection vers le login approprié
  if (!user) {
    const loginPath = allowedRole === UserRole.CLIENT ? '/auth/client' : '/auth/freelance'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  // 2. Si connecté mais pas le bon rôle
  if (role && role !== allowedRole) {
    // Redirection vers le dashboard approprié
    const dashboardPath = role === UserRole.CLIENT ? '/dashboard/projet' : '/admin/commandes'
    return <Navigate to={dashboardPath} replace />
  }

  // 3. Si tout est bon, on affiche la page
  return <>{children}</>
}
