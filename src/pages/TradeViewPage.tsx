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
      {/* TradeView Sidebar (Black background, tv.png logo, 3 categories with blue beam indicator & original profile card) */}
      <aside
        className="sidebar"
        style={{
          width: '300px',
          minWidth: '300px',
          height: '100vh',
          backgroundColor: '#000000',
          backgroundImage: 'none',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '32px 24px',
          boxSizing: 'border-box'
        }}
      >
        {/* Top Section */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo Section with tv.png */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: '32px', padding: 0 }}>
            <img
              src={tvLogo}
              alt="TradeView Logo"
              style={{
                width: '100%',
                maxWidth: '252px',
                maxHeight: '140px',
                height: 'auto',
                objectFit: 'contain',
                cursor: 'pointer',
                display: 'block',
                margin: '0 auto'
              }}
              onClick={() => navigate('/admin/performance')}
            />
          </div>

          {/* Navigation Items: Dashboard / Market / Data with blue beam indicator */}
          <nav className="sidebar__nav" style={{ gap: '12px' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar__nav-item ${activeTab === item.label ? 'active' : ''}`}
                onClick={() => setActiveTab(item.label)}
              >
                <span className="sidebar__nav-icon">{item.icon}</span>
                <span className="sidebar__nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Footer Section: Original Profile Card & Return Link */}
        <div className="sidebar__footer" style={{ position: 'relative', zIndex: 1, marginTop: 'auto' }}>
          {/* Profile Card matching exact design */}
          <div className="sidebar__profile-card">
            <div className="sidebar__profile-image">
              <img src={robinAvatar} alt="Robin Masini" className="sidebar__profile-img" />
            </div>
            <div className="sidebar__profile-text">
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', fontWeight: 500 }}>
                {age} ans • {days} jours
              </div>
              <div className="sidebar__contact">EI Robin MASINI</div>
              <div className="sidebar__siret">99268512300018</div>
              <div className="sidebar__domain">robinmasini.com</div>
            </div>
          </div>

          {/* Return to Main Dashboard */}
          <button
            onClick={() => navigate('/admin/performance')}
            className="logout-button"
            style={{
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
