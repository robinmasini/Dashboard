import type { FloatingStat } from '../../data/dashboard'
import { getDigitalRadicalzTJM } from '../utils/tjm'

type FloatingStatsProps = {
  items: FloatingStat[]
}

const FloatingStats = ({ items }: FloatingStatsProps) => {
  if (!items.length) return null

  const { todayBenefitFormatted, tjmFormatted, weekBenefitFormatted, isThursday, hasThursdayPassed } = getDigitalRadicalzTJM()

  return (
    <div className="floating-stats">
      {items.map((item) => {
        // Calcul dynamique du bénéfice et TJM pour les labels spécifiques
        let displayValue = item.value
        let displayTrend = item.trendLabel
        let displayDirection = item.trendDirection

        if (item.label === "Bénéfice généré aujourd'hui" || item.label === 'Bénéfice généré') {
          displayValue = todayBenefitFormatted
          displayTrend = isThursday ? 'Jeudi Digital Radicalz' : 'En attente'
          displayDirection = isThursday ? 'up' : 'neutral'
        } else if (item.label === 'Bénéfice cette semaine') {
          displayValue = weekBenefitFormatted
          displayTrend = hasThursdayPassed ? 'Jeudi Digital Radicalz' : 'En attente'
          displayDirection = hasThursdayPassed ? 'up' : 'neutral'
        } else if (item.label === 'TJM de la journée') {
          displayValue = tjmFormatted
          displayTrend = 'Jeudi Digital Radicalz'
          displayDirection = 'up'
        }

        return (
          <article key={item.label} className="floating-card">
            <p className="floating-card__label">{item.label}</p>
            <div className="floating-card__value">
              <span>{displayValue}</span>
              {displayTrend && (
                <span className={`trend trend--${displayDirection ?? 'neutral'}`}>
                  {displayTrend}
                </span>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default FloatingStats


