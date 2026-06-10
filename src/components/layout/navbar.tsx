'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Search, Sun, Moon, Monitor, ChevronDown, Check,
  User, Settings, LogOut, ShoppingCart, Package, ShoppingBag,
  LayoutDashboard, BarChart3, Menu,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';
import { useAuth } from '@/components/providers/auth-context';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your pharmacy operations' },
  '/pos': { title: 'Point of Sale', subtitle: 'Process prescriptions and over-the-counter sales' },
  '/inventory': { title: 'Inventory', subtitle: 'Manage medicine stock and details' },
  '/purchases': { title: 'Purchases', subtitle: 'Record and track stock purchases' },
  '/sales-history': { title: 'Sales History', subtitle: 'View all past transactions and invoices' },
  '/profits': { title: 'Profits & Analytics', subtitle: 'Financial performance and profit insights' },
  '/reports': { title: 'Reports', subtitle: 'Generate and export detailed reports' },
  '/settings': { title: 'Settings', subtitle: 'Configure your pharmacy system' },
  '/profile': { title: 'My Profile', subtitle: 'Your account details' },
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-foreground transition-colors">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'bg-accent' : ''}>
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'bg-accent' : ''}>
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'bg-accent' : ''}>
          <Monitor className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Small muted heading that labels a segment inside the menu.
 *  Plain div on purpose — base-ui's Menu.GroupLabel throws if it's not a
 *  direct child of a Menu.Group, and these headings are purely visual. */
function SegmentLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="presentation"
      className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground/60 select-none"
    >
      {children}
    </div>
  );
}

function UserMenu() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin';
  const initials = (user?.name ?? '?')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const go = (href: string) => router.push(href);
  const handleLogout = () => { logout(); router.replace('/login'); };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2 rounded-full hover:bg-muted transition-colors">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-foreground text-background text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs font-semibold text-foreground">{user?.name ?? '—'}</span>
          <span className="text-[10px] text-muted-foreground capitalize">{user?.role ?? ''}</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-1">
        {/* Identity header */}
        <div className="flex items-center gap-3 px-2 py-2.5">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-foreground text-background text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground truncate">@{user?.username ?? ''}</p>
            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {isAdmin ? 'Administrator' : 'Staff'}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Account */}
        <SegmentLabel>Account</SegmentLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => go('/profile')}>
            <User className="mr-2 h-4 w-4" /> My Profile
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem onClick={() => go('/settings')}>
              <Settings className="mr-2 h-4 w-4" /> Account Settings
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Quick actions */}
        <SegmentLabel>Quick Actions</SegmentLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => go('/pos')}>
            <ShoppingCart className="mr-2 h-4 w-4" /> New Sale
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go('/inventory')}>
            <Package className="mr-2 h-4 w-4" /> Manage Inventory
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go('/purchases')}>
            <ShoppingBag className="mr-2 h-4 w-4" /> Record Purchase
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={() => go('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go('/reports')}>
                <BarChart3 className="mr-2 h-4 w-4" /> Reports
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Appearance */}
        <SegmentLabel>Appearance</SegmentLabel>
        <DropdownMenuGroup>
          {themeOptions.map(opt => (
            <DropdownMenuItem
              key={opt.value}
              closeOnClick={false}
              onClick={() => setTheme(opt.value)}
            >
              <opt.icon className="mr-2 h-4 w-4" /> {opt.label}
              {theme === opt.value && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Session */}
        <SegmentLabel>Session</SegmentLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] ?? { title: 'Family Care', subtitle: '' };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Mobile trigger */}
      <Sheet>
        <SheetTrigger className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-foreground transition-colors">
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <div className="min-w-0 shrink-0">
        <h1 className="text-base font-semibold text-foreground leading-tight truncate">{pageInfo.title}</h1>
        <p className="text-xs text-muted-foreground hidden sm:block truncate">{pageInfo.subtitle}</p>
      </div>

      {/* Search — fills all space between title and actions */}
      <div className="relative flex-1 hidden md:flex px-4">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search anything..."
          className="h-9 w-full pl-9 text-sm bg-muted/50 border-0 focus-visible:ring-1 rounded-full"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
