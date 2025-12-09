import { createContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../services/supabaseClient'
import { UserRole } from '../types/roles'

type AuthContextType = {
  session: Session | null
  user: User | null
  role: UserRole | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  // Helper to extract role from user metadata
  const getRoleFromUser = (user: User): UserRole | null => {
    const metadata = user.user_metadata
    if (metadata?.role === 'freelance') return UserRole.FREELANCE
    if (metadata?.role === 'client') return UserRole.CLIENT
    return null
  }

  useEffect(() => {
    let mounted = true

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (mounted && session) {
          setSession(session)
          setUser(session.user)
          setRole(getRoleFromUser(session.user))
        }
      } catch (error) {
        console.error('⚠️ Auth initialization error:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)
      setRole(session?.user ? getRoleFromUser(session.user) : null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err) {
      return { success: false, error: 'Erreur inattendue' }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setRole(null)
  }

  const value = {
    session,
    user,
    role,
    loading,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <div style={{ color: '#666', padding: 20, textAlign: 'center' }}>Chargement...</div>}
    </AuthContext.Provider>
  )
}
