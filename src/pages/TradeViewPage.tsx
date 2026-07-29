import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TVLoader from '../shared/components/TVLoader'
import HeaderGlobal from '../components/tradeview/HeaderGlobal'
import MarketView from '../components/tradeview/MarketView'
import DashboardView from '../components/tradeview/DashboardView'
import DataView from '../components/tradeview/DataView'
import { useTradeViewWebSocket } from '../hooks/useTradeViewWebSocket'

import tvLogo from '../assets/tv.png'
import robinAvatar from '../assets/robin-avatar.png'
import '../shared/components/Sidebar.css'

export default function TradeViewPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Market' | 'Data'>('Market')
  const [pageLoading, setPageLoading] = useState(true)

  // WebSocket Hook connected to Rust backend (defaults to ws://localhost:8080/ws)
  const tradeState = useTradeViewWebSocket('ws://localhost:8080/ws')

  useEffect(() => {
    document.title = 'TradeView - Interactive Brokers Scalping Robot'

    const existingFavicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    const originalFaviconHref = existingFavicon ? existingFavicon.href : '/favicon.png'

    let link: HTMLLinkElement = existingFavicon
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.getElementsByTagName('head')[0].appendChild(link)
    }
    link.href = '/tv-seul.png'

    const timer = setTimeout(() => {
      setPageLoading(false)
    }, 500)

    return () => {
      clearTimeout(timer)
      if (link) {
        link.href = originalFaviconHref
      }
    }
  }, [])

  if (pageLoading) {
    return <TVLoader />
  }

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
    { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'Market', label: 'Market', icon: '📈' },
    { id: 'Data', label: 'Data', icon: '⚡' },
  ]

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#000000', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        className="sidebar"
        style={{
          width: '280px',
          minWidth: '280px',
          height: '100vh',
          backgroundColor: '#000000',
          backgroundImage: 'none',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 18px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '20px', paddingLeft: '20px' }}>
            <img
              src={tvLogo}
              alt="TradeView Logo"
              style={{
                maxWidth: '180px',
                maxHeight: '140px',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                cursor: 'default',
                display: 'block',
              }}
            />
          </div>

          <nav className="sidebar__nav" style={{ gap: '12px' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar__nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id as any)}
              >
                <span className="sidebar__nav-icon">{item.icon}</span>
                <span className="sidebar__nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar__footer" style={{ position: 'relative', zIndex: 1, marginTop: 'auto' }}>
          <div className="sidebar__profile-card">
            <div className="sidebar__profile-image">
              <img src={robinAvatar} alt="Robin Masini" className="sidebar__profile-img" />
            </div>
            <div className="sidebar__profile-text">
              <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px', fontWeight: 500 }}>
                {age} ans • {days} jours
              </div>
              <div className="sidebar__contact">EI Robin MASINI</div>
              <div className="sidebar__siret">99268512300018</div>
              <div className="sidebar__domain">robinmasini.com</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/performance')}
            className="logout-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>← Retour au Dashboard</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area with Global Header */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#000000', overflow: 'hidden' }}>
        <HeaderGlobal
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as any)}
          tradeState={tradeState}
        />

        {activeTab === 'Market' && <MarketView tradeState={tradeState} />}
        {activeTab === 'Dashboard' && <DashboardView tradeState={tradeState} />}
        {activeTab === 'Data' && <DataView />}
      </div>
    </div>
  )
}
