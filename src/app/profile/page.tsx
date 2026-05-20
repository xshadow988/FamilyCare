'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, User, Building2, Phone, Mail, MapPin, RotateCcw, CheckCircle2 } from 'lucide-react';
import { defaultSettings } from '@/lib/data';
import { useAppContext } from '@/components/providers/app-context';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { reload } = useAppContext();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleReset = async () => {
    if (confirmText !== 'RESET') return;
    setResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      await reload();
      setResetDone(true);
      setTimeout(() => {
        setShowResetDialog(false);
        setResetDone(false);
        setConfirmText('');
      }, 1500);
    } finally {
      setResetting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-5 space-y-4 max-w-2xl">
        {/* Profile header */}
        <Card className="shadow-sm rounded-2xl py-0 gap-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-foreground text-background text-xl font-bold">MS</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold text-foreground">M.Shafique</h2>
                <p className="text-sm text-muted-foreground">Manager · Admin</p>
                <p className="text-xs text-muted-foreground mt-0.5">manager@familycare.com</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hospital info */}
        <Card className="shadow-sm rounded-2xl py-0 gap-0">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Hospital Information
            </CardTitle>
            <CardDescription>Pharmacy details shown on receipts</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 space-y-4">
            {[
              { icon: Building2, label: 'Hospital Name', value: defaultSettings.hospitalName },
              { icon: MapPin,    label: 'Address',       value: defaultSettings.address },
              { icon: Phone,     label: 'Phone',         value: defaultSettings.phone },
              { icon: Mail,      label: 'Email',         value: defaultSettings.email },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-sm text-foreground font-medium mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="shadow-sm rounded-2xl py-0 gap-0">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" /> Account Details
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</Label>
                <Input defaultValue="M.Shafique" className="h-9 rounded-xl" readOnly />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</Label>
                <Input defaultValue="Manager" className="h-9 rounded-xl" readOnly />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</Label>
              <Input defaultValue="manager@familycare.com" className="h-9 rounded-xl" readOnly />
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
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
                <p className="text-xs text-muted-foreground mt-0.5">Permanently deletes all medicines, sales, purchases and categories from the database.</p>
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
                <p className="text-sm text-muted-foreground">This will permanently delete <span className="font-semibold text-foreground">all medicines, sales, purchases, and categories</span> from the database. This action cannot be undone.</p>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Type <span className="text-foreground">RESET</span> to confirm
                  </Label>
                  <Input
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="RESET"
                    className={cn('h-10 rounded-xl font-mono', confirmText === 'RESET' ? 'border-red-400 focus-visible:ring-red-300' : '')}
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
