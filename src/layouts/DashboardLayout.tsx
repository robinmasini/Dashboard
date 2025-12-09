import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { UserRole } from '../shared/types/roles'
import { useAuth } from '../shared/hooks/useAuth'
import { useClients } from '../shared/hooks/useSupabaseHooks'
import '../App.css'
import '../shared/components/Sidebar.css'
import logoDs from '../assets/logo-ds.png'
import robinAvatar from '../assets/robin-avatar.png'

// Composant pour afficher le profil du client connecté
function ClientProfileSection({ user, onAvatarClick }: { user: any; onAvatarClick?: () => void }) {
  const { clients } = useClients()

  // Trouver le client associé à l'utilisateur connecté
  const clientInfo = clients.find(c =>
    c.auth_user_id === user?.id ||
    (c.email && user?.email && c.email.trim().toLowerCase() === user.email.trim().toLowerCase())
  )

  // Debug: afficher les infos pour comprendre le problème
  console.log('🔍 ClientProfileSection Debug:', {
    userId: user?.id,
    userEmail: user?.email,
    clientsCount: clients.length,
    clientsData: clients.map(c => ({ name: c.name, email: c.email, auth_user_id: c.auth_user_id, avatar_url: c.avatar_url })),
    clientFound: !!clientInfo,
    clientInfo: clientInfo,
    avatarUrl: clientInfo?.avatar_url
  })

  // Première lettre pour l'avatar par défaut
  const avatarLetter = clientInfo?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'
  const displayName = clientInfo?.name || 'Client'
  const displayEmail = user?.email || ''

  return (
    <div className="sidebar__profile-card">
      <div
        className="sidebar__profile-image"
        onClick={onAvatarClick}
        style={{ cursor: onAvatarClick ? 'pointer' : 'default' }}
      >
        {clientInfo?.avatar_url ? (
          <img
            src={clientInfo.avatar_url.startsWith('http') || clientInfo.avatar_url.startsWith('/')
              ? clientInfo.avatar_url
              : `/${clientInfo.avatar_url}`}
            alt={displayName}
            className="sidebar__profile-img"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: 'white',
            fontWeight: 600
          }}>
            {avatarLetter}
          </div>
        )}
      </div>
      <div className="sidebar__profile-text">
        <div className="sidebar__contact" style={{ fontWeight: 600 }}>
          {displayName}
        </div>
        <div className="sidebar__domain" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          {displayEmail}
        </div>
      </div>
    </div>
  )
}

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
}

interface DashboardLayoutProps {
  role: UserRole
  children?: React.ReactNode
}

/**
 * Layout principal du dashboard avec sidebar adaptative selon le rôle
 */
export default function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  // Mobile detection & collapsed state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      setIsCollapsed(mobile)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = () => setIsCollapsed(!isCollapsed)


  // Navigation différente selon le rôle
  const navItems: NavItem[] = role === UserRole.FREELANCE ? [
    { id: 'performance', label: 'Performance', icon: '📊', path: '/admin/performance' },
    { id: 'commandes', label: 'Commandes', icon: '📋', path: '/admin/commandes' },
    { id: 'time-tracking', label: 'Time Tracking', icon: '⏱️', path: '/admin/time-tracking' },
    { id: 'planning', label: 'Planning', icon: '📅', path: '/admin/planning' },
    { id: 'clients', label: 'Clients', icon: '👥', path: '/admin/clients' },
  ] : [
    { id: 'projet', label: 'Votre Projet', icon: '📁', path: '/dashboard/projet' },
    { id: 'commandes', label: 'Commandes', icon: '📋', path: '/dashboard/commandes' },
    { id: 'planning', label: 'Planning', icon: '📅', path: '/dashboard/planning' },
  ]

  const isActive = (path: string) => {
    if (role === UserRole.CLIENT && path === '/dashboard/commandes') {
      return location.pathname.startsWith('/dashboard/commandes')
    }
    return location.pathname.startsWith(path)
  }

  const handleLogout = async () => {
    await logout()
    navigate(role === UserRole.CLIENT ? '/auth/client' : '/auth/freelance')
  }

  // Calcul de l'âge et des jours vécus depuis le dernier anniversaire
  const calculateAgeAndDays = () => {
    const birthDate = new Date('2002-08-24')
    const today = new Date()

    // Âge en années
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    // Date du dernier anniversaire
    const lastBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
    if (today < lastBirthday) {
      lastBirthday.setFullYear(today.getFullYear() - 1)
    }

    // Jours depuis le dernier anniversaire
    const diffTime = Math.abs(today.getTime() - lastBirthday.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return { age, days: diffDays }
  }

  const { age, days } = calculateAgeAndDays()

  return (
    <div className={`app-shell ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile && !isCollapsed ? 'expanded' : ''}`}>
        {/* Toggle Button - Mobile */}
        {isMobile && (
          <button
            className="sidebar__toggle"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Ouvrir menu' : 'Fermer menu'}
          >
            {isCollapsed ? '☰' : '✕'}
          </button>
        )}

        {/* Logo Section */}
        <div className="sidebar__logo-container">
          <img src={logoDs} alt="Logo Digital Radicalz" className="sidebar__logo" />
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar__nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="sidebar__nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Contact / Bottom Section */}
        <div className="sidebar__footer">
          {role === UserRole.FREELANCE ? (
            <>
              <div className="sidebar__profile-card">
                <div
                  className="sidebar__profile-image"
                  onClick={isMobile ? toggleSidebar : undefined}
                  style={{ cursor: isMobile ? 'pointer' : 'default' }}
                >
                  <img src={robinAvatar} alt="Robin Masini" className="sidebar__profile-img" />
                </div>
                {!isCollapsed && (
                  <div className="sidebar__profile-text">
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', fontWeight: 500 }}>
                      {age} ans • {days} jours
                    </div>
                    <div className="sidebar__contact">EI Robin MASINI</div>
                    <div className="sidebar__siret">99268512300018</div>
                    <div className="sidebar__domain">robinmasini.com</div>
                  </div>
                )}
              </div>
              <button onClick={handleLogout} className="logout-button">
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <ClientProfileSection user={user} onAvatarClick={isMobile ? toggleSidebar : undefined} />
              <button
                onClick={handleLogout}
                className="ghost-button logout-button"
              >
                Se déconnecter
              </button>
            </>
          )}
        </div>
      </aside>

      <main className={`workspace ${isCollapsed ? 'workspace--expanded' : ''}`}>
        {children || <Outlet />}
      </main>
    </div>
  )
}
