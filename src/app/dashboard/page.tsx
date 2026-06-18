'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
  Plus,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { dailySalesData, monthlySalesData, defaultSettings } from '@/lib/data';
import { useAppContext } from '@/components/providers/app-context';
import { tpt, perTablet, isLowStock } from '@/lib/strip';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const CURRENCY = defaultSettings.currencySymbol;

function StatCard({
  title,
  value,
  change,
  trend,
  subtext,
}: {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtext?: string;
}) {
  return (
    <Card className="py-0 gap-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {change && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-muted border text-muted-foreground">
              {trend === 'up' && <TrendingUp className="h-2.5 w-2.5" />}
              {trend === 'down' && <TrendingDown className="h-2.5 w-2.5" />}
              {change}
            </span>
          )}
        </div>
        <p className="text-xl font-bold text-foreground tracking-tight leading-none">{value}</p>
        {subtext && <p className="text-[11px] text-muted-foreground mt-1.5">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}:</span>
            <span className="font-medium">{CURRENCY} {p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { medicines, sales } = useAppContext();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const tooltipContentStyle = {
    background: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px', fontSize: '11px',
  };
  const tooltipLabelStyle = { color: isDark ? '#f1f5f9' : '#1e293b', fontWeight: 600 };
  const lowStockMeds = medicines.filter(m => isLowStock(m) || m.stock === 0);

  const today = new Date().toDateString();
  const completedSales = sales.filter(s => s.status === 'completed');
  const todayRevenue = completedSales.filter(s => new Date(s.date).toDateString() === today).reduce((sum, s) => sum + s.total, 0);
  const monthlyRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);
  const monthlyProfit = completedSales.reduce((sum, s) => {
    const cost = s.items.reduce((c, item) => {
      const med = medicines.find(m => m.id === item.medicineId);
      return c + (med ? perTablet(med.purchasePrice, tpt(med)) : item.price * 0.4) * item.quantity;
    }, 0);
    return sum + (s.total - cost);
  }, 0);
  const todayChange = '0.0';

  const recentSales = sales.slice(0, 5);

  return (
    <AppLayout>
      <div className="p-5 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          <StatCard
            title="Today's Sales"
            value={`${CURRENCY} ${todayRevenue.toFixed(2)}`}
            subtext="Completed today"
          />
          <StatCard
            title="Total Revenue"
            value={`${CURRENCY} ${monthlyRevenue.toFixed(2)}`}
            subtext="All completed sales"
          />
          <StatCard
            title="Net Profit"
            value={`${CURRENCY} ${monthlyProfit.toFixed(2)}`}
            subtext="Revenue minus costs"
          />
          <StatCard
            title="Total Medicines"
            value={medicines.length.toString()}
            subtext="In inventory"
          />
          <StatCard
            title="Low Stock"
            value={lowStockMeds.length.toString()}
            change={lowStockMeds.length > 0 ? `${lowStockMeds.length} items` : undefined}
            trend={lowStockMeds.length > 0 ? 'down' : undefined}
            subtext="Below minimum"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Sales Area Chart */}
          <Card className="xl:col-span-2 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
                  <CardDescription>Last 7 days performance</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailySalesData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `${CURRENCY}${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue" />
                  <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} fill="url(#colorProfit)" name="Profit" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />Revenue
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Profit
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly bar chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Monthly Overview</CardTitle>
              <CardDescription>Revenue vs Cost (last 6 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlySalesData.slice(-6)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `${CURRENCY}${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`${CURRENCY}${Number(v).toLocaleString()}`, '']} labelStyle={tooltipLabelStyle} contentStyle={tooltipContentStyle} />
                  <Bar dataKey="revenue" fill="#2563EB" radius={[3, 3, 0, 0]} name="Revenue" />
                  <Bar dataKey="cost" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales + Low Stock */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Recent Sales */}
          <Card className="xl:col-span-2 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
                  <CardDescription>Latest transactions today</CardDescription>
                </div>
                <Link href="/sales-history">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                      <ShoppingCart className="h-4 w-4 text-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{sale.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{sale.customerName ?? 'Walk-in Patient'} · {sale.items.length} item{sale.items.length > 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{CURRENCY}{sale.total.toFixed(2)}</p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px] h-4 px-1.5',
                          sale.status === 'completed' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
                          sale.status === 'refunded' && 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
                          sale.status === 'pending' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
                        )}
                      >
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock + Quick Actions */}
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Low Stock Alert
                  </CardTitle>
                  <Badge variant="destructive" className="text-xs">{lowStockMeds.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {lowStockMeds.slice(0, 4).map((med) => (
                    <div key={med.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{med.name}</p>
                        <p className="text-xs text-muted-foreground">{med.category}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-bold text-red-600">{med.stock}</p>
                        <p className="text-[10px] text-muted-foreground">/ {med.minStock} min</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-3 border-t">
                  <Link href="/inventory">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View All Low Stock <ArrowRight className="ml-1.5 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Link href="/pos">
                  <Button variant="outline" className="w-full h-auto flex-col gap-1.5 py-3 hover:bg-muted transition-all">
                    <ShoppingCart className="h-4 w-4 text-foreground/70" />
                    <span className="text-xs">New Sale</span>
                  </Button>
                </Link>
                <Link href="/purchases">
                  <Button variant="outline" className="w-full h-auto flex-col gap-1.5 py-3 hover:bg-muted transition-all">
                    <Plus className="h-4 w-4 text-foreground/70" />
                    <span className="text-xs">Add Stock</span>
                  </Button>
                </Link>
                <Link href="/reports">
                  <Button variant="outline" className="w-full h-auto flex-col gap-1.5 py-3 hover:bg-muted transition-all">
                    <FileText className="h-4 w-4 text-foreground/70" />
                    <span className="text-xs">Reports</span>
                  </Button>
                </Link>
                <Link href="/inventory">
                  <Button variant="outline" className="w-full h-auto flex-col gap-1.5 py-3 hover:bg-muted transition-all">
                    <Package className="h-4 w-4 text-foreground/70" />
                    <span className="text-xs">Inventory</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
