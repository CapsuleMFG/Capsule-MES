import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getMyProfile, logout as authLogout, login as authLogin } from '../services/auth.service';
import type { AuthUser } from '../../../shared/types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);

  async function loadProfile() {
    // Prevent concurrent profile fetches (React Strict Mode / lock race)
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const profile = await getMyProfile();
      setUser({ id: profile.id, email: profile.email, name: profile.name, role: profile.role });
    } catch {
      setUser(null);
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Check for existing session first (no lock needed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile();
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          loadProfile();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!supabase) throw new Error('Auth not configured');
    await authLogin(email, password);
  };

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within an AuthProvider');
  return context;
}
