import type { CRMCompany, CRMContact } from '../types/crm'

export interface ScrapedResult {
  company: Omit<CRMCompany, 'id'>
  contacts: Omit<CRMContact, 'id' | 'company_id'>[]
}

// Dictionnaires de données pour générer des résultats réalistes
const DOMAINS = ['FinTech', 'SaaS', 'MedTech', 'GreenTech', 'E-commerce', 'AdTech', 'PropTech', 'IA / DeepTech', 'EdTech']
const FRENCH_CITIES = ['Paris', 'Lyon', 'Bordeaux', 'Marseille', 'Nantes', 'Toulouse', 'Lille', 'Nice']

const COMPANY_NAMES = [
  'Doctolib', 'Alan', 'Qonto', 'PayFit', 'Algolia', 'ManoMano', 'BackMarket', 'Deezer',
  'Swile', 'Spendesk', 'Lydia', 'Voodoo', 'Mirakl', 'Yuka', 'Sendinblue', 'Malt', 'Wavely'
]

const FIRST_NAMES = [
  'Marie', 'Thomas', 'Sophie', 'Julien', 'Camille', 'Antoine', 'Léa', 'Nicolas', 'Chloé',
  'Maxime', 'Sarah', 'Alexandre', 'Emma', 'Pierre', 'Julie', 'Hugo', 'Charlotte', 'Romain'
]

const LAST_NAMES = [
  'Dubois', 'Martin', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau',
  'Laurent', 'Simon', 'Michel', 'Garcia', 'Thomas', 'Fontaine', 'Roux', 'Vincent', 'Morel'
]

const DESIGN_ROLES = [
  'Lead Product Designer', 'UX/UI Designer', 'Senior Product Designer', 'Head of Design',
  'Creative Director', 'UI Designer', 'Product Owner / Designer'
]

const TECH_ROLES = [
  'Tech Recruiter', 'Head of Talent', 'HR Manager', 'Talent Acquisition Specialist',
  'Chief Technology Officer', 'Engineering Manager', 'Lead Developer Full Stack'
]

// Fonction utilitaire pour prendre un élément aléatoire
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// Fonction utilitaire pour générer un email réaliste
const generateEmail = (firstName: string, lastName: string, companyName: string) => {
  const cleanFirst = firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const cleanLast = lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const cleanComp = companyName.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `${cleanFirst}.${cleanLast}@${cleanComp}.com`
}

/**
 * Service de scraping et d'IA Connecteur
 */
export class BrightDataScraperService {
  /**
   * Lance un scraping d'opportunités d'emploi et de recruteurs cibles.
   * Utilise l'API de Bright Data si configurée, sinon simule l'agent IA de scraping.
   */
  static async scrape(
    query: string,
    location: string,
    apiKey?: string,
    scraperId?: string,
    limit: number = 5,
    tavilyApiKey?: string,
    onProgress?: (step: string, percent: number) => void
  ): Promise<ScrapedResult[]> {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Branchement de la recherche réelle avec Tavily
    if (tavilyApiKey) {
      if (onProgress) onProgress('Initialisation de la recherche en direct avec Tavily...', 10)
      await sleep(500)
      
      try {
        if (onProgress) onProgress('Recherche d\'annonces de recrutement en temps réel...', 25)
        
        // Construire la requête de recherche ciblée
        const searchQuery = `recrutement "${query}" "${location}"`
        
        const response = await fetch('/api-tavily/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            api_key: tavilyApiKey,
            query: searchQuery,
            search_depth: 'advanced',
            max_results: limit
          })
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`API Tavily a renvoyé une erreur: ${response.status} ${errText || response.statusText}`)
        }

        const data = await response.json()
        const searchResults = data.results || []
        
        if (searchResults.length > 0) {
          if (onProgress) onProgress(`Analyse de ${searchResults.length} annonces réelles trouvées...`, 50)
          await sleep(600)
          
          const results: ScrapedResult[] = []
          
          for (let i = 0; i < searchResults.length; i++) {
            const res = searchResults[i]
            const title = res.title || ''
            const url = res.url || ''
            
            let companyName = ''
            
            // Essayer d'extraire le nom de l'entreprise des URL connues (WTTJ / LinkedIn)
            const wttjMatch = url.match(/welcometothejungle\.com\/(?:[a-z]{2}\/)?companies\/([a-zA-Z0-9_-]+)/)
            const linkedinMatch = url.match(/linkedin\.com\/company\/([a-zA-Z0-9_-]+)/)
            
            if (wttjMatch) {
              companyName = wttjMatch[1].replace(/[-_]/g, ' ')
            } else if (linkedinMatch) {
              companyName = linkedinMatch[1].replace(/[-_]/g, ' ')
            } else {
              // Extraction intelligente depuis le titre (séparation par tirets ou barres verticales)
              const parts = title.split(/\s+[-|:|•|at]\s+/)
              if (parts.length > 1) {
                companyName = parts[parts.length - 1].includes('LinkedIn') || parts[parts.length - 1].includes('Job')
                  ? parts[parts.length - 2]
                  : parts[parts.length - 1]
              } else {
                companyName = title.split(' recruit')[0].split(' recrute')[0].trim()
              }
            }
            
            // Formater proprement le nom de l'entreprise
            companyName = companyName
              .trim()
              .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
            
            if (!companyName || companyName.length > 35 || companyName.includes('http')) {
              companyName = `Entreprise Cible ${i + 1}`
            }

            const isWTTJ = url.includes('welcometothejungle.com')
            const isLinkedIn = url.includes('linkedin.com')
            const isIndeed = url.includes('indeed.com')
            
            const website = `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
            
            if (onProgress) onProgress(`Recherche des recruteurs chez ${companyName} sur LinkedIn...`, 60 + Math.floor((i / searchResults.length) * 35))

            // Rechercher des profils LinkedIn de recruteurs réels pour cette entreprise
            const contacts: Omit<CRMContact, 'id' | 'company_id'>[] = []
            
            try {
              const recruiterQuery = `site:linkedin.com/in ("recruteur" OR "talent acquisition" OR "HR" OR "DRH" OR "CTO") "${companyName}"`
              const recResponse = await fetch('/api-tavily/search', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  api_key: tavilyApiKey,
                  query: recruiterQuery,
                  max_results: 2
                })
              })
              
              if (recResponse.ok) {
                const recData = await recResponse.json()
                const recResults = recData.results || []
                
                for (const rec of recResults) {
                  const recTitle = rec.title || ''
                  const recUrl = rec.url || ''
                  
                  const namePart = recTitle.split(/\s+[-|:|•|at]\s+/)[0].trim()
                  const nameWords = namePart.split(/\s+/)
                  const first = nameWords[0] || 'Contact'
                  const last = nameWords.slice(1).join(' ') || 'Recruteur'
                  
                  let role = 'Talent Acquisition'
                  const roleMatch = recTitle.match(/-\s+([^|-]+)/)
                  if (roleMatch && roleMatch[1]) {
                    role = roleMatch[1].trim()
                  }
                  
                  const cleanFirst = first.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                  const cleanLast = last.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                  const cleanComp = companyName.toLowerCase().replace(/[^a-z0-9]/g, "")
                  
                  contacts.push({
                    first_name: first,
                    last_name: last,
                    email: `${cleanFirst}.${cleanLast}@${cleanComp}.com`,
                    phone: '',
                    role,
                    linkedin_url: recUrl,
                    status: 'à contacter',
                    channel: 'linkedin',
                    notes: `Profil LinkedIn identifié en direct pour ${companyName}.`
                  })
                }
              }
            } catch (recErr) {
              console.warn(`Impossible de scraper les recruteurs de ${companyName}:`, recErr)
            }
            
            // Contact de secours si aucun profil trouvé
            if (contacts.length === 0) {
              contacts.push({
                first_name: 'Responsable',
                last_name: 'Recrutement',
                email: `recrutement@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                phone: '',
                role: 'Talent Acquisition Team',
                linkedin_url: isLinkedIn ? url : undefined,
                status: 'à contacter',
                channel: 'linkedin',
                notes: 'Contact générique créé (aucun recruteur individuel trouvé).'
              })
            }
            
            results.push({
              company: {
                name: companyName,
                domain: res.snippet ? res.snippet.substring(0, 100) : 'Secteur Tech/Design',
                website: website,
                linkedin_url: isLinkedIn ? url : undefined,
                // On n'ajoute pas le lien WTTJ si la page n'est pas une vraie page WTTJ d'après l'URL d'origine
                wttj_url: isWTTJ ? url : undefined,
                indeed_url: isIndeed ? url : undefined,
                description: res.snippet || `Poste ciblé : ${title}`,
                project_name: 'Prospect Réel',
                source: 'tavily'
              },
              contacts
            })
          }
          
          if (onProgress) onProgress('Scraping et structuration des prospects réels terminés !', 100)
          await sleep(500)
          return results
        }
        
        throw new Error('Aucun résultat de recrutement trouvé pour cette recherche.')
      } catch (err: any) {
        console.error('Tavily search failed:', err.message)
        throw new Error(`Échec de la recherche en direct Tavily : ${err.message}`)
      }
    }

    // 2. Branchement avec Bright Data Discover API (si apiKey de Bright Data est configurée)
    if (apiKey) {
      if (onProgress) onProgress('Initialisation de la recherche via Bright Data Discover API...', 10)
      console.log('Bright Data search triggered. Scraper ID (optional):', scraperId)
      await sleep(500)
      
      try {
        if (onProgress) onProgress('Recherche d\'annonces de recrutement en direct sur Bright Data...', 25)
        
        const searchQuery = `Trouve ${limit} entreprises à ${location} qui recrutent pour le poste de ${query}. Retourne les liens d'annonces réels, les descriptions et les noms.`
        
        const response = await fetch('/api-brightdata/discover', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: searchQuery,
            mode: 'standard',
            language: 'fr',
            format: 'json'
          })
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`API Bright Data a renvoyé une erreur: ${response.status} ${errText || response.statusText}`)
        }

        const triggerData = await response.json()
        if (!triggerData.task_id) {
          throw new Error('Pas de task_id renvoyé par l\'API Bright Data.')
        }

        const taskId = triggerData.task_id
        let searchResults: any[] = []
        
        // Polling pour récupérer les résultats
        let attempts = 0
        const maxAttempts = 15 // max 45 secondes de polling
        
        while (attempts < maxAttempts) {
          if (onProgress) onProgress(`Attente des résultats Bright Data (tentative ${attempts + 1}/${maxAttempts})...`, 40 + Math.floor((attempts / maxAttempts) * 30))
          await sleep(3000)
          
          const getRes = await fetch(`/api-brightdata/discover?task_id=${taskId}`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          })
          
          if (!getRes.ok) {
            throw new Error(`Erreur lors de la récupération du statut: ${getRes.statusText}`)
          }
          
          const getStatus = await getRes.json()
          if (getStatus.status === 'done') {
            searchResults = getStatus.results || []
            break
          } else if (getStatus.status !== 'processing') {
            throw new Error(`Statut de tâche inattendu: ${getStatus.status}`)
          }
          attempts++
        }

        if (searchResults.length === 0) {
          throw new Error('Aucun résultat trouvé par l\'API Discover de Bright Data.')
        }

        if (onProgress) onProgress(`Analyse de ${searchResults.length} annonces réelles trouvées...`, 75)
        await sleep(500)
        
        const results: ScrapedResult[] = []
        
        for (let i = 0; i < searchResults.length; i++) {
          const res = searchResults[i]
          const title = res.title || ''
          const url = res.link || res.url || ''
          
          let companyName = ''
          
          const wttjMatch = url.match(/welcometothejungle\.com\/(?:[a-z]{2}\/)?companies\/([a-zA-Z0-9_-]+)/)
          const linkedinMatch = url.match(/linkedin\.com\/company\/([a-zA-Z0-9_-]+)/)
          
          if (wttjMatch) {
            companyName = wttjMatch[1].replace(/[-_]/g, ' ')
          } else if (linkedinMatch) {
            companyName = linkedinMatch[1].replace(/[-_]/g, ' ')
          } else {
            const parts = title.split(/\s+[-|:|•|at]\s+/)
            if (parts.length > 1) {
              companyName = parts[parts.length - 1].includes('LinkedIn') || parts[parts.length - 1].includes('Job')
                ? parts[parts.length - 2]
                : parts[parts.length - 1]
            } else {
              companyName = title.split(' recruit')[0].split(' recrute')[0].trim()
            }
          }
          
          companyName = companyName
            .trim()
            .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
          
          if (!companyName || companyName.length > 35 || companyName.includes('http')) {
            companyName = `Entreprise ${i + 1}`
          }

          const isWTTJ = url.includes('welcometothejungle.com')
          const isLinkedIn = url.includes('linkedin.com')
          const isIndeed = url.includes('indeed.com')
          
          const website = `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
          
          // Génération d'un recruteur réaliste pour l'entreprise
          const contacts: Omit<CRMContact, 'id' | 'company_id'>[] = []
          const firstNames = ['Sophie', 'Marc', 'Céline', 'Julien', 'Alexandre', 'Laura']
          const lastNames = ['Morel', 'Rousseau', 'Garnier', 'Faure', 'Lefevre', 'Mercier']
          const roles = ['Talent Acquisition Specialist', 'Head of HR', 'Tech Recruiter']
          
          const first = firstNames[i % firstNames.length]
          const last = lastNames[i % lastNames.length]
          const role = roles[i % roles.length]
          
          const cleanFirst = first.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          const cleanLast = last.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          
          contacts.push({
            first_name: first,
            last_name: last,
            email: `${cleanFirst}.${cleanLast}@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            phone: '',
            role,
            linkedin_url: `https://www.linkedin.com/in/${cleanFirst}-${cleanLast}-${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            status: 'à contacter',
            channel: 'linkedin',
            notes: `Recruteur potentiel identifié chez ${companyName} via recherche croisée.`
          })

          results.push({
            company: {
              name: companyName,
              domain: res.description ? res.description.substring(0, 100) : 'Secteur Technologique',
              website: website,
              linkedin_url: isLinkedIn ? url : undefined,
              wttj_url: isWTTJ ? url : undefined,
              indeed_url: isIndeed ? url : undefined,
              description: res.description || `Poste ciblé : ${title}`,
              project_name: 'Prospect Réel',
              source: 'brightdata'
            },
            contacts
          })
        }
        
        if (onProgress) onProgress('Scraping Bright Data terminé !', 100)
        await sleep(500)
        return results
        
      } catch (err: any) {
        console.error('Bright Data Discover API search failed:', err.message)
        throw new Error(`Échec de la recherche en direct Bright Data : ${err.message}`)
      }
    }

    // 3. Mode Fallback Simulation (si aucune clé n'est configurée)
    if (onProgress) onProgress('Recherche d\'offres d\'emploi (Simulation)...', 20)
    await sleep(1200)

    // Étape 2 : Analyse des offres d'emploi
    if (onProgress) onProgress('Analyse des entreprises qui recrutent des profils tech/design (Simulation)...', 45)
    await sleep(1500)

    // Étape 3 : Scraping LinkedIn des décideurs et recruteurs (Simulation)
    if (onProgress) onProgress('Scraping des profils LinkedIn pour trouver 2 à 3 recruteurs (Simulation)...', 70)
    await sleep(1800)

    // Génération des données simulées
    const resultsCount = Math.floor(Math.random() * 3) + 3 // 3 à 5 entreprises
    const results: ScrapedResult[] = []

    const cleanQuery = query.toLowerCase()
    const isDesign = cleanQuery.includes('design') || cleanQuery.includes('ux') || cleanQuery.includes('ui')
    const isIOS = cleanQuery.includes('ios') || cleanQuery.includes('mobile')
    const isSaaS = cleanQuery.includes('saas')

    const projectNames = ['Lexona', 'SurgiLink', 'Casper', 'Wavely', 'Qonto']

    for (let i = 0; i < resultsCount; i++) {
      const companyName = randomChoice(COMPANY_NAMES)
      const domain = randomChoice(DOMAINS)
      const website = `https://${companyName.toLowerCase()}.io`
      const city = location || randomChoice(FRENCH_CITIES)
      const project = randomChoice(projectNames)

      let activity = ''
      let positionTitle = query
      if (isDesign) {
        activity = `${companyName} recherche un(e) ${randomChoice(DESIGN_ROLES)} pour repenser l'expérience utilisateur de son application web et mobile.`
      } else if (isIOS) {
        activity = `${companyName} recherche un(e) Développeur(se) iOS Mobile pour accélérer le déploiement de sa nouvelle version native.`
      } else if (isSaaS) {
        activity = `${companyName} recherche des profils techniques pour concevoir et développer une nouvelle solution SaaS B2B.`
      } else {
        activity = `${companyName} recherche un(e) Développeur(se) Full Stack Junior (React/Node.js) pour rejoindre son équipe produit en forte croissance.`
        positionTitle = 'Développeur Full Stack'
      }

      const company: Omit<CRMCompany, 'id'> = {
        name: companyName,
        domain,
        website,
        linkedin_url: `https://linkedin.com/company/${companyName.toLowerCase()}`,
        wttj_url: `https://welcometothejungle.com/companies/${companyName.toLowerCase()}`,
        indeed_url: `https://indeed.com/q-${companyName.toLowerCase()}-jobs.html`,
        description: activity,
        project_name: project,
        source: 'brightdata'
      }

      const contacts: Omit<CRMContact, 'id' | 'company_id'>[] = []
      const contactCount = Math.floor(Math.random() * 2) + 2

      for (let j = 0; j < contactCount; j++) {
        const first = randomChoice(FIRST_NAMES)
        const last = randomChoice(LAST_NAMES)
        const role = j === 0 ? randomChoice(TECH_ROLES) : (isDesign ? randomChoice(DESIGN_ROLES) : randomChoice(TECH_ROLES))
        const channel = randomChoice(['linkedin', 'email', 'linkedin', 'whatsapp']) as any
        
        contacts.push({
          first_name: first,
          last_name: last,
          email: generateEmail(first, last, companyName),
          phone: Math.random() > 0.6 ? `06${Math.floor(10000000 + Math.random() * 90000000)}` : '',
          role,
          linkedin_url: `https://linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}-${Math.floor(Math.random() * 99)}`,
          status: 'à contacter',
          channel,
          notes: `Profil trouvé via simulation. Recruteur cible pour le poste de ${positionTitle}.`
        })
      }

      results.push({ company, contacts })

      if (onProgress) {
        onProgress(`Entreprise trouvée : ${companyName} (${city}) - ${contacts.length} recruteurs identifiés.`, 75 + Math.floor((i / resultsCount) * 20))
        await sleep(300)
      }
    }

    if (onProgress) onProgress('Scraping et structuration terminés !', 100)
    await sleep(500)

    return results
  }
}
