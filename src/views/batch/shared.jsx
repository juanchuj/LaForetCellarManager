import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const LEVEL_VARIANT = { green: 'success', yellow: 'warning', red: 'danger', alert: 'danger', gray: 'secondary', muted: 'secondary', info: 'info' };
export const LEVEL_TEXT = { green: 'text-success', yellow: 'text-warning', red: 'text-danger', alert: 'text-danger', gray: 'text-muted-foreground' };

export function LevelBadge({ level, children, className }) {
  return <Badge variant={LEVEL_VARIANT[level] || 'secondary'} className={className}>{children}</Badge>;
}

export function Panel({ title, description, action, children, className, contentClassName }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-display text-2xl font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}

export function Dot({ className }) {
  return <span className={cn('inline-block size-1.5 rounded-full bg-danger', className)} aria-hidden />;
}
