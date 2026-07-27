import { supabase } from './supabaseClient'
import type { Invoice } from '../types'

export const invoicesService = {
  async fetchInvoices(clientId?: string): Promise<Invoice[]> {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async addInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteInvoice(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
