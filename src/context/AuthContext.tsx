import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Business, BusinessMember } from '@/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  error: string | null
  business: Business | null
  membership: BusinessMember | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshBusiness: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [membership, setMembership] = useState<BusinessMember | null>(null)

  async function loadBusinessData(userId: string) {
    try {
      const { data: member, error: memberError } = await supabase
        .from('business_members')
        .select('*, businesses(*)')
        .eq('user_id', userId)
        .maybeSingle()

      if (memberError) {
        console.error('Error loading business member:', memberError)
        setError('Failed to load business data')
        setMembership(null)
        setBusiness(null)
        return
      }

      if (member) {
        setMembership(member as BusinessMember)
        setBusiness(member.businesses as Business)
        setError(null)
      } else {
        setMembership(null)
        setBusiness(null)
      }
    } catch (err) {
      console.error('Error in loadBusinessData:', err)
      setError('Failed to load business data')
      setMembership(null)
      setBusiness(null)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Failed to load session')
          setLoading(false)
          return
        }

        if (isMounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)

          if (currentSession?.user) {
            await loadBusinessData(currentSession.user.id)
          }
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        if (isMounted) {
          setError('Failed to initialize authentication')
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!isMounted) return

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await loadBusinessData(currentSession.user.id)
        } else {
          setBusiness(null)
          setMembership(null)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      return { error: message }
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      return { error: message }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setBusiness(null)
      setMembership(null)
      setError(null)
    } catch (err) {
      console.error('Sign out error:', err)
      setError('Failed to sign out')
    }
  }

  const refreshBusiness = async () => {
    if (user) await loadBusinessData(user.id)
  }

  return (
    <AuthContext.Provider
      value={{ session, user, loading, error, business, membership, signIn, signUp, signOut, refreshBusiness }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
