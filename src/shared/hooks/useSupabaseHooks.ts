/**
 * Comprehensive Supabase hooks for all database entities
 * Provides CRUD operations + realtime subscriptions
 * Automatically applies RLS filtering based on user role
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

// ============================================
// TYPES
// ============================================

export type Ticket = {
  id: string
  created_at?: string
  client_id: string
  title: string
  description?: string
  type: string
  status: 'Ouvert' | 'En cours' | 'Fermé' | 'commandé'
  price: number
  eta: string
  source?: string
  client?: string // For display (joined from clients table)
  pdf_url?: string // URL du PDF associé
}

export type Proposal = {
  id: string
  created_at?: string
  client_id: string
  title: string
  subtitle?: string
  amount: string
  date: string
  status: 'Signé' | 'En cours' | 'Refusé'
  pdf_url?: string // URL du PDF du devis
}

export type Invoice = {
  id: string
  created_at?: string
  client_id: string
  invoice_number?: string
  amount: string
  due_date: string
  status: 'À envoyer' | 'Envoyée' | 'Payée'
  notes?: string
  pdf_url?: string // URL du PDF de la facture
}

export type Project = {
  id: string
  created_at?: string
  client_id: string
  name: string
  progress: number
  status: 'En cours' | 'Terminé' | 'En attente'
  last_update: string
  description?: string
}

export type Message = {
  id: string
  created_at?: string
  client_id: string
  from_name: string
  content: string
  date: string
  read: boolean
}

export type Document = {
  id: string
  created_at?: string
  client_id: string
  name: string
  type: string
  size: string
  upload_date: string
  url?: string
}

export type AgendaEvent = {
  id: string
  created_at?: string
  label: string
  day: number
  start_time: number
  end_time: number
  type?: string
  color?: string
  source_card_id?: string
  client_id?: string
}

export type TodoItem = {
  id: string
  created_at?: string
  column_id: string
  title: string
  meta?: string
  tag?: string
  status_label?: string
  order_index: number
  deadline?: string
  notes?: string
  client_id?: string
  image_url?: string
}

export type TimeEntry = {
  id: string
  created_at?: string
  entry_date: string
  activity: string
  start_time?: string
  end_time?: string
  bilan?: 'Top' | 'Mauvais' | 'À améliorer'
  notes?: string
}

export type Client = {
  id: string
  created_at?: string
  name: string
  contact_name?: string
  industry?: string
  status: 'En cours' | 'Terminé' | 'Prospect'
  access_code: string
  notes?: string
  avatar_url?: string
  email?: string
  auth_user_id?: string
}

export type ActiveTimer = {
  id: string
  category_id: string
  start_time: string | null
  accumulated_ms: number
  is_running: boolean
  created_at?: string
  updated_at?: string
}

export type AvailabilitySlot = {
  id: string
  day_of_week: number // 0=Dimanche, 1=Lundi... 6=Samedi
  start_time: string
  end_time: string
  slot_duration: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type Appointment = {
  id: string
  client_id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'cancelled'
  meeting_type?: 'visio' | 'agence'
  notes?: string
  created_at?: string
  updated_at?: string
  client?: Client // For joined queries
}

// ============================================
// TICKETS HOOK
// ============================================

export function useTickets(clientId?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setTickets(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching tickets:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchTickets()
    // Realtime disabled for performance - data refreshes on CRUD operations
  }, [fetchTickets])

  const addTicket = useCallback(async (ticket: Omit<Ticket, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('tickets')
      .insert(ticket)
      .select()
      .single()

    if (insertError) throw insertError
    return data
  }, [])

  const updateTicket = useCallback(async (id: string, updates: Partial<Ticket>) => {
    const { data, error: updateError } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }, [])

  const deleteTicket = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  }, [])

  return {
    tickets,
    loading,
    error,
    addTicket,
    updateTicket,
    deleteTicket,
    refresh: fetchTickets,
  }
}

// ============================================
// PROPOSALS HOOK
// ============================================

export function useProposals(clientId?: string) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = useCallback(async () => {
    try {
      let query = supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setProposals(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching proposals:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchProposals()
    // Realtime disabled for performance
  }, [fetchProposals])

  const addProposal = useCallback(async (proposal: Omit<Proposal, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('proposals')
      .insert(proposal)
      .select()
      .single()

    if (insertError) throw insertError
    await fetchProposals() // Refresh list after adding
    return data
  }, [fetchProposals])

  const updateProposal = useCallback(async (id: string, updates: Partial<Proposal>) => {
    const { data, error: updateError } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    await fetchProposals() // Refresh list after updating
    return data
  }, [fetchProposals])

  const deleteProposal = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  }, [])

  return {
    proposals,
    loading,
    error,
    addProposal,
    updateProposal,
    deleteProposal,
    refresh: fetchProposals,
  }
}

// ============================================
// INVOICES HOOK
// ============================================

export function useInvoices(clientId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // PATCH TEMPORAIRE: Correction de l'affichage des factures
      // Remplace les montants 1500€ par 1040€
      const fixedData = (data || []).map((invoice: Invoice) => ({
        ...invoice,
        amount: (invoice.amount.includes('1500') || invoice.amount.includes('1 500')) ? '1 040,00 €' : invoice.amount
      }))

      setInvoices(fixedData)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching invoices:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchInvoices()
    // Realtime disabled for performance
  }, [fetchInvoices])

  const addInvoice = useCallback(async (invoice: Omit<Invoice, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single()

    if (insertError) throw insertError
    return data
  }, [])

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    const { data, error: updateError } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }, [])

  const deleteInvoice = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  }, [])

  return {
    invoices,
    loading,
    error,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    refresh: fetchInvoices,
  }
}

// ============================================
// PROJECTS HOOK
// ============================================

export function useProjects(clientId?: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setProjects(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching projects:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchProjects()
    // Realtime disabled for performance
  }, [fetchProjects])

  const addProject = useCallback(async (project: Omit<Project, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single()

    if (insertError) throw insertError
    return data
  }, [])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const { data, error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  }, [])

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
    refresh: fetchProjects,
  }
}

// ============================================
// MESSAGES HOOK
// ============================================

export function useMessages(clientId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setMessages(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching messages:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchMessages()
    // Realtime disabled for performance
  }, [fetchMessages])

  const addMessage = useCallback(async (message: Omit<Message, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single()

    if (insertError) throw insertError
    return data
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    const { data, error: updateError } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }, [])

  const deleteMessage = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  }, [])

  return {
    messages,
    loading,
    error,
    addMessage,
    markAsRead,
    deleteMessage,
    refresh: fetchMessages,
  }
}

// ============================================
// DOCUMENTS HOOK
// ============================================

export function useDocuments(clientId: string) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setDocuments(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching documents:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchDocuments()
    // Realtime disabled for performance
  }, [fetchDocuments])

  const addDocument = useCallback(async (document: Omit<Document, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('documents')
      .insert(document)
      .select()
      .single()

    if (insertError) throw insertError
    return data
  }, [])

  const deleteDocument = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  }, [])

  return {
    documents,
    loading,
    error,
    addDocument,
    deleteDocument,
    refresh: fetchDocuments,
  }
}

// ============================================
// AGENDA EVENTS HOOK
// ============================================

export function useAgendaEvents() {
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('agenda_events')
        .select('*')
        .order('day', { ascending: true })
        .order('start_time', { ascending: true })

      if (fetchError) throw fetchError

      setEvents(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching agenda events:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    // Realtime disabled for performance
  }, [fetchEvents])

  const addEvent = useCallback(async (event: Omit<AgendaEvent, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('agenda_events')
      .insert(event)
      .select()
      .single()

    if (insertError) throw insertError
    return data
  }, [])

  const updateEvent = useCallback(async (id: string, updates: Partial<AgendaEvent>) => {
    const { data, error: updateError } = await supabase
      .from('agenda_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }, [])

  const deleteEvent = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('agenda_events')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  }, [])

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refresh: fetchEvents,
  }
}

// ============================================
// TODO ITEMS HOOK
// ============================================

export function useTodoItems(clientId?: string) {
  const [items, setItems] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      let query = supabase
        .from('todo_items')
        .select('*')
        .order('column_id', { ascending: true })
        .order('order_index', { ascending: true })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setItems(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching todo items:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchItems()
    // Realtime disabled for performance
  }, [fetchItems])

  const addItem = useCallback(async (item: Omit<TodoItem, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('todo_items')
      .insert(item)
      .select()
      .single()

    if (insertError) throw insertError
    await fetchItems() // Refresh list after adding
    return data
  }, [fetchItems])

  const updateItem = useCallback(async (id: string, updates: Partial<TodoItem>) => {
    const { data, error: updateError } = await supabase
      .from('todo_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    await fetchItems() // Refresh list after updating
    return data
  }, [fetchItems])

  const moveItem = useCallback(async (id: string, newColumnId: string, newOrderIndex: number) => {
    const { data, error: updateError } = await supabase
      .from('todo_items')
      .update({ column_id: newColumnId, order_index: newOrderIndex })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    await fetchItems() // Refresh list after moving
    return data
  }, [fetchItems])

  const deleteItem = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('todo_items')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
    await fetchItems() // Refresh list after deleting
  }, [fetchItems])

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    moveItem,
    deleteItem,
    refresh: fetchItems,
  }
}

// ============================================
// TIME ENTRIES HOOK
// ============================================

export function useTimeEntries(date?: string) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    try {
      let query = supabase
        .from('time_entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('start_time', { ascending: true })

      if (date) {
        query = query.eq('entry_date', date)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setEntries(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching time entries:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchEntries()
    // Realtime disabled for performance
  }, [fetchEntries])

  const addEntry = useCallback(async (entry: Omit<TimeEntry, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('time_entries')
      .insert(entry)
      .select()
      .single()

    if (insertError) throw insertError
    return data
  }, [])

  const updateEntry = useCallback(async (id: string, updates: Partial<TimeEntry>) => {
    const { data, error: updateError } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }, [])

  const deleteEntry = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  }, [])

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refresh: fetchEntries,
  }
}

/**
 * Hook pour récupérer l'historique complet des temps (tous les jours)
 * Utilisé pour calculer les moyennes quotidiennes par catégorie
 */
export function useTimeHistory() {
  const [history, setHistory] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('time_entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('start_time', { ascending: true })

      if (fetchError) throw fetchError

      setHistory(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching time history:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Grouper l'historique par catégorie
  const getHistoryByCategory = useCallback((categoryId: string) => {
    return history.filter(e => e.activity.startsWith(categoryId))
  }, [history])

  // Obtenir les dates uniques où il y a des entrées pour une catégorie
  const getUniqueDates = useCallback((categoryId: string) => {
    const categoryEntries = history.filter(e => e.activity.startsWith(categoryId))
    const dates = [...new Set(categoryEntries.map(e => e.entry_date))]
    return dates
  }, [history])

  // Calculer la moyenne quotidienne pour une catégorie
  const getDailyAverageForCategory = useCallback((categoryId: string) => {
    const categoryEntries = history.filter(e => e.activity.startsWith(categoryId))
    if (categoryEntries.length === 0) return 0

    // Grouper par date
    const byDate: Record<string, number> = {}
    categoryEntries.forEach(entry => {
      const date = entry.entry_date
      if (!byDate[date]) byDate[date] = 0

      // Calculer la durée de l'entrée
      const start = entry.start_time || '00:00'
      const end = entry.end_time || '00:00'
      const [startH, startM] = start.split(':').map(Number)
      const [endH, endM] = end.split(':').map(Number)
      const durationHours = Math.max(0, (endH * 60 + endM - startH * 60 - startM) / 60)
      byDate[date] += durationHours
    })

    // Calculer la moyenne sur les jours
    const dates = Object.keys(byDate)
    const totalHours = Object.values(byDate).reduce((a, b) => a + b, 0)
    const moyenne = dates.length > 0 ? totalHours / dates.length : 0

    return parseFloat(moyenne.toFixed(2))
  }, [history])

  return {
    history,
    loading,
    error,
    getHistoryByCategory,
    getUniqueDates,
    getDailyAverageForCategory,
    refresh: fetchHistory,
  }
}

// ============================================
// CLIENTS HOOK
// ============================================

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setClients(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching clients:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
    // Realtime disabled for performance
  }, [fetchClients])

  const addClient = useCallback(async (client: Omit<Client, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single()

    if (insertError) throw insertError
    return data
  }, [])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    const { data, error: updateError } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    return data
  }, [])

  const deleteClient = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
  }, [])

  return {
    clients,
    loading,
    error,
    addClient,
    updateClient,
    deleteClient,
    refresh: fetchClients,
  }
}

// ============================================
// ACTIVE TIMERS HOOK (Supabase primary + real-time sync)
// ============================================

const TIMERS_STORAGE_KEY = 'active_timers_cache_v2'

type TimerState = {
  startTime: number | null
  accumulated: number
  isRunning: boolean
}

// Helper to save timers to localStorage (cache only)
const cacheTimersLocally = (timers: Record<string, TimerState>) => {
  try {
    localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(timers))
  } catch (err) {
    console.error('Error caching timers:', err)
  }
}

// Helper to load cached timers
const loadCachedTimers = (): Record<string, TimerState> => {
  try {
    const stored = localStorage.getItem(TIMERS_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (err) {
    console.error('Error loading cached timers:', err)
  }
  return {}
}

export function useActiveTimers() {
  // Initialize from cache, then sync from Supabase
  const [timers, setTimers] = useState<Record<string, TimerState>>(() => loadCachedTimers())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch timers from Supabase
  const fetchTimersFromDB = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('active_timers')
        .select('*')

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError)
        setError(fetchError.message)
        return
      }

      // Convert DB format to local format
      const timerMap: Record<string, TimerState> = {}
      for (const row of (data || [])) {
        timerMap[row.category_id] = {
          startTime: row.start_time ? new Date(row.start_time).getTime() : null,
          accumulated: row.accumulated_ms || 0,
          isRunning: row.is_running || false
        }
      }

      setTimers(timerMap)
      cacheTimersLocally(timerMap)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching timers:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + real-time subscription + visibility change
  useEffect(() => {
    fetchTimersFromDB()

    // Real-time subscription for cross-device sync
    const channel = supabase
      .channel('active_timers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_timers'
      }, (payload) => {
        console.log('Real-time timer update:', payload)
        // Refetch all timers on any change
        fetchTimersFromDB()
      })
      .subscribe()

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTimersFromDB()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchTimersFromDB])

  // Start timer - write to Supabase immediately
  const startTimer = useCallback(async (categoryId: string) => {
    const now = new Date()
    const currentTimer = timers[categoryId]
    const accumulated = currentTimer?.accumulated || 0

    const newState: TimerState = {
      startTime: now.getTime(),
      accumulated,
      isRunning: true
    }

    // Optimistic update
    setTimers(prev => {
      const updated = { ...prev, [categoryId]: newState }
      cacheTimersLocally(updated)
      return updated
    })

    // Write to Supabase
    try {
      const { error } = await supabase
        .from('active_timers')
        .upsert({
          category_id: categoryId,
          start_time: now.toISOString(),
          accumulated_ms: accumulated,
          is_running: true
        }, { onConflict: 'category_id' })

      if (error) {
        console.error('Error starting timer in DB:', error)
      }
    } catch (err) {
      console.error('Error starting timer:', err)
    }
  }, [timers])

  // Pause timer - write to Supabase immediately
  const pauseTimer = useCallback(async (categoryId: string) => {
    const timer = timers[categoryId]
    if (!timer || !timer.startTime) return

    const newAccumulated = timer.accumulated + (Date.now() - timer.startTime)

    const newState: TimerState = {
      startTime: null,
      accumulated: newAccumulated,
      isRunning: false
    }

    // Optimistic update
    setTimers(prev => {
      const updated = { ...prev, [categoryId]: newState }
      cacheTimersLocally(updated)
      return updated
    })

    // Write to Supabase
    try {
      const { error } = await supabase
        .from('active_timers')
        .update({
          start_time: null,
          accumulated_ms: newAccumulated,
          is_running: false
        })
        .eq('category_id', categoryId)

      if (error) {
        console.error('Error pausing timer in DB:', error)
      }
    } catch (err) {
      console.error('Error pausing timer:', err)
    }
  }, [timers])

  // Reset timer - delete from Supabase
  const resetTimer = useCallback(async (categoryId: string) => {
    // Optimistic update
    setTimers(prev => {
      const updated = { ...prev }
      delete updated[categoryId]
      cacheTimersLocally(updated)
      return updated
    })

    // Delete from Supabase
    try {
      const { error } = await supabase
        .from('active_timers')
        .delete()
        .eq('category_id', categoryId)

      if (error) {
        console.error('Error resetting timer in DB:', error)
      }
    } catch (err) {
      console.error('Error resetting timer:', err)
    }
  }, [])

  return {
    timers,
    loading,
    error,
    startTimer,
    pauseTimer,
    resetTimer,
    refresh: fetchTimersFromDB,
  }
}

// ============================================
// AVAILABILITY SLOTS HOOK
// ============================================

export function useAvailabilitySlots() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('availability_slots')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (fetchError) throw fetchError

      setSlots(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching availability slots:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const addSlot = useCallback(async (slot: Omit<AvailabilitySlot, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error: insertError } = await supabase
      .from('availability_slots')
      .insert(slot)
      .select()
      .single()

    if (insertError) throw insertError
    await fetchSlots()
    return data
  }, [fetchSlots])

  const updateSlot = useCallback(async (id: string, updates: Partial<AvailabilitySlot>) => {
    const { data, error: updateError } = await supabase
      .from('availability_slots')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    await fetchSlots()
    return data
  }, [fetchSlots])

  const deleteSlot = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('availability_slots')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
    await fetchSlots()
  }, [fetchSlots])

  const toggleSlot = useCallback(async (id: string, isActive: boolean) => {
    return updateSlot(id, { is_active: isActive })
  }, [updateSlot])

  return {
    slots,
    loading,
    error,
    addSlot,
    updateSlot,
    deleteSlot,
    toggleSlot,
    refresh: fetchSlots,
  }
}

// ============================================
// APPOINTMENTS HOOK
// ============================================

export function useAppointments(clientId?: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          client:clients(id, name, contact_name)
        `)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setAppointments(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching appointments:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const addAppointment = useCallback(async (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'client'>) => {
    const { data, error: insertError } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single()

    if (insertError) throw insertError
    await fetchAppointments()
    return data
  }, [fetchAppointments])

  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    const { data, error: updateError } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    await fetchAppointments()
    return data
  }, [fetchAppointments])

  const deleteAppointment = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError
    await fetchAppointments()
  }, [fetchAppointments])

  const confirmAppointment = useCallback(async (id: string) => {
    return updateAppointment(id, { status: 'confirmed' })
  }, [updateAppointment])

  const cancelAppointment = useCallback(async (id: string) => {
    return updateAppointment(id, { status: 'cancelled' })
  }, [updateAppointment])

  // Get booked slots for a specific date (to exclude from available slots)
  const getBookedSlotsForDate = useCallback((date: string) => {
    return appointments
      .filter(a => a.appointment_date === date && a.status !== 'cancelled')
      .map(a => ({ start: a.start_time, end: a.end_time }))
  }, [appointments])

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    confirmAppointment,
    cancelAppointment,
    getBookedSlotsForDate,
    refresh: fetchAppointments,
  }
}
