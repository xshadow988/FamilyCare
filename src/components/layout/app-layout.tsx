'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { useAuth } from '@/components/providers/auth-context';
import { ADMIN_PATHS } from '@/lib/auth';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    const isAdminOnly = ADMIN_PATHS.some(p => pathname.startsWith(p));
    if (user.role === 'user' && isAdminOnly) {
      router.replace('/pos');
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading || !user) return null;

  const isAdminOnly = ADMIN_PATHS.some(p => pathname.startsWith(p));
  if (user.role === 'user' && isAdminOnly) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar - desktop only */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        {user.isDemo && (
          <div className="shrink-0 bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
            Demo mode — sample data only, stored in this browser. Nothing here is saved to the pharmacy database, and it clears when you log out.
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
