import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 py-14 text-center', className)}>
      {Icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-secondary text-gold-ink"><Icon className="size-5" /></div>}
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      {children && <div className="mt-1.5 max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
