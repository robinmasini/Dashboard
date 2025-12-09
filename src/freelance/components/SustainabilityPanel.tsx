import { sustainabilityClients, sustainabilityMetrics } from '../../data/dashboard'

const SustainabilityPanel = () => (
  <section className="grid sustainability-grid">
    {sustainabilityMetrics.map((metric) => (
      <article key={metric.label} className="panel sustainability-card">
        <p className="sustainability-card__label">{metric.label}</p>
        <p className="sustainability-card__value">{metric.value}</p>
        <p className={`sustainability-card__status sustainability-card__status--${metric.sentiment}`}>
          {metric.description}
        </p>
      </article>
    ))}

    <article className="panel clients-health">
      <header className="panel__header">
        <p>Radar clients récurrents</p>
      </header>
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Portée</th>
            <th>Rythme</th>
            <th>Vitalité</th>
          </tr>
        </thead>
        <tbody>
          {sustainabilityClients.map((client) => (
            <tr key={client.name}>
              <td>{client.name}</td>
              <td>{client.scope}</td>
              <td>{client.recurrence}</td>
              <td>
                <span className={`status-pill status-pill--${client.health === 'Élevée' ? 'closed' : client.health === 'Moyenne' ? 'progress' : 'open'}`}>
                  {client.health}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  </section>
)

export default SustainabilityPanel


