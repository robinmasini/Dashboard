import { timeEvolution } from '../../data/dashboard'

const maxValue = Math.max(
  ...timeEvolution.current,
  ...timeEvolution.target,
)

const TimeEvolutionPanel = () => (
  <section className="panel evolution-panel">
    <header className="panel__header">
      <p>{timeEvolution.label}</p>
      <span>Objectif vs réalisé</span>
    </header>
    <div className="evolution-bars">
      {timeEvolution.categories.map((category, index) => {
        const current = timeEvolution.current[index]
        const target = timeEvolution.target[index]
        const currentHeight = (current / maxValue) * 100
        const targetHeight = (target / maxValue) * 100
        return (
          <div key={category} className="evolution-bar">
            <div className="evolution-bar__stack">
              <span className="evolution-bar__current" style={{ height: `${currentHeight}%` }} />
              <span className="evolution-bar__target" style={{ height: `${targetHeight}%` }} />
            </div>
            <p>{category}</p>
          </div>
        )
      })}
    </div>
  </section>
)

export default TimeEvolutionPanel


