type SoonPanelProps = {
  title: string
  description: string
  actions?: string[]
}

const SoonPanel = ({ title, description, actions = [] }: SoonPanelProps) => (
  <section className="panel soon-panel">
    <div>
      <p className="soon-panel__eyebrow">Bientôt disponible</p>
      <h3>{title}</h3>
      <p className="soon-panel__description">{description}</p>
    </div>
    {actions.length > 0 && (
      <ul className="soon-panel__actions">
        {actions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ul>
    )}
  </section>
)

export default SoonPanel


