import { cn } from '@/lib/utils';
import { stageVar } from '@/lib/domain';
import { tx } from '@/lib/i18n';

export function StageDot({ kind, className }) {
  return <span aria-hidden className={cn('inline-block size-2.5 shrink-0 rounded-[3px]', className)} style={{ background: stageVar(kind) }} />;
}

export function StageLabel({ kind, className }) {
  if (!kind) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <StageDot kind={kind} />
      {tx(kind)}
    </span>
  );
}
