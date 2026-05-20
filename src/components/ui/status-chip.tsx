import { cn } from '@/lib/utils';

type Variant = 'green' | 'amber' | 'red' | 'blue' | 'gray';

const variantStyles: Record<Variant, { chip: string; dot: string }> = {
  green: {
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  amber: {
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  red: {
    chip: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    dot: 'bg-red-500 dark:bg-red-400',
  },
  blue: {
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    dot: 'bg-blue-500 dark:bg-blue-400',
  },
  gray: {
    chip: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
};

const statusVariantMap: Record<string, Variant> = {
  // Sale statuses
  completed: 'green',
  refunded: 'red',
  pending: 'amber',
  // Purchase statuses
  received: 'green',
  cancelled: 'red',
  // Stock statuses
  'In Stock': 'green',
  'Low Stock': 'amber',
  'Out of Stock': 'red',
  // Priority statuses
  Critical: 'red',
  High: 'amber',
  Medium: 'blue',
};

interface StatusChipProps {
  label: string;
  variant?: Variant;
  className?: string;
}

export function StatusChip({ label, variant, className }: StatusChipProps) {
  const v = variant ?? statusVariantMap[label] ?? 'gray';
  const { chip, dot } = variantStyles[v];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', chip, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot)} />
      {label}
    </span>
  );
}
