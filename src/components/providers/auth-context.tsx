'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser } from '@/lib/auth';
import { resetDemoData, DEMO_TTL_MS } from '@/lib/demo-store';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('fc_auth');
      if (stored) {
        const u = JSON.parse(stored) as AuthUser;
        // End a demo session older than 24h so the next pitch starts from a
        // clean, deliberate login rather than yesterday's half-filled sandbox.
        const expired = u?.isDemo && Date.now() - (u.demoStartedAt ?? 0) > DEMO_TTL_MS;
        if (expired) {
          resetDemoData();
          localStorage.removeItem('fc_auth');
        } else {
          setUser(u);
        }
      }
    } catch {}
    setIsLoading(false);
  }, []);

  const login = (u: AuthUser) => {
    // Every demo login starts from an empty sandbox, and starts the 24h clock.
    const session = u.isDemo ? { ...u, demoStartedAt: Date.now() } : u;
    if (u.isDemo) resetDemoData();
    setUser(session);
    localStorage.setItem('fc_auth', JSON.stringify(session));
  };

  const logout = () => {
    if (user?.isDemo) resetDemoData();
    setUser(null);
    localStorage.removeItem('fc_auth');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
