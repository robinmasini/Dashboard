/**
 * Types de données partagés avec le Dashboard Freelance
 * Ces types correspondent exactement à ceux du Dashboard Freelance
 * pour garantir la compatibilité et la synchronisation
 */

export type Ticket = {
  id: string
  type: string
  client: string
  title: string
  price: number
  eta: string
  status: 'Ouvert' | 'En cours' | 'Fermé' | 'commandé'
  source?: string // Pour identifier l'origine (ex: 'dashboard_client')
  description?: string // Description détaillée de la demande
}

export type Proposal = {
  title: string
  subtitle: string
  date: string
  status: 'Signé' | 'En cours'
  amount: string
}

export type Invoice = {
  id: string
  client: string
  amount: string
  dueDate: string
  status: 'À envoyer' | 'Envoyée' | 'Payée'
}

export type TodoColumn = {
  id: string
  title: string
  icon: string
  cards: { title: string; meta: string; tag: string; status: string }[]
}

export type Project = {
  id: string
  name: string
  client: string
  progress: number
  status: 'En cours' | 'Terminé' | 'En attente'
  lastUpdate: string
  description?: string
}

export type Message = {
  id: string
  from: string
  content: string
  date: string
  read: boolean
}

export type Document = {
  id: string
  name: string
  type: string
  size: string
  uploadDate: string
  url?: string
}

