'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/status-chip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, Eye, Printer, Receipt, TrendingUp, DollarSign,
  ShoppingCart, Filter, RotateCcw, AlertTriangle, CalendarRange, Trash2, Wallet,
} from 'lucide-react';
import { defaultSettings } from '@/lib/data';
import { printReceipt } from '@/lib/print-receipt';
import { useAppContext } from '@/components/providers/app-context';
import { Sale } from '@/lib/types';
import { cn } from '@/lib/utils';

const CURRENCY = defaultSettings.currencySymbol;

const PERIOD_LABELS: Record<string, string> = {
  all: 'All Time',
  daily: 'Daily (Today)',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  bimonthly: 'Bi-Monthly',
};

const STATUS_LABELS: Record<string, string> = {
  All: 'All Status',
  completed: 'Completed',
  refunded: 'Refunded',
  pending: 'Pending',
};

const PAYMENT_LABELS: Record<string, string> = {
  All: 'All Payment',
  cash: 'Cash',
  card: 'Card',
  insurance: 'Insurance',
};


function PaymentBadge({ method }: { method: Sale['paymentMethod'] }) {
  const cls = 'bg-muted text-muted-foreground';
  return <Badge className={cn('text-[11px] rounded-full hover:opacity-100', cls)}>{method.charAt(0).toUpperCase() + method.slice(1)}</Badge>;
}

export default function SalesHistoryPage() {
  const { sales, setSales, medicines, setMedicines, setPurchases } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [reverting, setReverting] = useState(false);

  const handleRevert = async () => {
    if (!selectedSale) return;
    setReverting(true);
    try {
      const res = await fetch(`/api/sales/${selectedSale.id}/revert`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      // Update local state — mark sale refunded and restore stock
      setSales(prev => prev.map(s => s.id === selectedSale.id ? { ...s, status: 'refunded' as const } : s));
      const medsRes = await fetch('/api/medicines');
      setMedicines(await medsRes.json());
      setSelectedSale(prev => prev ? { ...prev, status: 'refunded' } : null);
      setShowRevertConfirm(false);
    } catch {
      alert('Could not revert sale. Please try again.');
    } finally {
      setReverting(false);
    }
  };

  // Date-range filter — cutoff timestamp (records on/after it pass)
  const periodCutoff = (() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    switch (periodFilter) {
      case 'daily': { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
      case 'weekly': return now - 7 * dayMs;
      case 'biweekly': return now - 14 * dayMs;
      case 'monthly': return now - 30 * dayMs;
      case 'bimonthly': return now - 60 * dayMs;
      default: return null;
    }
  })();

  // TEMP: reset all sales history + purchases (remove this later)
  const handleResetData = async () => {
    if (!confirm('Reset ALL Sales History and Purchases data? This cannot be undone. (Medicines & stock are kept.)')) return;
    try {
      const res = await fetch('/api/reset/history', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      setSales([]);
      setPurchases([]);
    } catch {
      alert('Could not reset data. Please try again.');
    }
  };

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.invoiceNumber.toLowerCase().includes(q) || (s.customerName ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchPayment = paymentFilter === 'All' || s.paymentMethod === paymentFilter;
    const matchPeriod = periodCutoff === null || new Date(s.date).getTime() >= periodCutoff;
    return matchSearch && matchStatus && matchPayment && matchPeriod;
  });

  const completedSales = filtered.filter(s => s.status === 'completed');
  const totalRevenue = completedSales.reduce((s, sale) => s + sale.total, 0);
  const completedCount = completedSales.length;
  // Net profit = revenue − cost of goods (matches dashboard / profits / reports)
  const totalCost = completedSales.reduce((cost, sale) => cost + sale.items.reduce((c, item) => {
    const med = medicines.find(m => m.id === item.medicineId);
    return c + (med?.purchasePrice ?? item.price * 0.4) * item.quantity;
  }, 0), 0);
  const totalNetProfit = totalRevenue - totalCost;

  return (
    <AppLayout>
      <div className="p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Transactions', value: String(filtered.length), icon: ShoppingCart, color: 'text-foreground', bg: 'bg-muted' },
            { label: 'Total Revenue', value: `${CURRENCY} ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-foreground', bg: 'bg-muted' },
            { label: 'Total Net Profit', value: `${CURRENCY} ${totalNetProfit.toFixed(2)}`, icon: Wallet, color: 'text-foreground', bg: 'bg-muted' },
            { label: 'Completed Sales', value: String(completedCount), icon: TrendingUp, color: 'text-foreground', bg: 'bg-muted' },
          ].map(s => (
            <Card key={s.label} className="shadow-sm rounded-2xl py-0 gap-0">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', s.bg)}>
                  <s.icon className={cn('h-5 w-5', s.color)} />
                </div>
                <div>
                  <p className="text-[13px] text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="shadow-sm rounded-2xl">
          <CardHeader className="px-6 pt-3 pb-0">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices, patients..." className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1 rounded-xl" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={periodFilter} onValueChange={v => { if (v) setPeriodFilter(v); }}>
                  <SelectTrigger className="w-40 h-9 text-sm border-0 bg-muted/50 rounded-xl">
                    <CalendarRange className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue>{PERIOD_LABELS[periodFilter]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="daily">Daily (Today)</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="bimonthly">Bi-Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={v => { if (v) setStatusFilter(v); }}>
                  <SelectTrigger className="w-36 h-9 text-sm border-0 bg-muted/50 rounded-xl">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue>{STATUS_LABELS[statusFilter]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentFilter} onValueChange={v => { if (v) setPaymentFilter(v); }}>
                  <SelectTrigger className="w-36 h-9 text-sm border-0 bg-muted/50 rounded-xl">
                    <SelectValue placeholder="Payment">{PAYMENT_LABELS[paymentFilter]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Payment</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
                {/* TEMP: reset data button — remove later */}
                <Button
                  onClick={handleResetData}
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-sm border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:hover:bg-red-950/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Reset Data
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '16%' }}>Invoice</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '13%' }}>Patient</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '8%' }}>Items</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '10%' }}>Payment</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '13%' }}>Amount</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '18%' }}>Date & Time</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '12%' }}>Status</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '10%' }} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-30">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                          <Receipt className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">No sales yet</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Completed sales will appear here</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(sale => (
                  <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{sale.invoiceNumber}</p>
                      <p className="text-[11px] text-muted-foreground">{sale.cashierName}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-foreground">{sale.customerName ?? 'Walk-in'}</TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
                        {sale.items.length} item{sale.items.length > 1 ? 's' : ''}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3"><PaymentBadge method={sale.paymentMethod} /></TableCell>
                    <TableCell className="px-4 py-3 font-bold text-sm text-foreground tabular-nums">{CURRENCY} {sale.total.toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">{new Date(sale.date).toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3"><StatusChip label={sale.status.charAt(0).toUpperCase() + sale.status.slice(1)} /></TableCell>
                    <TableCell className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedSale(sale)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Receipt Detail Modal */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-sm p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-6 pt-4 pb-3 border-b">
            <DialogTitle className="text-sm font-semibold">
              {selectedSale?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <ScrollArea className="max-h-[65vh]">
              <div className="p-5 font-mono text-xs space-y-3">
                {/* Header */}
                <div className="text-center pb-3 border-b border-dashed space-y-0.5">
                  <div className="font-bold text-sm text-foreground">{defaultSettings.hospitalName}</div>
                  <div className="text-muted-foreground text-[10px] leading-relaxed px-2">{defaultSettings.address}</div>
                  <div className="text-muted-foreground text-[11px]">{defaultSettings.phone}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Pharmacy Receipt</div>
                </div>

                {/* Details */}
                <div className="space-y-1 pb-3 border-b border-dashed">
                  {[
                    ['Invoice', selectedSale.invoiceNumber],
                    ['Date', new Date(selectedSale.date).toLocaleDateString()],
                    ['Time', new Date(selectedSale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })],
                    ...(selectedSale.customerName ? [['Patient', selectedSale.customerName]] : []),
                    ['Cashier', selectedSale.cashierName],
                    ['Payment', selectedSale.paymentMethod.charAt(0).toUpperCase() + selectedSale.paymentMethod.slice(1)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">{k}</span>
                      <span className="text-foreground font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Items */}
                <div className="pb-3 border-b border-dashed">
                  <div className="flex text-[10px] uppercase tracking-wider text-muted-foreground mb-2 pb-1.5 border-b border-dashed">
                    <span className="flex-1">Description</span>
                    <span className="w-8 text-center shrink-0">Qty</span>
                    <span className="w-24 text-right shrink-0">Amount</span>
                  </div>
                  <div className="space-y-2">
                    {selectedSale.items.map((item, idx) => (
                      <div key={idx} className="flex items-baseline">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-foreground font-medium truncate">{item.medicineName}</p>
                          <p className="text-[10px] text-muted-foreground">{CURRENCY} {item.price.toFixed(2)} each</p>
                        </div>
                        <span className="w-8 text-center shrink-0 text-muted-foreground">{item.quantity}</span>
                        <span className="w-24 text-right shrink-0 font-semibold text-foreground">{CURRENCY} {item.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-1.5 pb-3 border-b border-dashed">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{CURRENCY} {selectedSale.subtotal.toFixed(2)}</span></div>
                  {selectedSale.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{CURRENCY} {selectedSale.discount.toFixed(2)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax ({defaultSettings.taxPercentage}%)</span><span>{CURRENCY} {selectedSale.tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed"><span className="text-foreground">TOTAL</span><span className="text-foreground tabular-nums">{CURRENCY} {selectedSale.total.toFixed(2)}</span></div>
                </div>

                <div className="text-center text-muted-foreground text-[11px]">{defaultSettings.receiptFooter}</div>
              </div>
            </ScrollArea>
          )}
          <div className="p-4 border-t flex gap-2">
            <Button
              onClick={() => selectedSale && printReceipt(selectedSale)}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            {selectedSale?.status === 'completed' && (
              <Button
                onClick={() => setShowRevertConfirm(true)}
                variant="outline"
                className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:hover:bg-red-950/20"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Revert Sale
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revert confirmation */}
      <Dialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" /> Revert Sale
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              This will mark <span className="font-semibold text-foreground">{selectedSale?.invoiceNumber}</span> as refunded and add the items back to inventory.
            </p>
            <div className="rounded-xl bg-muted px-4 py-3 space-y-1">
              {selectedSale?.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.medicineName}</span>
                  <span className="font-medium text-foreground">+{item.quantity} {item.unit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowRevertConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRevert}
              disabled={reverting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {reverting ? 'Reverting...' : 'Confirm Revert'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
