import { clientsTrend, heroCard, satisfactionGauge, walletSummary, type ShineTransaction } from '../../data/dashboard'
import { getTJMData } from '../utils/tjm'
import { useTodayDate } from '../../shared/utils/date'

type PerformanceOverviewProps = {
  shineTransactions: ShineTransaction[]
}

const buildPolyline = (values: number[]) => {
  const max = Math.max(...values)
  const min = Math.min(...values)
  // Si toutes les valeurs sont identiques (ex: toutes à 0), afficher une ligne horizontale
  if (max === min) {
    return values.map((_, index) => {
      const x = (index / (values.length - 1)) * 100
      return `${x.toFixed(2)},50`
    }).join(' ')
  }
  // Sinon, créer une courbe avec variation
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const relative = (value - min) / (max - min)
      const y = 100 - relative * 80 - 10 // 10% de marge en bas, 80% pour la variation
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

// Générer les données quotidiennes du mois en cours à partir des transactions
const generateDailySalesData = (transactions: ShineTransaction[]): number[] => {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  // Créer un tableau avec 0 pour chaque jour du mois
  const dailyData = new Array(daysInMonth).fill(0)

  // Remplir avec les transactions du mois
  transactions.forEach((transaction) => {
    const txDate = new Date(transaction.date)
    if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
      const day = txDate.getDate() - 1 // Index 0-based
      if (day >= 0 && day < daysInMonth) {
        dailyData[day] += transaction.amount
      }
    }
  })

  return dailyData
}

// Calculer le solde total à partir des transactions
const calculateShineBalance = (transactions: ShineTransaction[]): number => {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0)
}

const PerformanceOverview = ({ shineTransactions }: PerformanceOverviewProps) => {
  const dailySalesData = generateDailySalesData(shineTransactions)
  const salesPoints = buildPolyline(dailySalesData)
  const { todayBenefitFormatted, tjmFormatted, isThursday } = getTJMData()
  const shineBalance = calculateShineBalance(shineTransactions)
  const todayDate = useTodayDate()

  // Générer les labels pour l'axe (tous les 5 jours environ)
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const monthLabel = `${monthNames[currentMonth]} ${currentYear}`

  const axisLabels: string[] = []
  const step = Math.max(1, Math.floor(daysInMonth / 6))
  for (let i = 0; i < daysInMonth; i += step) {
    axisLabels.push(`${i + 1}`)
  }
  if (axisLabels[axisLabels.length - 1] !== String(daysInMonth)) {
    axisLabels.push(String(daysInMonth))
  }

  return (
    <section className="grid performance-grid">
      {/* Top row - 4 KPIs - données flottantes intégrées directement dans le grid */}
      <article className="panel floating-card">
        <p className="floating-card__label">Bénéfice généré aujourd'hui</p>
        <div className="floating-card__value">
          <span>{todayBenefitFormatted}</span>
          <span className={`trend ${isThursday ? 'trend--up' : ''}`}>
            {isThursday ? 'Jeudi Productif' : 'En attente'}
          </span>
        </div>
      </article>
      <article className="panel floating-card">
        <p className="floating-card__label">Tarif journalier de référence</p>
        <div className="floating-card__value">
          <span>{tjmFormatted}</span>
          <span className="trend trend--up">Jeudi Productif</span>
        </div>
      </article>
      <article className="panel floating-card">
        <p className="floating-card__label">New Clients</p>
        <div className="floating-card__value">
          <span>+1</span>
          <span className="trend trend--up">Client Actif</span>
        </div>
      </article>
      <article className="panel floating-card">
        <p className="floating-card__label">Solde actuel Shine</p>
        <div className="floating-card__value">
          <span>+ {shineBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          <span className="trend">Disponible</span>
        </div>
      </article>

      {/* Middle row */}
      <article className="panel hero-panel">
        <div>
          <p className="hero-panel__eyebrow">{heroCard.welcome}</p>
          <h2>{heroCard.subtitle}</h2>
          <p className="hero-panel__date-label">{heroCard.dateLabel}</p>
          <p className="hero-panel__date">{todayDate}</p>
        </div>
        <div className="hero-panel__media">
          <img src={heroCard.illustration} alt="" />
        </div>
      </article>

      <article className="panel gauge-panel">
        <p className="panel__label">Satisfaction Rate</p>
        <p className="panel__sub">{satisfactionGauge.baseline}</p>
        <div className="gauge">
          <div className="gauge__value">{satisfactionGauge.value}</div>
        </div>
        <div className="gauge__labels">
          <span>0%</span>
          <span>100%</span>
        </div>
        <p className="gauge__footer">{satisfactionGauge.label}</p>
      </article>

      <article className="panel wallet-panel">
        <header className="panel__header">
          <p className="panel__label">Solde disponible</p>
          <button type="button" className="ghost-button tiny" aria-label="Options">⋯</button>
        </header>
        <p className="panel__sub">{walletSummary.provider}</p>
        <p className="wallet-panel__amount">{walletSummary.amount}</p>
        <p className="wallet-panel__objective">{walletSummary.objective}</p>
      </article>

      {/* Bottom row */}
      <article className="panel chart-panel">
        <header className="panel__header">
          <p>Ventes ({monthLabel})</p>
        </header>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f9dff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1c2340" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points={salesPoints} fill="none" stroke="#4f9dff" strokeWidth="2" strokeLinecap="round" />
          <polygon
            points={`${salesPoints} 100,100 0,100`}
            fill="url(#areaGradient)"
            opacity="0.4"
          />
        </svg>
        <div className="chart-panel__axis">
          {axisLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </article>

      <article className="panel bars-panel">
        <header className="panel__header">
          <p>{clientsTrend.label}</p>
        </header>
        <div className="bars">
          {clientsTrend.weeklyValues.map((value, index) => {
            const height = (value / Math.max(...clientsTrend.weeklyValues)) * 100
            return (
              <div key={`${value}-${index}`} className="bar">
                <span style={{ height: `${height}%` }} />
              </div>
            )
          })}
        </div>
        <p className="bars-panel__caption">Client Actif · 32 984</p>
      </article>
    </section>
  )
}

export default PerformanceOverview
