export type DashboardNavKey =
  | 'performance'
  | 'commandes'
  | 'timeTracking'
  | 'planning'
  | 'clients'

export type TrendDirection = 'up' | 'down' | 'neutral'

export type FloatingStat = {
  label: string
  value: string
  trendLabel?: string
  trendDirection?: TrendDirection
  icon?: string
}

export type SectionTab = {
  id: string
  label: string
  status: 'live' | 'soon'
  ctaLabel?: string
  soonMessage?: string
}

export type SectionConfig = {
  label: string
  icon: string
  tabs: SectionTab[]
  defaultTab: string
  ctaFallback: string
  floatingStats: FloatingStat[]
  floatingStatsByTab?: Record<string, FloatingStat[]>
}

export const navConfig: Record<DashboardNavKey, SectionConfig> = {
  performance: {
    label: 'Performance',
    icon: 'pulse',
    defaultTab: 'overview',
    ctaFallback: 'Signaler une transaction',
    tabs: [
      { id: 'overview', label: 'Vue d\'ensemble', status: 'live' },
      {
        id: 'forecast',
        label: 'Prévisionnel',
        status: 'soon',
        soonMessage:
          'Les prévisions seront alimentées par vos transactions Shine et vos scénarios Notion.',
      },
      {
        id: 'sustainability',
        label: 'Pérénité',
        status: 'soon',
        soonMessage:
          'Le suivi de pérénité consolidera trésorerie, récurrence clients et marge par offre.',
      },
    ],
    floatingStats: [
      {
        label: "Bénéfice généré aujourd'hui",
        value: '0,00€',
        trendLabel: 'En attente',
        trendDirection: 'neutral',
      },
      {
        label: 'Tarif journalier de référence',
        value: '323,75€',
        trendLabel: 'Jeudi Digital Radicalz',
        trendDirection: 'up',
      },
      { label: 'Nouveaux clients', value: '+1', trendLabel: 'Digital Radicalz', trendDirection: 'up' },
      { label: 'Bénéfice cette semaine', value: '0,00€', trendLabel: 'En attente', trendDirection: 'neutral' },
    ],
  },
  commandes: {
    label: 'Commandes',
    icon: 'tag',
    defaultTab: 'tickets',
    ctaFallback: 'Ajouter un ticket',
    tabs: [
      { id: 'tickets', label: 'Tickets', status: 'live', ctaLabel: 'Ajouter un ticket' },
      { id: 'quotes', label: 'Devis', status: 'live', ctaLabel: 'Ajouter un devis' },
      {
        id: 'invoicing',
        label: 'Facturation',
        status: 'soon',
        ctaLabel: 'Ajouter une facture',
        soonMessage:
          'Connectez Shine pour générer vos factures depuis les éléments déjà validés.',
      },
    ],
    floatingStats: [],
    floatingStatsByTab: {
      tickets: [
        { label: 'Tickets enregistrés', value: '1', trendLabel: 'Digital Radicalz', trendDirection: 'up' },
        { label: 'Tickets en cours', value: '1', trendLabel: 'Projet actif', trendDirection: 'up' },
      ],
      quotes: [
        { label: 'Devis signés (30j)', value: '1', trendLabel: 'Digital Radicalz', trendDirection: 'up' },
        { label: 'Nouveau devis en attente', value: '3 120€', trendLabel: 'Digital Radicalz', trendDirection: 'up' },
        { label: 'Montant en attente', value: '1 040€', trendLabel: 'À facturer', trendDirection: 'neutral' },
      ],
      invoicing: [
        { label: 'Factures à émettre', value: '1', trendLabel: '1 040€ Digital Radicalz', trendDirection: 'neutral' },
      ],
    },
  },
  timeTracking: {
    label: 'Time tracking',
    icon: 'timer',
    defaultTab: 'daily',
    ctaFallback: 'Ajouter un événement',
    tabs: [
      { id: 'daily', label: 'Bilan quotidien', status: 'live' },
      {
        id: 'evolution',
        label: 'Évolution',
        status: 'soon',
        soonMessage: 'Bientôt : tendances multi-semaines et seuils personnalisés.',
      },
    ],
    floatingStats: [
      { label: 'Bénéfice généré', value: '0,00€', trendLabel: 'En attente', trendDirection: 'neutral' },
      { label: 'TJM de la journée', value: '323,75€', trendLabel: 'Jeudi Digital Radicalz', trendDirection: 'up' },
      { label: 'Nouveaux clients', value: '+1', trendLabel: 'Digital Radicalz', trendDirection: 'up' },
    ],
  },
  planning: {
    label: 'Planning',
    icon: 'calendar',
    defaultTab: 'todo',
    ctaFallback: 'Ajouter une tâche',
    tabs: [
      { id: 'todo', label: 'To Do List', status: 'live', ctaLabel: 'Ajouter une tâche' },
      {
        id: 'agenda',
        label: 'Agenda',
        status: 'soon',
        soonMessage:
          "L'agenda sera synchronisé avec vos créneaux Google Calendar et vos sprints Notion.",
      },
    ],
    floatingStats: [
      { label: 'Rush en cours', value: 'Sprint DR', trendLabel: 'Focus', trendDirection: 'neutral' },
      { label: 'Cartes ouvertes', value: '7', trendLabel: '3 urgentes', trendDirection: 'up' },
    ],
  },
  clients: {
    label: 'Clients',
    icon: 'users',
    defaultTab: 'portfolio',
    ctaFallback: 'Ajouter un client',
    tabs: [
      { id: 'portfolio', label: 'Gestion de clients', status: 'live', ctaLabel: 'Ajouter un client' },
    ],
    floatingStats: [
      { label: 'Bénéfice généré', value: '0,00€', trendLabel: 'En attente', trendDirection: 'neutral' },
      { label: 'Nouveaux clients 30j', value: '+1', trendLabel: 'Digital Radicalz', trendDirection: 'up' },
      { label: 'Clients actifs', value: '1', trendLabel: 'Digital Radicalz', trendDirection: 'up' },
    ],
  },
}

export const walletSummary = {
  amount: '+440,00€',
  objective: 'En attente de paiement',
  provider: 'SHINE',
}

export const satisfactionGauge = {
  value: '99,9%',
  label: 'Reviews',
  baseline: 'Tous projets confondus',
}

export type ShineTransaction = {
  id: string
  date: string // Format YYYY-MM-DD
  amount: number // En euros
  source: string
  notes?: string
}

export const salesTrend = {
  label: 'Ventes (+5% vs Septembre 2025)',
  monthlyValues: [320, 410, 360, 420, 480, 510, 460, 530, 610, 580, 640, 700],
}

export const clientsTrend = {
  label: 'Clients actifs',
  weeklyValues: [180, 220, 260, 210, 300, 280, 320, 290, 330, 310, 350, 330],
}

export const forecastHighlights = [
  { label: 'Pipeline signé (30j)', amount: '1 040€', trend: 'Digital Radicalz', detail: '1 projet signé ce mois' },
  { label: 'Montant en attente', amount: '1 040€', trend: 'À facturer', detail: 'Devis Digital Radicalz' },
  { label: 'Solde actuel Shine', amount: '440€', trend: 'Disponible', detail: 'En attente de paiement' },
]

export const forecastTimeline = [
  { month: 'Nov', total: 4800 },
  { month: 'Déc', total: 6200 },
  { month: 'Jan', total: 5400 },
  { month: 'Fév', total: 7000 },
  { month: 'Mar', total: 7600 },
]

export const sustainabilityMetrics = [
  { label: 'Runway Shine', value: '5.4 mois', sentiment: 'positive', description: 'basé sur dépenses moyennes' },
  { label: 'Part récurrente', value: '62%', sentiment: 'warning', description: 'objectif fixé à 70%' },
  { label: 'Marge moyenne', value: '58%', sentiment: 'positive', description: '+4 pts vs trimestre précédent' },
]

export const sustainabilityClients = [
  { name: 'Digital Radicalz', health: 'Élevée', scope: 'UX/UI & Site Web', recurrence: 'Projet signé' },
]

export type Invoice = {
  id: string
  client: string
  amount: string
  dueDate: string
  status: 'À envoyer' | 'Envoyée' | 'Payée'
}

export const invoicingQueue: Invoice[] = [
  { id: 'INV-001', client: 'Digital Radicalz', amount: '1 040€', dueDate: '30/11/2025', status: 'À envoyer' },
]

export type AgendaEvent = {
  id: string
  label: string
  day: number // 0 = lundi, 6 = dimanche
  startTime: number // Heure de début en minutes depuis minuit (ex: 480 = 8h00)
  endTime: number // Heure de fin en minutes depuis minuit (ex: 720 = 12h00)
  type: string
  color?: string // Couleur de la carte (hex, ex: #5CE1FF)
  sourceCardId?: string // ID de la carte todo d'origine si applicable
}

export const agendaEvents: AgendaEvent[] = [
  { id: 'evt-1', label: 'DIGITAL RADICALZ', day: 0, startTime: 480, endTime: 540, type: 'Client', color: '#5CE1FF' }, // Lundi 8h00-9h00
  { id: 'evt-2', label: 'Suivi projet Digital Radicalz', day: 2, startTime: 840, endTime: 900, type: 'Review', color: '#8B5CF6' }, // Mercredi 14h00-15h00
]

export const timeEvolution = {
  label: 'Répartition hebdo (heures)',
  categories: ['Sommeil', 'Prod', 'Sport', 'Repas', 'Trajets', 'Divers'],
  current: [54, 46, 7, 6, 11, 8],
  target: [56, 48, 5, 6, 8, 5],
}

export type ActionField = {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'file'
  placeholder?: string
  options?: string[]
}

export type ActionSchema = {
  key: string
  title: string
  description: string
  submitLabel: string
  fields: ActionField[]
}

export const actionSchemas: Record<string, ActionSchema> = {
  'client:request_ticket': {
    key: 'client:request_ticket',
    title: 'Demander un ticket',
    description: 'Créez une nouvelle demande pour votre freelance.',
    submitLabel: 'Envoyer la demande',
    fields: [
      { id: 'type', label: 'Type de demande', type: 'select', options: ['Bug', 'Feature', 'Support', 'Design'] },
      { id: 'title', label: 'Sujet', type: 'text', placeholder: 'Ex: Problème d\'affichage mobile' },
      { id: 'description', label: 'Description détaillée', type: 'textarea', placeholder: 'Décrivez votre besoin...' },
      { id: 'priority', label: 'Priorité', type: 'select', options: ['Basse', 'Moyenne', 'Haute', 'Urgente'] },
    ],
  },
  'performance:overview': {
    key: 'performance:overview',
    title: 'Signaler une transaction',
    description: 'Enregistrez un revenu ou une dépense pour alimenter vos indicateurs Shine.',
    submitLabel: 'Ajouter la transaction',
    fields: [
      { id: 'source', label: 'Source', type: 'text', placeholder: 'Client ou plateforme' },
      { id: 'amount', label: 'Montant (€)', type: 'number', placeholder: 'ex: 420' },
      { id: 'date', label: 'Date', type: 'date' },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Contexte ou lien Notion' },
    ],
  },
  'performance:forecast': {
    key: 'performance:forecast',
    title: 'Ajouter une opportunité',
    description: 'Ajoutez une proposition ou lead pour enrichir le pipeline prévisionnel.',
    submitLabel: 'Ajouter au pipeline',
    fields: [
      { id: 'client', label: 'Client', type: 'text', placeholder: 'Nom du client' },
      { id: 'budget', label: 'Budget estimé (€)', type: 'number', placeholder: 'ex: 2500' },
      { id: 'deadline', label: 'Échéance', type: 'date' },
      { id: 'stage', label: 'Phase', type: 'select', options: ['Qualification', 'Devis envoyé', 'Négociation', 'Signé'] },
      { id: 'nextStep', label: 'Next step', type: 'textarea', placeholder: 'Prochaine action, owner...' },
    ],
  },
  'performance:sustainability': {
    key: 'performance:sustainability',
    title: 'Suivi de vitalité client',
    description: 'Ajoutez un point de suivi pour l\'un de vos clients récurrents.',
    submitLabel: 'Enregistrer le suivi',
    fields: [
      { id: 'client', label: 'Client', type: 'text', placeholder: 'Digital Radicalz...' },
      { id: 'health', label: 'Vitalité', type: 'select', options: ['Élevée', 'Moyenne', 'À surveiller'] },
      { id: 'scope', label: 'Portée', type: 'text', placeholder: 'Mission / service' },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Derniers échanges, risques...' },
    ],
  },
  'commandes:tickets': {
    key: 'commandes:tickets',
    title: 'Ajouter un ticket',
    description: 'Créez une nouvelle demande ou intervention client.',
    submitLabel: 'Créer le ticket',
    fields: [
      { id: 'client', label: 'Client', type: 'text', placeholder: 'Nom du client' },
      { id: 'type', label: 'Type', type: 'select', options: ['Design', 'UX/UI', 'Prototype', 'Révision'] },
      { id: 'title', label: 'Intitulé', type: 'text', placeholder: 'Ex: Desktop ne démarre plus' },
      { id: 'price', label: 'Prix (€)', type: 'number', placeholder: 'ex: 400' },
      { id: 'estimate', label: 'Durée estimée (h)', type: 'number', placeholder: 'ex: 4' },
      { id: 'notes', label: 'Notes internes', type: 'textarea', placeholder: 'Checklist, fichiers...' },
    ],
  },
  'commandes:quotes': {
    key: 'commandes:quotes',
    title: 'Créer un devis',
    description: 'Préparez un devis rapide pour un besoin client.',
    submitLabel: 'Ajouter le devis',
    fields: [
      { id: 'client', label: 'Client', type: 'text' },
      { id: 'title', label: 'Intitulé', type: 'text', placeholder: 'UX/UI & Site Web' },
      { id: 'amount', label: 'Montant HT (€)', type: 'number' },
      { id: 'delivery', label: 'Date de livraison', type: 'date' },
      { id: 'notes', label: 'Commentaire', type: 'textarea', placeholder: 'Conditions, lien Notion...' },
    ],
  },
  'commandes:invoicing': {
    key: 'commandes:invoicing',
    title: 'Ajouter une facture',
    description: 'Préparez une facture avant envoi Shine.',
    submitLabel: 'Ajouter à la file',
    fields: [
      { id: 'client', label: 'Client', type: 'text' },
      { id: 'amount', label: 'Montant TTC (€)', type: 'number' },
      { id: 'dueDate', label: 'Échéance', type: 'date' },
      { id: 'status', label: 'Statut', type: 'select', options: ['À envoyer', 'Envoyée', 'Payée'] },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Lien facture, rappel...' },
    ],
  },
  'timeTracking:daily': {
    key: 'timeTracking:daily',
    title: 'Ajouter un évènement',
    description: 'Consignez un bloc de temps dans votre journée.',
    submitLabel: 'Ajouter',
    fields: [
      { id: 'category', label: 'Catégorie', type: 'select', options: ['Sommeil', 'Prod', 'Sport', 'Repas', 'Trajets', 'Divers'] },
      { id: 'duration', label: 'Durée (hh:mm)', type: 'text', placeholder: '01:30' },
      { id: 'date', label: 'Date', type: 'date' },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Qualité, contexte...' },
    ],
  },
  'timeTracking:evolution': {
    key: 'timeTracking:evolution',
    title: 'Définir un objectif',
    description: 'Créez un nouveau repère hebdo pour votre suivi.',
    submitLabel: 'Enregistrer l\'objectif',
    fields: [
      { id: 'category', label: 'Catégorie', type: 'text', placeholder: 'Ex: Prod' },
      { id: 'target', label: 'Cible (h)', type: 'number', placeholder: 'ex: 45' },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Motivation, alignement...' },
    ],
  },
  'planning:agenda': {
    key: 'planning:agenda',
    title: 'Ajouter un évènement',
    description: 'Planifiez un rendez-vous ou jalon dans votre agenda.',
    submitLabel: 'Planifier',
    fields: [
      { id: 'title', label: 'Titre', type: 'text', placeholder: 'Kickoff, Démo...' },
      { id: 'date', label: 'Date', type: 'date' },
      { id: 'time', label: 'Heure de début', type: 'text', placeholder: '09:30' },
      { id: 'duration', label: 'Durée (heures)', type: 'number', placeholder: '1.5' },
      { id: 'type', label: 'Type', type: 'select', options: ['Sprint', 'Review', 'Learning', 'Client'] },
      { id: 'color', label: 'Couleur', type: 'select', options: ['#5CE1FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1'] },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Lien visio, attendees...' },
    ],
  },
  'planning:todo': {
    key: 'planning:todo',
    title: 'Ajouter une carte',
    description: 'Ajoutez une tâche dans votre to-do list.',
    submitLabel: 'Ajouter la carte',
    fields: [
      { id: 'list', label: 'Colonne', type: 'select', options: ['Rush', 'En cours', 'Terminé'] },
      { id: 'client', label: 'Client (Optionnel)', type: 'select', options: [] }, // Options populated dynamically
      { id: 'title', label: 'Titre', type: 'text', placeholder: 'Nouvelle carte' },
      { id: 'deadline', label: 'Échéance', type: 'date' },
      { id: 'notes', label: 'Détails', type: 'textarea', placeholder: 'Checklist, owners...' },
      { id: 'image', label: 'Illustration', type: 'file', placeholder: 'Ajouter une image' },
    ],
  },
  clients: {
    key: 'clients',
    title: 'Ajouter un client',
    description: 'Renseignez un nouveau contact dans votre CRM perso.',
    submitLabel: 'Ajouter le client',
    fields: [
      { id: 'client', label: 'Client', type: 'text' },
      { id: 'email', label: 'Email (Accès)', type: 'text', placeholder: 'client@company.com' },
      { id: 'auth_user_id', label: 'ID Utilisateur (Auth Supabase)', type: 'text', placeholder: 'Copier depuis l\'espace client (Diagnostic)' },
      { id: 'access_code', label: 'Mot de passe', type: 'text', placeholder: 'Ex: 123456' },
      { id: 'contact', label: 'Contact principal', type: 'text' },
      { id: 'industry', label: 'Industrie', type: 'text' },
      { id: 'status', label: 'Statut', type: 'select', options: ['En cours', 'Terminé', 'Prospect'] },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Lien Notion, Slack...' },
    ],
  },
  default: {
    key: 'default',
    title: 'Nouvelle entrée',
    description: 'Ajoutez un élément à votre dashboard.',
    submitLabel: 'Ajouter',
    fields: [
      { id: 'title', label: 'Titre', type: 'text' },
      { id: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
}

export type Ticket = {
  id: string
  type: string
  client: string
  title: string
  price: number
  eta: string
  status: 'Ouvert' | 'En cours' | 'Fermé'
}

export const ticketsData: Ticket[] = [
  { id: 'DR-001', type: 'UX/UI', client: 'Digital Radicalz', price: 1040, title: 'Conception UX/UI & Site Web Framer', eta: 'En cours', status: 'En cours' },
]

export type Proposal = {
  title: string
  subtitle: string
  date: string
  status: 'Signé' | 'En cours'
  amount: string
}

export const proposals: Proposal[] = [
  {
    title: 'Conception UX/UI & Site Web Framer - Digital Radicalz',
    subtitle: 'UX/UI - Conception Site Web',
    date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    status: 'Signé',
    amount: '1 040,00 €',
  },
]

export type Client = {
  name: string
  contact: string
  industry: string
  status: 'En cours' | 'Terminé'
  addedOn: string
  avatar?: string
}

export const clients: Client[] = [
  {
    name: 'Digital Radicalz',
    contact: 'Digital Radicalz',
    industry: 'Digital',
    status: 'En cours',
    addedOn: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  },
]

export type TimeBlock = {
  id: string
  label: string
  duration: string
  delta: string
  sentiment: 'positive' | 'warning' | 'alert'
  icon: string
}

export type TimeTrackingEntry = {
  id: string
  activity: string
  startTime: string // Format HH:mm
  endTime: string // Format HH:mm
  bilan: 'Top' | 'Mauvais' | 'À améliorer'
}

export const timeBlocks: TimeBlock[] = [
  { id: 'sleep', label: 'Sommeil', duration: '08:00', delta: '+00:15', sentiment: 'positive', icon: '🌙' },
  { id: 'prod', label: 'Prod', duration: '09:56', delta: '+01:12', sentiment: 'positive', icon: '🟪' },
  { id: 'sport', label: 'Sport', duration: '01:34', delta: '+00:20', sentiment: 'positive', icon: '🏋️' },
  { id: 'meals', label: 'Repas', duration: '00:56', delta: '-00:10', sentiment: 'warning', icon: '🍲' },
  { id: 'drive', label: 'Trajets', duration: '02:20', delta: '+00:40', sentiment: 'alert', icon: '🚗' },
  { id: 'misc', label: 'Divers', duration: '02:34', delta: '+00:32', sentiment: 'alert', icon: '📦' },
]

export const timeTrackingEntries: TimeTrackingEntry[] = [
  { id: 'entry-1', activity: 'Divers (Réveil, Douc', startTime: '12:19', endTime: '12:45', bilan: 'Top' },
  { id: 'entry-2', activity: 'Regus', startTime: '00:00', endTime: '00:00', bilan: 'Mauvais' },
  { id: 'entry-3', activity: 'Trajet', startTime: '18:57', endTime: '19:36', bilan: 'Top' },
  { id: 'entry-4', activity: 'Prod (Ne pas déran', startTime: '22:25', endTime: '04:56', bilan: 'Mauvais' },
  { id: 'entry-5', activity: 'Repas', startTime: '11:48', endTime: '12:20', bilan: 'Top' },
  { id: 'entry-6', activity: 'Prod (Ne pas déran', startTime: '16:24', endTime: '17:27', bilan: 'Top' },
  { id: 'entry-7', activity: 'Divers (Répondre a', startTime: '17:27', endTime: '18:50', bilan: 'Top' },
  { id: 'entry-8', activity: 'Maison', startTime: '00:00', endTime: '00:00', bilan: 'Top' },
  { id: 'entry-9', activity: 'Trajet', startTime: '00:00', endTime: '00:00', bilan: 'Top' },
  { id: 'entry-10', activity: 'Prod (Ne pas déran', startTime: '22:30', endTime: '23:47', bilan: 'À améliorer' },
  { id: 'entry-11', activity: 'Divers (Douche,Ling', startTime: '23:47', endTime: '02:00', bilan: 'Top' },
  { id: 'entry-12', activity: 'Sommeil', startTime: '02:00', endTime: '09:36', bilan: 'Top' },
]

export type TodoColumn = {
  id: string
  title: string
  icon: string
  cards: { title: string; meta: string; tag: string; status: string; image?: string }[]
}

export const todoColumns: TodoColumn[] = [
  {
    id: 'rush',
    title: 'Rush',
    icon: 'runner',
    cards: [
      { title: 'SPRINT', meta: 'Production Digital Radicalz', tag: 'Sprint', status: '1 carte' },
      { title: 'Prod Digital Radicalz', meta: 'Livraison UX/UI & Site Web', tag: 'Rush', status: 'En cours' },
    ],
  },
  {
    id: 'progress',
    title: 'En cours',
    icon: 'folder',
    cards: [
      { title: 'Conception UX/UI', meta: 'Digital Radicalz - Site Web Framer', tag: 'UX/UI', status: 'En cours' },
    ],
  },
  {
    id: 'done',
    title: 'Terminé',
    icon: 'shield',
    cards: [
      { title: 'Devis signé', meta: 'Digital Radicalz - 1 040€', tag: 'Done', status: 'Validé' },
    ],
  },
]

export const heroCard = {
  welcome: 'Bienvenue, Robin MASINI',
  subtitle: 'Ravi de vous revoir !',
  dateLabel: "Date d'aujourd'hui",
  date: 'Mercredi 12 Novembre 2025',
  illustration:
    'https://images.unsplash.com/photo-1496564203457-11bb12075d90?auto=format&fit=crop&w=800&q=80',
}

