import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Business, BusinessMember } from "@/types";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  business: Business | null;
  membership: BusinessMember | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  recoveryMode: boolean;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [membership, setMembership] = useState<BusinessMember | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  async function loadBusinessData(userId: string) {
    try {
      const { data: members, error: memberError } = await supabase
        .from("business_members")
        .select("*, businesses(*)")
        .eq("user_id", userId)
        .limit(2);

      if (memberError) {
        console.error("Error loading business member:", memberError);
        setError("Failed to load business data");
        setMembership(null);
        setBusiness(null);
        return;
      }

      if (members && members.length > 1) {
        console.error("Multiple business memberships found for user:", userId);
        setError("Multiple business memberships found. Please contact your administrator.");
        setMembership(null);
        setBusiness(null);
        return;
      }

      const member = members?.[0] ?? null;

      if (member) {
        setMembership(member as BusinessMember);
        setBusiness(member.businesses as Business);
        setError(null);
      } else {
        setMembership(null);
        setBusiness(null);
        setError(null);
      }
    } catch (err) {
      console.error("Error in loadBusinessData:", err);
      setError("Failed to load business data");
      setMembership(null);
      setBusiness(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          if (isMounted) {
            setError("Failed to load session");
            setLoading(false);
          }
          return;
        }

        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await loadBusinessData(currentSession.user.id);
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (isMounted) {
          setError("Failed to initialize authentication");
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setRecoveryMode(_event === "PASSWORD_RECOVERY");
      setError(null);

      if (currentSession?.user) {
        // Supabase recommends keeping auth callbacks synchronous. Defer the
        // database query so auth event processing is not blocked by I/O.
        setTimeout(() => {
          if (isMounted) {
            void loadBusinessData(currentSession.user.id);
          }
        }, 0);
      } else {
        setBusiness(null);
        setMembership(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) return { error: error.message };

      // Load the business before AuthPage navigates to "/". This prevents a
      // race where Protected briefly sees an authenticated user without
      // business data and redirects to onboarding even though membership
      // data is already available.
      if (data.user) {
        await loadBusinessData(data.user.id);
      }

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      return { error: message };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) return { error: error.message };

      return {
        error: null,
        requiresEmailConfirmation: !data.session,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      return { error: message };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const redirectTo = typeof window !== "undefined" ? window.location.origin + "/auth" : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), redirectTo ? { redirectTo } : undefined);
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Password reset request failed" };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) setRecoveryMode(false);
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Password update failed" };
    }
  };

  const signOut = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error("Sign out error:", signOutError);
        setError("Failed to sign out");
        return;
      }

      setSession(null);
      setUser(null);
      setBusiness(null);
      setMembership(null);
      setError(null);
    } catch (err) {
      console.error("Sign out error:", err);
      setError("Failed to sign out");
    }
  };

  const refreshBusiness = async () => {
    if (user) await loadBusinessData(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        error,
        business,
        membership,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
        recoveryMode,
        refreshBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
