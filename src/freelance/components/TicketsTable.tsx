import type { Ticket } from '../../data/dashboard'

// Type pour le client avec avatar
type ClientInfo = {
  id: string
  name: string
  avatar_url?: string
  email?: string
}

type TicketsTableProps = {
  tickets: Ticket[]
  clients?: ClientInfo[]
  onEdit: (ticket: Ticket) => void
  onStatusChange: (id: string, status: Ticket['status']) => void
  onDelete: (id: string) => void
}

const statusTone: Record<Ticket['status'], string> = {
  Ouvert: 'status-pill status-pill--open',
  'En cours': 'status-pill status-pill--progress',
  Fermé: 'status-pill status-pill--closed',
}

const statusOptions: Ticket['status'][] = ['Ouvert', 'En cours', 'Fermé']

const TicketsTable = ({ tickets, clients = [], onEdit, onStatusChange, onDelete }: TicketsTableProps) => {
  // Fonction pour récupérer les infos du client
  const getClientInfo = (ticket: Ticket): ClientInfo | null => {
    if ((ticket as any).client_id) {
      return clients.find(c => c.id === (ticket as any).client_id) || null
    }
    if (ticket.client) {
      return clients.find(c => c.name === ticket.client) || null
    }
    return null
  }

  return (
    <section className="panel tickets-panel">
      <table>
        <thead>
          <tr>
            <th>N° Ticket</th>
            <th>Type</th>
            <th>Client</th>
            <th>Prix (€)</th>
            <th>Intitulé</th>
            <th>Durée estimée</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const clientInfo = getClientInfo(ticket)
            const avatarUrl = clientInfo?.avatar_url
              ? (clientInfo.avatar_url.startsWith('http') || clientInfo.avatar_url.startsWith('/')
                ? clientInfo.avatar_url
                : `/${clientInfo.avatar_url}`)
              : null

            return (
              <tr key={ticket.id}>
                <td>{ticket.id ? ticket.id.substring(0, 8) : '-'}...</td>
                <td>{ticket.type}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Avatar circulaire */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: avatarUrl
                        ? `url(${avatarUrl}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #6366f1, #3b82f6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      color: 'white',
                      fontWeight: 600,
                      flexShrink: 0
                    }}>
                      {!avatarUrl && (clientInfo?.name?.charAt(0)?.toUpperCase() || ticket.client?.charAt(0)?.toUpperCase() || '?')}
                    </div>
                    <span>{clientInfo?.name || ticket.client || '-'}</span>
                  </div>
                </td>
                <td>{ticket.price}</td>
                <td>{ticket.title}</td>
                <td>{ticket.eta}</td>
                <td>
                  <select
                    value={ticket.status}
                    onChange={(e) => onStatusChange(ticket.id, e.target.value as Ticket['status'])}
                    className={`status-select ${statusTone[ticket.status]}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      fontSize: 'inherit',
                      padding: '4px 8px',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      fontWeight: 'inherit',
                    }}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={() => onEdit(ticket)}
                      aria-label="Modifier"
                      title="Modifier"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="ghost-button tiny"
                      onClick={() => onDelete(ticket.id)}
                      aria-label="Supprimer"
                      title="Supprimer"
                      style={{ color: '#ff6b6b' }}
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

export default TicketsTable



