import { useState, useMemo } from 'react'
import ActionModal from '../../components/ActionModal'
import { actionSchemas } from '../../../data/dashboard'
import { useTodayDate } from '../../../shared/utils/date'
import welcomeBg from '../../../assets/braden-collum-CBcS51cGoSw-unsplash.jpg'
import ForecastPanel from '../../components/ForecastPanel'
import SustainabilityPanel from '../../components/SustainabilityPanel'
import { satisfactionGauge, walletSummary } from '../../../data/dashboard'
import { useInvoices, useClients } from '../../../shared'

// --- Helper Functions ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

// --- Overview Content ---

const OverviewContent = () => {
  const formattedDate = useTodayDate()
  const { invoices } = useInvoices()
  const { clients } = useClients()
  // Note: useTickets available for future client activity visualization

  // --- KPI Calculations ---

  // 1. Bénéfice du jour (Somme des factures payées ou émises aujourd'hui ?)
  // Pour l'instant, on va prendre les factures créées aujourd'hui
  const todayBenefit = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return invoices
      .filter(inv => inv.created_at?.startsWith(today))
      .reduce((sum, inv) => {
        const amount = parseFloat(inv.amount.replace(/[^0-9,-]+/g, "").replace(',', '.'))
        return sum + (isNaN(amount) ? 0 : amount)
      }, 0)
  }, [invoices])

  const todayBenefitFormatted = formatCurrency(todayBenefit)

  // 2. TJM (Fixe pour l'instant ou calculé sur la moyenne des tickets ?)
  const tjmValue = "323,75 €"

  // 3. Nouveaux Clients (Ce mois-ci)
  const newClientsCount = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return clients.filter(c => {
      if (!c.created_at) return false
      const d = new Date(c.created_at)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length
  }, [clients])

  // 4. Sales Chart Data (Ventes du mois en cours)
  const { salesPoints, axisLabels, monthLabel } = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    // Init array with 0
    const dailySales = new Array(daysInMonth).fill(0)

    invoices.forEach(inv => {
      if (!inv.created_at) return
      const d = new Date(inv.created_at)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const dayIndex = d.getDate() - 1
        const amount = parseFloat(inv.amount.replace(/[^0-9,-]+/g, "").replace(',', '.'))
        dailySales[dayIndex] += (isNaN(amount) ? 0 : amount)
      }
    })

    // Generate points for SVG polyline
    const maxVal = Math.max(...dailySales, 100) // Min 100 to avoid flat line at 0
    const points = dailySales.map((val, idx) => {
      const x = (idx / (daysInMonth - 1)) * 100
      const y = 50 - (val / maxVal) * 50 // 50 is height of SVG
      return `${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')

    // Axis labels (every 5 days)
    const labels = []
    for (let i = 0; i < daysInMonth; i += 5) labels.push(String(i + 1))

    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

    return {
      salesPoints: points,
      axisLabels: labels,
      monthLabel: `${monthNames[currentMonth]} ${currentYear}`
    }
  }, [invoices])

  // Note: Client activity visualization available for future enhancement
  // using clients and tickets data

  return (
    <section className="grid performance-grid">
      {/* Top row - 3 KPIs */}
      <article className="panel floating-card col-span-4">
        <p className="floating-card__label">Bénéfice du jour</p>
        <div className="floating-card__value">
          <span>{todayBenefitFormatted}</span>
          <span className="trend">
            {todayBenefit > 0 ? 'En hausse' : 'Stable'}
          </span>
        </div>
      </article>
      <article className="panel floating-card col-span-4">
        <p className="floating-card__label">Tarif Journalier (TJM)</p>
        <div className="floating-card__value">
          <span>{tjmValue}</span>
          <span className="trend trend--up">Référence</span>
        </div>
      </article>
      <article className="panel floating-card col-span-4">
        <p className="floating-card__label">Nouveaux Clients</p>
        <div className="floating-card__value">
          <span>+{newClientsCount}</span>
          <span className="trend trend--up">Ce mois-ci</span>
        </div>
      </article>

      {/* Row 2 Left: Welcome Banner */}
      <div
        className="col-span-8"
        style={{
          background: 'linear-gradient(135deg, #060b28 0%, #0a0e23 100%)',
          borderRadius: '14px',
          overflow: 'hidden',
          position: 'relative',
          height: '350px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div
          className="jellyfish-animation"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${welcomeBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 1,
          }}
        ></div>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, #060b28 0%, rgba(6, 11, 40, 0.8) 40%, rgba(6, 11, 40, 0) 100%)',
        }}></div>

        <div style={{ position: 'relative', zIndex: 10, padding: '32px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bienvenue,</p>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Robin MASINI</h2>
          <p style={{ color: '#d1d5db', marginBottom: 'auto', maxWidth: '450px', fontSize: '1rem', lineHeight: '1.6' }}>
            Ravi de vous revoir ! Consultez votre Dashboard pour suivre votre activité et vos performances en temps réel.
          </p>

          <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '12px', color: '#9ca3af', fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', width: 'fit-content' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
            <span>Date d'aujourd'hui :</span>
            <span style={{ color: 'white', fontWeight: 600 }}>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Row 2 Right: Stacked Sat & Wallet */}
      <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '350px' }}>
        {/* Satisfaction */}
        <article className="panel gauge-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 12px' }}>
            <div>
              <p className="panel__label" style={{ textAlign: 'left' }}>Satisfaction</p>
              <p className="panel__sub" style={{ textAlign: 'left', marginBottom: 0 }}>{satisfactionGauge.baseline}</p>
            </div>
            <div className="gauge" style={{ width: '70px', height: '70px', margin: 0 }}>
              <div className="gauge__value" style={{ fontSize: '1.1rem' }}>{satisfactionGauge.value}</div>
            </div>
          </div>
        </article>

        {/* Wallet */}
        <article className="panel wallet-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <header className="panel__header" style={{ marginBottom: '12px' }}>
            <p className="panel__label">Solde disponible</p>
            <button type="button" className="ghost-button tiny" aria-label="Options">⋯</button>
          </header>
          <p className="panel__sub" style={{ marginBottom: '8px' }}>{walletSummary.provider}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '0', lineHeight: 1 }}>{walletSummary.amount}</p>
            <p style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>49 % de l'objectif atteint</p>
          </div>
        </article>
      </div>

      {/* Row 3: Sales Chart */}
      <article className="panel chart-panel col-span-8" style={{ height: '240px' }}>
        <header className="panel__header">
          <p>Ventes ({monthLabel})</p>
        </header>
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <svg viewBox="0 0 100 50" preserveAspectRatio="none" style={{ width: '100%', height: '100%', minHeight: 'auto' }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f9dff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#1c2340" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline points={salesPoints} fill="none" stroke="#4f9dff" strokeWidth="2" strokeLinecap="round" />
            <polygon
              points={`${salesPoints} 100,50 0,50`}
              fill="url(#areaGradient)"
              opacity="0.4"
            />
          </svg>
        </div>
        <div className="chart-panel__axis">
          {axisLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </article>

      {/* Row 3: Clients Trends */}
      <article className="panel bars-panel col-span-4" style={{ height: '240px' }}>
        <header className="panel__header">
          <p>Activité Clients</p>
        </header>
        <div className="bars" style={{ flex: 1, minHeight: 0 }}>
          {/* Mock bars for visual consistency */}
          {[60, 80, 45, 90, 30, 70, 50].map((value, index) => {
            const height = value
            return (
              <div key={index} className="bar">
                <span style={{ height: `${height}%` }} />
              </div>
            )
          })}
        </div>
        <p className="bars-panel__caption">Basé sur les tickets</p>
      </article>
    </section>
  )
}

// --- Main Page ---

export default function FreelancePerformance() {
  const [activeTab, setActiveTab] = useState('Vue d\'ensemble')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalSchema, setModalSchema] = useState<any>(null)

  const handleOpenModal = () => {
    const schemaKey = activeTab === 'Vue d\'ensemble' ? 'performance:overview' :
      activeTab === 'Prévisionnel' ? 'performance:forecast' :
        'performance:sustainability'
    setModalSchema(actionSchemas[schemaKey] || actionSchemas['default'])
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalSchema(null)
  }

  return (
    <div className="workspace__content">
      {/* HEADER SECTION */}
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Performance</p>
          <div className="tab-group">
            {['Vue d\'ensemble', 'Prévisionnel', 'Pérénité'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-pill ${activeTab === tab ? 'is-active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            className="primary-button"
            onClick={handleOpenModal}
            style={{
              background: 'linear-gradient(135deg, #6823ff, #3b4fff)',
              boxShadow: '0 10px 15px -3px rgba(104, 35, 255, 0.3)',
              padding: '10px 24px'
            }}
          >
            {activeTab === 'Vue d\'ensemble' ? 'Signaler une transaction' :
              activeTab === 'Prévisionnel' ? 'Ajouter une opportunité' : 'Suivi de vitalité'}
          </button>
        </div>
      </div>

      {/* MODAL */}
      <ActionModal
        open={isModalOpen}
        schema={modalSchema}
        onClose={handleCloseModal}
        onSubmit={() => handleCloseModal()}
      />

      {/* DASHBOARD CONTENT */}
      {activeTab === 'Vue d\'ensemble' && <OverviewContent />}
      {activeTab === 'Prévisionnel' && <ForecastPanel />}
      {activeTab === 'Pérénité' && <SustainabilityPanel />}
    </div>
  )
}
