'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { monthlySalesData, dailySalesData } from '@/lib/data';
import { useAppContext } from '@/components/providers/app-context';
import { defaultSettings } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

const CURRENCY = defaultSettings.currencySymbol;

const chartTooltipStyle = {
  contentStyle: { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600 },
};

const totalRevenue = monthlySalesData.reduce((s, m) => s + m.revenue, 0);
const totalCost = monthlySalesData.reduce((s, m) => s + m.cost, 0);
const totalProfit = monthlySalesData.reduce((s, m) => s + m.profit, 0);
const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

const thisMonth = monthlySalesData[monthlySalesData.length - 1];
const lastMonth = monthlySalesData[monthlySalesData.length - 2];
const monthlyProfitChange = lastMonth.profit > 0 ? (((thisMonth.profit - lastMonth.profit) / lastMonth.profit) * 100).toFixed(1) : '0.0';


function StatCard({ title, value, sub }: {
  title: string; value: string; sub?: string;
}) {
  return (
    <Card className="shadow-sm py-0 gap-0">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
        <p className="text-xl font-bold text-foreground tracking-tight leading-none">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function ProfitsPage() {
  const { medicines, sales } = useAppContext();
  const { resolvedTheme } = useTheme();
  const axisColor = resolvedTheme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const completedSales = sales.filter(s => s.status === 'completed');
  const realTotalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);
  const realTotalCost = completedSales.reduce((cost, s) => cost + s.items.reduce((c, item) => {
    const med = medicines.find(m => m.id === item.medicineId);
    return c + (med?.purchasePrice ?? item.price * 0.4) * item.quantity;
  }, 0), 0);
  const realTotalProfit = realTotalRevenue - realTotalCost;
  const realProfitMargin = realTotalRevenue > 0 ? ((realTotalProfit / realTotalRevenue) * 100).toFixed(1) : '0.0';

  const topMedicines = medicines
    .map(m => ({
      name: m.name,
      category: m.category,
      margin: m.sellingPrice > 0 ? (((m.sellingPrice - m.purchasePrice) / m.sellingPrice) * 100).toFixed(1) : '0.0',
      revenue: m.sellingPrice * Math.max(0, 500 - m.stock),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  return (
    <AppLayout>
      <div className="p-5 space-y-4">
        {/* Financial KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard title="Total Revenue" value={`${CURRENCY} ${realTotalRevenue.toFixed(2)}`} sub="From all sales" />
          <StatCard title="Total Cost" value={`${CURRENCY} ${realTotalCost.toFixed(2)}`} sub="Purchase cost" />
          <StatCard title="Net Profit" value={`${CURRENCY} ${realTotalProfit.toFixed(2)}`} sub="Revenue − Cost" />
          <StatCard title="Profit Margin" value={`${realProfitMargin}%`} sub="Average margin" />
          <StatCard title="Total Orders" value={String(completedSales.length)} sub="Completed sales" />
        </div>

        {/* Charts */}
        <Tabs defaultValue="monthly">
          <TabsList className="h-9 bg-muted/50">
            <TabsTrigger value="monthly" className="text-xs">Monthly Overview</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">Weekly Trend</TabsTrigger>
            <TabsTrigger value="comparison" className="text-xs">Revenue vs Cost</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Monthly Profit Trend</CardTitle>
                <CardDescription>12-month profit performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlySalesData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [`${CURRENCY}${Number(v).toLocaleString()}`, '']} {...chartTooltipStyle} />
                    <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2.5} fill="url(#profitGrad)" name="Net Profit" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Weekly Performance</CardTitle>
                <CardDescription>Last 7 days — revenue, cost, and profit</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dailySalesData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={(v) => [`${CURRENCY}${Number(v).toLocaleString()}`, '']} {...chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={false} name="Revenue" />
                    <Line type="monotone" dataKey="cost" stroke="#F59E0B" strokeWidth={2} dot={false} name="Cost" />
                    <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2.5} dot={false} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Revenue vs Cost</CardTitle>
                <CardDescription>Monthly comparison for the past year</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlySalesData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [`${CURRENCY}${Number(v).toLocaleString()}`, '']} {...chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="revenue" fill="#2563EB" radius={[3, 3, 0, 0]} name="Revenue" />
                    <Bar dataKey="cost" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Cost" />
                    <Bar dataKey="profit" fill="#10B981" radius={[3, 3, 0, 0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Top Profitable Medicines */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top Performing Medicines</CardTitle>
            <CardDescription>Ranked by estimated revenue contribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMedicines.map((med, i) => (
                <div key={med.name} className="flex items-center gap-3">
                  <div className="w-6 text-xs font-bold text-muted-foreground text-right shrink-0">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">{med.name}</p>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="secondary" className="text-[10px]">{med.margin}% margin</Badge>
                        <span className="text-sm font-bold text-emerald-600">{CURRENCY}{med.revenue.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                        style={{ width: topMedicines[0].revenue > 0 ? `${(med.revenue / topMedicines[0].revenue) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
