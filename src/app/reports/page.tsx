'use client';

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/status-chip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Download,
  FileText,
  FileBarChart,
  Package,
  TrendingUp,
  AlertTriangle,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { defaultSettings } from '@/lib/data';
import { useAppContext } from '@/components/providers/app-context';
import { tpt, perTablet, formatStock } from '@/lib/strip';
import { cn } from '@/lib/utils';

const CURRENCY = defaultSettings.currencySymbol;

function ReportCard({ title, description, icon: Icon, onClick, isActive }: {
  title: string; description: string; icon: React.ElementType; onClick?: () => void; isActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border transition-all text-left w-full',
        isActive
          ? 'bg-foreground border-foreground shadow-sm'
          : 'bg-card border-border hover:border-foreground/30 hover:shadow-sm'
      )}
    >
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
        isActive ? 'bg-background/15' : 'bg-muted'
      )}>
        <Icon className={cn('h-4.5 w-4.5', isActive ? 'text-background' : 'text-foreground')} />
      </div>
      <div>
        <p className={cn('text-sm font-semibold', isActive ? 'text-background' : 'text-foreground')}>{title}</p>
        <p className={cn('text-xs mt-0.5', isActive ? 'text-background/65' : 'text-muted-foreground')}>{description}</p>
      </div>
    </button>
  );
}

export default function ReportsPage() {
  const { medicines, sales, purchases } = useAppContext();
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo, setDateTo] = useState('2026-05-20');
  const [activeTab, setActiveTab] = useState('sales');

  const lowStockMeds = medicines.filter(m => m.stock <= m.minStock * tpt(m));

  const filteredSales = sales.filter(s => {
    const d = new Date(s.date);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    return d >= new Date(dateFrom) && d <= to;
  });

  const salesRevenue = filteredSales.filter(s => s.status === 'completed').reduce((s, sale) => s + sale.total, 0);

  // Profit data computed from real sales
  const profitData = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; cost: number }>();
    sales.filter(s => s.status === 'completed').forEach(sale => {
      const date = new Date(sale.date);
      const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      const prev = monthMap.get(key) ?? { revenue: 0, cost: 0 };
      const saleCost = sale.items.reduce((c, item) => {
        const med = medicines.find(m => m.id === item.medicineId);
        return c + (med ? perTablet(med.purchasePrice, tpt(med)) : item.price * 0.4) * item.quantity;
      }, 0);
      monthMap.set(key, { revenue: prev.revenue + sale.total, cost: prev.cost + saleCost });
    });
    return Array.from(monthMap.entries()).map(([month, d]) => ({
      month,
      revenue: d.revenue,
      cost: d.cost,
      profit: d.revenue - d.cost,
    }));
  }, [sales, medicines]);

  const setQuickRange = (label: string) => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (label === 'Today') {
      setDateFrom(fmt(today)); setDateTo(fmt(today));
    } else if (label === 'Week') {
      const start = new Date(today); start.setDate(today.getDate() - 6);
      setDateFrom(fmt(start)); setDateTo(fmt(today));
    } else if (label === 'Month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(fmt(start)); setDateTo(fmt(today));
    }
  };

  const handleExport = () => {
    alert('Export feature: In production, this would generate a CSV/PDF download.');
  };

  return (
    <AppLayout>
      <div className="p-5 space-y-4">
        {/* Quick report cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <ReportCard title="Sales Report" description="All transactions and revenue details" icon={FileText} isActive={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
          <ReportCard title="Inventory Report" description="Stock levels and medicine details" icon={Package} isActive={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <ReportCard title="Profit Report" description="Revenue, cost, and profit analysis" icon={TrendingUp} isActive={activeTab === 'profit'} onClick={() => setActiveTab('profit')} />
          <ReportCard title="Low Stock Report" description="Medicines requiring restocking" icon={AlertTriangle} isActive={activeTab === 'lowstock'} onClick={() => setActiveTab('lowstock')} />
        </div>

        {/* Date Range — clean shadcn-consistent design */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end justify-between">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">From</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 text-sm w-44 rounded-xl border bg-background" />
                </div>
                <div className="pb-2.5 text-muted-foreground font-medium">—</div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">To</Label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 text-sm w-44 rounded-xl border bg-background" />
                </div>
                <div className="flex gap-1.5 pb-0.5">
                  {['Today', 'Week', 'Month'].map(label => (
                    <button key={label} onClick={() => setQuickRange(label)} className="h-10 px-3.5 rounded-xl border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleExport} className="h-10 gap-2 px-5 rounded-xl bg-foreground hover:bg-foreground/90 text-background shrink-0">
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Tables */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9 bg-muted/50">
            <TabsTrigger value="sales" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Sales
              {filteredSales.length > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center ml-0.5">{filteredSales.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs gap-1.5">
              <Package className="h-3.5 w-3.5" /> Inventory
            </TabsTrigger>
            <TabsTrigger value="profit" className="text-xs gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Profit
            </TabsTrigger>
            <TabsTrigger value="lowstock" className="text-xs gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
              {lowStockMeds.length > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center ml-0.5">{lowStockMeds.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Sales Report */}
          <TabsContent value="sales" className="mt-4">
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Sales Report</CardTitle>
                    <CardDescription>{dateFrom} to {dateTo} · {filteredSales.length} transactions · {CURRENCY}{salesRevenue.toFixed(2)} total</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                    <Download className="h-3.5 w-3.5" /> CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 text-muted-foreground font-medium">Invoice</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Patient</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Items</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Payment</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Total</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Date</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No sales in this date range</TableCell></TableRow>
                    ) : filteredSales.map(sale => (
                      <TableRow key={sale.id} className="hover:bg-muted/30">
                        <TableCell className="px-4 py-3 text-sm font-semibold text-foreground">{sale.invoiceNumber}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground">{sale.customerName ?? 'Walk-in'}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-foreground">{sale.items.length}</TableCell>
                        <TableCell className="px-4 py-3 text-sm capitalize text-foreground">{sale.paymentMethod}</TableCell>
                        <TableCell className="px-4 py-3 text-sm font-bold tabular-nums text-foreground">{CURRENCY} {sale.total.toFixed(2)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">{new Date(sale.date).toLocaleDateString()}</TableCell>
                        <TableCell className="px-4 py-3">
                          <StatusChip label={sale.status.charAt(0).toUpperCase() + sale.status.slice(1)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Report */}
          <TabsContent value="inventory" className="mt-4">
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Inventory Report</CardTitle>
                    <CardDescription>{medicines.length} medicines · stock valuation snapshot</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 bg-foreground hover:bg-foreground/90 text-background" onClick={handleExport}><Download className="h-3.5 w-3.5" /> CSV</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 text-muted-foreground font-medium">Medicine</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Category</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Stock</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Buy Price</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Sell Price</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Stock Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicines.map(m => (
                      <TableRow key={m.id} className="hover:bg-muted/30">
                        <TableCell className="px-4 py-3 text-sm font-semibold text-foreground">{m.name}</TableCell>
                        <TableCell className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{m.category}</Badge></TableCell>
                        <TableCell className={cn('px-4 py-3 text-sm font-semibold tabular-nums', m.stock <= m.minStock * tpt(m) ? 'text-red-600' : 'text-foreground')}>{formatStock(m.stock, m.tabletsPerStrip)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{CURRENCY} {m.purchasePrice.toFixed(2)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm tabular-nums font-medium text-foreground">{CURRENCY} {m.sellingPrice.toFixed(2)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm tabular-nums font-semibold text-foreground">{CURRENCY} {(m.stock * perTablet(m.sellingPrice, tpt(m))).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profit Report */}
          <TabsContent value="profit" className="mt-4">
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Profit Report</CardTitle>
                    <CardDescription>Monthly profit & loss summary</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 bg-foreground hover:bg-foreground/90 text-background" onClick={handleExport}><Download className="h-3.5 w-3.5" /> CSV</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 text-muted-foreground font-medium">Month</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Revenue</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Cost</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Profit</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitData.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-sm text-muted-foreground">No completed sales yet</TableCell></TableRow>
                    ) : profitData.map(m => {
                      const margin = m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) : '0.0';
                      return (
                        <TableRow key={m.month} className="hover:bg-muted/30">
                          <TableCell className="px-4 py-3 text-sm font-semibold text-foreground">{m.month}</TableCell>
                          <TableCell className="px-4 py-3 text-sm tabular-nums text-foreground font-medium">{CURRENCY} {m.revenue.toFixed(2)}</TableCell>
                          <TableCell className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{CURRENCY} {m.cost.toFixed(2)}</TableCell>
                          <TableCell className="px-4 py-3 text-sm tabular-nums font-bold text-foreground">{CURRENCY} {m.profit.toFixed(2)}</TableCell>
                          <TableCell className="px-4 py-3">
                            <StatusChip label={`${margin}%`} variant="green" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Low Stock Report */}
          <TabsContent value="lowstock" className="mt-4">
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Low Stock Report
                    </CardTitle>
                    <CardDescription>{lowStockMeds.length} medicines need restocking</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 bg-foreground hover:bg-foreground/90 text-background" onClick={handleExport}><Download className="h-3.5 w-3.5" /> CSV</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-4 text-muted-foreground font-medium">Medicine</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Category</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Current Stock</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Min Required</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Shortage</TableHead>
                      <TableHead className="px-4 text-muted-foreground font-medium">Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockMeds.map(m => {
                      const minTablets = m.minStock * tpt(m);
                      const shortage = Math.max(0, minTablets - m.stock);
                      const priority = m.stock === 0 ? 'Critical' : shortage > minTablets * 0.5 ? 'High' : 'Medium';
                      return (
                        <TableRow key={m.id} className="hover:bg-muted/30">
                          <TableCell className="px-4 py-3">
                            <p className="text-sm font-semibold text-foreground">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.category}</p>
                          </TableCell>
                          <TableCell className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{m.category}</Badge></TableCell>
                          <TableCell className="px-4 py-3 text-sm font-bold text-red-600 tabular-nums">{formatStock(m.stock, m.tabletsPerStrip)}</TableCell>
                          <TableCell className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{m.minStock} {tpt(m) > 1 ? 'strips' : ''}</TableCell>
                          <TableCell className="px-4 py-3 text-sm font-semibold tabular-nums text-foreground">{shortage}{tpt(m) > 1 ? ' tab' : ''}</TableCell>
                          <TableCell className="px-4 py-3">
                            <StatusChip label={priority} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
