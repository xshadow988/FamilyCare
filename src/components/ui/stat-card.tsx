import { TrendingUp, TrendingDown, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';

export interface StatCardProps {
  description: string;
  value: string;
  badge?: { icon?: 'up' | 'down' | 'tag'; text: string };
  footerMain?: string;
  footerSub?: string;
}

export function StatCard({ description, value, badge, footerMain, footerSub }: StatCardProps) {
  // Font scales with BOTH card width (cqi units) and the value's length, so a
  // longer price gets a smaller font and always stays on one line. The
  // coefficient is reduced when a badge shares the title row (less width).
  const len = Math.max(value.length, 1);
  const titleCqi = Math.min((badge ? 78 : 95) / len, 13);
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="text-xs @[180px]/card:text-sm">{description}</CardDescription>
        <CardTitle
          className="min-w-0 overflow-hidden font-semibold tabular-nums whitespace-nowrap leading-tight"
          style={{ fontSize: `clamp(0.8rem, ${titleCqi.toFixed(2)}cqi, 1.75rem)` }}
        >
          {value}
        </CardTitle>
        {badge && (
          <CardAction>
            <Badge variant="outline">
              {badge.icon === 'tag' ? <Tag /> : badge.icon === 'down' ? <TrendingDown /> : badge.icon === 'up' ? <TrendingUp /> : null}
              {badge.text}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {(footerMain || footerSub) && (
        <CardFooter className="flex-col items-start gap-1 text-[11px] @[200px]/card:text-sm @[200px]/card:gap-1.5">
          {footerMain && <div className="line-clamp-1 flex gap-2 font-medium">{footerMain}</div>}
          {footerSub && <div className="line-clamp-1 text-muted-foreground">{footerSub}</div>}
        </CardFooter>
      )}
    </Card>
  );
}
