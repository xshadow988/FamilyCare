'use client';

import { createContext, useContext, useState, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import type { Medicine, Sale, Purchase } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from './auth-context';

interface AppContextType {
  medicines: Medicine[];
  setMedicines: Dispatch<SetStateAction<Medicine[]>>;
  sales: Sale[];
  setSales: Dispatch<SetStateAction<Sale[]>>;
  purchases: Purchase[];
  setPurchases: Dispatch<SetStateAction<Purchase[]>>;
  categories: string[];
  setCategories: Dispatch<SetStateAction<string[]>>;
  isLoaded: boolean;
  reload: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

async function fetchAll() {
  const [meds, sls, purch, cats] = await Promise.all([
    apiFetch('/api/medicines').then(r => r.json()),
    apiFetch('/api/sales').then(r => r.json()),
    apiFetch('/api/purchases').then(r => r.json()),
    apiFetch('/api/categories').then(r => r.json()),
  ]);
  return { meds, sls, purch, cats };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const reload = async () => {
    try {
      const { meds, sls, purch, cats } = await fetchAll();
      setMedicines(meds);
      setSales(sls);
      setPurchases(purch);
      setCategories(cats);
    } catch {
      // DB not configured yet — stay with empty state
    } finally {
      setIsLoaded(true);
    }
  };

  // Load only once we know who is signed in, and reload whenever that changes.
  //
  // Fetching on mount instead would run while the user is still on /login with
  // no session: apiFetch would see no demo flag, hit the real API, and load the
  // live pharmacy's data into this context. Logging in as `demo` afterwards is
  // a client-side navigation, so the provider never remounts and the demo user
  // would keep seeing production numbers.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setMedicines([]);
      setSales([]);
      setPurchases([]);
      setCategories([]);
      setIsLoaded(true);
      return;
    }
    setIsLoaded(false);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.username, user?.isDemo]);

  return (
    <AppContext.Provider value={{
      medicines, setMedicines,
      sales, setSales,
      purchases, setPurchases,
      categories, setCategories,
      isLoaded, reload,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function useMedicines() {
  return useAppContext();
}
