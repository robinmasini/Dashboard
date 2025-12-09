import { forecastHighlights, forecastTimeline } from '../../data/dashboard'

const buildPolyline = (values: number[]) => {
  const max = Math.max(...values)
  const min = Math.min(...values)
  if (max === min) {
    return '0,50 100,50'
  }
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const relative = (value - min) / (max - min)
      const y = 90 - relative * 70
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

const ForecastPanel = () => {
  const values = forecastTimeline.map((item) => item.total)
  const points = buildPolyline(values)

  return (
    <section className="forecast-grid">
      {forecastHighlights.map((card) => (
        <article key={card.label} className="panel metric-card">
          <p className="metric-card__label">{card.label}</p>
          <p className="metric-card__value">{card.amount}</p>
          <p className="metric-card__trend">{card.trend}</p>
          <p className="metric-card__detail">{card.detail}</p>
        </article>
      ))}

      <article className="panel forecast-chart">
        <header className="panel__header">
          <p>Carnet de commandes</p>
          <span>Projection 5 mois</span>
        </header>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points={points} fill="none" stroke="#69a2ff" strokeWidth="2.5" strokeLinecap="round" />
          <polygon points={`${points} 100,100 0,100`} fill="rgba(105,162,255,0.18)" />
        </svg>
        <div className="forecast-chart__axis">
          {forecastTimeline.map((item) => (
            <span key={item.month}>{item.month}</span>
          ))}
        </div>
      </article>
    </section>
  )
}

export default ForecastPanel


