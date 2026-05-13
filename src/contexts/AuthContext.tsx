import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'admin' | 'planner' | 'productor' | 'armado';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAdmin: () => boolean;
  canEditProgramming: (sector?: string) => boolean;
  canEditProduction: (sector?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const getRoleFromEmail = (email?: string): UserRole | null => {
    if (!email) return null;
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes('admin')) return 'admin';
    if (lowerEmail.includes('planificador')) return 'planner';
    if (lowerEmail.includes('produccion')) return 'productor';
    if (lowerEmail.includes('armador')) return 'armado';
    return null;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setRole(getRoleFromEmail(currentUser?.email));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setRole(getRoleFromEmail(currentUser?.email));
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) throw error;
  };

  const isAdmin = () => role === 'admin';
  
  const canEditProgramming = (sector?: string) => {
    if (role === 'admin' || role === 'planner') return true;
    if (role === 'armado' && sector === 'Armado') return true;
    return false;
  };

  const canEditProduction = (sector?: string) => {
    if (role === 'admin' || role === 'productor') return true;
    if (role === 'armado' && sector === 'Armado') return true;
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword,
      isAdmin,
      canEditProgramming,
      canEditProduction
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
