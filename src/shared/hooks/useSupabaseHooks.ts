/**
 * Comprehensive Supabase hooks for all database entities
 * Provides CRUD operations + realtime subscriptions
 * Automatically applies RLS filtering based on user role
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import { invoicesService } from '../services/invoicesService'
import { clientsService } from '../services/clientsService'
import { tasksService } from '../services/tasksService'
import { projectsService } from '../services/projectsService'
import { appointmentsService } from '../services/appointmentsService'
import { ticketsService } from '../services/ticketsService'

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
      const data = await ticketsService.fetchTickets(clientId)
      setTickets(data)
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

    const channel = supabase
      .channel('realtime:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTickets])

  const addTicket = useCallback(async (ticket: Omit<Ticket, 'id' | 'created_at'>) => {
    try {
      const data = await ticketsService.addTicket(ticket)
      setTickets(prev => [data, ...prev])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const updateTicket = useCallback(async (id: string, updates: Partial<Ticket>) => {
    try {
      setTickets(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)))
      const data = await ticketsService.updateTicket(id, updates)
      return data
    } catch (err: any) {
      fetchTickets()
      setError(err.message)
      throw err
    }
  }, [fetchTickets])

  const deleteTicket = useCallback(async (id: string) => {
    try {
      setTickets(prev => prev.filter(t => t.id !== id))
      await ticketsService.deleteTicket(id)
    } catch (err: any) {
      fetchTickets()
      setError(err.message)
      throw err
    }
  }, [fetchTickets])

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

    const channel = supabase
      .channel('realtime:proposals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, () => {
        fetchProposals()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProposals])

  const addProposal = useCallback(async (proposal: Omit<Proposal, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('proposals')
      .insert(proposal)
      .select()
      .single()

    if (insertError) throw insertError
    setProposals(prev => [data, ...prev])
    return data
  }, [])

  const updateProposal = useCallback(async (id: string, updates: Partial<Proposal>) => {
    setProposals(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
    const { data, error: updateError } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      fetchProposals()
      throw updateError
    }
    return data
  }, [fetchProposals])

  const deleteProposal = useCallback(async (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id))
    const { error: deleteError } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id)

    if (deleteError) {
      fetchProposals()
      throw deleteError
    }
  }, [fetchProposals])

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
      const data = await invoicesService.fetchInvoices(clientId)
      setInvoices(data)
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

    const channel = supabase
      .channel('realtime:invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchInvoices()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchInvoices])

  const addInvoice = useCallback(async (invoice: Omit<Invoice, 'id' | 'created_at'>) => {
    try {
      const data = await invoicesService.addInvoice(invoice)
      setInvoices(prev => [data, ...prev])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    try {
      setInvoices(prev => prev.map(inv => (inv.id === id ? { ...inv, ...updates } : inv)))
      const data = await invoicesService.updateInvoice(id, updates)
      return data
    } catch (err: any) {
      fetchInvoices()
      setError(err.message)
      throw err
    }
  }, [fetchInvoices])

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      setInvoices(prev => prev.filter(inv => inv.id !== id))
      await invoicesService.deleteInvoice(id)
    } catch (err: any) {
      fetchInvoices()
      setError(err.message)
      throw err
    }
  }, [fetchInvoices])

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
      const data = await projectsService.fetchProjects(clientId)
      setProjects(data)
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

    const channel = supabase
      .channel('realtime:projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProjects])

  const addProject = useCallback(async (project: Omit<Project, 'id' | 'created_at'>) => {
    try {
      const data = await projectsService.addProject(project)
      setProjects(prev => [data, ...prev])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
      const data = await projectsService.updateProject(id, updates)
      return data
    } catch (err: any) {
      fetchProjects()
      setError(err.message)
      throw err
    }
  }, [fetchProjects])

  const deleteProject = useCallback(async (id: string) => {
    try {
      setProjects(prev => prev.filter(p => p.id !== id))
      await projectsService.deleteProject(id)
    } catch (err: any) {
      fetchProjects()
      setError(err.message)
      throw err
    }
  }, [fetchProjects])

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

    const channel = supabase
      .channel(`realtime:messages:${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` }, () => {
        fetchMessages()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchMessages, clientId])

  const addMessage = useCallback(async (message: Omit<Message, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single()

    if (insertError) throw insertError
    setMessages(prev => [data, ...prev])
    return data
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, read: true } : m)))
    const { data, error: updateError } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      fetchMessages()
      throw updateError
    }
    return data
  }, [fetchMessages])

  const deleteMessage = useCallback(async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)

    if (deleteError) {
      fetchMessages()
      throw deleteError
    }
  }, [fetchMessages])

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

    const channel = supabase
      .channel(`realtime:documents:${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `client_id=eq.${clientId}` }, () => {
        fetchDocuments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchDocuments, clientId])

  const addDocument = useCallback(async (document: Omit<Document, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('documents')
      .insert(document)
      .select()
      .single()

    if (insertError) throw insertError
    setDocuments(prev => [data, ...prev])
    return data
  }, [])

  const deleteDocument = useCallback(async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id))
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      fetchDocuments()
      throw deleteError
    }
  }, [fetchDocuments])

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

    const channel = supabase
      .channel('realtime:agenda_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_events' }, () => {
        fetchEvents()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEvents])

  const addEvent = useCallback(async (event: Omit<AgendaEvent, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('agenda_events')
      .insert(event)
      .select()
      .single()

    if (insertError) throw insertError
    setEvents(prev => [...prev, data])
    return data
  }, [])

  const updateEvent = useCallback(async (id: string, updates: Partial<AgendaEvent>) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)))
    const { data, error: updateError } = await supabase
      .from('agenda_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      fetchEvents()
      throw updateError
    }
    return data
  }, [fetchEvents])

  const deleteEvent = useCallback(async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    const { error: deleteError } = await supabase
      .from('agenda_events')
      .delete()
      .eq('id', id)

    if (deleteError) {
      fetchEvents()
      throw deleteError
    }
  }, [fetchEvents])

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
      const data = await tasksService.fetchTodoItems(clientId)
      setItems(data)
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

    const channel = supabase
      .channel('realtime:todo_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_items' }, () => {
        fetchItems()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchItems])

  const addItem = useCallback(async (item: Omit<TodoItem, 'id' | 'created_at'>) => {
    try {
      const data = await tasksService.addTodoItem(item)
      setItems(prev => [...prev, data])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const updateItem = useCallback(async (id: string, updates: Partial<TodoItem>) => {
    try {
      setItems(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)))
      const data = await tasksService.updateTodoItem(id, updates)
      return data
    } catch (err: any) {
      fetchItems()
      setError(err.message)
      throw err
    }
  }, [fetchItems])

  const moveItem = useCallback(async (id: string, newColumnId: string, newOrderIndex: number) => {
    try {
      setItems(prev => prev.map(i => (i.id === id ? { ...i, column_id: newColumnId, order_index: newOrderIndex } : i)))
      const data = await tasksService.moveTodoItem(id, newColumnId, newOrderIndex)
      return data
    } catch (err: any) {
      fetchItems()
      setError(err.message)
      throw err
    }
  }, [fetchItems])

  const deleteItem = useCallback(async (id: string) => {
    try {
      setItems(prev => prev.filter(i => i.id !== id))
      await tasksService.deleteTodoItem(id)
    } catch (err: any) {
      fetchItems()
      setError(err.message)
      throw err
    }
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

    const channel = supabase
      .channel('realtime:time_entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => {
        fetchEntries()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEntries])

  const addEntry = useCallback(async (entry: Omit<TimeEntry, 'id' | 'created_at'>) => {
    const { data, error: insertError } = await supabase
      .from('time_entries')
      .insert(entry)
      .select()
      .single()

    if (insertError) throw insertError
    setEntries(prev => [data, ...prev])
    return data
  }, [])

  const updateEntry = useCallback(async (id: string, updates: Partial<TimeEntry>) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)))
    const { data, error: updateError } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      fetchEntries()
      throw updateError
    }
    return data
  }, [fetchEntries])

  const deleteEntry = useCallback(async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)

    if (deleteError) {
      fetchEntries()
      throw deleteError
    }
  }, [fetchEntries])

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
      const data = await clientsService.fetchClients()
      setClients(data)
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

    const channel = supabase
      .channel('realtime:clients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchClients()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchClients])

  const addClient = useCallback(async (client: Omit<Client, 'id' | 'created_at'>) => {
    try {
      const data = await clientsService.addClient(client)
      setClients(prev => [...prev, data])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    try {
      setClients(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)))
      const data = await clientsService.updateClient(id, updates)
      return data
    } catch (err: any) {
      fetchClients()
      setError(err.message)
      throw err
    }
  }, [fetchClients])

  const deleteClient = useCallback(async (id: string) => {
    try {
      setClients(prev => prev.filter(c => c.id !== id))
      await clientsService.deleteClient(id)
    } catch (err: any) {
      fetchClients()
      setError(err.message)
      throw err
    }
  }, [fetchClients])

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
  const [timers, setTimers] = useState<Record<string, TimerState>>(() => loadCachedTimers())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchTimersFromDB()

    const channel = supabase
      .channel('active_timers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_timers'
      }, () => {
        fetchTimersFromDB()
      })
      .subscribe()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTimersFromDB()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchTimersFromDB])

  const startTimer = useCallback(async (categoryId: string) => {
    const now = new Date()
    const currentTimer = timers[categoryId]
    const accumulated = currentTimer?.accumulated || 0

    const newState: TimerState = {
      startTime: now.getTime(),
      accumulated,
      isRunning: true
    }

    setTimers(prev => {
      const updated = { ...prev, [categoryId]: newState }
      cacheTimersLocally(updated)
      return updated
    })

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

  const pauseTimer = useCallback(async (categoryId: string) => {
    const timer = timers[categoryId]
    if (!timer || !timer.startTime) return

    const newAccumulated = timer.accumulated + (Date.now() - timer.startTime)

    const newState: TimerState = {
      startTime: null,
      accumulated: newAccumulated,
      isRunning: false
    }

    setTimers(prev => {
      const updated = { ...prev, [categoryId]: newState }
      cacheTimersLocally(updated)
      return updated
    })

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

  const resetTimer = useCallback(async (categoryId: string) => {
    setTimers(prev => {
      const updated = { ...prev }
      delete updated[categoryId]
      cacheTimersLocally(updated)
      return updated
    })

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

    const channel = supabase
      .channel('realtime:availability_slots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_slots' }, () => {
        fetchSlots()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSlots])

  const addSlot = useCallback(async (slot: Omit<AvailabilitySlot, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error: insertError } = await supabase
      .from('availability_slots')
      .insert(slot)
      .select()
      .single()

    if (insertError) throw insertError
    setSlots(prev => [...prev, data])
    return data
  }, [])

  const updateSlot = useCallback(async (id: string, updates: Partial<AvailabilitySlot>) => {
    setSlots(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)))
    const { data, error: updateError } = await supabase
      .from('availability_slots')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      fetchSlots()
      throw updateError
    }
    return data
  }, [fetchSlots])

  const deleteSlot = useCallback(async (id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id))
    const { error: deleteError } = await supabase
      .from('availability_slots')
      .delete()
      .eq('id', id)

    if (deleteError) {
      fetchSlots()
      throw deleteError
    }
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
      const data = await appointmentsService.fetchAppointments(clientId)
      setAppointments(data)
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

    const channel = supabase
      .channel('realtime:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAppointments])

  const addAppointment = useCallback(async (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'client'>) => {
    try {
      const data = await appointmentsService.addAppointment(appointment)
      setAppointments(prev => [...prev, data])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    try {
      setAppointments(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)))
      const data = await appointmentsService.updateAppointment(id, updates)
      return data
    } catch (err: any) {
      fetchAppointments()
      setError(err.message)
      throw err
    }
  }, [fetchAppointments])

  const deleteAppointment = useCallback(async (id: string) => {
    try {
      setAppointments(prev => prev.filter(a => a.id !== id))
      await appointmentsService.deleteAppointment(id)
    } catch (err: any) {
      fetchAppointments()
      setError(err.message)
      throw err
    }
  }, [fetchAppointments])

  const confirmAppointment = useCallback(async (id: string) => {
    return updateAppointment(id, { status: 'confirmed' })
  }, [updateAppointment])

  const cancelAppointment = useCallback(async (id: string) => {
    return updateAppointment(id, { status: 'cancelled' })
  }, [updateAppointment])

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
