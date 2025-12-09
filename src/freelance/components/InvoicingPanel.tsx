import type { Invoice } from '../../data/dashboard'

type InvoicingPanelProps = {
  invoices: Invoice[]
  onEdit: (invoice: Invoice) => void
  onStatusChange: (id: string, status: Invoice['status']) => void
}

const statusClass: Record<Invoice['status'], string> = {
  'À envoyer': 'status-pill status-pill--open',
  Envoyée: 'status-pill status-pill--progress',
  Payée: 'status-pill status-pill--closed',
}

const statusOptions: Invoice['status'][] = ['À envoyer', 'Envoyée', 'Payée']

const InvoicingPanel = ({ invoices, onEdit, onStatusChange }: InvoicingPanelProps) => (
  <section className="panel invoicing-panel">
    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Client</th>
          <th>Montant</th>
          <th>Échéance</th>
          <th>Statut</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td>{invoice.id}</td>
            <td>{invoice.client}</td>
            <td>{invoice.amount}</td>
            <td>{invoice.dueDate}</td>
            <td>
              <select
                value={invoice.status}
                onChange={(e) => onStatusChange(invoice.id, e.target.value as Invoice['status'])}
                className={`status-select ${statusClass[invoice.status]}`}
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
              <button
                type="button"
                className="ghost-button tiny"
                onClick={() => onEdit(invoice)}
                aria-label="Modifier"
                title="Modifier"
              >
                ✎
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <footer className="invoicing-panel__footer">
      <p>Automatisez votre envoi Shine dès que les tickets passent en "Done".</p>
      <button type="button" className="primary-button subtle">
        Activer l'auto-facturation
      </button>
    </footer>
  </section>
)

export default InvoicingPanel


