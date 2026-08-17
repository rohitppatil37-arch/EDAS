import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types/database";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

// Single subscription + single profile fetch shared by the whole app, instead of
// every page that calls useAuth() re-subscribing and re-querying `profiles` on its
// own mount (previously: one extra "profiles" SELECT per admin page navigation).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const knownUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile(userId: string) {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (active) setProfile((data as Profile) ?? null);
    }

    // Dedupes against the currently-known user so routine auth events (token
    // refresh on tab focus, etc.) don't trigger a redundant profile refetch —
    // only an actual sign-in/sign-out (a real user change) does.
    function syncSession(newSession: Session | null) {
      if (!active) return;
      setSession(newSession);
      const userId = newSession?.user.id ?? null;
      if (userId === knownUserId.current) return;
      knownUserId.current = userId;
      if (userId) {
        loadProfile(userId);
      } else {
        setProfile(null);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session);
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      syncSession(newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ session, profile, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
