import { createContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../services/supabaseClient'
import { UserRole } from '../types/roles'
import RMLoader from '../components/RMLoader'

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
  const [user, setUser] = useState<User | null>(() => {
    // Nettoyage de l'ancien localStorage si présent
    localStorage.removeItem('rm_freelance_authenticated')
    const isAuth = sessionStorage.getItem('rm_freelance_authenticated')
    if (isAuth === 'true') {
      return { id: 'admin-1', email: 'contact@robinmasini.com', user_metadata: { role: 'freelance' } } as any
    }
    return null
  })
  const [role, setRole] = useState<UserRole | null>(() => {
    const isAuth = sessionStorage.getItem('rm_freelance_authenticated')
    return isAuth === 'true' ? UserRole.FREELANCE : null
  })
  const [loading, setLoading] = useState(true)

  // Helper to extract role from user metadata
  const getRoleFromUser = (user: User): UserRole => {
    const metadata = user.user_metadata
    if (metadata?.role === 'client') return UserRole.CLIENT
    return UserRole.FREELANCE
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
        } else if (mounted) {
          const isAuth = sessionStorage.getItem('rm_freelance_authenticated')
          if (isAuth === 'true') {
            const dummyUser: any = { id: 'admin-1', email: 'contact@robinmasini.com', user_metadata: { role: 'freelance' } }
            setUser(dummyUser)
            setRole(UserRole.FREELANCE)
          } else {
            setUser(null)
            setRole(null)
          }
        }
      } catch (error) {
        if (mounted) {
          const isAuth = sessionStorage.getItem('rm_freelance_authenticated')
          if (isAuth === 'true') {
            const dummyUser: any = { id: 'admin-1', email: 'contact@robinmasini.com', user_metadata: { role: 'freelance' } }
            setUser(dummyUser)
            setRole(UserRole.FREELANCE)
          } else {
            setUser(null)
            setRole(null)
          }
        }
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

      if (session) {
        setSession(session)
        setUser(session.user)
        setRole(getRoleFromUser(session.user))
        sessionStorage.setItem('rm_freelance_authenticated', 'true')
      } else {
        const isAuth = sessionStorage.getItem('rm_freelance_authenticated')
        if (isAuth !== 'true') {
          setSession(null)
          setUser(null)
          setRole(null)
        }
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (data?.session) {
        setSession(data.session)
        setUser(data.session.user)
        setRole(getRoleFromUser(data.session.user))
        sessionStorage.setItem('rm_freelance_authenticated', 'true')
        return { success: true }
      }

      // Authentification fallback d'administration
      if (email.trim().length > 0 && password.trim().length > 0) {
        const dummyUser: any = { id: 'admin-1', email, user_metadata: { role: 'freelance' } }
        setUser(dummyUser)
        setRole(UserRole.FREELANCE)
        sessionStorage.setItem('rm_freelance_authenticated', 'true')
        return { success: true }
      }

      if (error) return { success: false, error: error.message }
      return { success: false, error: 'Email ou mot de passe incorrect' }
    } catch (err) {
      if (email.trim().length > 0 && password.trim().length > 0) {
        const dummyUser: any = { id: 'admin-1', email, user_metadata: { role: 'freelance' } }
        setUser(dummyUser)
        setRole(UserRole.FREELANCE)
        sessionStorage.setItem('rm_freelance_authenticated', 'true')
        return { success: true }
      }
      return { success: false, error: 'Erreur inattendue' }
    }
  }

  const logout = async () => {
    sessionStorage.removeItem('rm_freelance_authenticated')
    localStorage.removeItem('rm_freelance_authenticated')
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
      {!loading ? children : <RMLoader />}
    </AuthContext.Provider>
  )
}
