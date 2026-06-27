import { useState, useEffect } from 'react'
import { useCRM } from '../../../shared/hooks/useCRM'
import '../../../App.css'

export default function CRMSettings() {
  const { settings, updateSettings, isSupabase, resetToSeed } = useCRM()
  
  // États locaux des formulaires
  const [apiKey, setApiKey] = useState('')
  const [scraperId, setScraperId] = useState('')
  const [linkedinCookie, setLinkedinCookie] = useState('')
  const [tavilyApiKey, setTavilyApiKey] = useState('')

  // Charger les valeurs quand les paramètres sont prêts
  useEffect(() => {
    if (settings) {
      setApiKey(settings.brightdata_api_key || '')
      setScraperId(settings.brightdata_scraper_id || '')
      setLinkedinCookie(settings.linkedin_cookie || '')
      setTavilyApiKey(settings.tavily_api_key || '')
    }
  }, [settings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateSettings({
        brightdata_api_key: apiKey,
        brightdata_scraper_id: scraperId,
        linkedin_cookie: linkedinCookie,
        tavily_api_key: tavilyApiKey
      })
      alert('✅ Paramètres enregistrés avec succès !')
    } catch (err: any) {
      alert(`Erreur d'enregistrement : ${err.message}`)
    }
  }

  const handleResetData = () => {
    if (confirm('Voulez-vous réinitialiser toutes les données du CRM (Entreprises, Contacts, Templates) avec les données de démonstration ? Toutes vos modifications actuelles seront écrasées.')) {
      resetToSeed()
      alert('CRM réinitialisé avec succès !')
    }
  }

  // Le script SQL pour copier coller
  const sqlSchemaCode = `-- CRM SQL Migration
CREATE TABLE crm_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    website TEXT,
    linkedin_url TEXT,
    wttj_url TEXT,
    indeed_url TEXT,
    description TEXT,
    project_name TEXT,
    source TEXT DEFAULT 'brightdata'
);

CREATE TABLE crm_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    company_id UUID REFERENCES crm_companies(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    linkedin_url TEXT,
    status TEXT CHECK (status IN ('à contacter', 'contacté', 'à relancer', 'relancé', 'accepté', 'refusé')) DEFAULT 'à contacter',
    channel TEXT CHECK (channel IN ('email', 'whatsapp', 'linkedin', 'welcometothejungle', 'indeed')) DEFAULT 'linkedin',
    notes TEXT
);`;

  return (
    <div className="workspace__content">
      {/* Header */}
      <div className="section-header">
        <div className="section-header__tabs">
          <p className="section-header__label">Personal CRM</p>
          <h1 style={{ margin: '8px 0', fontSize: '2rem', fontWeight: 700 }}>Paramètres & Configuration</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Paramètres API (Gauche) */}
        <div className="panel" style={{ padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
            🔑 Clés d'API & Scraping
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Configurez vos connecteurs Bright Data et LinkedIn pour automatiser la recherche d'offres et l'extraction de profils de recruteurs cibles.
          </p>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="modal-field">
              <span>Clé d'API Tavily (Recherche IA en direct)</span>
              <input
                type="password"
                value={tavilyApiKey}
                onChange={e => setTavilyApiKey(e.target.value)}
                placeholder="tvly-abcdef..."
              />
            </div>

            <div className="modal-field">
              <span>Clé d'API Bright Data (https://brightdata.fr)</span>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Insérez votre jeton API Bright Data"
              />
            </div>

            <div className="modal-field">
              <span>ID de Scraper (Web Scraper Collector)</span>
              <input
                type="text"
                value={scraperId}
                onChange={e => setScraperId(e.target.value)}
                placeholder="Ex: col_abcdef123"
              />
            </div>

            <div className="modal-field">
              <span>LinkedIn Session Cookie (li_at)</span>
              <input
                type="password"
                value={linkedinCookie}
                onChange={e => setLinkedinCookie(e.target.value)}
                placeholder="Cookie li_at pour le scraping LinkedIn direct"
              />
            </div>

            <button
              type="submit"
              className="primary-button"
              style={{
                alignSelf: 'flex-start',
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                borderRadius: '10px',
                marginTop: '8px'
              }}
            >
              Enregistrer les clés
            </button>
          </form>

          {/* Seed/Reset section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '32px', paddingTop: '24px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600, color: '#f87171' }}>Zone de danger</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Vous pouvez réinitialiser le CRM avec des prospects et templates par défaut.
            </p>
            <button
              type="button"
              onClick={handleResetData}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Réinitialiser les données CRM
            </button>
          </div>
        </div>

        {/* Supabase & SQL (Droite) */}
        <div className="panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
            💾 Statut Base de Données
          </h3>
          
          {/* Status badge */}
          <div 
            style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              background: isSupabase ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: isSupabase ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{isSupabase ? '🟢' : '🟡'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSupabase ? '#34d399' : '#fbbf24' }}>
                {isSupabase ? 'Synchronisé avec Supabase' : 'Mode Fallback LocalStorage'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {isSupabase 
                  ? 'Vos données sont stockées et synchronisées en temps réel sur votre base Supabase.'
                  : 'Les tables du CRM ne sont pas détectées dans Supabase. Les données sont conservées localement dans votre navigateur.'}
              </div>
            </div>
          </div>

          {/* Tavily status badge */}
          <div 
            style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              background: settings?.tavily_api_key ? 'rgba(99, 102, 241, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: settings?.tavily_api_key ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{settings?.tavily_api_key ? '⚡' : '⚠️'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: settings?.tavily_api_key ? '#a5b4fc' : '#fbbf24' }}>
                {settings?.tavily_api_key ? 'Recherche en direct Tavily Activée' : 'Recherche en direct Désactivée'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {settings?.tavily_api_key 
                  ? 'Le CRM recherche de vraies annonces et profils LinkedIn sur le web en temps réel.'
                  : 'Configurez votre clé Tavily pour connecter la recherche de prospects réels.'}
              </div>
            </div>
          </div>

          {!isSupabase && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                Pour activer la synchronisation Supabase :
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Copiez et exécutez le script SQL ci-dessous dans l'onglet <strong>SQL Editor</strong> de votre console Supabase :
              </p>
              <pre
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '16px',
                  borderRadius: '10px',
                  color: '#34d399',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  margin: 0
                }}
              >
                {sqlSchemaCode}
              </pre>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
