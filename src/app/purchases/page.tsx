'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusChip } from '@/components/ui/status-chip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, Plus, ShoppingBag, TrendingDown, Package, Clock,
} from 'lucide-react';
import { defaultSettings } from '@/lib/data';
import { useAppContext } from '@/components/providers/app-context';
import { Purchase } from '@/lib/types';
import { cn } from '@/lib/utils';

const CURRENCY = defaultSettings.currencySymbol;

const emptyForm = {
  medicineId: '',
  quantity: 1,
  purchasePrice: 0,
  sellingPrice: 0,
  date: new Date().toISOString().split('T')[0],
};


export default function PurchasesPage() {
  const { medicines, setMedicines, purchases, setPurchases } = useAppContext();
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const selectedMed = medicines.find(m => m.id === form.medicineId);

  const filtered = purchases.filter(p => {
    const q = search.toLowerCase();
    return !q || p.medicineName.toLowerCase().includes(q) || p.invoiceNumber.toLowerCase().includes(q);
  });

  const totalSpent = purchases.filter(p => p.status === 'received').reduce((s, p) => s + p.total, 0);
  const pendingCount = purchases.filter(p => p.status === 'pending').length;
  const todayCount = purchases.filter(p => p.date.startsWith(new Date().toISOString().split('T')[0])).length;

  const handleAdd = async () => {
    if (!form.medicineId) return;
    const med = medicines.find(m => m.id === form.medicineId);
    if (!med) return;
    const purchasePrice = form.purchasePrice || med.purchasePrice;
    const sellingPrice = form.sellingPrice || med.sellingPrice;
    const payload = {
      date: new Date(form.date).toISOString(),
      medicineId: form.medicineId,
      medicineName: med.name,
      quantity: form.quantity,
      purchasePrice,
      sellingPrice,
      total: form.quantity * purchasePrice,
    };
    const res = await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const saved = await res.json();
    setPurchases(prev => [saved, ...prev]);
    // Refresh stock from server
    const medsRes = await fetch('/api/medicines');
    setMedicines(await medsRes.json());
    setShowDialog(false);
    setForm(emptyForm);
  };

  const f = (key: keyof typeof form, val: string | number) => setForm(p => ({ ...p, [key]: val }));

  return (
    <AppLayout>
      <div className="p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Spent', value: `${CURRENCY} ${totalSpent.toLocaleString('en', { minimumFractionDigits: 2 })}`, icon: TrendingDown, color: 'text-foreground', bg: 'bg-muted' },
            { label: 'Pending Orders', value: String(pendingCount), icon: Clock, color: 'text-foreground', bg: 'bg-muted' },
            { label: "Today's Purchases", value: String(todayCount), icon: Package, color: 'text-foreground', bg: 'bg-muted' },
          ].map(s => (
            <Card key={s.label} className="shadow-sm rounded-2xl py-0 gap-0">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', s.bg)}>
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
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search purchases..." className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1 rounded-xl" />
              </div>
              <Button
                onClick={() => { if (medicines.length === 0) return; setShowDialog(true); }}
                size="sm"
                className="h-9 gap-1.5 text-sm bg-foreground hover:bg-foreground/90 text-background"
                disabled={medicines.length === 0}
                title={medicines.length === 0 ? 'Add medicines in Inventory first' : undefined}
              >
                <Plus className="h-3.5 w-3.5" /> New Purchase
              </Button>
            </div>
            {medicines.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">Add medicines in the Inventory screen before recording purchases.</p>
            )}
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '20%' }}>Purchase Order</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '18%' }}>Medicine</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '10%' }}>Qty</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '15%' }}>Unit Price</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '15%' }}>Total</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '12%' }}>Date</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '10%' }}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-30">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                          <ShoppingBag className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">No purchases yet</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Record your first stock purchase above</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(p => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{p.invoiceNumber}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground">{p.medicineName}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-semibold tabular-nums">{p.quantity.toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{CURRENCY} {p.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-bold tabular-nums text-foreground">{CURRENCY} {p.total.toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{new Date(p.date).toLocaleDateString()}</TableCell>
                    <TableCell className="px-4 py-3"><StatusChip label={p.status.charAt(0).toUpperCase() + p.status.slice(1)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Purchase Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">New Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Medicine *</Label>
              <Select value={form.medicineId} onValueChange={v => {
                if (!v) return;
                const med = medicines.find(m => m.id === v);
                setForm(p => ({ ...p, medicineId: v, purchasePrice: med?.purchasePrice ?? 0, sellingPrice: med?.sellingPrice ?? 0 }));
              }}>
                <SelectTrigger className="h-10 rounded-xl w-full">
                  <SelectValue placeholder="Select medicine">
                    {form.medicineId ? medicines.find(m => m.id === form.medicineId)?.name : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {medicines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedMed && (
                <p className="text-[11px] text-muted-foreground">Current stock: <span className="font-semibold">{selectedMed.stock} {selectedMed.unit}</span></p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantity *</Label>
                <Input type="text" inputMode="numeric" value={form.quantity === 0 ? '' : String(form.quantity)} onChange={e => f('quantity', parseInt(e.target.value.replace(/\D/g, '')) || 0)} className="h-10 rounded-xl" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit Price ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.purchasePrice === 0 ? '' : form.purchasePrice}
                  onChange={e => f('purchasePrice', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sale Price ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.sellingPrice === 0 ? '' : form.sellingPrice}
                  onChange={e => f('sellingPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</Label>
                <Input type="date" value={form.date} onChange={e => f('date', e.target.value)} className="h-10 rounded-xl" />
              </div>
            </div>
            {form.quantity > 0 && form.purchasePrice > 0 && (
              <div className="rounded-xl bg-muted px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">Total Cost</span>
                <span className="text-base font-bold text-foreground tabular-nums">{CURRENCY} {(form.quantity * form.purchasePrice).toFixed(2)}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-foreground hover:bg-foreground/90 text-background" disabled={!form.medicineId}>
              Record Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
