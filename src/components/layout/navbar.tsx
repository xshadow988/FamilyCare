'use client';

import { usePathname } from 'next/navigation';
import { Search, Sun, Moon, Monitor, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Sidebar } from './sidebar';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your pharmacy operations' },
  '/pos': { title: 'Point of Sale', subtitle: 'Process prescriptions and over-the-counter sales' },
  '/inventory': { title: 'Inventory', subtitle: 'Manage medicine stock and details' },
  '/purchases': { title: 'Purchases', subtitle: 'Record and track stock purchases' },
  '/sales-history': { title: 'Sales History', subtitle: 'View all past transactions and invoices' },
  '/profits': { title: 'Profits & Analytics', subtitle: 'Financial performance and profit insights' },
  '/reports': { title: 'Reports', subtitle: 'Generate and export detailed reports' },
  '/settings': { title: 'Settings', subtitle: 'Configure your pharmacy system' },
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
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2 rounded-full hover:bg-muted transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                MS
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-foreground">M.Shafique</span>
              <span className="text-[10px] text-muted-foreground">Manager</span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-semibold">M.Shafique</p>
                <p className="text-xs text-muted-foreground font-normal">manager@familycare.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
