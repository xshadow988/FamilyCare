'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, ShoppingBag,
  Receipt, TrendingUp, BarChart3, Settings, Cross, LogOut, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const mainNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/pos', icon: ShoppingCart, label: 'POS' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/purchases', icon: ShoppingBag, label: 'Purchases' },
  { href: '/sales-history', icon: Receipt, label: 'Sales History' },
  { href: '/profits', icon: TrendingUp, label: 'Profits' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="flex h-full w-64 flex-col bg-card border-r">
      {/* Brand */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-7 w-7 rounded-full ring-[1.5px] ring-foreground flex items-center justify-center shrink-0">
            <Cross className="h-3 w-3 text-foreground" strokeWidth={3} />
          </div>
          <span className="font-semibold text-sm text-foreground tracking-tight">Family Care</span>
        </div>

        {/* Quick action */}
        <Link
          href="/pos"
          className="flex items-center gap-2.5 h-9 w-full px-3 rounded-full bg-muted text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors font-medium"
        >
          <Plus className="h-4 w-4 shrink-0" />
          New Sale
        </Link>
      </div>

      <Separator />

      {/* Main navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-2 space-y-0.5">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                isActive(item.href)
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}

          <div className="pt-4 pb-1.5">
            <p className="px-3 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">System</p>
          </div>

          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
              isActive('/settings')
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
        </nav>
      </ScrollArea>

      {/* User */}
      <Separator />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-foreground">MS</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">M.Shafique</p>
            <p className="text-[11px] text-muted-foreground truncate">Manager</p>
          </div>
          <button className="text-muted-foreground hover:text-destructive transition-colors" title="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
