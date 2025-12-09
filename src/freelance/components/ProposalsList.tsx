import type { Proposal } from '../../data/dashboard'

type ProposalsListProps = {
  proposals: Proposal[]
  onEdit: (proposal: Proposal) => void
  onStatusChange: (title: string, status: Proposal['status']) => void
  onDelete: (title: string) => void
}

const statusClass: Record<Proposal['status'], string> = {
  'En cours': 'status-pill status-pill--progress',
  Signé: 'status-pill status-pill--closed',
}

const statusOptions: Proposal['status'][] = ['En cours', 'Signé']

const ProposalsList = ({ proposals, onEdit, onStatusChange, onDelete }: ProposalsListProps) => (
  <section className="panel proposals-panel">
    <table>
      <thead>
        <tr>
          <th>Intitulé du devis</th>
          <th>Date d'émission</th>
          <th>Statut</th>
          <th>Montant total HT</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {proposals.map((proposal) => (
          <tr key={proposal.title}>
            <td>
              <p className="proposal-title">{proposal.title}</p>
              <p className="proposal-subtitle">{proposal.subtitle}</p>
            </td>
            <td>{proposal.date}</td>
            <td>
              <select
                value={proposal.status}
                onChange={(e) => onStatusChange(proposal.title, e.target.value as Proposal['status'])}
                className={`status-select ${statusClass[proposal.status]}`}
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
            <td>{proposal.amount}</td>
            <td>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="ghost-button tiny"
                  onClick={() => onEdit(proposal)}
                  aria-label="Modifier"
                  title="Modifier"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="ghost-button tiny"
                  onClick={() => onDelete(proposal.title)}
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

export default ProposalsList


