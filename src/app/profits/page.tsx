'use client';

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
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
import { tpt, perTablet } from '@/lib/strip';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { PERIOD_LABELS, monthBounds, rangeBounds, inPeriod, type DateWindow } from '@/lib/period';

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


export default function ProfitsPage() {
  const { medicines, sales, purchases } = useAppContext();
  const { resolvedTheme } = useTheme();
  const axisColor = resolvedTheme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = resolvedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const [periodFilter, setPeriodFilter] = useState('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateWindow = useMemo((): DateWindow | null => {
    if (periodFilter === 'thismonth') return monthBounds(new Date());
    if (periodFilter === 'custom' && customRange?.from) return rangeBounds(customRange.from, customRange.to);
    return null;
  }, [periodFilter, customRange]);

  const periodLabel = periodFilter === 'custom'
    ? (customRange?.from
        ? customRange.to
          ? `${format(customRange.from, 'dd MMM')} – ${format(customRange.to, 'dd MMM yyyy')}`
          : format(customRange.from, 'dd MMM yyyy')
        : 'Custom Range (no dates picked)')
    : periodFilter === 'thismonth'
      ? format(new Date(), 'MMMM yyyy')
      : PERIOD_LABELS[periodFilter];

  const completedSales = useMemo(
    () => sales.filter(s => s.status === 'completed' && inPeriod(s.date, periodFilter, dateWindow)),
    [sales, periodFilter, dateWindow],
  );

  const realTotalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);

  // Cost of goods SOLD — only the stock that actually left the shelf in this
  // period. This is what makes profit differ from money spent on stock.
  const realTotalCost = completedSales.reduce((cost, s) => cost + s.items.reduce((c, item) => {
    const med = medicines.find(m => m.id === item.medicineId);
    return c + (med ? perTablet(med.purchasePrice, tpt(med)) : item.price * 0.4) * item.quantity;
  }, 0), 0);
  const realTotalProfit = realTotalRevenue - realTotalCost;
  const realProfitMargin = realTotalRevenue > 0 ? ((realTotalProfit / realTotalRevenue) * 100).toFixed(1) : '0.0';

  // Money actually spent buying stock in the same period. Deliberately NOT
  // part of the profit sum — stock bought but unsold is inventory, not a loss.
  const stockPurchased = useMemo(
    () => purchases
      .filter(p => p.status === 'received' && inPeriod(p.date, periodFilter, dateWindow))
      .reduce((sum, p) => sum + p.total, 0),
    [purchases, periodFilter, dateWindow],
  );
  const stockNotYetSold = stockPurchased - realTotalCost;
  const cashDifference = realTotalRevenue - stockPurchased;
  const purchaseDays = useMemo(
    () => purchases.map(p => { const d = new Date(p.date); d.setHours(12, 0, 0, 0); return d; }),
    [purchases],
  );
  const money = (n: number) => `${CURRENCY} ${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        {/* Period selector — profit is only meaningful for a stated window */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodFilter} onValueChange={v => {
            if (!v) return;
            setPeriodFilter(v);
            if (v === 'custom') setCalendarOpen(true);
          }}>
            <SelectTrigger className="w-44 h-9 text-sm border-0 bg-muted/50 rounded-xl">
              <CalendarRange className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue>{PERIOD_LABELS[periodFilter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="daily">Daily (Today)</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-Weekly</SelectItem>
              <SelectItem value="monthly">Monthly (30 days)</SelectItem>
              <SelectItem value="thismonth">This Month</SelectItem>
              <SelectItem value="custom">Custom Range…</SelectItem>
            </SelectContent>
          </Select>

          {periodFilter === 'custom' && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger className="inline-flex items-center gap-1.5 w-56 shrink-0 h-9 px-3 text-sm rounded-xl bg-muted/50 text-foreground hover:bg-muted transition-colors overflow-hidden">
                <CalendarRange className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {customRange?.from
                    ? customRange.to
                      ? `${format(customRange.from, 'dd MMM')} – ${format(customRange.to, 'dd MMM yyyy')}`
                      : format(customRange.from, 'dd MMM yyyy')
                    : 'Pick date(s)'}
                </span>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  defaultMonth={customRange?.from ?? new Date()}
                  selected={customRange}
                  onSelect={setCustomRange}
                  disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                  modifiers={{ hasPurchase: purchaseDays }}
                  modifiersStyles={{
                    hasPurchase: {
                      fontWeight: 700,
                      textDecoration: 'underline',
                      textDecorationColor: 'var(--primary)',
                      textDecorationThickness: '2px',
                      textUnderlineOffset: '3px',
                    },
                  }}
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-2">Underlined</span> days have purchases
                  </p>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCustomRange(undefined)}>Clear</Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <span className="text-xs text-muted-foreground">Showing <span className="font-semibold text-foreground">{periodLabel}</span></span>
        </div>

        {/* Financial KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard description="Total Revenue" value={money(realTotalRevenue)} footerMain="From completed sales" footerSub={periodLabel} />
          <StatCard description="Total Cost" value={money(realTotalCost)} footerMain="Cost of goods sold" footerSub="Only stock that sold" />
          <StatCard description="Net Profit" value={money(realTotalProfit)} badge={{ icon: realTotalProfit >= 0 ? 'up' : 'down', text: realTotalProfit >= 0 ? 'Profit' : 'Loss' }} footerMain="Revenue minus cost of goods sold" footerSub={periodLabel} />
          <StatCard description="Profit Margin" value={`${realProfitMargin}%`} badge={{ icon: 'up', text: `${realProfitMargin}%` }} footerMain="Average margin" footerSub="Profit ÷ revenue" />
          <StatCard description="Total Orders" value={String(completedSales.length)} footerMain="Completed sales" footerSub="Total transactions" />
        </div>

        {/* Reconciliation — why profit is not "revenue minus what we spent on stock" */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">How this profit is calculated</CardTitle>
            <CardDescription>{periodLabel} — profit counts only the stock that was actually sold</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Profit */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">Revenue (completed sales)</span>
                  <span className="font-semibold tabular-nums">{money(realTotalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">− Cost of goods <span className="font-semibold text-foreground">sold</span></span>
                  <span className="font-semibold tabular-nums text-amber-600">−{money(realTotalCost).replace(CURRENCY + ' ', CURRENCY + ' ')}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between border-t pt-2.5">
                  <span className="text-sm font-semibold">Net Profit</span>
                  <span className={cn('text-lg font-bold tabular-nums', realTotalProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {money(realTotalProfit)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  This is the figure shown on the Dashboard and Sales History.
                </p>
              </div>

              {/* Cash view */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">Stock purchased in this period</span>
                  <span className="font-semibold tabular-nums">{money(stockPurchased)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">Of that, <span className="font-semibold text-foreground">not yet sold</span></span>
                  <span className={cn('font-semibold tabular-nums', stockNotYetSold >= 0 ? 'text-blue-600' : 'text-muted-foreground')}>
                    {money(stockNotYetSold)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between border-t pt-2.5">
                  <span className="text-sm font-semibold">Revenue − stock purchased</span>
                  <span className="text-lg font-bold tabular-nums text-foreground">{money(cashDifference)}</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  This is cash flow, not profit. It is lower whenever you restock
                  more than you sell — that stock is still on the shelf.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                The two figures differ by{' '}
                <span className="font-semibold text-foreground">{money(Math.abs(stockNotYetSold))}</span>
                {stockNotYetSold >= 0
                  ? ' — stock bought in this period that has not been sold yet. It is inventory you still own, not a loss, and its profit will appear when it sells.'
                  : ' — stock sold in this period that was bought earlier, so the cost falls outside this window.'}
              </p>
            </div>
          </CardContent>
        </Card>

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
