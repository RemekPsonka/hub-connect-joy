import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Director {
  id: string;
  tenant_id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string | null;
}

interface Assistant {
  id: string;
  director_id: string;
  tenant_id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  allowed_group_ids: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  director: Director | null;
  assistant: Assistant | null;
  isAssistant: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [director, setDirector] = useState<Director | null>(null);
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDirector = async (userId: string) => {
    const { data, error } = await supabase
      .from('directors')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching director:', error);
      return null;
    }
    return data as Director;
  };

  const fetchAssistant = async (userId: string): Promise<Assistant | null> => {
    const { data, error } = await supabase
      .from('assistants')
      .select(`
        *,
        allowed_groups:assistant_group_access(group_id)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching assistant:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      director_id: data.director_id,
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      full_name: data.full_name,
      email: data.email,
      is_active: data.is_active,
      allowed_group_ids: data.allowed_groups?.map((g: { group_id: string }) => g.group_id) || [],
    };
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(async () => {
            const dir = await fetchDirector(session.user.id);
            setDirector(dir);
            
            if (!dir) {
              const asst = await fetchAssistant(session.user.id);
              setAssistant(asst);
            } else {
              setAssistant(null);
            }
          }, 0);
        } else {
          setDirector(null);
          setAssistant(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const dir = await fetchDirector(session.user.id);
        setDirector(dir);
        
        if (!dir) {
          const asst = await fetchAssistant(session.user.id);
          setAssistant(asst);
        }
        
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setDirector(null);
    setAssistant(null);
  };

  const isAssistant = assistant !== null && director === null;

  return (
    <AuthContext.Provider value={{ user, session, director, assistant, isAssistant, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
