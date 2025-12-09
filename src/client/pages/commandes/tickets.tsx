import { useState, useEffect } from 'react'
import { useTickets, useAuth, useClients } from '../../../shared'
import SectionTabs from '../../../shared/components/SectionTabs'
import TicketRequestModal from '../../components/TicketRequestModal'
import '../../../App.css'

const commandesTabs = [
  { id: 'tickets', label: 'Tickets', path: '/dashboard/commandes/tickets' },
  { id: 'devis', label: 'Devis', path: '/dashboard/commandes/devis' },
  { id: 'facturation', label: 'Facturation', path: '/dashboard/commandes/facturation' },
]

/**
 * Page Tickets - Liste des tickets du client
 * Utilise les hooks Supabase pour charger et mettre à jour les tickets
 */
export default function Tickets() {
  const { user } = useAuth()
  const { clients } = useClients()
  // Initialize with a dummy UUID to prevent fetching all items (freelance view) before client is identified
  const [clientId, setClientId] = useState<string | undefined>('00000000-0000-0000-0000-000000000000')

  useEffect(() => {
    if (user && clients.length > 0) {
      // Find client associated with current user by ID or Email (robust comparison)
      const client = clients.find(c =>
        c.auth_user_id === user.id ||
        (c.email && user.email && c.email.trim().toLowerCase() === user.email.trim().toLowerCase())
      )

      if (client) {
        setClientId(client.id)
      }
    }
  }, [user, clients])

  // Hooks Supabase pour les tickets
  const { tickets, loading, addTicket, updateTicket, refresh } = useTickets(clientId)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [notification, setNotification] = useState('')

  // Client info for display (safe access)
  const clientInfo = user && clients.length > 0 ? clients.find(c => c.auth_user_id === user.id) : null

  /**
   * Mettre à jour le statut d'un ticket à "commandé" (Valider)
   */
  const handleValidateTicket = async (ticketId: string) => {
    try {
      await updateTicket(ticketId, { status: 'commandé' })
      setNotification('Ticket validé avec succès.')
      setTimeout(() => setNotification(''), 3000)
      refresh()
    } catch (err) {
      console.error(err)
      setNotification('Erreur lors de la validation.')
      setTimeout(() => setNotification(''), 3000)
    }
  }

  /**
   * Mettre à jour le statut d'un ticket à "Fermé" (Refuser)
   */
  const handleRejectTicket = async (ticketId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir refuser ce ticket ?')) return

    try {
      await updateTicket(ticketId, { status: 'Fermé' })
      setNotification('Ticket refusé.')
      setTimeout(() => setNotification(''), 3000)
      refresh()
    } catch (err) {
      console.error(err)
      setNotification('Erreur lors du refus.')
      setTimeout(() => setNotification(''), 3000)
    }
  }

  /**
   * Créer un nouveau ticket depuis le formulaire client
   */
  const handleCreateTicket = async (category: string, description: string) => {
    console.log("Tentative de création de ticket...");
    console.log("Client ID:", clientId);

    try {
      if (!clientId || clientId === '00000000-0000-0000-0000-000000000000') {
        console.error("Erreur: Client ID invalide");
        setNotification('Erreur: Compte client non identifié. Contactez le support.')
        return
      }

      const newTicket = {
        type: category,
        title: `Demande - ${category}`,
        client_id: clientId,
        description,
        status: 'Ouvert',
        price: 0,
        eta: 'En attente',
        source: 'dashboard_client'
      };

      console.log("Données envoyées:", newTicket);

      const result = await addTicket(newTicket as any);
      console.log("Résultat création:", result);

      setNotification('Votre demande de ticket a bien été envoyée.')
      setTimeout(() => setNotification(''), 3000)
      setIsModalOpen(false)

      // Force refresh
      console.log("Refreshing tickets list...");
      refresh()
    } catch (err: any) {
      console.error("Erreur CRITIQUE lors de la création:", err)
      let message = "Erreur lors de la création du ticket";

      // Gestion des erreurs spécifiques Supabase
      if (err.code === '42501') {
        message = "🛑 Accès refusé (Erreur 42501). Votre profil client n'est pas correctement lié à votre compte utilisateur. Veuillez consulter le diagnostic orange en haut de cette page pour corriger ce problème.";
      } else if (err.code === '23503') {
        message = "🛑 Client invalide (Erreur 23503). L'identifiant client ne correspond pas.";
      } else if (err.message) {
        message = `Erreur: ${err.message}`;
      }

      setNotification(message)
      setTimeout(() => setNotification(''), 10000) // Affichage plus long pour lecture
    }
  }

  return (
    <div className="workspace__content">
      {/* Header avec bouton "Demander un ticket" */}
      <div className="section-header">
        <SectionTabs label="Commandes" tabs={commandesTabs} />
        <div className="section-header__actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => setIsModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #6823ff, #3b4fff)',
            }}
          >
            Demander une commande
          </button>
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: notification.includes('Erreur') ? 'rgba(255, 107, 107, 0.15)' : 'rgba(88, 243, 156, 0.15)',
            border: `1px solid ${notification.includes('Erreur') ? 'rgba(255, 107, 107, 0.3)' : 'rgba(88, 243, 156, 0.3)'}`,
            color: notification.includes('Erreur') ? 'var(--danger)' : 'var(--success)',
            padding: '12px 20px',
            borderRadius: '14px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          {notification}
        </div>
      )}

      {/* Diagnostic temporaire */}
      <div style={{ padding: '16px', marginBottom: '24px', background: 'rgba(255, 200, 0, 0.1)', border: '1px solid rgba(255, 200, 0, 0.3)', borderRadius: '8px', fontSize: '0.85rem' }}>
        <p style={{ fontWeight: 'bold', color: '#fbbf24' }}>🔧 Diagnostic de connexion (Tickets)</p>
        <p><strong>Email connecté :</strong> {user?.email || 'Non connecté'}</p>
        <p><strong>ID Utilisateur (Supabase) :</strong> <code style={{ userSelect: 'all' }}>{user?.id}</code></p>
        <p><strong>Clients chargés :</strong> {clients.length}</p>
        <p><strong>Client identifié :</strong> {clientId && clientId !== '00000000-0000-0000-0000-000000000000'
          ? (clients.find(c => c.id === clientId)?.name + ' (ID trouvé)')
          : 'Aucun client associé'}
        </p>

        {clients.length === 0 && (
          <div style={{ marginTop: '8px', color: '#f87171' }}>
            <p>⚠️ <strong>Attention : Impossible de charger votre profil client.</strong></p>
            <p>Cela est dû à une restriction de sécurité. Pour corriger cela :</p>
            <ol style={{ paddingLeft: '20px', marginTop: '4px' }}>
              <li>Copiez votre <strong>ID Utilisateur</strong> ci-dessus ({user?.id}).</li>
              <li>Connectez-vous au <strong>Dashboard Freelance</strong> (Admin).</li>
              <li>Allez dans l'onglet <strong>Clients</strong>, modifiez votre fiche client.</li>
              <li>Collez cet ID dans le champ <strong>"ID Utilisateur (Auth Supabase)"</strong>.</li>
            </ol>
          </div>
        )}

        {clients.length > 0 && (!clientId || clientId === '00000000-0000-0000-0000-000000000000') && (
          <p style={{ marginTop: '8px', color: '#9ca3af' }}>
            👉 Nous avons accès à {clients.length} clients, mais aucun ne correspond à l'email <strong>"{user?.email}"</strong>.<br />
            Vérifiez qu'il n'y a pas d'espace en trop ou d'erreur de frappe dans la fiche client sur le Dashboard Freelance.
          </p>
        )}
      </div>

      {/* Liste des tickets */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chargement des tickets...
          </div>
        ) : tickets.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Titre</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Prix (€)</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td style={{ fontWeight: 600 }}>{ticket.id.substring(0, 8)}</td>
                  <td>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{ticket.title}</p>
                      {ticket.description && (
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {ticket.description}
                        </p>
                      )}
                      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {clientInfo?.name}
                      </p>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{ticket.type}</td>
                  <td>
                    <span className={`status-pill status-pill--${ticket.status === 'Ouvert' ? 'open' :
                        ticket.status === 'En cours' ? 'progress' :
                          ticket.status === 'commandé' ? 'ordered' :
                            'closed'
                      }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {ticket.price > 0 ? `${ticket.price.toFixed(2)}€` : 'N/A'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {ticket.status !== 'commandé' && ticket.status !== 'Fermé' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleRejectTicket(ticket.id)}
                          className="ghost-button tiny"
                          style={{
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            padding: '6px 12px'
                          }}
                          title="Refuser"
                        >
                          ✕
                        </button>
                        <button
                          type="button"
                          onClick={() => handleValidateTicket(ticket.id)}
                          className="ordered-button"
                          style={{
                            background: 'rgba(104, 35, 255, 0.15)',
                            border: '1px solid rgba(104, 35, 255, 0.3)',
                            color: '#8B5CF6',
                            padding: '6px 14px',
                            borderRadius: '999px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(104, 35, 255, 0.25)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(104, 35, 255, 0.15)'
                          }}
                        >
                          Valider
                        </button>
                      </div>
                    )}
                    {ticket.status === 'commandé' && (
                      <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>Validé ✓</span>
                    )}
                    {ticket.status === 'Fermé' && (
                      <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>Refusé ✕</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="page-placeholder">
            <div className="page-placeholder__icon">🎫</div>
            <p className="page-placeholder__title">Aucun ticket</p>
            <p className="page-placeholder__description">
              Vos tickets apparaîtront ici une fois créés.
            </p>
          </div>
        )}
      </div>

      {/* Modal de demande de ticket */}
      <TicketRequestModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTicket}
        title="Demander une commande"
      />
    </div>
  )
}
