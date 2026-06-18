'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Printer,
  X, Package, Banknote, Smartphone, User, Loader2, Pencil,
} from 'lucide-react';
import { defaultSettings } from '@/lib/data';
import { useAppContext } from '@/components/providers/app-context';
import { Medicine, CartItem, Sale } from '@/lib/types';
import { tpt, perTablet, isLowStock, isOutStock } from '@/lib/strip';
import { printReceipt } from '@/lib/print-receipt';
import { cn } from '@/lib/utils';

const CURRENCY = defaultSettings.currencySymbol;
type PaymentMethod = 'cash' | 'online';

/** Numeric counter that allows 0 and clamps to max. */
function CountInput({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => { setRaw(String(value)); }, [value]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={raw}
      onChange={e => {
        const s = e.target.value.replace(/\D/g, '');
        setRaw(s);
        const n = parseInt(s);
        onChange(isNaN(n) ? 0 : Math.min(n, max));
      }}
      onBlur={() => {
        const n = parseInt(raw);
        const v = isNaN(n) ? 0 : Math.min(Math.max(0, n), max);
        setRaw(String(v));
        onChange(v);
      }}
      onFocus={e => e.target.select()}
      className="w-9 text-center text-sm font-bold tabular-nums text-foreground bg-transparent border-b border-foreground/30 focus:border-foreground focus:outline-none"
    />
  );
}

function PriceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(value.toFixed(2));
  useEffect(() => { setRaw(value.toFixed(2)); }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={e => {
        const s = e.target.value.replace(/[^\d.]/g, '');
        setRaw(s);
        const n = parseFloat(s);
        if (!isNaN(n) && n >= 0) onChange(n);
      }}
      onBlur={() => {
        const n = parseFloat(raw);
        if (isNaN(n) || n < 0) { setRaw(value.toFixed(2)); }
        else { setRaw(n.toFixed(2)); onChange(n); }
      }}
      onFocus={e => e.target.select()}
      className="w-16 text-sm font-semibold tabular-nums text-foreground bg-transparent border-b border-foreground/30 focus:border-foreground focus:outline-none"
    />
  );
}

let invoiceCounter = 0;
function generateInvoice() {
  invoiceCounter++;
  return `INV-${new Date().getFullYear()}-${String(invoiceCounter).padStart(4, '0')}`;
}

export default function POSPage() {
  const { medicines: allMedicines, setMedicines, setSales, categories } = useAppContext();
  const allCategories = ['All', ...categories];
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredMedicines = useMemo(() => {
    return allMedicines.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allMedicines, search, selectedCategory]);

  // ── Tablet-aware helpers ──
  const totalTabs = (i: CartItem) => i.strips * tpt(i.medicine) + i.tablets;
  const priceTab = (i: CartItem) => i.price ?? perTablet(i.medicine.sellingPrice, tpt(i.medicine));
  const lineTotal = (i: CartItem) => totalTabs(i) * priceTab(i);

  const addToCart = (medicine: Medicine) => {
    if (medicine.stock <= 0) return;
    const t = tpt(medicine);
    setCart(prev => {
      const existing = prev.find(i => i.medicine.id === medicine.id);
      if (existing) {
        const used = totalTabs(existing);
        if (used + t <= medicine.stock) {
          return prev.map(i => i.medicine.id === medicine.id ? { ...i, strips: i.strips + 1 } : i);
        }
        if (used + 1 <= medicine.stock) {
          return prev.map(i => i.medicine.id === medicine.id ? { ...i, tablets: i.tablets + 1 } : i);
        }
        return prev;
      }
      const price = perTablet(medicine.sellingPrice, t);
      return t <= medicine.stock
        ? [...prev, { medicine, strips: 1, tablets: 0, price }]
        : [...prev, { medicine, strips: 0, tablets: 1, price }];
    });
  };

  // +/- buttons (auto-remove the line when it drops to 0)
  const changeStrips = (id: string, delta: number) => setCart(prev => prev.flatMap(i => {
    if (i.medicine.id !== id) return [i];
    const t = tpt(i.medicine);
    const maxStrips = Math.floor((i.medicine.stock - i.tablets) / t);
    const strips = Math.min(Math.max(0, i.strips + delta), Math.max(0, maxStrips));
    const updated = { ...i, strips };
    return totalTabs(updated) <= 0 ? [] : [updated];
  }));
  const changeTablets = (id: string, delta: number) => setCart(prev => prev.flatMap(i => {
    if (i.medicine.id !== id) return [i];
    const t = tpt(i.medicine);
    const maxTabs = i.medicine.stock - i.strips * t;
    const tablets = Math.min(Math.max(0, i.tablets + delta), Math.max(0, maxTabs));
    const updated = { ...i, tablets };
    return totalTabs(updated) <= 0 ? [] : [updated];
  }));
  // typed entry (clamped, keeps the line even at 0)
  const setStrips = (id: string, val: number) => setCart(prev => prev.map(i => {
    if (i.medicine.id !== id) return i;
    const t = tpt(i.medicine);
    const maxStrips = Math.floor((i.medicine.stock - i.tablets) / t);
    return { ...i, strips: Math.min(Math.max(0, val), Math.max(0, maxStrips)) };
  }));
  const setTablets = (id: string, val: number) => setCart(prev => prev.map(i => {
    if (i.medicine.id !== id) return i;
    const maxTabs = i.medicine.stock - i.strips * tpt(i.medicine);
    return { ...i, tablets: Math.min(Math.max(0, val), Math.max(0, maxTabs)) };
  }));

  const updatePrice = (id: string, price: number) =>
    setCart(prev => prev.map(i => i.medicine.id === id ? { ...i, price } : i));

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.medicine.id !== id));
  const clearCart = () => { setCart([]); setCustomerName(''); };

  const total = cart.reduce((sum, i) => sum + lineTotal(i), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const payload = {
        date: new Date().toISOString(),
        items: cart.map(item => ({
          medicineId: item.medicine.id,
          medicineName: item.medicine.name,
          quantity: totalTabs(item),
          unit: item.medicine.unit,
          price: priceTab(item),
          total: lineTotal(item),
        })),
        subtotal: total, tax: 0, discount: 0, total,
        paymentMethod,
        cashierName: 'Admin',
        customerName: customerName.trim() || undefined,
        status: 'completed',
      };
      const res = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const savedSale = await res.json();
      setSales(prev => [savedSale, ...prev]);
      // Refresh medicine stock from server
      const medsRes = await fetch('/api/medicines');
      setMedicines(await medsRes.json());
      setLastSale(savedSale);
      setIsProcessing(false);
      setShowReceipt(true);
    } catch {
      setIsProcessing(false);
    }
  };

  const handleNewSale = () => {
    clearCart();
    setShowReceipt(false);
    setLastSale(null);
    setPaymentMethod('cash');
    searchRef.current?.focus();
  };

  const paymentConfig: Record<PaymentMethod, { icon: React.ElementType; label: string }> = {
    cash: { icon: Banknote, label: 'Cash' },
    online: { icon: Smartphone, label: 'Online' },
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* ── LEFT: Medicine Browser ── */}
        <div className="flex flex-1 flex-col overflow-hidden border-r bg-muted/20">
          {/* Search & Filters */}
          <div className="p-4 border-b space-y-3 bg-background">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search medicines by name..."
                className="pl-10 h-10 bg-muted/50 border-0 focus-visible:ring-1 rounded-xl text-sm"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-1.5 pb-1">
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border',
                      selectedCategory === cat
                        ? 'bg-foreground text-background border-foreground shadow-sm'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Medicine Grid */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              {allMedicines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Package className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No medicines in inventory</p>
                  <p className="text-xs text-muted-foreground mt-1">Add medicines in the Inventory screen first</p>
                </div>
              ) : filteredMedicines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Search className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search or category</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {filteredMedicines.map(med => {
                    const inCart = cart.find(i => i.medicine.id === med.id);
                    const isLow = isLowStock(med);
                    const isOut = isOutStock(med);
                    const t = tpt(med);
                    const stripsLeft = Math.floor(med.stock / t);
                    const stockPill = isOut ? 'Out'
                      : t > 1 ? `${stripsLeft} strips${isLow ? ' · Low' : ''}`
                      : `${med.stock} left${isLow ? ' · Low' : ''}`;

                    return (
                      <button
                        key={med.id}
                        onClick={() => addToCart(med)}
                        disabled={isOut}
                        className={cn(
                          'relative text-left w-full rounded-2xl border bg-background transition-all duration-150 overflow-hidden',
                          !isOut && 'hover:shadow-md hover:border-foreground/20 cursor-pointer active:scale-[0.98]',
                          isOut && 'opacity-50 cursor-not-allowed',
                          inCart && 'border-foreground/30 ring-1 ring-foreground/15 bg-muted/30'
                        )}
                      >
                        {/* In-cart qty badge (total tablets) */}
                        {inCart && (
                          <span className="absolute top-2.5 right-2.5 h-5 min-w-5 px-1 rounded-full bg-foreground flex items-center justify-center z-10">
                            <span className="text-[10px] font-bold text-background">{totalTabs(inCart)}</span>
                          </span>
                        )}

                        <div className="p-3.5 flex flex-col h-full">
                          {/* Category */}
                          <Badge variant="secondary" className="self-start text-[10px] font-medium rounded-full mb-2.5 px-2">
                            {med.category}
                          </Badge>

                          {/* Name */}
                          <p className="font-semibold text-sm text-foreground leading-snug line-clamp-2" style={{ marginBottom: 5 }}>
                            {med.name}
                          </p>

                          {/* Divider */}
                          <div className="border-t" style={{ marginBottom: 5 }} />

                          {/* Price + Stock */}
                          <div className="flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground mb-0.5 font-medium">{t > 1 ? 'Price / strip' : 'Unit Price'}</p>
                              <p className="font-bold text-base text-foreground leading-none">
                                {CURRENCY} {med.sellingPrice.toFixed(2)}
                              </p>
                              {t > 1 && (
                                <p className="text-[10px] text-muted-foreground mt-1 leading-none">
                                  {CURRENCY} {perTablet(med.sellingPrice, t).toFixed(2)}/tab · {t}/strip
                                </p>
                              )}
                            </div>
                            <div className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                              isOut
                                ? 'bg-destructive/10 text-destructive'
                                : isLow
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            )}>
                              {stockPill}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── RIGHT: Cart ── */}
        <div className="flex w-[360px] shrink-0 flex-col overflow-hidden bg-background">
          {/* Cart Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="h-4 w-4 text-foreground" />
              <span className="font-semibold text-sm text-foreground">Cart</span>
              {cart.length > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-foreground flex items-center justify-center">
                  <span className="text-[10px] font-bold text-background">{cart.length}</span>
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 font-medium">
                <Trash2 className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>

          {/* Customer Name */}
          <div className="px-4 py-3 border-b">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Patient name (optional)"
                className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1 rounded-xl"
              />
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-center px-6">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold text-foreground">Cart is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Select medicines from the left panel</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.map(item => {
                  const t = tpt(item.medicine);
                  const tabs = totalTabs(item);
                  return (
                  <Card key={item.medicine.id} className="border shadow-none rounded-xl overflow-hidden py-0 gap-0">
                    <CardContent className="px-3 py-2.5">
                      {/* Name + remove */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground leading-snug flex-1">{item.medicine.name}</p>
                        <button
                          onClick={() => removeFromCart(item.medicine.id)}
                          className="shrink-0 h-5 w-5 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Editable per-tablet price + per-strip info */}
                      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                        <Pencil className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                        <span className="text-xs text-muted-foreground font-medium">{CURRENCY}</span>
                        <PriceInput value={priceTab(item)} onChange={p => updatePrice(item.medicine.id, p)} />
                        <span className="text-xs text-muted-foreground font-medium">/ {t > 1 ? 'tablet' : item.medicine.unit}</span>
                        {t > 1 && (
                          <span className="text-[10px] text-muted-foreground/70">· {CURRENCY} {item.medicine.sellingPrice.toFixed(2)}/strip ({t})</span>
                        )}
                      </div>

                      {/* Strips & tablets steppers */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {/* Strips */}
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <button onClick={() => changeStrips(item.medicine.id, -1)} className="h-6 w-6 rounded-full border-2 border-foreground/20 flex items-center justify-center hover:bg-muted hover:border-foreground/40 transition-all">
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                              <CountInput value={item.strips} max={Math.floor((item.medicine.stock - item.tablets) / t)} onChange={v => setStrips(item.medicine.id, v)} />
                              <button onClick={() => changeStrips(item.medicine.id, 1)} className="h-6 w-6 rounded-full border-2 border-foreground/20 flex items-center justify-center hover:bg-muted hover:border-foreground/40 transition-all disabled:opacity-35" disabled={(item.strips + 1) * t + item.tablets > item.medicine.stock}>
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{t > 1 ? 'Strips' : item.medicine.unit}</span>
                          </div>

                          {/* Tablets (only when strip-based) */}
                          {t > 1 && (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1">
                                <button onClick={() => changeTablets(item.medicine.id, -1)} className="h-6 w-6 rounded-full border-2 border-foreground/20 flex items-center justify-center hover:bg-muted hover:border-foreground/40 transition-all">
                                  <Minus className="h-2.5 w-2.5" />
                                </button>
                                <CountInput value={item.tablets} max={item.medicine.stock - item.strips * t} onChange={v => setTablets(item.medicine.id, v)} />
                                <button onClick={() => changeTablets(item.medicine.id, 1)} className="h-6 w-6 rounded-full border-2 border-foreground/20 flex items-center justify-center hover:bg-muted hover:border-foreground/40 transition-all disabled:opacity-35" disabled={item.strips * t + item.tablets + 1 > item.medicine.stock}>
                                  <Plus className="h-2.5 w-2.5" />
                                </button>
                              </div>
                              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">Tablets</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">{tabs} {t > 1 ? 'tab' : item.medicine.unit} × {CURRENCY} {priceTab(item).toFixed(2)}</p>
                          <p className="text-sm font-bold text-foreground tabular-nums">
                            {CURRENCY} {lineTotal(item).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* ── Order Summary ── */}
          <div className="border-t bg-background shrink-0">
            {/* Payment Method */}
            <div className="px-4 pt-4 pb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(paymentConfig) as PaymentMethod[]).map(method => {
                  const { icon: Icon, label } = paymentConfig[method];
                  return (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all',
                        paymentMethod === method
                          ? 'border-foreground bg-foreground text-background shadow-sm'
                          : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />


            {/* Total Amount — prominent */}
            <div className="px-4 pt-2 pb-8">
              <div className="rounded-2xl bg-muted/60 px-4 py-3 flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-foreground">Total Amount</span>
                <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                  {CURRENCY} {total.toFixed(2)}
                </span>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessing}
                className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background font-bold text-sm rounded-full shadow-sm transition-all disabled:opacity-40"
              >
                Complete Sale
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Processing spinner */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-2xl px-10 py-8 flex flex-col items-center gap-4 shadow-2xl border">
            <Loader2 className="h-9 w-9 animate-spin text-foreground" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Processing Sale</p>
              <p className="text-xs text-muted-foreground mt-0.5">Please wait...</p>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <Dialog open={showReceipt} onOpenChange={(open) => { if (!open) handleNewSale(); }}>
        <DialogContent className="max-w-sm p-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-6 pt-4 pb-3 border-b">
            <DialogTitle className="text-sm font-semibold">
              Medical Receipt Details
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh]" id="receipt-print">
            <div className="p-5 font-mono text-xs space-y-3">
              {/* Header */}
              <div className="text-center pb-3 border-b border-dashed space-y-0.5">
                <div className="font-bold text-sm text-foreground">{defaultSettings.hospitalName}</div>
                <div className="text-muted-foreground text-[10px] leading-relaxed px-2">{defaultSettings.address}</div>
                <div className="text-muted-foreground text-[11px]">{defaultSettings.phone}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Pharmacy Receipt</div>
              </div>

              {/* Details */}
              {lastSale && (
                <div className="space-y-1 pb-3 border-b border-dashed">
                  {[
                    ['Invoice', lastSale.invoiceNumber],
                    ['Date', new Date(lastSale.date).toLocaleDateString()],
                    ['Time', new Date(lastSale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })],
                    ...(lastSale.customerName ? [['Patient', lastSale.customerName]] : []),
                    ['Cashier', lastSale.cashierName],
                    ['Payment', lastSale.paymentMethod.charAt(0).toUpperCase() + lastSale.paymentMethod.slice(1)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">{k}</span>
                      <span className="text-foreground font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Items */}
              {lastSale && (
                <div className="pb-3 border-b border-dashed">
                  <div className="flex text-[10px] uppercase tracking-wider text-muted-foreground mb-2 pb-1.5 border-b border-dashed">
                    <span className="flex-1">Description</span>
                    <span className="w-8 text-center shrink-0">Qty</span>
                    <span className="w-24 text-right shrink-0">Amount</span>
                  </div>
                  <div className="space-y-2">
                    {lastSale.items.map((item, idx) => (
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
              )}

              {/* Totals */}
              {lastSale && (
                <div className="space-y-1.5 pb-3 border-b border-dashed">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{CURRENCY} {lastSale.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax ({defaultSettings.taxPercentage}%)</span><span className="tabular-nums">{CURRENCY} {lastSale.tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-dashed">
                    <span className="text-foreground">TOTAL</span>
                    <span className="text-foreground tabular-nums">{CURRENCY} {lastSale.total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="text-center text-muted-foreground text-[11px]">
                <p>{defaultSettings.receiptFooter}</p>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => lastSale && printReceipt(lastSale)} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button onClick={handleNewSale} className="bg-foreground hover:bg-foreground/90 text-background gap-2">
              <Plus className="h-4 w-4" /> New Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
