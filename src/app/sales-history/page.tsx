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
  ShoppingCart, Filter,
} from 'lucide-react';
import { defaultSettings } from '@/lib/data';
import { printReceipt } from '@/lib/print-receipt';
import { useAppContext } from '@/components/providers/app-context';
import { Sale } from '@/lib/types';
import { cn } from '@/lib/utils';

const CURRENCY = defaultSettings.currencySymbol;


function PaymentBadge({ method }: { method: Sale['paymentMethod'] }) {
  const cls = 'bg-muted text-muted-foreground';
  return <Badge className={cn('text-[11px] rounded-full hover:opacity-100', cls)}>{method.charAt(0).toUpperCase() + method.slice(1)}</Badge>;
}

export default function SalesHistoryPage() {
  const { sales } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.invoiceNumber.toLowerCase().includes(q) || (s.customerName ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchPayment = paymentFilter === 'All' || s.paymentMethod === paymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  const totalRevenue = filtered.filter(s => s.status === 'completed').reduce((s, sale) => s + sale.total, 0);
  const completedCount = filtered.filter(s => s.status === 'completed').length;

  return (
    <AppLayout>
      <div className="p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Transactions', value: String(filtered.length), icon: ShoppingCart, color: 'text-foreground', bg: 'bg-muted' },
            { label: 'Total Revenue', value: `${CURRENCY} ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-foreground', bg: 'bg-muted' },
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
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={v => { if (v) setStatusFilter(v); }}>
                  <SelectTrigger className="w-36 h-9 text-sm border-0 bg-muted/50 rounded-xl">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
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
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Payment</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
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
          <div className="p-4 border-t">
            <Button onClick={() => selectedSale && printReceipt(selectedSale)} className="w-full gap-2 bg-foreground hover:bg-foreground/90 text-background">
              <Printer className="h-4 w-4" /> Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
