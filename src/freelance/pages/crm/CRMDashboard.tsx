import { useState } from 'react'
import { useCRM } from '../../../shared/hooks/useCRM'
import { BrightDataScraperService } from '../../../shared/services/brightDataScraper'
import type { ScrapedResult } from '../../../shared/services/brightDataScraper'
import '../../../App.css'

export default function CRMDashboard() {
  const { addCompany, addContact, settings } = useCRM()
  
  // États pour les critères de recherche
  const [ville, setVille] = useState('Lyon')
  const [domaine, setDomaine] = useState('développeur iOS')
  
  // États de scraping
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStep, setProgressStep] = useState('')
  const [scrapedResults, setScrapedResults] = useState<ScrapedResult[]>([])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  // Lancer le scraping
  const handleScrape = async () => {
    setLoading(true)
    setProgress(0)
    setProgressStep('Démarrage de l\'agent de scraping...')
    setScrapedResults([])
    setSelectedIndices([])

    try {
      // Déterminer les requêtes intelligemment (en cas d'inversion des champs par l'utilisateur)
      const q = domaine || ville
      const loc = ville && domaine ? ville : 'France'

      const results = await BrightDataScraperService.scrape(
        q,
        loc,
        settings?.brightdata_api_key,
        settings?.brightdata_scraper_id,
        (step, pct) => {
          setProgress(pct)
          setProgressStep(step)
        }
      )

      setScrapedResults(results)
      // Sélectionner tout par défaut
      setSelectedIndices(results.map((_, i) => i))
    } catch (err) {
      console.error(err)
      alert('Erreur lors du scraping.')
    } finally {
      setLoading(false)
    }
  }

  // Gérer la sélection individuelle
  const toggleSelect = (idx: number) => {
    setSelectedIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )
  }

  // Ajouter les entreprises et contacts sélectionnés au CRM
  const handleAddSelection = async () => {
    if (selectedIndices.length === 0) return

    let companiesAdded = 0
    let contactsAdded = 0

    try {
      for (const idx of selectedIndices) {
        const item = scrapedResults[idx]
        
        // 1. Ajouter l'entreprise
        const newCompany = await addCompany({
          name: item.company.name,
          domain: item.company.domain,
          website: item.company.website,
          linkedin_url: item.company.linkedin_url,
          wttj_url: item.company.wttj_url,
          indeed_url: item.company.indeed_url,
          description: item.company.description,
          project_name: item.company.project_name,
          source: 'brightdata'
        })

        // 2. Ajouter ses contacts rattachés
        if (newCompany?.id) {
          for (const contact of item.contacts) {
            await addContact({
              company_id: newCompany.id,
              first_name: contact.first_name,
              last_name: contact.last_name,
              email: contact.email,
              phone: contact.phone,
              role: contact.role,
              linkedin_url: contact.linkedin_url,
              status: 'à contacter',
              channel: contact.channel || 'linkedin',
              notes: contact.notes
            })
            contactsAdded++
          }
        }
        companiesAdded++
      }

      alert(`✅ Prospection importée avec succès :\n- ${companiesAdded} Entreprises ajoutées\n- ${contactsAdded} Recruteurs/Contacts créés`);
      
      // Vider les résultats après import
      setScrapedResults([])
      setSelectedIndices([])
    } catch (e: any) {
      console.error(e)
      alert(`Erreur lors de l'importation: ${e.message}`)
    }
  }

  return (
    <div className="workspace__content">
      {/* Section Header */}
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Personal CRM</p>
          <h1 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 700 }}>Scraper de Prospects</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Découvrez des entreprises sur Welcome to the Jungle et LinkedIn qui recrutent dans un domaine donné — sans les ajouter automatiquement.
          </p>
        </div>
      </div>

      {/* Alert Badge if API Keys are missing */}
      {(!settings?.brightdata_api_key || !settings?.brightdata_scraper_id) && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '12px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          color: '#fbbf24',
          fontSize: '0.85rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>⚠️</span>
          <span>
            <strong>Mode Démo (Simulation) :</strong> Les clés API Bright Data ne sont pas configurées. Le scraper utilise une simulation IA avec des entreprises réelles. Configurez vos clés dans l'onglet <strong>Settings</strong> pour activer le scraping réel.
          </span>
        </div>
      )}

      {/* Pane Recherche Entreprises */}
      <div className="panel" style={{ padding: '28px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 600 }}>Recherche entreprises</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div className="modal-field">
            <span>Ville / Localisation</span>
            <input
              type="text"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              placeholder="Ex: Lyon, Paris, Télétravail"
            />
          </div>
          <div className="modal-field">
            <span>Domaine / type de poste</span>
            <input
              type="text"
              value={domaine}
              onChange={(e) => setDomaine(e.target.value)}
              placeholder="Ex: développeur iOS, UX/UI designer, Product Designer"
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="primary-button"
            onClick={handleScrape}
            disabled={loading}
            style={{
              padding: '12px 28px',
              background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #12131a, #000)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: loading ? 'var(--text-muted)' : '#fff',
              fontSize: '0.95rem',
              borderRadius: '12px'
            }}
          >
            {loading ? 'Recherche en cours...' : 'Valider'}
          </button>

          {!loading && scrapedResults.length === 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Prêt à lancer l'agent IA via Bright Data.
            </span>
          )}

          {!loading && scrapedResults.length > 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {scrapedResults.length} proposition(s) hors base sur {scrapedResults.length} résultat(s) bruts.
            </span>
          )}
        </div>

        {/* Barre de chargement/Agent Progress */}
        {loading && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'between', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span style={{ color: '#a5b4fc', fontWeight: 500 }}>🤖 Agent IA : {progressStep}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${progress}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #6366f1, #3b82f6)',
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)',
                  transition: 'width 0.4s ease'
                }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Résultats Section */}
      {scrapedResults.length > 0 && (
        <div className="section-header" style={{ marginTop: '12px' }}>
          <div className="section-header__tabs">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Résultats</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Cochez les lignes à enregistrer dans le CRM, puis cliquez sur « Ajouter la sélection ».
            </p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={handleAddSelection}
            disabled={selectedIndices.length === 0}
            style={{
              background: selectedIndices.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1, #3b82f6)',
              color: selectedIndices.length === 0 ? 'var(--text-muted)' : '#white',
              padding: '10px 20px',
              borderRadius: '12px'
            }}
          >
            Ajouter la sélection ({selectedIndices.length})
          </button>
        </div>
      )}

      {/* Liste des cartes d'entreprises scraped */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {scrapedResults.map((item, idx) => (
          <div 
            key={idx} 
            className="panel"
            style={{
              padding: '20px',
              border: selectedIndices.includes(idx) ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.05)',
              background: selectedIndices.includes(idx) ? 'rgba(99, 102, 241, 0.02)' : 'var(--bg-panel-soft)',
              transition: 'all 0.2s',
              display: 'flex',
              gap: '20px'
            }}
          >
            {/* Checkbox */}
            <div style={{ display: 'flex', alignItems: 'start', paddingTop: '4px' }}>
              <input
                type="checkbox"
                checked={selectedIndices.includes(idx)}
                onChange={() => toggleSelect(idx)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#6366f1'
                }}
              />
            </div>

            {/* Infos entreprise */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{item.company.name}</h3>
                <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  {item.company.domain}
                </span>
                {item.company.project_name && (
                  <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Projet : {item.company.project_name}
                  </span>
                )}

                {/* Badge de liens */}
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                  {item.company.website && (
                    <a href={item.company.website} target="_blank" rel="noreferrer" className="status-pill status-pill--open" style={{ textDecoration: 'none', fontSize: '0.7rem' }}>
                      🌐 Site web
                    </a>
                  )}
                  {item.company.linkedin_url && (
                    <a href={item.company.linkedin_url} target="_blank" rel="noreferrer" className="status-pill status-pill--progress" style={{ textDecoration: 'none', fontSize: '0.7rem' }}>
                      💼 LinkedIn
                    </a>
                  )}
                  {item.company.wttj_url && (
                    <a href={item.company.wttj_url} target="_blank" rel="noreferrer" className="status-pill status-pill--closed" style={{ textDecoration: 'none', fontSize: '0.7rem' }}>
                      🌴 Welcome To The Jungle
                    </a>
                  )}
                </div>
              </div>

              {/* Descriptions */}
              <p style={{ margin: '12px 0 6px 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                <strong>Activité — </strong> {item.company.description}
              </p>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Recrutement — </strong> Offres liées à « {ville} » pour « {domaine} » (extrait de la recherche).
              </p>

              {/* Recruteurs trouvés */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                  🕵️ Recruteurs cibles identifiés ({item.contacts.length}) :
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {item.contacts.map((c, cIdx) => (
                    <div 
                      key={cIdx} 
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.first_name} {c.last_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{c.role}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        {c.linkedin_url && (
                          <a href={c.linkedin_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#60a5fa', textDecoration: 'none' }}>
                            🔗 Profile
                          </a>
                        )}
                        {c.email && (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                            ✉️ Email
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
