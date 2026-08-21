'use client';

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusChip } from '@/components/ui/status-chip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/ui/stat-card';
import {
  Search, Plus, ShoppingBag, Trash2, CalendarRange, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { defaultSettings } from '@/lib/data';
import { useAppContext } from '@/components/providers/app-context';
import { Purchase } from '@/lib/types';
import { formatStock } from '@/lib/strip';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

const CURRENCY = defaultSettings.currencySymbol;
const PAGE_SIZE = 10;

// Rolling windows, matching the period filter in Sales History.
const PERIOD_LABELS: Record<string, string> = {
  all: 'All Time',
  daily: 'Daily (Today)',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
};

const emptyForm = {
  medicineId: '',
  quantity: 1,
  purchasePrice: 0,
  sellingPrice: 0,
  tabletsPerStrip: 1,
  date: new Date().toISOString().split('T')[0],
};


export default function PurchasesPage() {
  const { medicines, setMedicines, purchases, setPurchases, categories } = useAppContext();
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedMed = medicines.find(m => m.id === form.medicineId);
  const medicineOptions = categoryFilter === 'All'
    ? medicines
    : medicines.filter(m => m.category === categoryFilter);

  // Cutoff timestamp for the selected period — purchases on/after it pass.
  const periodCutoff = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    switch (periodFilter) {
      case 'daily': { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
      case 'weekly': return now - 7 * dayMs;
      case 'biweekly': return now - 14 * dayMs;
      case 'monthly': return now - 30 * dayMs;
      default: return null;
    }
  }, [periodFilter]);

  // Sort by the date the table actually shows. The API returns createdAt order,
  // so a back-dated entry used to jump to the top and made the Date column read
  // out of sequence, as if older history were missing.
  const filtered = useMemo(() => purchases.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.medicineName.toLowerCase().includes(q) || p.invoiceNumber.toLowerCase().includes(q);
    const matchPeriod = periodCutoff === null || new Date(p.date).getTime() >= periodCutoff;
    return matchSearch && matchPeriod;
  }).sort((a, b) => {
    const d = new Date(b.date).getTime() - new Date(a.date).getTime();
    return d !== 0 ? d : b.invoiceNumber.localeCompare(a.invoiceNumber);
  }), [purchases, search, periodCutoff]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Stats reflect the current filters, as they do in Sales History.
  const totalSpent = filtered.filter(p => p.status === 'received').reduce((s, p) => s + p.total, 0);
  const pendingCount = filtered.filter(p => p.status === 'pending').length;
  const periodLabel = PERIOD_LABELS[periodFilter];

  const handleAdd = async () => {
    if (!form.medicineId) return;
    const med = medicines.find(m => m.id === form.medicineId);
    if (!med) return;
    const purchasePrice = form.purchasePrice || med.purchasePrice;
    const sellingPrice = form.sellingPrice || med.sellingPrice;
    const tabletsPerStrip = Math.max(1, Math.floor(form.tabletsPerStrip || 1));
    const payload = {
      date: new Date(form.date).toISOString(),
      medicineId: form.medicineId,
      medicineName: med.name,
      quantity: form.quantity,
      purchasePrice,
      sellingPrice,
      tabletsPerStrip,
      total: form.quantity * purchasePrice,
    };
    const res = await apiFetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const saved = await res.json();
    setPurchases(prev => [saved, ...prev]);
    // Refresh stock from server
    const medsRes = await apiFetch('/api/medicines');
    setMedicines(await medsRes.json());
    setShowDialog(false);
    setForm(emptyForm);
    setCategoryFilter('All');
    setPage(1); // jump back to where the new entry will appear
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/purchases/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setPurchases(prev => prev.filter(p => p.id !== deleteTarget.id));
      // Stock was reversed server-side — refresh medicines
      const medsRes = await apiFetch('/api/medicines');
      setMedicines(await medsRes.json());
      setDeleteTarget(null);
    } catch {
      alert('Could not delete this purchase. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const f = (key: keyof typeof form, val: string | number) => setForm(p => ({ ...p, [key]: val }));

  return (
    <AppLayout>
      <div className="p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard description="Total Spent" value={`${CURRENCY} ${totalSpent.toLocaleString('en', { minimumFractionDigits: 2 })}`} footerMain="On received stock" footerSub={periodLabel} />
          <StatCard description="Pending Orders" value={String(pendingCount)} badge={pendingCount > 0 ? { icon: 'down', text: String(pendingCount) } : undefined} footerMain="Awaiting delivery" footerSub="Not yet received" />
          <StatCard description="Purchase Orders" value={String(filtered.length)} footerMain="Entries in view" footerSub="Matches current filters" />
        </div>

        {/* Table */}
        <Card className="shadow-sm rounded-2xl">
          <CardHeader className="px-6 pt-3 pb-0">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-50 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search purchases..." className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1 rounded-xl" />
                </div>
                <Select value={periodFilter} onValueChange={v => { if (v) { setPeriodFilter(v); setPage(1); } }}>
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
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => { if (medicines.length === 0) return; setForm(emptyForm); setCategoryFilter('All'); setShowDialog(true); }}
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
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '14%' }}>Purchase Order</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '16%' }}>Medicine</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '7%' }}>Qty</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '14%' }}>Purchase Price</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '14%' }}>Selling Price</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '11%' }}>Total</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '12%' }}>Date</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '8%' }}>Status</TableHead>
                  <TableHead className="px-4 text-muted-foreground font-medium" style={{ width: '4%' }} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-30">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                          <ShoppingBag className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {purchases.length === 0 ? 'No purchases yet' : 'No purchases match these filters'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {purchases.length === 0
                              ? 'Record your first stock purchase above'
                              : `Nothing recorded for “${periodLabel}”${search ? ' with this search' : ''}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginated.map(p => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{p.invoiceNumber}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground">{p.medicineName}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-semibold tabular-nums">{p.quantity.toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{CURRENCY} {p.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{CURRENCY} {p.sellingPrice.toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-bold tabular-nums text-foreground">{CURRENCY} {p.total.toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">{new Date(p.date).toLocaleDateString()}</TableCell>
                    <TableCell className="px-4 py-3"><StatusChip label={p.status.charAt(0).toUpperCase() + p.status.slice(1)} /></TableCell>
                    <TableCell className="px-2 py-3">
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete purchase"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .map((p, idx, arr) => (
                        <span key={p} className="contents">
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-muted-foreground px-0.5 text-xs">…</span>}
                          <Button
                            variant={safePage === p ? 'default' : 'ghost'}
                            size="icon"
                            className={cn('h-7 w-7 text-xs rounded-full', safePage === p && 'bg-foreground hover:bg-foreground/90 text-background')}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        </span>
                      ))}
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
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
            {/* Category first — it narrows the medicine list below it. */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</Label>
              <Select value={categoryFilter} onValueChange={v => {
                if (!v) return;
                setCategoryFilter(v);
                // Clear medicine if it no longer matches the chosen category
                if (v !== 'All' && selectedMed && selectedMed.category !== v) {
                  setForm(p => ({ ...p, medicineId: '' }));
                }
              }}>
                <SelectTrigger className="h-10 rounded-xl w-full">
                  <SelectValue placeholder="All categories">
                    {categoryFilter === 'All' ? 'All categories' : categoryFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Medicine *</Label>
              <Select value={form.medicineId} onValueChange={v => {
                if (!v) return;
                const med = medicines.find(m => m.id === v);
                setForm(p => ({ ...p, medicineId: v, purchasePrice: med?.purchasePrice ?? 0, sellingPrice: med?.sellingPrice ?? 0, tabletsPerStrip: med?.tabletsPerStrip ?? 1 }));
                if (med) setCategoryFilter(med.category);
              }}>
                <SelectTrigger className="h-10 rounded-xl w-full">
                  <SelectValue placeholder="Select medicine">
                    {form.medicineId ? medicines.find(m => m.id === form.medicineId)?.name : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {medicineOptions.length === 0
                    ? <div className="px-3 py-4 text-xs text-muted-foreground text-center">No medicines in this category</div>
                    : medicineOptions.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedMed && (
                <p className="text-[11px] text-muted-foreground">Current stock: <span className="font-semibold">{formatStock(selectedMed.stock, selectedMed.tabletsPerStrip)}</span></p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quantity (Strips) *</Label>
                <Input type="text" inputMode="numeric" value={form.quantity === 0 ? '' : String(form.quantity)} onChange={e => f('quantity', parseInt(e.target.value.replace(/\D/g, '')) || 0)} onFocus={e => e.target.select()} className="h-10 rounded-xl" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tablets Per Strip</Label>
                <Input type="number" min="1" value={form.tabletsPerStrip === 0 ? '' : form.tabletsPerStrip} onChange={e => f('tabletsPerStrip', parseInt(e.target.value) || 1)} onFocus={e => e.target.select()} className="h-10 rounded-xl" placeholder="1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Purchase Price / Strip ({CURRENCY})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.purchasePrice === 0 ? '' : form.purchasePrice}
                onChange={e => f('purchasePrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-10 rounded-xl w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sale Price / Strip ({CURRENCY})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.sellingPrice === 0 ? '' : form.sellingPrice}
                onChange={e => f('sellingPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-10 rounded-xl w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</Label>
              <Input type="date" value={form.date} onChange={e => f('date', e.target.value)} className="h-10 rounded-xl" />
            </div>
            {form.quantity > 0 && form.purchasePrice > 0 && (
              <div className="rounded-xl bg-muted px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Total Cost</span>
                  <span className="text-base font-bold text-foreground tabular-nums">{CURRENCY} {(form.quantity * form.purchasePrice).toFixed(2)}</span>
                </div>
                {Math.max(1, Math.floor(form.tabletsPerStrip || 1)) > 1 && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Adds to stock</span>
                    <span className="font-medium">{form.quantity * Math.max(1, Math.floor(form.tabletsPerStrip || 1))} tablets</span>
                  </div>
                )}
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

      {/* Delete Purchase Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" /> Delete Purchase
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              This will delete <span className="font-semibold text-foreground">{deleteTarget?.invoiceNumber}</span> and remove
              the <span className="font-semibold text-foreground">{deleteTarget?.quantity} {''}</span>
              units it added back out of <span className="font-semibold text-foreground">{deleteTarget?.medicineName}</span> stock.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="px-5">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="px-5 bg-red-600 hover:bg-red-700 text-white">
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
