import type { Client } from '../../data/dashboard'

type ClientsBoardProps = {
  clients: Client[]
  onEdit: (client: Client) => void
  onStatusChange: (name: string, status: Client['status']) => void
  onDelete: (name: string) => void
}

const statusClass: Record<Client['status'], string> = {
  'En cours': 'status-pill status-pill--progress',
  Terminé: 'status-pill status-pill--closed',
}

const statusOptions: Client['status'][] = ['En cours', 'Terminé']

const ClientsBoard = ({ clients, onEdit, onStatusChange, onDelete }: ClientsBoardProps) => (
  <section className="panel clients-panel">
    <table>
      <thead>
        <tr>
          <th>Clients</th>
          <th>Contact principal</th>
          <th>Industrie</th>
          <th>Statut</th>
          <th>Date d'ajout</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {clients.map((client) => (
          <tr key={client.name}>
            <td>{client.name}</td>
            <td>{client.contact}</td>
            <td>{client.industry}</td>
            <td>
              <select
                value={client.status}
                onChange={(e) => onStatusChange(client.name, e.target.value as Client['status'])}
                className={`status-select ${statusClass[client.status]}`}
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
            <td>{client.addedOn}</td>
            <td>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="ghost-button tiny"
                  onClick={() => onEdit(client)}
                  aria-label="Modifier"
                  title="Modifier"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="ghost-button tiny"
                  onClick={() => onDelete(client.name)}
                  aria-label="Supprimer"
                  title="Supprimer"
                  style={{ color: '#ff6b6b' }}
                >
                  ×
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
)

export default ClientsBoard


