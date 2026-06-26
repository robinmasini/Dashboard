import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import type { CRMCompany, CRMContact, CRMTemplate, CRMSettings } from '../types/crm'

// Default mock templates
const DEFAULT_TEMPLATES: Omit<CRMTemplate, 'id'>[] = [
  {
    name: 'Relance LinkedIn',
    subject: '',
    body: 'Hello {{first_name}},\n\nJe me permets de te relancer suite à mon précédent message. As-tu eu le temps d\'y jeter un œil concernant le poste de {{role}} chez {{company_name}} ?\n\nBelle journée !'
  },
  {
    name: 'DM LinkedIn - Tech - Reco',
    subject: '',
    body: 'Hello {{first_name}},\n\nJ\'ai vu que tu gérais le recrutement tech pour {{company_name}}. Je suis développeur web full stack junior, spécialisé sur React/Node, et j\'aimerais beaucoup échanger sur vos besoins actuels ou futurs.\n\nEst-ce que tu aurais 5 minutes cette semaine ?\n\nLien vers mon portfolio : robinmasini.com'
  },
  {
    name: 'DM LinkedIn - Tech',
    subject: '',
    body: 'Hello {{first_name}},\n\nJ\'ai repéré l\'offre de {{company_name}} pour un développeur. En tant que développeur web full stack passionné de SaaS, j\'ai développé des projets similaires au vôtre. J\'aimerais beaucoup savoir si le recrutement est toujours ouvert.\n\nBonne journée !'
  },
  {
    name: 'J\'ai vu sur WTTJ',
    subject: '{{first_name}}, une immersion avec votre équipe ?',
    body: 'Bonjour {{first_name}},\n\nJ\'ai vu l\'offre de {{company_name}} sur Welcome to the Jungle concernant la recherche d\'un {{role}}.\n\nJe trouve le projet de votre entreprise incroyable, particulièrement sur le projet {{project_name}}.\n\nJe serais ravi d\'échanger avec vous sur vos challenges techniques et design.\n\nCordialement,\nRobin Masini'
  }
]

// Default mock companies
const DEFAULT_COMPANIES: CRMCompany[] = [
  {
    id: 'c1',
    name: 'Toporder',
    domain: 'FinTech',
    website: 'https://toporder.fr',
    linkedin_url: 'https://linkedin.com/company/toporder',
    wttj_url: 'https://welcometothejungle.com/companies/toporder',
    description: 'Toporder recherche un(e) développeur(se) Mobile sur iOS.',
    project_name: 'Lexona',
    source: 'brightdata'
  },
  {
    id: 'c2',
    name: 'Steamulo',
    domain: 'Agence Digitale',
    website: 'https://steamulo.com',
    linkedin_url: 'https://linkedin.com/company/steamulo',
    wttj_url: 'https://welcometothejungle.com/companies/steamulo',
    description: 'Expérience confirmée en développement mobile, idéalement avec React Native et Flutter.',
    project_name: 'SurgiLink',
    source: 'brightdata'
  },
  {
    id: 'c3',
    name: 'Casper',
    domain: 'E-commerce / D2C',
    website: 'https://casper.com',
    linkedin_url: 'https://linkedin.com/company/casper',
    wttj_url: 'https://welcometothejungle.com/companies/casper',
    description: 'Recherche d\'un UX/UI Designer senior pour la refonte du tunnel d\'achat.',
    project_name: 'Casper',
    source: 'manual'
  }
]

// Default mock contacts
const DEFAULT_CONTACTS: CRMContact[] = [
  {
    id: 'r1',
    company_id: 'c1',
    first_name: 'Marie',
    last_name: 'Dubois',
    email: 'm.dubois@toporder.fr',
    phone: '0612345678',
    role: 'Head of Talent',
    linkedin_url: 'https://linkedin.com/in/marie-dubois-hr',
    status: 'à contacter',
    channel: 'linkedin'
  },
  {
    id: 'r2',
    company_id: 'c1',
    first_name: 'Thomas',
    last_name: 'Martin',
    email: 't.martin@toporder.fr',
    phone: '',
    role: 'Tech Lead Mobile',
    linkedin_url: 'https://linkedin.com/in/thomas-martin-tech',
    status: 'contacté',
    channel: 'email'
  },
  {
    id: 'r3',
    company_id: 'c2',
    first_name: 'Sophie',
    last_name: 'Bernard',
    email: 's.bernard@steamulo.com',
    phone: '',
    role: 'Talent Acquisition',
    linkedin_url: 'https://linkedin.com/in/sophie-bernard-recrutement',
    status: 'à relancer',
    channel: 'linkedin'
  },
  {
    id: 'r4',
    company_id: 'c3',
    first_name: 'Julien',
    last_name: 'Petit',
    email: 'j.petit@casper.com',
    phone: '0687654321',
    role: 'Product Owner',
    linkedin_url: 'https://linkedin.com/in/julien-petit-product',
    status: 'refusé',
    channel: 'whatsapp'
  }
]

export function useCRM() {
  const [companies, setCompanies] = useState<CRMCompany[]>([])
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [templates, setTemplates] = useState<CRMTemplate[]>([])
  const [settings, setSettings] = useState<CRMSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSupabase, setIsSupabase] = useState(false)

  // Initialisation et chargement des données
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 1. Tenter de charger depuis Supabase
      const { error: testError } = await supabase
        .from('crm_companies')
        .select('id')
        .limit(1)

      // Si erreur de type 'relation "crm_companies" does not exist' (code 42P01)
      if (testError && testError.code === 'P0001' || (testError && testError.message?.includes('does not exist'))) {
        throw new Error('Supabase tables missing, using local storage fallback')
      }

      // Si pas d'erreur critique, on charge tout depuis Supabase
      setIsSupabase(true)

      const [companiesRes, contactsRes, templatesRes, settingsRes] = await Promise.all([
        supabase.from('crm_companies').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_templates').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_settings').select('*').limit(1).maybeSingle()
      ])

      if (companiesRes.error) throw companiesRes.error
      if (contactsRes.error) throw contactsRes.error
      if (templatesRes.error) throw templatesRes.error

      setCompanies(companiesRes.data || [])
      setContacts(contactsRes.data || [])

      // Initialiser des templates par défaut si vide dans Supabase
      if (!templatesRes.data || templatesRes.data.length === 0) {
        const insertData = DEFAULT_TEMPLATES.map(t => ({ ...t }))
        const { data: inserted, error: insertErr } = await supabase
          .from('crm_templates')
          .insert(insertData)
          .select()
        if (!insertErr && inserted) {
          setTemplates(inserted)
        } else {
          setTemplates([])
        }
      } else {
        setTemplates(templatesRes.data)
      }

      if (settingsRes.data) {
        setSettings(settingsRes.data)
      } else {
        // Créer les paramètres par défaut
        const { data: newSettings, error: setErr } = await supabase
          .from('crm_settings')
          .insert([{}])
          .select()
          .single()
        if (!setErr && newSettings) {
          setSettings(newSettings)
        }
      }

    } catch (e: any) {
      console.warn('CRM: Falling back to LocalStorage.', e.message)
      setIsSupabase(false)
      
      // Chargement depuis localStorage
      const localComp = localStorage.getItem('crm_companies')
      const localCont = localStorage.getItem('crm_contacts')
      const localTemp = localStorage.getItem('crm_templates')
      const localSett = localStorage.getItem('crm_settings')

      // Seed local s'il n'y a pas de données
      if (!localComp) {
        localStorage.setItem('crm_companies', JSON.stringify(DEFAULT_COMPANIES))
        setCompanies(DEFAULT_COMPANIES)
      } else {
        setCompanies(JSON.parse(localComp))
      }

      if (!localCont) {
        localStorage.setItem('crm_contacts', JSON.stringify(DEFAULT_CONTACTS))
        setContacts(DEFAULT_CONTACTS)
      } else {
        setContacts(JSON.parse(localCont))
      }

      if (!localTemp) {
        const tempsWithIds = DEFAULT_TEMPLATES.map((t, idx) => ({ ...t, id: `t${idx}` }))
        localStorage.setItem('crm_templates', JSON.stringify(tempsWithIds))
        setTemplates(tempsWithIds)
      } else {
        setTemplates(JSON.parse(localTemp))
      }

      if (!localSett) {
        const defaultSettings = { id: 's1', brightdata_api_key: '', brightdata_scraper_id: '', linkedin_cookie: '' }
        localStorage.setItem('crm_settings', JSON.stringify(defaultSettings))
        setSettings(defaultSettings)
      } else {
        setSettings(JSON.parse(localSett))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- CRUD ENTREPRISES ---

  const addCompany = async (company: Omit<CRMCompany, 'id' | 'created_at'>) => {
    if (isSupabase) {
      const { data, error } = await supabase.from('crm_companies').insert([company]).select().single()
      if (error) throw error
      setCompanies(prev => [data, ...prev])
      return data
    } else {
      const newCompany: CRMCompany = {
        ...company,
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString()
      }
      const updated = [newCompany, ...companies]
      localStorage.setItem('crm_companies', JSON.stringify(updated))
      setCompanies(updated)
      return newCompany
    }
  }

  const updateCompany = async (id: string, updates: Partial<CRMCompany>) => {
    if (isSupabase) {
      const { data, error } = await supabase.from('crm_companies').update(updates).eq('id', id).select().single()
      if (error) throw error
      setCompanies(prev => prev.map(c => c.id === id ? data : c))
      return data
    } else {
      const updated = companies.map(c => c.id === id ? { ...c, ...updates } : c)
      localStorage.setItem('crm_companies', JSON.stringify(updated))
      setCompanies(updated)
      return updated.find(c => c.id === id)
    }
  }

  const deleteCompany = async (id: string) => {
    if (isSupabase) {
      const { error } = await supabase.from('crm_companies').delete().eq('id', id)
      if (error) throw error
      setCompanies(prev => prev.filter(c => c.id !== id))
      setContacts(prev => prev.filter(c => c.company_id !== id)) // Cascade deletion locally
    } else {
      const updatedComp = companies.filter(c => c.id !== id)
      const updatedCont = contacts.filter(c => c.company_id !== id)
      localStorage.setItem('crm_companies', JSON.stringify(updatedComp))
      localStorage.setItem('crm_contacts', JSON.stringify(updatedCont))
      setCompanies(updatedComp)
      setContacts(updatedCont)
    }
  }

  // --- CRUD CONTACTS ---

  const addContact = async (contact: Omit<CRMContact, 'id' | 'created_at'>) => {
    if (isSupabase) {
      const { data, error } = await supabase.from('crm_contacts').insert([contact]).select().single()
      if (error) throw error
      setContacts(prev => [data, ...prev])
      return data
    } else {
      const newContact: CRMContact = {
        ...contact,
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString()
      }
      const updated = [newContact, ...contacts]
      localStorage.setItem('crm_contacts', JSON.stringify(updated))
      setContacts(updated)
      return newContact
    }
  }

  const updateContact = async (id: string, updates: Partial<CRMContact>) => {
    if (isSupabase) {
      const { data, error } = await supabase.from('crm_contacts').update(updates).eq('id', id).select().single()
      if (error) throw error
      setContacts(prev => prev.map(c => c.id === id ? data : c))
      return data
    } else {
      const updated = contacts.map(c => c.id === id ? { ...c, ...updates } : c)
      localStorage.setItem('crm_contacts', JSON.stringify(updated))
      setContacts(updated)
      return updated.find(c => c.id === id)
    }
  }

  const deleteContact = async (id: string) => {
    if (isSupabase) {
      const { error } = await supabase.from('crm_contacts').delete().eq('id', id)
      if (error) throw error
      setContacts(prev => prev.filter(c => c.id !== id))
    } else {
      const updated = contacts.filter(c => c.id !== id)
      localStorage.setItem('crm_contacts', JSON.stringify(updated))
      setContacts(updated)
    }
  }

  // --- CRUD TEMPLATES ---

  const addTemplate = async (template: Omit<CRMTemplate, 'id' | 'created_at'>) => {
    if (isSupabase) {
      const { data, error } = await supabase.from('crm_templates').insert([template]).select().single()
      if (error) throw error
      setTemplates(prev => [data, ...prev])
      return data
    } else {
      const newTemplate: CRMTemplate = {
        ...template,
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString()
      }
      const updated = [newTemplate, ...templates]
      localStorage.setItem('crm_templates', JSON.stringify(updated))
      setTemplates(updated)
      return newTemplate
    }
  }

  const updateTemplate = async (id: string, updates: Partial<CRMTemplate>) => {
    if (isSupabase) {
      const { data, error } = await supabase.from('crm_templates').update(updates).eq('id', id).select().single()
      if (error) throw error
      setTemplates(prev => prev.map(t => t.id === id ? data : t))
      return data
    } else {
      const updated = templates.map(t => t.id === id ? { ...t, ...updates } : t)
      localStorage.setItem('crm_templates', JSON.stringify(updated))
      setTemplates(updated)
      return updated.find(t => t.id === id)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (isSupabase) {
      const { error } = await supabase.from('crm_templates').delete().eq('id', id)
      if (error) throw error
      setTemplates(prev => prev.filter(t => t.id !== id))
    } else {
      const updated = templates.filter(t => t.id !== id)
      localStorage.setItem('crm_templates', JSON.stringify(updated))
      setTemplates(updated)
    }
  }

  // --- SETTINGS ---

  const updateSettings = async (updates: Partial<CRMSettings>) => {
    if (isSupabase && settings?.id) {
      const { data, error } = await supabase.from('crm_settings').update(updates).eq('id', settings.id).select().single()
      if (error) throw error
      setSettings(data)
      return data
    } else {
      const updated = { ...(settings || {}), ...updates, updated_at: new Date().toISOString() }
      localStorage.setItem('crm_settings', JSON.stringify(updated))
      setSettings(updated)
      return updated
    }
  }

  // --- IMPORT / EXPORT JSON ---

  const exportToJSON = () => {
    const data = {
      companies,
      contacts,
      templates
    }
    return JSON.stringify(data, null, 2)
  }

  const importFromJSON = async (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData)
      if (!parsed.companies || !parsed.contacts) {
        throw new Error('Format JSON invalide. Doit contenir "companies" et "contacts".')
      }

      if (isSupabase) {
        // En Supabase, on insère un par un ou en lot
        // Vider d'abord ? Non, on ajoute les nouveaux pour ne rien perdre
        // Pour simplifier et éviter les violations de clés étrangères, on mappe les anciens IDs vers de nouveaux IDs
        const idMap: Record<string, string> = {}

        // Importer les entreprises
        for (const comp of parsed.companies) {
          const { id: oldId, created_at, ...cleanComp } = comp
          const { data: newComp, error: err } = await supabase.from('crm_companies').insert([cleanComp]).select().single()
          if (!err && newComp) {
            idMap[oldId] = newComp.id
          }
        }

        // Importer les contacts
        const cleanContacts = parsed.contacts
          .filter((cont: any) => idMap[cont.company_id])
          .map((cont: any) => {
            const { id, created_at, ...cleanCont } = cont
            return {
              ...cleanCont,
              company_id: idMap[cont.company_id]
            }
          })

        if (cleanContacts.length > 0) {
          const { error: err } = await supabase.from('crm_contacts').insert(cleanContacts)
          if (err) throw err
        }

        // Importer les templates
        if (parsed.templates && parsed.templates.length > 0) {
          const cleanTemps = parsed.templates.map((temp: any) => {
            const { id, created_at, ...cleanTemp } = temp
            return cleanTemp
          })
          await supabase.from('crm_templates').insert(cleanTemps)
        }

        // Recharger tout
        await loadData()
      } else {
        // En mode localStorage
        const idMap: Record<string, string> = {}
        
        const newCompanies = parsed.companies.map((comp: any) => {
          const newId = Math.random().toString(36).substring(2, 9)
          idMap[comp.id] = newId
          return {
            ...comp,
            id: newId,
            created_at: new Date().toISOString()
          }
        })

        const newContacts = parsed.contacts
          .map((cont: any) => ({
            ...cont,
            id: Math.random().toString(36).substring(2, 9),
            company_id: idMap[cont.company_id] || cont.company_id,
            created_at: new Date().toISOString()
          }))

        const combinedCompanies = [...newCompanies, ...companies]
        const combinedContacts = [...newContacts, ...contacts]

        localStorage.setItem('crm_companies', JSON.stringify(combinedCompanies))
        localStorage.setItem('crm_contacts', JSON.stringify(combinedContacts))

        setCompanies(combinedCompanies)
        setContacts(combinedContacts)

        if (parsed.templates) {
          const newTemps = parsed.templates.map((t: any) => ({
            ...t,
            id: Math.random().toString(36).substring(2, 9),
            created_at: new Date().toISOString()
          }))
          const combinedTemps = [...newTemps, ...templates]
          localStorage.setItem('crm_templates', JSON.stringify(combinedTemps))
          setTemplates(combinedTemps)
        }
      }
      return true
    } catch (e: any) {
      console.error('Import JSON Error:', e)
      throw e
    }
  }

  // Permet de forcer une ré-initialisation complète avec données de seed
  const resetToSeed = () => {
    localStorage.removeItem('crm_companies')
    localStorage.removeItem('crm_contacts')
    localStorage.removeItem('crm_templates')
    localStorage.removeItem('crm_settings')
    loadData()
  }

  return {
    companies,
    contacts,
    templates,
    settings,
    loading,
    error,
    isSupabase,
    addCompany,
    updateCompany,
    deleteCompany,
    addContact,
    updateContact,
    deleteContact,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    updateSettings,
    exportToJSON,
    importFromJSON,
    resetToSeed,
    refetch: loadData
  }
}
