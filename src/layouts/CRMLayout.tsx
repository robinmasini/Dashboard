import { Outlet } from 'react-router-dom'
import SectionTabs from '../shared/components/SectionTabs'

const crmTabs = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin/crm/dashboard' },
  { id: 'entreprises', label: 'Entreprises', path: '/admin/crm/entreprises' },
  { id: 'contacts', label: 'Contacts', path: '/admin/crm/contacts' },
  { id: 'templates', label: 'Templates', path: '/admin/crm/templates' },
  { id: 'settings', label: 'Settings', path: '/admin/crm/settings' },
]

export default function CRMLayout() {
  return (
    <div className="workspace__content">
      <SectionTabs label="Personal CRM" tabs={crmTabs} />
      <div style={{ marginTop: '24px' }}>
        <Outlet />
      </div>
    </div>
  )
}
