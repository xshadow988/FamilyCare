'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Building2,
  Receipt,
  DollarSign,
  Bell,
  Palette,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { defaultSettings } from '@/lib/data';
import { AppSettings } from '@/lib/types';
import { useTheme } from 'next-themes';
import { useAppContext } from '@/components/providers/app-context';
import { cn } from '@/lib/utils';

const CURRENCY = defaultSettings.currencySymbol;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { reload } = useAppContext();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [notifications, setNotifications] = useState({
    lowStock: true,
    expiry: true,
    dailySummary: false,
    newSale: false,
  });

  const f = (key: keyof AppSettings, val: string | number) =>
    setSettings(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = async () => {
    if (confirmText !== 'RESET') return;
    setResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      await reload();
      setResetDone(true);
      setTimeout(() => { setShowResetDialog(false); setResetDone(false); setConfirmText(''); }, 1500);
    } finally {
      setResetting(false);
    }
  };

  const Section = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );

  const FieldRow = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start py-3 border-b last:border-0">
      <div>
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Configure your pharmacy system preferences
          </div>
          <Button
            onClick={handleSave}
            className={`transition-all ${saved ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-foreground hover:bg-foreground/90 text-background'}`}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <Tabs defaultValue="hospital">
          <TabsList className="h-9 bg-muted/50 flex-wrap">
            <TabsTrigger value="hospital" className="text-xs gap-1.5"><Building2 className="h-3.5 w-3.5" /> Hospital</TabsTrigger>
            <TabsTrigger value="receipt" className="text-xs gap-1.5"><Receipt className="h-3.5 w-3.5" /> Receipt</TabsTrigger>
            <TabsTrigger value="financial" className="text-xs gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Financial</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs gap-1.5"><Bell className="h-3.5 w-3.5" /> Alerts</TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs gap-1.5"><Palette className="h-3.5 w-3.5" /> Appearance</TabsTrigger>
          </TabsList>

          {/* Hospital Info */}
          <TabsContent value="hospital" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" /> Hospital Information
                </CardTitle>
                <CardDescription>This information appears on receipts and reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  <FieldRow label="Hospital Name" hint="Displayed on all receipts">
                    <Input value={settings.hospitalName} onChange={e => f('hospitalName', e.target.value)} className="h-9 text-sm" />
                  </FieldRow>
                  <FieldRow label="Tagline" hint="Short description below hospital name">
                    <Input value={settings.tagline} onChange={e => f('tagline', e.target.value)} className="h-9 text-sm" />
                  </FieldRow>
                  <FieldRow label="Address" hint="Full address for receipts">
                    <Textarea value={settings.address} onChange={e => f('address', e.target.value)} className="text-sm min-h-16 resize-none" />
                  </FieldRow>
                  <FieldRow label="Phone" hint="Contact number">
                    <Input value={settings.phone} onChange={e => f('phone', e.target.value)} className="h-9 text-sm" />
                  </FieldRow>
                  <FieldRow label="Email" hint="Pharmacy email address">
                    <Input type="email" value={settings.email} onChange={e => f('email', e.target.value)} className="h-9 text-sm" />
                  </FieldRow>
                </div>

                {/* Preview */}
                <div className="mt-6 rounded-xl border-2 border-dashed p-4 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Receipt Preview</p>
                  <div className="text-center font-mono text-xs space-y-0.5">
                    <div className="font-bold text-sm text-foreground">{settings.hospitalName}</div>
                    <div className="text-muted-foreground">{settings.tagline}</div>
                    <div className="text-muted-foreground">{settings.address}</div>
                    <div className="text-muted-foreground">{settings.phone}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipt Settings */}
          <TabsContent value="receipt" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-600" /> Receipt Configuration
                </CardTitle>
                <CardDescription>Customize how your receipts look and what they contain</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  <FieldRow label="Footer Text" hint="Message printed at the bottom of every receipt">
                    <Textarea value={settings.receiptFooter} onChange={e => f('receiptFooter', e.target.value)} className="text-sm min-h-16 resize-none" />
                  </FieldRow>
                  <FieldRow label="Show Logo" hint="Display hospital logo on printed receipts">
                    <Switch defaultChecked className="data-[state=checked]:bg-blue-600" />
                  </FieldRow>
                  <FieldRow label="Show Tax Breakdown" hint="Include tax line items in receipts">
                    <Switch defaultChecked className="data-[state=checked]:bg-blue-600" />
                  </FieldRow>
                  <FieldRow label="Show Generic Names" hint="Print generic names below medicine names">
                    <Switch defaultChecked className="data-[state=checked]:bg-blue-600" />
                  </FieldRow>
                  <FieldRow label="Auto-print on Sale" hint="Automatically open print dialog after checkout">
                    <Switch className="data-[state=checked]:bg-blue-600" />
                  </FieldRow>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Settings */}
          <TabsContent value="financial" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" /> Financial Settings
                </CardTitle>
                <CardDescription>Configure currency, taxes, and inventory thresholds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  <FieldRow label="Currency" hint="Base currency for all transactions">
                    <Select value={settings.currency} onValueChange={v => { if (v) f('currency', v); }}>
                      <SelectTrigger className="h-9 text-sm w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
                        <SelectItem value="GBP">GBP — British Pound (£)</SelectItem>
                        <SelectItem value="IDR">IDR — Indonesian Rupiah (Rp)</SelectItem>
                        <SelectItem value="INR">INR — Indian Rupee (₹)</SelectItem>
                        <SelectItem value="PKR">PKR — Pakistani Rupee (₨)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Tax Percentage" hint="Applied to all sales transactions">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.taxPercentage}
                        onChange={e => f('taxPercentage', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm w-24"
                        min="0"
                        max="100"
                        step="0.5"
                      />
                      <span className="text-sm font-medium text-muted-foreground">%</span>
                    </div>
                  </FieldRow>
                  <FieldRow label="Low Stock Threshold" hint="Alert when stock falls below this number">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={settings.lowStockThreshold}
                        onChange={e => f('lowStockThreshold', parseInt(e.target.value) || 0)}
                        className="h-9 text-sm w-24"
                        min="0"
                      />
                      <span className="text-sm font-medium text-muted-foreground">units</span>
                    </div>
                  </FieldRow>
                </div>

                <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4 text-sm space-y-1">
                  <p className="font-semibold text-blue-700 dark:text-blue-400">Current Tax Preview</p>
                  <p className="text-muted-foreground">A {CURRENCY}100.00 sale will include {CURRENCY}{(100 * settings.taxPercentage / 100).toFixed(2)} in tax for a total of {CURRENCY}{(100 + 100 * settings.taxPercentage / 100).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" /> Alert Settings
                </CardTitle>
                <CardDescription>Configure when and how you receive pharmacy alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {[
                    { key: 'lowStock' as const, label: 'Low Stock Alerts', hint: 'Notify when medicine stock falls below threshold', badge: 'Recommended' },
                    { key: 'expiry' as const, label: 'Expiry Date Warnings', hint: 'Alert 30 days before medicines expire', badge: 'Recommended' },
                    { key: 'dailySummary' as const, label: 'Daily Summary', hint: 'Send daily sales and inventory summary at end of day', badge: null },
                    { key: 'newSale' as const, label: 'New Sale Notifications', hint: 'Alert for every completed transaction', badge: null },
                  ].map(({ key, label, hint, badge }) => (
                    <FieldRow key={key} label={label} hint={hint}>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={notifications[key]}
                          onCheckedChange={v => setNotifications(p => ({ ...p, [key]: v }))}
                          className="data-[state=checked]:bg-blue-600"
                        />
                        {badge && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 text-[10px]">{badge}</Badge>}
                      </div>
                    </FieldRow>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-blue-600" /> Appearance
                </CardTitle>
                <CardDescription>Customize the visual experience of your system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', preview: 'bg-white border-slate-200' },
                      { value: 'dark', label: 'Dark', preview: 'bg-slate-900 border-slate-700' },
                      { value: 'system', label: 'System', preview: 'bg-gradient-to-br from-white to-slate-900 border-slate-400' },
                    ].map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${theme === t.value ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20' : 'border-border hover:border-muted-foreground/30'}`}
                      >
                        <div className={`h-10 w-full rounded-lg border ${t.preview}`} />
                        <span className="text-xs font-medium text-foreground">{t.label}</span>
                        {theme === t.value && <Badge className="bg-blue-600 text-white text-[10px] h-4">Active</Badge>}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Sidebar Style</Label>
                  <Select defaultValue="default">
                    <SelectTrigger className="h-9 text-sm w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (White/Dark)</SelectItem>
                      <SelectItem value="colored">Colored (Blue)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Version Info</Label>
                  <div className="rounded-lg bg-muted/50 p-4 space-y-1.5">
                    {[
                      ['Application', 'MedPOS Hospital Pharmacy System'],
                      ['Version', 'v1.0.0'],
                      ['Build', '2026.05.20'],
                      ['Framework', 'Next.js 15 + shadcn/ui'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Danger Zone */}
        <Card className="shadow-sm rounded-2xl border-red-200 dark:border-red-900/40 py-0 gap-0">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions — proceed with caution</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Reset All Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes all medicines, sales, purchases and categories from the database.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:hover:bg-red-950/20"
                onClick={() => setShowResetDialog(true)}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset confirmation dialog */}
      <Dialog open={showResetDialog} onOpenChange={open => { if (!open) { setShowResetDialog(false); setConfirmText(''); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" /> Reset All Data
            </DialogTitle>
          </DialogHeader>
          {resetDone ? (
            <div className="py-6 flex flex-col items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-semibold text-foreground">All data has been reset.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  This will permanently delete <span className="font-semibold text-foreground">all medicines, sales, purchases, and categories</span> from the database. This cannot be undone.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Type <span className="text-foreground font-mono">RESET</span> to confirm
                  </Label>
                  <Input
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="RESET"
                    className={cn('h-10 rounded-xl font-mono', confirmText === 'RESET' && 'border-red-400 focus-visible:ring-red-300')}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setShowResetDialog(false); setConfirmText(''); }}>Cancel</Button>
                <Button
                  onClick={handleReset}
                  disabled={confirmText !== 'RESET' || resetting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {resetting ? 'Resetting...' : 'Reset Everything'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
