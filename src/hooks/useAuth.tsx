import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error: string | null }>;
  register: (username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const toEmail = (username: string) => `${username.toLowerCase()}@liikumispaevik.app`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or create profile for user (handles Google OAuth users too)
  useEffect(() => {
    if (!user) {
      setUsername(null);
      return;
    }
    const ensureProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setUsername(data.username);
      } else {
        // Auto-create profile for OAuth users
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "kasutaja";
        await supabase
          .from("profiles")
          .insert({ user_id: user.id, username: name });
        setUsername(name);
      }
    };
    ensureProfile();
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    });
    if (error) return { error: "Vale kasutajanimi või parool" };
    return { error: null };
  };

  const register = async (username: string, password: string) => {
    const { data: exists } = await supabase.rpc("check_username_exists", {
      p_username: username,
    });
    if (exists) return { error: "See kasutajanimi on juba kasutusel" };

    const { data, error } = await supabase.auth.signUp({
      email: toEmail(username),
      password,
    });
    if (error) return { error: error.message };

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ user_id: data.user.id, username });
      if (profileError) return { error: "Profiili loomine ebaõnnestus" };
    }

    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, username, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
