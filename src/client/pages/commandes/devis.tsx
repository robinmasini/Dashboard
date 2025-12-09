import { useState, useEffect } from 'react'
import { useProposals, useAuth, useClients } from '../../../shared'
import SectionTabs from '../../../shared/components/SectionTabs'
import '../../../App.css'

const commandesTabs = [
  { id: 'tickets', label: 'Tickets', path: '/dashboard/commandes/tickets' },
  { id: 'devis', label: 'Devis', path: '/dashboard/commandes/devis' },
  { id: 'facturation', label: 'Facturation', path: '/dashboard/commandes/facturation' },
]

/**
 * Page Devis - Liste des devis du client
 * Utilise les hooks Supabase pour charger les devis
 */
export default function Devis() {
  const { user } = useAuth()
  const { clients } = useClients()
  const [clientId, setClientId] = useState<string | undefined>('00000000-0000-0000-0000-000000000000')

  useEffect(() => {
    if (user && clients.length > 0) {
      const client = clients.find(c =>
        c.auth_user_id === user.id ||
        (c.email && user.email && c.email.trim().toLowerCase() === user.email.trim().toLowerCase())
      )
      if (client) {
        setClientId(client.id)
      }
    }
  }, [user, clients])

  // Récupérer les devis depuis Supabase (filtrés automatiquement par RLS)
  const { proposals, loading } = useProposals(clientId)

  return (
    <div className="workspace__content">
      <SectionTabs label="Commandes" tabs={commandesTabs} />

      <div className="panel">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chargement des devis...
          </div>
        ) : proposals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {proposals.map((proposal) => (
              <div key={proposal.id} style={{
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '18px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '1.1rem' }}>
                      {proposal.subtitle || proposal.title.split(' - ')[0]}
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {proposal.title.includes(' - ') ? proposal.title.split(' - ')[1] : proposal.title}
                    </p>
                  </div>
                  <span className={`status-pill status-pill--${proposal.status === 'Signé' ? 'signed' : 'pending'}`}>
                    {proposal.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Date: {proposal.date}
                  </p>
                  <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                    {proposal.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="page-placeholder">
            <div className="page-placeholder__icon">📝</div>
            <p className="page-placeholder__title">Aucun devis</p>
            <p className="page-placeholder__description">
              Vos devis apparaîtront ici une fois créés.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
