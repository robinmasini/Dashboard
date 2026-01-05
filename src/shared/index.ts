// Exports centralisés pour faciliter les imports

// Services
export { supabase } from './services/supabaseClient'
export * from './services/uploadService'


// Contexts & Hooks
export * from './contexts/AuthProvider'
export * from './hooks/useAuth'

// Utils
export * from './utils/auth'

// Types
export * from './types/roles'

// Hooks Data
export * from './hooks/useSupabaseHooks'
export * from './utils/date'

// Components
export { default as RobinLogo } from './components/RobinLogo'
export { default as SectionTabs } from './components/SectionTabs'
export { default as ProtectedRoute } from './components/ProtectedRoute'

// Types (from useSupabaseHooks)
export type {
  Ticket,
  Proposal,
  Invoice,
  Project,
  Message,
  Document,
  AgendaEvent,
  TodoItem,
  TimeEntry,
  Client,
} from './hooks/useSupabaseHooks'
