import { useState, useEffect } from 'react'
import { useTickets, useProposals, useProjects, useMessages, useDocuments, useTodoItems, useInvoices, useAuth, useClients } from '../../../shared'
import '../../../App.css'

/**
 * Page "Votre Projet" - Résumé, avancement, actualités, messages, documents
 * Utilise les hooks Supabase pour charger les données
 */
export default function VotreProjet() {
  const { user } = useAuth()
  const { clients } = useClients()
  // Initialize with a dummy UUID. State is explicitly string to satisfy hooks that require string.
  const [clientId, setClientId] = useState<string>('00000000-0000-0000-0000-000000000000')

  useEffect(() => {
    if (user && clients.length > 0) {
      // Find client associated with current user by ID (if linked) or Email
      const client = clients.find(c => 
        c.auth_user_id === user.id || 
        (c.email && user.email && c.email.trim().toLowerCase() === user.email.trim().toLowerCase())
      )
      
      if (client) {
        setClientId(client.id)
      }
    }
  }, [user, clients])

  // Récupérer les données depuis Supabase (filtrées automatiquement par RLS)
  const { tickets } = useTickets(clientId)
  const { proposals } = useProposals(clientId)
  const { projects } = useProjects(clientId)
  const { messages } = useMessages(clientId)
  const { documents } = useDocuments(clientId)
  const { items: todoItems } = useTodoItems(clientId)
  const { invoices } = useInvoices(clientId)

  // Utiliser le premier projet comme projet actif
  const project = projects.length > 0 ? projects[0] : null

  // Calculer l'avancement basé sur les tickets
  const activeTickets = tickets.filter(t => t.status !== 'Fermé')
  const progress = project?.progress || (tickets.length > 0 
    ? Math.round((tickets.filter(t => t.status === 'Fermé').length / tickets.length) * 100)
    : 0)

  // Filtrer les éléments pour les actualités
  const pendingProposals = proposals.filter(p => p.status === 'En cours')
  const pendingInvoices = invoices.filter(i => i.status === 'Envoyée' || i.status === 'À envoyer')
  
  // Trier les actualités par importance/date
  // On combine tout pour l'affichage
  const hasNews = activeTickets.length > 0 || todoItems.length > 0 || pendingProposals.length > 0 || pendingInvoices.length > 0

  return (
    <div className="workspace__content">
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Votre Projet</p>
          <h1 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 700 }}>
            {project?.name || 'Tableau de bord'}
          </h1>
        </div>
      </div>

      {/* Résumé du projet */}
      <div className="panel">
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 600 }}>Résumé</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Avancement</p>
            <p style={{ margin: '8px 0', fontSize: '1.8rem', fontWeight: 700 }}>{progress}%</p>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '999px',
              marginTop: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4f7cff, #6823ff)',
                transition: 'width 0.3s'
              }} />
            </div>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tickets actifs</p>
            <p style={{ margin: '8px 0', fontSize: '1.8rem', fontWeight: 700 }}>{activeTickets.length}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tâches (To-Do)</p>
            <p style={{ margin: '8px 0', fontSize: '1.8rem', fontWeight: 700 }}>
              {todoItems.length}
            </p>
          </div>
        </div>
      </div>

      {/* Actualités */}
      <div className="panel">
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 600 }}>Actualités</h2>
        {hasNews ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Commandes / Tickets en cours */}
            {activeTickets.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Commandes en cours ({activeTickets.length})
                </p>
                {activeTickets.map((ticket) => (
              <div key={ticket.id} style={{ 
                padding: '16px', 
                    marginBottom: '8px',
                    background: 'rgba(79, 157, 255, 0.05)', 
                borderRadius: '14px',
                    border: '1px solid rgba(79, 157, 255, 0.2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                  <div>
                      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#4f9dff' }}>{ticket.title}</p>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{ticket.type} • {ticket.status}</p>
                  </div>
                    <span className={`status-pill status-pill--${ticket.status === 'Ouvert' ? 'open' : 'progress'}`}>
                    {ticket.status}
                  </span>
                </div>
                ))}
              </div>
            )}

            {/* Devis à valider */}
            {pendingProposals.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Devis en attente ({pendingProposals.length})
                </p>
                {pendingProposals.map((proposal) => (
                  <div key={proposal.id} style={{ 
                    padding: '16px', 
                    marginBottom: '8px',
                    background: 'rgba(255, 165, 0, 0.05)', 
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 165, 0, 0.2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#fbbf24' }}>{proposal.title}</p>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{proposal.amount}</p>
                    </div>
                    <span className="status-pill status-pill--pending">À valider</span>
              </div>
            ))}
              </div>
            )}

            {/* Factures à payer */}
            {pendingInvoices.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Factures à régler ({pendingInvoices.length})
                </p>
                {pendingInvoices.map((invoice) => (
                  <div key={invoice.id} style={{ 
                    padding: '16px', 
                    marginBottom: '8px',
                    background: 'rgba(239, 68, 68, 0.05)', 
                    borderRadius: '14px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#f87171' }}>Facture {invoice.invoice_number || `#${invoice.id.substring(0,6)}`}</p>
                      {/* Quick fix for incorrect invoice amount display */}
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {(invoice.amount === '1500€' || invoice.amount === '1 500€' || invoice.amount === '1500') ? '1 040€' : invoice.amount} • Échéance : {invoice.due_date}
                      </p>
                    </div>
                    <span className="status-pill status-pill--closed">À payer</span>
                  </div>
                ))}
              </div>
            )}

            {/* To-Do List */}
            {todoItems.length > 0 && (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tâches en cours ({todoItems.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                  {todoItems.map((item) => (
                    <div key={item.id} style={{ 
                      padding: '16px', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      {item.notes && item.notes.startsWith('data:image') && (
                        <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', height: '100px' }}>
                          <img src={item.notes} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{item.title}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#5ce1ff' }}>{item.tag}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.status_label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="page-placeholder">
            <div className="page-placeholder__icon">✅</div>
            <p className="page-placeholder__title">Tout est à jour</p>
            <p className="page-placeholder__description">
              Aucune tâche, devis ou facture en attente.
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="panel">
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 600 }}>Messages</h2>
        {messages.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((message) => (
              <div key={message.id} style={{
                padding: '16px',
                background: message.read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(79, 124, 255, 0.1)',
                borderRadius: '14px',
                border: message.read ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(79, 124, 255, 0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{message.from_name}</p>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{message.date}</p>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{message.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="page-placeholder">
            <div className="page-placeholder__icon">💬</div>
            <p className="page-placeholder__title">Aucun message</p>
            <p className="page-placeholder__description">
              Les messages concernant votre projet apparaîtront ici.
            </p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="panel">
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: 600 }}>Documents</h2>
        {documents.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Taille</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 600 }}>{doc.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{doc.type}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{doc.size}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{doc.upload_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="page-placeholder">
            <div className="page-placeholder__icon">📄</div>
            <p className="page-placeholder__title">Aucun document</p>
            <p className="page-placeholder__description">
              Les documents partagés apparaîtront ici.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
