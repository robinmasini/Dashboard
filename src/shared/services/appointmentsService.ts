import { supabase } from './supabaseClient'
import type { Appointment } from '../hooks/useSupabaseHooks'

export const appointmentsService = {
  async fetchAppointments(clientId?: string): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select('*, client:clients(*)')
      .order('appointment_date', { ascending: true })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async addAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select('*, client:clients(*)')
      .single()

    if (error) throw error
    return data
  },

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select('*, client:clients(*)')
      .single()

    if (error) throw error
    return data
  },

  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
