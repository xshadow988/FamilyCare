'use client';

import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusChip } from '@/components/ui/status-chip';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Search, Plus, MoreHorizontal, Edit2, Trash2, Package, X, Tag,
  AlertTriangle, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import { defaultSettings } from '@/lib/data';
import { useAppContext } from '@/components/providers/app-context';
import { Medicine } from '@/lib/types';
import { tpt, perTablet, splitStock, formatStock, isLowStock, isOutStock } from '@/lib/strip';
import { cn } from '@/lib/utils';

const CURRENCY = defaultSettings.currencySymbol;
const PAGE_SIZE = 10;
const UNITS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Cream', 'Drops', 'Vial', 'Sachet', 'Patch', 'Lotion', 'Ointment', 'Mother & Baby Care', 'Dressing Items'];

type MedForm = {
  name: string; category: string; unit: string;
  purchasePrice: number; sellingPrice: number; minStock: number;
  tabletsPerStrip: number;
  stockStrips: number; stockTablets: number;
};

const emptyMed: MedForm = {
  name: '', category: '', unit: '',
  purchasePrice: 0, sellingPrice: 0, minStock: 50,
  tabletsPerStrip: 1, stockStrips: 0, stockTablets: 0,
};

function StockBadge({ med }: { med: Medicine }) {
  if (isOutStock(med)) return <StatusChip label="Out of Stock" />;
  if (isLowStock(med)) return <StatusChip label="Low Stock" />;
  return <StatusChip label="In Stock" />;
}

export default function InventoryPage() {
  const { medicines, setMedicines, categories, setCategories } = useAppContext();
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const addCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setCategories(prev => [...prev, trimmed]);
      setNewCategoryInput('');
      setShowCategoryDialog(false);
    } catch (err) {
      console.error('Failed to save category:', err);
      alert('Could not save category. Please check your database connection.');
    }
  };

  const removeCategory = async (cat: string) => {
    await fetch(`/api/categories/${encodeURIComponent(cat)}`, { method: 'DELETE' });
    setCategories(prev => prev.filter(c => c !== cat));
  };
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editMed, setEditMed] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState<MedForm>(emptyMed);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return medicines.filter(m => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.name.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'All' || m.category === categoryFilter;
      const matchStatus = statusFilter === 'All' ||
        (statusFilter === 'low' && isLowStock(m)) ||
        (statusFilter === 'out' && isOutStock(m)) ||
        (statusFilter === 'ok' && !isLowStock(m) && !isOutStock(m));
      return matchSearch && matchCat && matchStatus;
    });
  }, [medicines, search, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => { setEditMed(null); setFormData(emptyMed); setShowDialog(true); };
  const openEdit = (med: Medicine) => {
    setEditMed(med);
    const { strips, tablets } = splitStock(med.stock, med.tabletsPerStrip);
    setFormData({
      name: med.name, category: med.category, unit: med.unit,
      purchasePrice: med.purchasePrice, sellingPrice: med.sellingPrice, minStock: med.minStock,
      tabletsPerStrip: med.tabletsPerStrip || 1, stockStrips: strips, stockTablets: tablets,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.sellingPrice || !formData.category || !formData.unit) return;
    const tps = Math.max(1, Math.floor(formData.tabletsPerStrip || 1));
    const payload = {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      purchasePrice: formData.purchasePrice,
      sellingPrice: formData.sellingPrice,
      minStock: formData.minStock,
      tabletsPerStrip: tps,
      stock: formData.stockStrips * tps + formData.stockTablets,
    };
    if (editMed) {
      const res = await fetch(`/api/medicines/${editMed.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const updated = await res.json();
      setMedicines(prev => prev.map(m => m.id === editMed.id ? updated : m));
    } else {
      const res = await fetch('/api/medicines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const created = await res.json();
      setMedicines(prev => [...prev, created]);
    }
    setShowDialog(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await fetch(`/api/medicines/${deleteId}`, { method: 'DELETE' });
      setMedicines(prev => prev.filter(m => m.id !== deleteId));
    }
    setDeleteId(null);
  };

  const f = (key: keyof MedForm, val: string | number) => setFormData(p => ({ ...p, [key]: val }));
  const lowStockCount = medicines.filter(isLowStock).length;
  const outCount = medicines.filter(isOutStock).length;
  const formTps = Math.max(1, Math.floor(formData.tabletsPerStrip || 1));
  const formTotalTablets = formData.stockStrips * formTps + formData.stockTablets;

  return (
    <AppLayout>
      <div className="p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard description="Total Medicines" value={String(medicines.length)} footerMain="Distinct products" footerSub="In your catalog" />
          <StatCard description="In Stock" value={String(medicines.filter(m => !isLowStock(m) && !isOutStock(m)).length)} badge={{ icon: 'up', text: 'Healthy' }} footerMain="Above minimum level" footerSub="Well-stocked items" />
          <StatCard description="Low Stock" value={String(lowStockCount)} badge={lowStockCount > 0 ? { icon: 'down', text: String(lowStockCount) } : undefined} footerMain="Needs restocking soon" footerSub="At or below minimum" />
          <StatCard description="Out of Stock" value={String(outCount)} badge={outCount > 0 ? { icon: 'down', text: 'Critical' } : undefined} footerMain="Currently unavailable" footerSub="Restock required" />
        </div>

        {/* Main Table */}
        <Card className="shadow-sm py-0 gap-0">
          {/* Filter bar — all controls h-9 for consistency */}
          <div className="flex flex-col sm:flex-row gap-2 p-4 border-b items-center">
            <div className="flex flex-1 gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-44">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search medicines..."
                  className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1 rounded-lg"
                />
              </div>
              <Select value={categoryFilter} onValueChange={v => { if (v) { setCategoryFilter(v); setPage(1); } }}>
                <SelectTrigger className="w-40 h-9 text-sm border bg-background rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['All', ...categories].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => { if (v) { setStatusFilter(v); setPage(1); } }}>
                <SelectTrigger className="w-36 h-9 text-sm border bg-background rounded-lg">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="ok">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" className="h-9 gap-2 text-sm px-4 rounded-lg">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <Button variant="outline" onClick={() => setShowCategoryDialog(true)} className="h-9 gap-2 text-sm px-4 rounded-lg">
                <Tag className="h-3.5 w-3.5" /> Add Category
              </Button>
              <Button onClick={openAdd} className="h-9 gap-2 text-sm px-4 rounded-lg bg-foreground hover:bg-foreground/90 text-background">
                <Plus className="h-3.5 w-3.5" /> Add Medicine
              </Button>
            </div>
          </div>

          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="px-4" style={{ width: '16%' }}>Medicine Name</TableHead>
                <TableHead className="px-4" style={{ width: '16%' }}>Category</TableHead>
                <TableHead className="px-4" style={{ width: '16%' }}>Stock</TableHead>
                <TableHead className="px-4" style={{ width: '16%' }}>Buy Price</TableHead>
                <TableHead className="px-4" style={{ width: '16%' }}>Sell Price</TableHead>
                <TableHead className="px-4" style={{ width: '16%' }}>Status</TableHead>
                <TableHead style={{ width: '4%' }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">No medicines yet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Add your first medicine to get started</p>
                      </div>
                      <Button onClick={openAdd} size="sm" className="bg-foreground hover:bg-foreground/90 text-background rounded-full px-4">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Medicine
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginated.map(med => (
                <TableRow key={med.id}>
                  <TableCell className="px-4 py-3 font-medium text-foreground truncate max-w-0">{med.name}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs font-medium rounded-full truncate max-w-full">{med.category}</Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 tabular-nums">
                    <span className={cn('text-sm font-semibold', isOutStock(med) ? 'text-destructive' : isLowStock(med) ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
                      {formatStock(med.stock, med.tabletsPerStrip)}
                    </span>
                    {tpt(med) > 1 && (
                      <span className="block text-[11px] text-muted-foreground">{med.stock} tablets · {tpt(med)}/strip</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                    {CURRENCY} {med.purchasePrice.toFixed(2)}
                    {tpt(med) > 1 && (
                      <span className="block text-[11px] text-muted-foreground/70">{CURRENCY} {perTablet(med.purchasePrice, tpt(med)).toFixed(2)}/tab</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm tabular-nums font-semibold text-foreground">
                    {CURRENCY} {med.sellingPrice.toFixed(2)}
                    {tpt(med) > 1 && (
                      <span className="block text-[11px] font-normal text-muted-foreground/70">{CURRENCY} {perTablet(med.sellingPrice, tpt(med)).toFixed(2)}/tab</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StockBadge med={med} />
                  </TableCell>
                  <TableCell className="py-3 pr-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => openEdit(med)}>
                          <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(med.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="contents">
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-muted-foreground px-0.5 text-xs">…</span>}
                      <Button
                        variant={page === p ? 'default' : 'ghost'}
                        size="icon"
                        className={cn('h-7 w-7 text-xs rounded-full', page === p && 'bg-foreground hover:bg-foreground/90 text-background')}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    </span>
                  ))}
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{editMed ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Medicine Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Medicine Name *</Label>
              <Input
                value={formData.name}
                onChange={e => f('name', e.target.value)}
                placeholder="e.g. Paracetamol 500mg"
                className="h-10 rounded-xl w-full"
              />
            </div>

            {/* Category + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</Label>
                <Select value={formData.category || undefined} onValueChange={v => { if (v) f('category', v); }}>
                  <SelectTrigger className="h-10 rounded-xl w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.length === 0
                      ? <div className="px-3 py-4 text-xs text-muted-foreground text-center">No categories yet — add one first</div>
                      : categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</Label>
                <Select value={formData.unit || undefined} onValueChange={v => { if (v) f('unit', v); }}>
                  <SelectTrigger className="h-10 rounded-xl w-full"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Purchase Price + Selling Price (per strip) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Purchase / Strip ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice === 0 ? '' : formData.purchasePrice}
                  onChange={e => f('purchasePrice', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-10 rounded-xl w-full"
                  min="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Selling / Strip ({CURRENCY}) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice === 0 ? '' : formData.sellingPrice}
                  onChange={e => f('sellingPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-10 rounded-xl w-full"
                  min="0"
                />
              </div>
            </div>

            {/* Tablets per strip + Min stock */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tablets Per Strip</Label>
                <Input
                  type="number"
                  value={formData.tabletsPerStrip === 0 ? '' : formData.tabletsPerStrip}
                  onChange={e => f('tabletsPerStrip', parseInt(e.target.value) || 1)}
                  onFocus={e => e.target.select()}
                  placeholder="1"
                  className="h-10 rounded-xl w-full"
                  min="1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Min Stock Alert (Strips)</Label>
                <Input
                  type="number"
                  value={formData.minStock === 0 ? '' : formData.minStock}
                  onChange={e => f('minStock', parseInt(e.target.value) || 0)}
                  placeholder="50"
                  className="h-10 rounded-xl w-full"
                  min="0"
                />
              </div>
            </div>

            {/* Stock entry */}
            {formTps > 1 ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock (Strips)</Label>
                  <Input
                    type="number"
                    value={formData.stockStrips === 0 ? '' : formData.stockStrips}
                    onChange={e => f('stockStrips', parseInt(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    placeholder="0"
                    className="h-10 rounded-xl w-full"
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loose Tablets</Label>
                  <Input
                    type="number"
                    value={formData.stockTablets === 0 ? '' : formData.stockTablets}
                    onChange={e => f('stockTablets', parseInt(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    placeholder="0"
                    className="h-10 rounded-xl w-full"
                    min="0"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Stock ({formData.unit || 'Units'})</Label>
                <Input
                  type="number"
                  value={formData.stockStrips === 0 ? '' : formData.stockStrips}
                  onChange={e => f('stockStrips', parseInt(e.target.value) || 0)}
                  onFocus={e => e.target.select()}
                  placeholder="0"
                  className="h-10 rounded-xl w-full"
                  min="0"
                />
              </div>
            )}

            {/* Auto-calculated per-tablet prices (read-only, always shown) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Purchase / Tablet ({CURRENCY})</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={`${CURRENCY} ${perTablet(formData.purchasePrice, formTps).toFixed(2)}`}
                  className="h-10 rounded-xl w-full bg-muted/60 text-muted-foreground cursor-default"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Selling / Tablet ({CURRENCY})</Label>
                <Input
                  readOnly
                  tabIndex={-1}
                  value={`${CURRENCY} ${perTablet(formData.sellingPrice, formTps).toFixed(2)}`}
                  className="h-10 rounded-xl w-full bg-muted/60 text-muted-foreground cursor-default"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1">
              {formTps > 1
                ? <>Auto-calculated from per-strip price ÷ {formTps} tablets · Total stock: <span className="font-semibold text-foreground">{formTotalTablets} tablets</span></>
                : <>Auto-calculated per unit · Set Tablets Per Strip above to sell loose tablets</>}
            </p>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="px-5">Cancel</Button>
            <Button onClick={handleSave} className="bg-foreground hover:bg-foreground/90 text-background px-5">
              {editMed ? 'Save Changes' : 'Add Medicine'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={(o) => { setShowCategoryDialog(o); if (!o) setNewCategoryInput(''); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Tag className="h-4 w-4" /> Add Category
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Input
              value={newCategoryInput}
              onChange={e => setNewCategoryInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCategory(); }}
              placeholder="e.g. Antibiotics"
              className="h-10 rounded-xl"
              autoFocus
            />
            {categories.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Existing categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <div key={cat} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground border border-border/50">
                      {cat}
                      <button onClick={() => removeCategory(cat)} className="hover:text-destructive transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)} className="px-5">Cancel</Button>
            <Button
              onClick={addCategory}
              disabled={!newCategoryInput.trim() || categories.includes(newCategoryInput.trim())}
              className="px-5 bg-foreground hover:bg-foreground/90 text-background"
            >
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" /> Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">Are you sure you want to delete this medicine? This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="px-5">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="px-5">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
