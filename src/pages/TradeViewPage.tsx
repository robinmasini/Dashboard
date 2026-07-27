import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import tvLogo from '../assets/tv.png'
import robinAvatar from '../assets/robin-avatar.png'
import '../shared/components/Sidebar.css'

export default function TradeViewPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Dashboard')

  useEffect(() => {
    document.title = 'TradeView - Interactive Brokers Scalping Robot'
  }, [])

  // Calcul de l'âge et des jours vécus depuis le dernier anniversaire
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'market', label: 'Market', icon: '📈' },
    { id: 'data', label: 'Data', icon: '⚡' },
  ]

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#000000', overflow: 'hidden' }}>
      {/* TradeView Sidebar (Black background, tv.png logo, 3 categories) */}
      <aside
        className="sidebar"
        style={{
          width: '260px',
          minWidth: '260px',
          height: '100vh',
          backgroundColor: '#000000',
          backgroundImage: 'none',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
          boxSizing: 'border-box'
        }}
      >
        {/* Logo Section with tv.png */}
        <div>
          <div className="sidebar__logo-container" style={{ padding: '8px 12px', marginBottom: '24px' }}>
            <img
              src={tvLogo}
              alt="TradeView Logo"
              className="sidebar__logo"
              style={{ maxHeight: '45px', width: 'auto', objectFit: 'contain', cursor: 'pointer' }}
              onClick={() => navigate('/admin/performance')}
            />
          </div>

          {/* Navigation Items: Dashboard / Market / Data */}
          <nav className="sidebar__nav" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar__nav-item ${activeTab === item.label ? 'active' : ''}`}
                onClick={() => setActiveTab(item.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: activeTab === item.label ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  border: activeTab === item.label ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  color: activeTab === item.label ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontWeight: activeTab === item.label ? 600 : 400,
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="sidebar__nav-icon" style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span className="sidebar__nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer Profile & Logout */}
        <div className="sidebar__footer" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div className="sidebar__profile-card" style={{ marginBottom: '12px' }}>
            <div className="sidebar__profile-image">
              <img src={robinAvatar} alt="Robin Masini" className="sidebar__profile-img" />
            </div>
            <div className="sidebar__profile-text">
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px', fontWeight: 500 }}>
                {age} ans • {days} jours
              </div>
              <div className="sidebar__contact" style={{ color: 'white', fontWeight: 600 }}>EI Robin MASINI</div>
              <div className="sidebar__domain" style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>robinmasini.com</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/performance')}
            className="ghost-button"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>← Retour au Dashboard</span>
          </button>
        </div>
      </aside>

      {/* Virgin Black Workspace Area */}
      <main style={{ flex: 1, height: '100vh', backgroundColor: '#000000' }}>
      </main>
    </div>
  )
}
