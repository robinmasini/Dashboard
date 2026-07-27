import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ActionModal from '../../components/ActionModal'
import { actionSchemas } from '../../../data/dashboard'
import { useTodayDate } from '../../../shared/utils/date'
import welcomeBg from '../../../assets/braden-collum-CBcS51cGoSw-unsplash.jpg'
import tvIllustration from '../../../assets/TV-illustration.png'
import ForecastPanel from '../../components/ForecastPanel'
import SustainabilityPanel from '../../components/SustainabilityPanel'
import { walletSummary } from '../../../data/dashboard'
import { useInvoices, useClients, useAppointments } from '../../../shared'
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

// --- Overview Content ---

const OverviewContent = () => {
  const navigate = useNavigate()
  const formattedDate = useTodayDate()
  const { invoices } = useInvoices()
  const { clients } = useClients()
  const { appointments } = useAppointments()

  // --- Upcoming Appointments (next 3) ---
  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return appointments
      .filter(apt => apt.appointment_date >= today && apt.status !== 'cancelled')
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || a.start_time.localeCompare(b.start_time))
      .slice(0, 3)
  }, [appointments])

  // --- KPI Calculations ---
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
  const tjmValue = "323,75 €"

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

  const totalPaidAmount = useMemo(() => {
    // Solde de référence fixe (Shine 8 094,76 € + Stripe 3 753,19 € = 11 847,95 €)
    const baseBalance = 11847.95

    // Additionner uniquement les nouvelles transactions créées par l'utilisateur via la modale
    const newTransactionsSum = invoices
      .filter(inv => {
        if (inv.status !== 'Payée') return false
        // Exclure les anciens éléments de test ou les entrées par défaut
        if (inv.id === 'STRIPE-001' || inv.id === 'AC-001' || inv.id === 'INV-001') return false
        return inv.notes === 'Transaction signalée via Performance' || (inv.created_at && inv.created_at > '2026-07-27T11:50:00Z')
      })
      .reduce((acc, inv) => {
        const amt = parseFloat(inv.amount.replace(/[^0-9,-]+/g, "").replace(',', '.'))
        return acc + (isNaN(amt) ? 0 : amt)
      }, 0)

    return formatCurrency(baseBalance + newTransactionsSum)
  }, [invoices])

  const stripeKey = "pk_live_51Sv3ZHLkTHqEmucyTb6aAik6fRLlnMVAkSrx0Uc8k0im9pIQMxyArnXv1ZgDh4hzv6G0wSvBRrHUwuL8xZHIXkyl00pk1e2U3M"
  const stripeStatus = "Connecté"

  return (
    <>
      {/* Top row - 4 KPIs separated in kpi-grid */}
      <div className="kpi-grid">
        <article className="panel floating-card">
          <p className="floating-card__label">Bénéfice du jour</p>
          <div className="floating-card__value">
            <span>{todayBenefitFormatted}</span>
            <span className="trend">
              {todayBenefit > 0 ? 'En hausse' : 'Stable'}
            </span>
          </div>
        </article>
        <article className="panel floating-card">
          <p className="floating-card__label">Tarif Journalier (TJM)</p>
          <div className="floating-card__value">
            <span>{tjmValue}</span>
            <span className="trend trend--up">Référence</span>
          </div>
        </article>
        <article className="panel floating-card">
          <p className="floating-card__label">Nouveaux Clients</p>
          <div className="floating-card__value">
            <span>+{newClientsCount}</span>
            <span className="trend trend--up">Ce mois-ci</span>
          </div>
        </article>
        <article className="panel floating-card">
          <p className="floating-card__label">Compte Stripe</p>
          <div className="floating-card__value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', color: '#6366f1' }}>{stripeStatus}</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
            </div>
            <span className="trend" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              {stripeKey.substring(0, 16)}...
            </span>
          </div>
        </article>
      </div>

      <section className="grid performance-grid">
        {/* Row 1 Left: Welcome Banner */}
        <div
          className="col-span-4 row-1-card"
          style={{
            background: 'linear-gradient(135deg, #060b28 0%, #0a0e23 100%)',
            borderRadius: '14px',
            overflow: 'hidden',
            position: 'relative',
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

          <div style={{ position: 'relative', zIndex: 10, padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bienvenue,</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Robin MASINI</h2>
            <p style={{ color: '#d1d5db', margin: 0, maxWidth: '100%', fontSize: '0.8rem', lineHeight: '1.4' }}>
              Suivez votre activité et vos performances en temps réel.
            </p>

            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', width: 'fit-content' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
              <span>Aujourd'hui :</span>
              <span style={{ color: 'white', fontWeight: 600 }}>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Row 1 Middle: Wallet / Solde disponible (moved from Row 2, same size as Welcome card) */}
        <article className="panel wallet-panel col-span-4 row-1-card" style={{ justifyContent: 'center', padding: '16px 20px' }}>
          <header className="panel__header" style={{ marginBottom: '8px' }}>
            <p className="panel__label">Solde disponible</p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)' }}>STRIPE OK</span>
            </div>
          </header>
          <p className="panel__sub" style={{ marginBottom: '6px', fontSize: '0.8rem' }}>{walletSummary.provider} + STRIPE</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1 }}>{totalPaidAmount}</p>
            <p style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>86 % de l'objectif atteint</p>
          </div>
        </article>

        {/* Row 1 Right: Rendez-vous à venir */}
        <article className="panel col-span-4 row-1-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px' }}>
          <p className="panel__label" style={{ marginBottom: '8px', fontSize: '0.8rem' }}>Rendez-vous à venir</p>
          {upcomingAppointments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 'auto 0' }}>Aucun rendez-vous prévu</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'center' }}>
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                  borderLeft: '3px solid #4f9dff'
                }}>
                  <span style={{ fontSize: '1rem' }}>📆</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {apt.client?.name || apt.notes || 'Rendez-vous'}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                      {new Date(apt.appointment_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {apt.start_time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* Row 2: TradeView & Financial Intelligence Banner */}
        <article
          className="panel col-span-12"
          onClick={() => navigate('/tradeview')}
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(15, 21, 53, 0.85) 0%, rgba(8, 11, 28, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px 28px 24px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            marginTop: '8px',
            cursor: 'pointer',
            transition: 'transform 0.25 ease, border-color 0.25s ease, box-shadow 0.25s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
            e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(99, 102, 241, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
          }}
        >
          {/* Left image display column (with subtle left padding & floating animation) */}
          <div style={{ flex: '0 0 45%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', zIndex: 2 }}>
            <img
              src={tvIllustration}
              alt="TradeView Illustration"
              className="tv-illustration-animated"
              style={{
                width: '100%',
                maxWidth: '480px',
                height: 'auto',
                borderRadius: '16px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 35px rgba(99, 102, 241, 0.25))',
                transition: 'transform 0.4s ease'
              }}
            />
          </div>

          {/* Right info column */}
          <div style={{ flex: '1 1 50%', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                TradeView Intelligence
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                Marchés en Direct
              </span>
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: '0 0 10px 0', lineHeight: 1.2 }}>
              Suivez, Investissez & Développez vos Actifs
            </h3>

            <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 20px 0', maxWidth: '520px' }}>
              Consultez vos positions boursières, visualisez les opportunités crypto et analysez vos performances financières en temps réel grâce à TradeView.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '12px 18px', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Portefeuille</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>+24.8 % <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400 }}>YTD</span></p>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '12px 18px', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indices & Crypto</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#6366f1' }}>CAC40 • BTC • ETH</p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </>
  )
}

// --- Main Page ---

export default function FreelancePerformance() {
  const [activeTab, setActiveTab] = useState('Vue d\'ensemble')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalSchema, setModalSchema] = useState<any>(null)
  const { addInvoice } = useInvoices()

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

  const handleModalSubmit = async (values: Record<string, string>) => {
    try {
      if (activeTab === 'Vue d\'ensemble') {
        const rawAmount = parseFloat(values.amount?.replace(',', '.') || '0')
        if (!isNaN(rawAmount) && rawAmount > 0) {
          const formattedAmount = `${rawAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`
          await addInvoice({
            client_id: values.source || 'Transaction Directe',
            amount: formattedAmount,
            due_date: values.date || new Date().toISOString().split('T')[0],
            status: 'Payée',
            notes: values.notes || 'Transaction signalée via Performance'
          })
        }
      }
    } catch (err) {
      console.error('Error submitting transaction:', err)
    }
    handleCloseModal()
  }

  return (
    <div className="workspace__content">
      {/* HEADER SECTION */}
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Dashboard</p>
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
          <a
            href="/portfolio.pdf"
            download="portfolio.pdf"
            className="ghost-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Portfolio</span>
          </a>
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
        onSubmit={handleModalSubmit}
      />

      {/* DASHBOARD CONTENT */}
      {activeTab === 'Vue d\'ensemble' && <OverviewContent />}
      {activeTab === 'Prévisionnel' && <ForecastPanel />}
      {activeTab === 'Pérénité' && <SustainabilityPanel />}
    </div>
  )
}
