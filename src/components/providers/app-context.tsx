'use client';

import { createContext, useContext, useState, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import type { Medicine, Sale, Purchase } from '@/lib/types';
import { apiFetch } from '@/lib/api';

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

  useEffect(() => { reload(); }, []);

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
