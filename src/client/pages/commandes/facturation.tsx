import { useState, useEffect, useMemo } from 'react'
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
 * Avec style d'alerte rouge pour les factures impayées
 */
export default function Facturation() {
  const { user } = useAuth()
  const { clients, loading: loadingClients } = useClients()
  const [clientId, setClientId] = useState<string | undefined>(undefined)

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

  // Récupérer les factures depuis Supabase (filtrées par client_id)
  const { invoices, loading } = useInvoices(clientId)

  // Separate paid and unpaid invoices
  const { unpaidInvoices, paidInvoices } = useMemo(() => {
    const unpaid = invoices.filter(inv => inv.status === 'Envoyée' || inv.status === 'À envoyer')
    const paid = invoices.filter(inv => inv.status === 'Payée')
    return { unpaidInvoices: unpaid, paidInvoices: paid }
  }, [invoices])

  const handlePayInvoice = (_invoiceId: string) => {
    // Télécharger le RIB Shine pour le virement
    const link = document.createElement('a')
    link.href = '/RIB-Shine.pdf'
    link.download = 'RIB-EI-Robin-Masini.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="workspace__content">
      <SectionTabs label="Commandes" tabs={commandesTabs} />

      <div className="panel">
        {loadingClients || !clientId ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {loadingClients ? 'Chargement...' : 'Configuration du compte...'}
          </div>
        ) : loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chargement des factures...
          </div>
        ) : invoices.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Unpaid Invoices - Red Alert Style */}
            {unpaidInvoices.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#ef4444',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ⚠️ Factures en attente de règlement
                </h3>

                {unpaidInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '16px',
                      padding: '20px 24px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Invoice Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
                      {/* Invoice Icon */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>
                        📄
                      </div>

                      {/* Invoice Details */}
                      <div>
                        <p style={{
                          margin: 0,
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          color: '#fff'
                        }}>
                          Facture {invoice.invoice_number || invoice.id.substring(0, 8)}
                        </p>
                        <p style={{
                          margin: '4px 0 0',
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)'
                        }}>
                          Échéance : {invoice.due_date}
                        </p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: 'center', minWidth: '100px' }}>
                      <p style={{
                        margin: 0,
                        fontWeight: 700,
                        fontSize: '1.4rem',
                        color: '#ef4444'
                      }}>
                        {(invoice.amount === '1500€' || invoice.amount === '1 500€' || invoice.amount === '1500') ? '1 040€' : invoice.amount}
                      </p>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: invoice.status === 'Envoyée' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: invoice.status === 'Envoyée' ? '#fbbf24' : '#ef4444',
                        fontWeight: 600
                      }}>
                        {invoice.status}
                      </span>
                    </div>

                    {/* Pay Button - Right aligned */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {invoice.pdf_url && (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '14px 20px',
                            borderRadius: '12px',
                            border: '1px solid rgba(104, 35, 255, 0.3)',
                            background: 'rgba(104, 35, 255, 0.15)',
                            color: '#a78bfa',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                          }}
                        >
                          📄 Consulter
                        </a>
                      )}
                      <button
                        onClick={() => handlePayInvoice(invoice.id)}
                        style={{
                          padding: '14px 28px',
                          borderRadius: '12px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)'
                        }}
                      >
                        💳 Régler immédiatement
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paid Invoices - Normal Style */}
            {paidInvoices.length > 0 && (
              <div>
                <h3 style={{
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ✅ Factures réglées
                </h3>

                {paidInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    style={{
                      background: 'rgba(74, 222, 128, 0.05)',
                      border: '1px solid rgba(74, 222, 128, 0.2)',
                      borderRadius: '16px',
                      padding: '16px 24px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}
                  >
                    {/* Invoice Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(74, 222, 128, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        ✓
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                          Facture {invoice.invoice_number || invoice.id.substring(0, 8)}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Réglée le {invoice.due_date}
                        </p>
                      </div>
                    </div>

                    {/* Amount & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {invoice.pdf_url && (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            background: 'rgba(74, 222, 128, 0.1)',
                            color: '#4ade80',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          📄 Voir
                        </a>
                      )}
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem', color: '#4ade80' }}>
                        {(invoice.amount === '1500€' || invoice.amount === '1 500€' || invoice.amount === '1500') ? '1 040€' : invoice.amount}
                      </p>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: 'rgba(74, 222, 128, 0.2)',
                        color: '#4ade80',
                        fontWeight: 600
                      }}>
                        Payée
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
