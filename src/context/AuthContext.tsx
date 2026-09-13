import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Business, BusinessMember } from '@/types'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
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
  const [business, setBusiness] = useState<Business | null>(null)
  const [membership, setMembership] = useState<BusinessMember | null>(null)

  async function loadBusinessData(userId: string) {
    const { data: member } = await supabase
      .from('business_members')
      .select('*, businesses(*)')
      .eq('user_id', userId)
      .maybeSingle()

    if (member) {
      setMembership(member as BusinessMember)
      setBusiness(member.businesses as Business)
    } else {
      setMembership(null)
      setBusiness(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadBusinessData(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        (async () => {
          await loadBusinessData(session.user.id)
          setLoading(false)
        })()
      } else {
        setBusiness(null)
        setMembership(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) return { error: error.message }
    // The owner's business and membership row are created during onboarding,
    // where the business itself exists and can be linked in one step.
    void data
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setBusiness(null)
    setMembership(null)
  }

  const refreshBusiness = async () => {
    if (user) await loadBusinessData(user.id)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, business, membership, signIn, signUp, signOut, refreshBusiness }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
