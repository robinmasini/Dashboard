import { useNavigate, useLocation } from 'react-router-dom'
import '../../App.css'

interface Tab {
  id: string
  label: string
  path: string
}

interface SectionTabsProps {
  label: string
  tabs: Tab[]
}

/**
 * Composant de navigation par onglets pour les sections
 */
export default function SectionTabs({ label, tabs }: SectionTabsProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="section-header">
      <div className="section-header__tabs">
        <p className="section-header__label">{label}</p>
        <div className="tab-group">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-pill ${location.pathname === tab.path ? 'is-active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

