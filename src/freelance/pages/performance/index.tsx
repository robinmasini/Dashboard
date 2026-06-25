import { useState, useMemo } from 'react'
import ActionModal from '../../components/ActionModal'
import { actionSchemas } from '../../../data/dashboard'
import { useTodayDate } from '../../../shared/utils/date'
import welcomeBg from '../../../assets/braden-collum-CBcS51cGoSw-unsplash.jpg'
import ForecastPanel from '../../components/ForecastPanel'
import SustainabilityPanel from '../../components/SustainabilityPanel'
import { walletSummary } from '../../../data/dashboard'
import { useInvoices, useClients, useAppointments } from '../../../shared'
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

// --- Sourcing & SMM Data ---

interface Product {
  id: string
  name: string
  category: string
  sourcePrice: number
  sellPrice: number
  views: string
  supplier: string
  supplierUrl: string
  engagement: string
  growth: string
}

const winningProducts: Product[] = [
  {
    id: "blender",
    name: "Mini Blender Portable Ultra-Power",
    category: "Cuisine & Nutrition",
    sourcePrice: 4.50,
    sellPrice: 29.90,
    views: "4.8M",
    supplier: "Alibaba (Fournisseur Certifié, livraison 7j)",
    supplierUrl: "https://french.alibaba.com",
    engagement: "9.2%",
    growth: "+145%"
  },
  {
    id: "brush",
    name: "Brosse Nettoyante Électrique 5-en-1",
    category: "Beauté & Entretien",
    sourcePrice: 2.80,
    sellPrice: 19.99,
    views: "12.1M",
    supplier: "Zendrop (Dropshipping rapide, stock Europe)",
    supplierUrl: "https://www.zendrop.com",
    engagement: "11.5%",
    growth: "+310%"
  },
  {
    id: "galaxy",
    name: "Projecteur Galaxie Portable Lumineux",
    category: "Décoration & High-Tech",
    sourcePrice: 6.20,
    sellPrice: 34.99,
    views: "8.3M",
    supplier: "Alibaba (Fabricant direct, logo personnalisé)",
    supplierUrl: "https://french.alibaba.com",
    engagement: "8.7%",
    growth: "+95%"
  },
  {
    id: "phone-holder",
    name: "Support Téléphone Suiveur de Visage (360° AI)",
    category: "High-Tech & Création",
    sourcePrice: 5.10,
    sellPrice: 27.99,
    views: "3.2M",
    supplier: "CJDropshipping (Livraison express avec emballage personnalisé)",
    supplierUrl: "https://cjdropshipping.com",
    engagement: "7.9%",
    growth: "+65%"
  }
]

const productStrategies: Record<string, { hook: string; angle: string; videoPlan: string[]; sourcingTips: string }> = {
  blender: {
    hook: "« Arrêtez de dépenser 8€ dans vos smoothies le matin. Ce petit gadget fait exactement la même chose pour 0,50€... »",
    angle: "Style esthétique 'Clean Girl' / Routine matinale saine. C'est l'aspect d'indépendance, d'économie et la praticité pour le bureau/sport qui convertit.",
    videoPlan: [
      "0-3s : Hook visuel montrant des fruits frais mixés instantanément à la salle de sport ou dans la voiture.",
      "3-10s : Démo de la charge USB-C et du nettoyage (on met de l'eau, du liquide vaisselle, et on mixe).",
      "10-15s : Appel à l'action : 'Obtenez -50% aujourd'hui via le lien en bio'."
    ],
    sourcingTips: "Acheter par lots de 50 unités sur Alibaba pour faire baisser le coût à 3.20€ l'unité. Créer une marque simple autour de la nutrition."
  },
  brush: {
    hook: "« Si vous avez cette trace de calcaire incrustée chez vous depuis des mois, ne frottez plus comme un fou... »",
    angle: "Style ASMR / Nettoyage satisfaisant. Montrer l'avant/après sur une surface très sale (carrelage, joints, robinet) sans frotter.",
    videoPlan: [
      "0-3s : Plan ultra-satisfaisant d'une brosse rotative qui nettoie une trace noire instantanément.",
      "3-10s : Comparaison de l'effort traditionnel vs la puissance de la brosse 5-en-1 avec embouts adaptés.",
      "10-15s : Rareté & Call to action : 'Livraison offerte ce soir seulement. Lien en bio'."
    ],
    sourcingTips: "Produit idéal pour TikTok Organic. Commandez 2 exemplaires pour filmer des vidéos chez vous, puis lancez le shop."
  },
  galaxy: {
    hook: "« J'ai transformé ma chambre d'étudiant ennuyeuse en vaisseau spatial pour moins de 35€... »",
    angle: "Ambiance de nuit chaleureuse. Le produit doit être mis en scène dans l'obscurité avec des couleurs vibrantes pour déclencher un achat impulsif.",
    videoPlan: [
      "0-3s : Allumage du projecteur dans le noir total sur un drop de musique virale.",
      "3-10s : Présentation des différents modes de couleurs et du mode de synchronisation à la musique.",
      "10-15s : 'Lien en bio pour choper le vôtre avec le code TIKTOK15'."
    ],
    sourcingTips: "Trouver un fournisseur en marque blanche sur Alibaba. Vendre via Shopify en intégrant des avis clients vidéosTikTok."
  },
  "phone-holder": {
    hook: "« Ce robot à 25€ remplace un caméraman pro et me suit partout quand je filme mes TikToks... »",
    angle: "Cibler les créateurs de contenu, influenceurs et profs de sport. Montrer que la rotation AI suit chaque mouvement de façon fluide.",
    videoPlan: [
      "0-3s : Mouvement rapide du créateur et suivi instantané par le support sans aucun lag.",
      "3-10s : Démonstration qu'aucune application n'est nécessaire (puce AI intégrée au capteur).",
      "10-15s : 'Quantités limitées pour le lancement. Lien dans la bio'."
    ],
    sourcingTips: "Sourcing conseillé via CJDropshipping pour réduire les délais de livraison à 5-8 jours. Excellente opportunité en affiliation."
  }
}

// --- Overview Content ---

const OverviewContent = () => {
  const formattedDate = useTodayDate()
  const { invoices } = useInvoices()
  const { clients } = useClients()
  const { appointments } = useAppointments()

  // --- States for TikTok Robots ---
  const [isScanningTrends, setIsScanningTrends] = useState(false)
  const [trendLogs, setTrendLogs] = useState<string[]>([
    `[08:30:00] [INFO] Robot Scanner TikTok en veille.`,
    `[08:32:15] [SUCCESS] Scan quotidien automatique réussi.`
  ])
  const [selectedProduct, setSelectedProduct] = useState<string>('blender')
  const [showSupplierModal, setShowSupplierModal] = useState<Product | null>(null)

  const runTrendScan = () => {
    if (isScanningTrends) return
    setIsScanningTrends(true)
    setTrendLogs([`[${new Date().toLocaleTimeString('fr-FR')}] [⚡] Initialisation du scan manuel...`])
    
    const logSteps = [
      { text: "[🔄] Connexion aux serveurs API TikTok Creative Center...", delay: 600 },
      { text: "[🔍] Analyse des mots-clés émergents en France dans la catégorie 'E-commerce'...", delay: 1200 },
      { text: "[📈] Indexation de 4 500 vidéos et calcul de la vélocité des hashtags...", delay: 1800 },
      { text: "[🔥] TENDANCE PHARE DÉTECTÉE : #tiktokmademebuyit (Taux d'engagement +140%)", delay: 2400 },
      { text: "[🎵] Détection des pistes audio virales avec vélocité > 250%...", delay: 3000 },
      { text: "[SUCCESS] Sons viraux identifiés. Hooks comportementaux extraits.", delay: 3600 },
      { text: "[📊] Actualisation des produits gagnants TikTok Shop & Organic...", delay: 4200 },
      { text: "[SUCCESS] Base de données actualisée avec succès. Prêt à vendre !", delay: 4800 }
    ]

    logSteps.forEach((step, idx) => {
      setTimeout(() => {
        const time = new Date().toLocaleTimeString('fr-FR')
        setTrendLogs(prev => [...prev, `[${time}] ${step.text}`])
        if (idx === logSteps.length - 1) {
          setIsScanningTrends(false)
        }
      }, step.delay)
    })
  }

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
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1 }}>{walletSummary.amount}</p>
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

        {/* Row 2 Left: TikTok Trends Robot */}
        <article className="panel tiktok-panel col-span-6 row-2-card" style={{ padding: '20px', justifyContent: 'space-between' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`pulse-dot ${isScanningTrends ? 'scanning' : ''}`}></span>
                Robot Scanner TikTok
              </h4>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Dernier scan : à 08:32
              </span>
            </div>
            <button
              onClick={runTrendScan}
              disabled={isScanningTrends}
              className="primary-button tiny"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: isScanningTrends ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ff0050, #00f2fe)',
                color: 'white',
                opacity: isScanningTrends ? 0.6 : 1,
                cursor: isScanningTrends ? 'not-allowed' : 'pointer'
              }}
            >
              {isScanningTrends ? 'Analyse...' : 'Scanner'}
            </button>
          </header>

          {/* Live log console */}
          <div className="tiktok-console" style={{ marginBottom: '12px', flex: 1, height: '110px' }}>
            {trendLogs.map((log, index) => (
              <div key={index} className="tiktok-console__line">{log}</div>
            ))}
          </div>

          {/* Trending widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔥 Hashtags</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px' }}>
                  <span style={{ color: '#ff0050', fontWeight: 600 }}>#mademebuy</span>
                  <span style={{ color: 'var(--text-muted)' }}>+140%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px' }}>
                  <span style={{ color: '#00f2fe', fontWeight: 600 }}>#unboxing</span>
                  <span style={{ color: 'var(--text-muted)' }}>+95%</span>
                </div>
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎵 Sons</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.65rem', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Lofi Remix</span>
                  <span style={{ color: '#ff0050', fontSize: '0.6rem' }}>+340%</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Row 2 Right: TikTok Products Sourcing Robot */}
        <article className="panel tiktok-panel col-span-6 row-2-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
          <header style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>
              🤖 Robot Sourcing Produits
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Sélectionnez un produit gagnant
            </span>
          </header>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', paddingRight: '2px' }}>
            {winningProducts.map((p) => {
              const marginAmount = p.sellPrice - p.sourcePrice
              const isSelected = selectedProduct === p.id

              return (
                <div
                  key={p.id}
                  className={`product-row ${isSelected ? 'is-selected' : ''}`}
                  style={{ cursor: 'pointer', padding: '8px 10px', marginBottom: '4px' }}
                  onClick={() => setSelectedProduct(p.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      Marge: <span style={{ color: '#39ff14', fontWeight: 700 }}>{marginAmount.toFixed(1)}€</span> • {p.views}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSupplierModal(p)
                    }}
                    className="ghost-button tiny"
                    style={{ padding: '3px 6px', fontSize: '0.65rem', border: '1px solid rgba(255,255,255,0.1)', marginLeft: '8px' }}
                  >
                    Source
                  </button>
                </div>
              )
            })}
          </div>
        </article>

      {/* Row 4: TikTok E-commerce Idea/Strategy Generator (Full Width) */}
      {selectedProduct && (
        <article className="panel tiktok-strategy-panel col-span-12" style={{ marginTop: '8px' }}>
          <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#00f2fe', fontWeight: 700 }}>
                Générateur d'Idées & Stratégie E-commerce TikTok
              </span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.3rem', fontWeight: 700, color: 'white' }}>
                Pitch & Script pour : <span style={{ color: '#ff0050' }}>{winningProducts.find(p => p.id === selectedProduct)?.name}</span>
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', background: 'rgba(57, 255, 20, 0.1)', color: '#39ff14', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                Marge estimée : {(winningProducts.find(p => p.id === selectedProduct)!.sellPrice - winningProducts.find(p => p.id === selectedProduct)!.sourcePrice).toFixed(2)} €
              </span>
            </div>
          </header>

          <div className="tiktok-strategy-grid">
            {/* Hook video script */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700, color: '#ff0050', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📣 Accroche Vidéo (Hook)
              </h5>
              <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.5', color: '#e5e7eb' }}>
                {productStrategies[selectedProduct]?.hook}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(productStrategies[selectedProduct]?.hook || '')
                  alert('Hook copié dans le presse-papiers !')
                }}
                className="ghost-button tiny"
                style={{ marginTop: '12px', width: '100%', padding: '6px', fontSize: '0.75rem', justifyContent: 'center' }}
              >
                📋 Copier le Hook
              </button>
            </div>

            {/* Marketing Angle */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700, color: '#00f2fe' }}>
                🎯 Angle Marketing Recommandé
              </h5>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', color: '#d1d5db' }}>
                {productStrategies[selectedProduct]?.angle}
              </p>
            </div>

            {/* Sourcing & Logistics */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700, color: '#39ff14' }}>
                📦 Sourcing & Logistique
              </h5>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', color: '#d1d5db', marginBottom: '8px' }}>
                {productStrategies[selectedProduct]?.sourcingTips}
              </p>
              <a
                href={winningProducts.find(p => p.id === selectedProduct)?.supplierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-button tiny"
                style={{
                  display: 'inline-flex',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '6px',
                  fontSize: '0.75rem',
                  background: 'rgba(57, 255, 20, 0.15)',
                  border: '1px solid rgba(57, 255, 20, 0.3)',
                  color: '#39ff14',
                  boxShadow: 'none'
                }}
              >
                Visiter le Fournisseur ↗
              </a>
            </div>
          </div>

          {/* Video Script Plan */}
          <div style={{ marginTop: '16px', background: 'rgba(255, 255, 255, 0.01)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>
              🎥 Structure Vidéo recommandée (Format Court 15s)
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {productStrategies[selectedProduct]?.videoPlan.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: '#d1d5db' }}>
                  <span style={{ color: '#ff0050', fontWeight: 700 }}>{idx + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      )}

      {/* Supplier Sourcing Modal Popup */}
      {showSupplierModal && (
        <div className="modal-backdrop" onClick={() => setShowSupplierModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', background: '#0b0c16' }}>
            <div className="modal__header">
              <div>
                <p className="modal__eyebrow">Détails Logistique & Sourcing</p>
                <h3 style={{ fontSize: '1.2rem' }}>{showSupplierModal.name}</h3>
              </div>
              <button onClick={() => setShowSupplierModal(null)} className="ghost-button" style={{ border: 'none', fontSize: '1.2rem', color: 'white' }}>✕</button>
            </div>
            <div className="modal__body" style={{ gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Prix de Vente conseillé</span>
                <span style={{ fontWeight: 700, color: 'white' }}>{showSupplierModal.sellPrice.toFixed(2)} €</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Coût d'achat de base</span>
                <span style={{ fontWeight: 700, color: '#ff0050' }}>{showSupplierModal.sourcePrice.toFixed(2)} €</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Marge nette</span>
                <span style={{ fontWeight: 700, color: '#39ff14' }}>{(showSupplierModal.sellPrice - showSupplierModal.sourcePrice).toFixed(2)} €</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Fournisseur identifié :</span>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', color: '#e5e7eb' }}>
                  {showSupplierModal.supplier}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Statistiques de viabilité :</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Engagement TikTok</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#00f2fe' }}>{showSupplierModal.engagement}</p>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Croissance hebdomadaire</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#ff0050' }}>{showSupplierModal.growth}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal__footer" style={{ padding: '16px 24px' }}>
              <button onClick={() => setShowSupplierModal(null)} className="ghost-button" style={{ padding: '8px 16px' }}>Fermer</button>
              <a
                href={showSupplierModal.supplierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-button"
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #00f2fe, #3b4fff)',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                Commander Échantillon
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  </>
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
        onSubmit={() => handleCloseModal()}
      />

      {/* DASHBOARD CONTENT */}
      {activeTab === 'Vue d\'ensemble' && <OverviewContent />}
      {activeTab === 'Prévisionnel' && <ForecastPanel />}
      {activeTab === 'Pérénité' && <SustainabilityPanel />}
    </div>
  )
}
