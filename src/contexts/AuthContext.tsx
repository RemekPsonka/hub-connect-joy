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

interface MFAState {
  required: boolean;
  factorId: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  director: Director | null;
  assistant: Assistant | null;
  isAssistant: boolean;
  loading: boolean;
  mfaState: MFAState;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; needsMFA?: boolean; factorId?: string }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  completeMFAVerification: () => void;
  cancelMFA: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [director, setDirector] = useState<Director | null>(null);
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaState, setMFAState] = useState<MFAState>({ required: false, factorId: null });

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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error };
    }

    // Check if MFA is required
    if (data.user) {
      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
        
        if (verifiedFactors.length > 0) {
          // MFA is required - set state and return
          setMFAState({
            required: true,
            factorId: verifiedFactors[0].id,
          });
          return { 
            error: null, 
            needsMFA: true, 
            factorId: verifiedFactors[0].id 
          };
        }
      } catch (err) {
        console.error('Error checking MFA factors:', err);
      }
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
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
    setMFAState({ required: false, factorId: null });
  };

  const completeMFAVerification = () => {
    setMFAState({ required: false, factorId: null });
  };

  const cancelMFA = async () => {
    await supabase.auth.signOut();
    setMFAState({ required: false, factorId: null });
    setUser(null);
    setSession(null);
  };

  const isAssistant = assistant !== null && director === null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      director, 
      assistant, 
      isAssistant, 
      loading, 
      mfaState,
      signIn,
      signInWithGoogle,
      signUp, 
      signOut,
      completeMFAVerification,
      cancelMFA,
    }}>
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
