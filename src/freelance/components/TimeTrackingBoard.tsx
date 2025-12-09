import type { TimeBlock } from '../../data/dashboard'

type TimeTrackingBoardProps = {
  blocks: TimeBlock[]
  date: string
  recap: string
  onEdit: (block: TimeBlock) => void
}

const sentimentClass: Record<TimeBlock['sentiment'], string> = {
  positive: 'time-pill--positive',
  warning: 'time-pill--warning',
  alert: 'time-pill--alert',
}

const TimeTrackingBoard = ({ blocks, date, recap, onEdit }: TimeTrackingBoardProps) => (
  <section className="panel time-panel">
    <header className="time-panel__header">
      <div>
        <p className="panel__label">Bilan quotidien</p>
        <h3>{date}</h3>
        <p className="time-panel__recap">{recap}</p>
      </div>
      <button type="button" className="primary-button subtle">
        Valider Tracking
      </button>
    </header>
    <div className="time-panel__grid">
      {blocks.map((block) => (
        <article key={block.id} className="time-pill">
          <span className="time-pill__icon">{block.icon}</span>
          <div>
            <p className="time-pill__label">{block.label}</p>
            <p className="time-pill__duration">{block.duration}</p>
          </div>
          <span className={`time-pill__delta ${sentimentClass[block.sentiment]}`}>
            {block.delta}
          </span>
          <button
            type="button"
            className="ghost-button tiny"
            onClick={() => onEdit(block)}
            aria-label="Modifier"
            title="Modifier"
          >
            ✎
          </button>
        </article>
      ))}
    </div>
  </section>
)

export default TimeTrackingBoard


