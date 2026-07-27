import { supabase } from './supabaseClient'
import type { TodoItem } from '../hooks/useSupabaseHooks'

export const tasksService = {
  async fetchTodoItems(clientId?: string): Promise<TodoItem[]> {
    let query = supabase
      .from('todo_items')
      .select('*')
      .order('column_id', { ascending: true })
      .order('order_index', { ascending: true })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async addTodoItem(item: Omit<TodoItem, 'id' | 'created_at'>): Promise<TodoItem> {
    const { data, error } = await supabase
      .from('todo_items')
      .insert(item)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateTodoItem(id: string, updates: Partial<TodoItem>): Promise<TodoItem> {
    const { data, error } = await supabase
      .from('todo_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async moveTodoItem(id: string, newColumnId: string, newOrderIndex: number): Promise<TodoItem> {
    const { data, error } = await supabase
      .from('todo_items')
      .update({ column_id: newColumnId, order_index: newOrderIndex })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteTodoItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('todo_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
