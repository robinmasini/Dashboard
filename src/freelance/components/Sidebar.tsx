import { useNavigate, useLocation } from 'react-router-dom'
import RobinLogo from '../../shared/components/RobinLogo'
import './Sidebar.css'

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
}

const navItems: NavItem[] = [
  { id: 'projet', label: 'Votre Projet', icon: '📁', path: '/admin/projet' },
  { id: 'commandes', label: 'Commandes', icon: '📋', path: '/admin/commandes' },
  { id: 'planning', label: 'Planning', icon: '📅', path: '/admin/planning' },
]

/**
 * Sidebar de navigation pour le Dashboard Client
 */
export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="sidebar">
      <RobinLogo />

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar__nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="sidebar__nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

