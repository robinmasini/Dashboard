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
 * Avec possibilité de consulter le PDF et d'accepter/refuser le devis
 */
export default function Devis() {
  const { user } = useAuth()
  const { clients, loading: loadingClients } = useClients()
  const [clientId, setClientId] = useState<string | undefined>(undefined)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; action: 'accept' | 'reject'; proposalId: string } | null>(null)

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

  // Récupérer les devis depuis Supabase (filtrés par client_id)
  const { proposals, loading, updateProposal, refresh } = useProposals(clientId)

  const handleAccept = async (id: string) => {
    try {
      await updateProposal(id, { status: 'Signé' })
      await refresh()
      setConfirmModal(null)
    } catch (error) {
      console.error('Error accepting proposal:', error)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await updateProposal(id, { status: 'Refusé' })
      await refresh()
      setConfirmModal(null)
    } catch (error) {
      console.error('Error rejecting proposal:', error)
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Signé':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }
      case 'Refusé':
        return { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
      default:
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }
    }
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
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    ...getStatusStyle(proposal.status)
                  }}>
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

                {/* Actions Section */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  {/* Bouton Consulter le devis */}
                  {proposal.pdf_url ? (
                    <a
                      href={proposal.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: 'rgba(104, 35, 255, 0.15)',
                        border: '1px solid rgba(104, 35, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#a78bfa',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      📄 Consulter le devis
                    </a>
                  ) : (
                    <span style={{
                      padding: '8px 16px',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      fontStyle: 'italic'
                    }}>
                      Aucun PDF disponible
                    </span>
                  )}

                  {/* Boutons Accepter / Refuser (uniquement si "En cours") */}
                  {proposal.status === 'En cours' && (
                    <>
                      <button
                        onClick={() => setConfirmModal({ open: true, action: 'accept', proposalId: proposal.id })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '8px',
                          color: '#10b981',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        ✓ Accepter le devis
                      </button>
                      <button
                        onClick={() => setConfirmModal({ open: true, action: 'reject', proposalId: proposal.id })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                          color: '#ef4444',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        ✕ Refuser le devis
                      </button>
                    </>
                  )}
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

      {/* Modal de confirmation */}
      {confirmModal?.open && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card-bg, #1a1a2e)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
              {confirmModal.action === 'accept' ? '✅' : '❌'}
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.3rem' }}>
              {confirmModal.action === 'accept' ? 'Accepter ce devis ?' : 'Refuser ce devis ?'}
            </h3>
            <p style={{ margin: '0 0 24px', color: 'var(--text-muted)' }}>
              {confirmModal.action === 'accept'
                ? 'En acceptant, vous confirmez votre accord avec les termes du devis.'
                : 'En refusant, le devis sera marqué comme refusé.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (confirmModal.action === 'accept') {
                    handleAccept(confirmModal.proposalId)
                  } else {
                    handleReject(confirmModal.proposalId)
                  }
                }}
                style={{
                  padding: '10px 20px',
                  background: confirmModal.action === 'accept'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                {confirmModal.action === 'accept' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
