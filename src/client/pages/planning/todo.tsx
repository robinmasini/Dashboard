import { useEffect, useState } from 'react'
import { useTodoItems, useAuth, useClients, useTickets } from '../../../shared'
import TicketRequestModal from '../../components/TicketRequestModal'
import '../../../App.css'

/**
 * Page Planning - To-do list / Planning général (lecture seule pour le client)
 * Utilise les hooks Supabase pour charger les todos
 */
export default function Planning() {
  const { user } = useAuth()
  const { clients } = useClients()
  // Initialize with a dummy UUID to prevent fetching all items (freelance view) before client is identified
  const [clientId, setClientId] = useState<string | undefined>('00000000-0000-0000-0000-000000000000')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [notification, setNotification] = useState('')

  // Hooks Supabase pour créer un ticket (demande de tâche)
  // Pass dummy UUID if clientId is generic loading state to avoid errors in addTicket? 
  // Actually addTicket doesn't need clientId in hook init, it takes it in arg. 
  // But useTickets hook fetches tickets. We should prevent fetching all tickets too.
  const { addTicket } = useTickets(clientId)

  useEffect(() => {
    if (user && clients.length > 0) {
      // Find client associated with current user by ID (if linked) or Email
      const client = clients.find(c => 
        c.auth_user_id === user.id || 
        (c.email && user.email && c.email.trim().toLowerCase() === user.email.trim().toLowerCase())
      )
      
      if (client) {
        console.log("Client identified:", client.name)
        setClientId(client.id)
      } else {
        console.log("No client found for user:", user.email)
      }
    }
  }, [user, clients])

  const handleRequestTask = async (category: string, description: string) => {
    try {
      if (!clientId) {
        setNotification('Erreur: client non identifié')
        return
      }

          await addTicket({
            type: 'Planning', // Force type Planning for tasks
            title: `Demande de tâche - ${category}`,
            client_id: clientId,
            description,
            status: 'Ouvert',
            price: 0,
            eta: 'En attente'
            // source removed
          })
      
      setNotification('Votre demande de tâche a bien été envoyée.')
      setTimeout(() => setNotification(''), 3000)
      setIsModalOpen(false)
        } catch (err: any) {
          console.error('Erreur lors de la demande de tâche:', err)
          
          let message = "Erreur lors de la demande"
          if (err.code === '42501') {
            message = "🛑 Accès refusé (RLS). Vérifiez le lien entre votre compte et votre profil client (voir diagnostic)."
          } else if (err.message) {
             message = `Erreur: ${err.message}`
          }
          
          setNotification(message)
          setTimeout(() => setNotification(''), 10000)
        }
  }

  // Récupérer les todos depuis Supabase (filtrés par client si connecté)
  const { items: todoItems, loading } = useTodoItems(clientId)

  // Regrouper les items par colonne
  const columns = [
    { id: 'rush', title: 'Rush', icon: '🏃' },
    { id: 'progress', title: 'En cours', icon: '📁' },
    { id: 'done', title: 'Terminé', icon: '✅' },
  ]

  const getItemsForColumn = (columnId: string) => {
    return todoItems.filter(item => item.column_id === columnId)
  }

  return (
    <div className="workspace__content">
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Planning</p>
          <h1 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 700 }}>To-do List</h1>
        </div>
        <div className="section-header__actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => setIsModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #6823ff, #3b4fff)',
            }}
          >
            Demander une tâche
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

      <TicketRequestModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRequestTask}
        title="Demander une tâche"
      />

      {/* Diagnostic temporaire pour aider au debug */}
      <div style={{ padding: '16px', marginBottom: '24px', background: 'rgba(255, 200, 0, 0.1)', border: '1px solid rgba(255, 200, 0, 0.3)', borderRadius: '8px', fontSize: '0.85rem' }}>
        <p style={{ fontWeight: 'bold', color: '#fbbf24' }}>🔧 Diagnostic de connexion</p>
        <p><strong>Email connecté :</strong> {user?.email || 'Non connecté'}</p>
        <p><strong>ID Utilisateur (Supabase) :</strong> <code style={{userSelect: 'all'}}>{user?.id}</code></p>
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
            👉 Si vous êtes &quot;Digital Radicalz&quot;, copiez l'ID ci-dessus et collez-le dans le champ "ID Utilisateur" de votre fiche client sur le dashboard Freelance.
          </p>
        )}
      </div>

      {loading ? (
        <div className="panel">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chargement du planning...
          </div>
        </div>
      ) : todoItems.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {columns.map((column) => {
            const items = getItemsForColumn(column.id)
            return (
              <div key={column.id} className="panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                  <span style={{ fontSize: '1.6rem' }}>{column.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 600 }}>{column.title}</h3>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {items.length} {items.length > 1 ? 'cartes' : 'carte'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div key={item.id} style={{
                        padding: '14px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '18px',
                        border: '1px solid rgba(255, 255, 255, 0.04)'
                      }}>
                        {item.notes && item.notes.startsWith('data:image') && (
                          <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', width: '100%', height: '120px' }}>
                            <img src={item.notes} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{item.title}</p>
                        {item.meta && (
                          <p style={{ margin: '4px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {item.meta}
                          </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: '#5ce1ff' }}>{item.tag}</span>
                          <span>{item.status_label}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', margin: 0 }}>
                      Aucune carte
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="panel">
          <div className="page-placeholder">
            <div className="page-placeholder__icon">📅</div>
            <p className="page-placeholder__title">Aucune tâche</p>
            <p className="page-placeholder__description">
              Votre planning et vos tâches apparaîtront ici.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
