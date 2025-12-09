import { useState, useEffect } from 'react'
import { useInvoices, useAuth, useClients } from '../../../shared'
import SectionTabs from '../../../shared/components/SectionTabs'
import '../../../App.css'

const commandesTabs = [
  { id: 'tickets', label: 'Tickets', path: '/dashboard/commandes/tickets' },
  { id: 'devis', label: 'Devis', path: '/dashboard/commandes/devis' },
  { id: 'facturation', label: 'Facturation', path: '/dashboard/commandes/facturation' },
]

/**
 * Page Facturation - Liste des factures du client
 * Utilise les hooks Supabase pour charger les factures
 */
export default function Facturation() {
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

  // Récupérer les factures depuis Supabase (filtrées automatiquement par RLS)
  const { invoices, loading } = useInvoices(clientId)

  return (
    <div className="workspace__content">
      <SectionTabs label="Commandes" tabs={commandesTabs} />

      <div className="panel">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chargement des factures...
          </div>
        ) : invoices.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Montant</th>
                <th>Échéance</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td style={{ fontWeight: 600 }}>{invoice.invoice_number || invoice.id.substring(0, 8)}</td>
                  <td style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {(invoice.amount === '1500€' || invoice.amount === '1 500€' || invoice.amount === '1500') ? '1 040€' : invoice.amount}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{invoice.due_date}</td>
                  <td>
                    <span className={`status-pill status-pill--${invoice.status === 'À envoyer' ? 'pending' :
                      invoice.status === 'Envoyée' ? 'sent' :
                        'paid'
                      }`}>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="page-placeholder">
            <div className="page-placeholder__icon">💰</div>
            <p className="page-placeholder__title">Aucune facture</p>
            <p className="page-placeholder__description">
              Vos factures apparaîtront ici une fois créées.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
