import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../shared/hooks/useAuth'
import '../App.css'
import '../shared/components/Sidebar.css'
import logoDs from '../assets/rm-logo.png'
import robinAvatar from '../assets/robin-avatar.png'

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
}

export default function CRMLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  // Mobile detection & menu open state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Navigation spécifique au Personal CRM
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '/admin/crm/dashboard' },
    { id: 'entreprises', label: 'Entreprises', icon: '🏢', path: '/admin/crm/entreprises' },
    { id: 'contacts', label: 'Contacts', icon: '👥', path: '/admin/crm/contacts' },
    { id: 'templates', label: 'Templates', icon: '📝', path: '/admin/crm/templates' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/admin/crm/settings' },
  ]

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/auth/freelance')
  }

  // Calcul de l'âge et des jours vécus
  const calculateAgeAndDays = () => {
    const birthDate = new Date('2002-08-24')
    const today = new Date()

    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    const lastBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
    if (today < lastBirthday) {
      lastBirthday.setFullYear(today.getFullYear() - 1)
    }

    const diffTime = Math.abs(today.getTime() - lastBirthday.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return { age, days: diffDays }
  }

  const { age, days } = calculateAgeAndDays()

  return (
    <div className={`app-shell ${isMobile ? 'is-mobile' : ''} ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Header Bar */}
      {isMobile && (
        <header className="mobile-header">
          <button
            className="mobile-header__burger"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <div className="mobile-header__logo">
            <img src={logoDs} alt="Logo CRM" style={{ height: '32px' }} />
          </div>
          <div className="mobile-header__user" onClick={() => setIsMobileMenuOpen(true)}>
            <img src={robinAvatar} alt="Robin Masini" className="mobile-header__avatar-img" />
          </div>
        </header>
      )}

      {/* Dark Blur Overlay Backdrop */}
      {isMobile && isMobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${isMobile ? 'mobile-sidebar' : ''} ${isMobileMenuOpen ? 'is-open' : ''}`}>
        {/* Close Button inside Sidebar on mobile */}
        {isMobile && (
          <button
            className="sidebar__close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        )}

        {/* Brand / Logo Section */}
        <div className="sidebar__logo-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '0px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={logoDs} alt="Logo Dashboard" className="sidebar__logo" style={{ margin: 0 }} />
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#a5b4fc',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 700,
            paddingLeft: '14px',
            marginTop: '12px',
            textShadow: '0 0 10px rgba(165, 180, 252, 0.3)'
          }}>
            Personal CRM
          </div>
        </div>

        <nav className="sidebar__nav" style={{ marginTop: '12px' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar__nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => {
                navigate(item.path)
                setIsMobileMenuOpen(false)
              }}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              <span className="sidebar__nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="sidebar__footer" style={{ marginTop: 'auto' }}>
          {/* Bouton Retour au Dashboard Principal */}
          <button
            onClick={() => navigate('/admin/performance')}
            className="ghost-button"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.02)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontWeight: 600,
              fontSize: '0.85rem',
              marginBottom: '16px',
              transition: 'all 0.2s'
            }}
          >
            <span>←</span> Retour Freelance
          </button>

          <div className="sidebar__profile-card">
            <div className="sidebar__profile-image">
              <img src={robinAvatar} alt="Robin Masini" className="sidebar__profile-img" />
            </div>
            <div className="sidebar__profile-text">
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', fontWeight: 500 }}>
                {age} ans • {days} jours
              </div>
              <div className="sidebar__contact">EI Robin MASINI</div>
              <div className="sidebar__domain">crm.robinmasini.com</div>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button" style={{ marginTop: '8px' }}>
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="workspace">
        <Outlet />
      </main>
    </div>
  )
}
