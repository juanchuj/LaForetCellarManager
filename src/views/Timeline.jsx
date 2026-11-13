import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChartGantt, Crosshair, Plus } from 'lucide-react';
import { useDB } from '@/lib/store';
import { navigate } from '@/lib/router';
import { pending } from '@/lib/notify';
import { fmtDate, fmtG, greenWeight, stageVar } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StageDot } from '@/components/stage-dot';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DAY = 86400000;
const ZOOM = { semanas: 26, meses: 12, trimestre: 6 };
const LABEL_W = 232;

/* Same segment rules as v4.4.3: done → real; in progress → real until today + projected;
   not started → projected; past expected end and not done → overdue. */
function segmentsFor(b, today) {
  const out = [];
  for (const s of b.stages) {
    const start = new Date(s.startedAt || b.startedAt);
    if (s.done) out.push({ s, kind: 'real', start, end: new Date(s.actualEnd || s.expectedEnd || start) });
    else {
      const exp = new Date(s.expectedEnd || start);
      if (start > today) out.push({ s, kind: 'proj', start, end: exp });
      else if (exp <= today) out.push({ s, kind: 'overdue', start, end: today, expected: exp });
      else { out.push({ s, kind: 'real', start, end: today }); out.push({ s, kind: 'proj', start: today, end: exp, cont: true }); }
    }
  }
  return out;
}

export function Timeline() {
  const db = useDB();
  const [zoom, setZoom] = useState('meses');
  const [scope, setScope] = useState('activos');
  const scroller = useRef(null);
  const today = new Date();

  const batches = db.batches
    .filter((b) => (scope === 'activos' ? b.status === 'in_progress' : b.status !== 'draft'))
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

  const { minD, days, months, weeks } = useMemo(() => {
    if (!batches.length) return { minD: today, days: 0, months: [], weeks: [] };
    const starts = batches.map((b) => +new Date(b.startedAt));
    const ends = batches.map((b) => { const s = b.stages[b.stages.length - 1]; return +new Date(s.actualEnd || s.expectedEnd || s.startedAt || b.startedAt); });
    const minD = new Date(Math.min(...starts, +today) - 5 * DAY);
    const maxD = new Date(Math.max(...ends, +today + 14 * DAY) + 7 * DAY);
    const days = (maxD - minD) / DAY;
    const months = []; const m = new Date(minD.getFullYear(), minD.getMonth() + 1, 1);
    while (m < maxD) { months.push(new Date(m)); m.setMonth(m.getMonth() + 1); }
    const weeks = []; const w = new Date(minD); w.setDate(w.getDate() + ((8 - w.getDay()) % 7));
    while (w < maxD) { weeks.push(new Date(w)); w.setDate(w.getDate() + 7); }
    return { minD, days, months, weeks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.batches.length, scope, batches.map((b) => b.id + b.stages.map((s) => s.done).join()).join()]);

  const px = ZOOM[zoom];
  const width = Math.max(720, days * px);
  const x = (d) => ((+new Date(d) - +minD) / DAY) * px;

  const scrollToToday = (smooth) => {
    const el = scroller.current; if (!el) return;
    el.scrollTo({ left: Math.max(0, x(today) - (el.clientWidth - LABEL_W) * 0.35), behavior: smooth ? 'smooth' : 'auto' });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => scrollToToday(false), [zoom, scope, batches.length]);

  const stagesPresent = [...new Set(batches.flatMap((b) => b.stages.map((s) => s.kind)))];

  return (
    <>
      <PageHeader
        eyebrow="Vista de cava"
        title="Línea de tiempo"
        description="Etapas reales y proyectadas de cada lote. Hacé clic en una fila para abrir el lote."
        actions={<Button onClick={() => pending('El asistente de nuevo lote')}><Plus /> Nuevo lote</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={scope} onValueChange={setScope}>
          <TabsList>
            <TabsTrigger value="activos">Activos</TabsTrigger>
            <TabsTrigger value="todos">Incluir terminados</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={zoom} onValueChange={setZoom}>
          <TabsList>
            <TabsTrigger value="semanas">Semanas</TabsTrigger>
            <TabsTrigger value="meses">Meses</TabsTrigger>
            <TabsTrigger value="trimestre">Trimestre</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={() => scrollToToday(true)}><Crosshair /> Hoy</Button>
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {stagesPresent.map((k) => <span key={k} className="inline-flex items-center gap-1.5"><StageDot kind={k} />{k}</span>)}
          <span className="inline-flex items-center gap-1.5"><span className="seg-proj inline-block h-2.5 w-5 rounded-[3px]" style={{ '--seg': 'var(--muted-foreground)' }} />Proyectado</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-5 rounded-[3px] bg-muted ring-2 ring-danger" />Vencida</span>
        </div>
      </div>

      {batches.length === 0 ? (
        <EmptyState icon={ChartGantt} title="Sin lotes activos">Cuando inicies un lote, sus etapas aparecen aquí.</EmptyState>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div ref={scroller} className="overflow-x-auto">
            <div style={{ width: width + LABEL_W }} className="relative">
              {/* scale */}
              <div className="sticky top-0 z-20 flex h-10 border-b bg-card/95 backdrop-blur">
                <div style={{ width: LABEL_W }} className="sticky left-0 z-10 flex shrink-0 items-center border-r bg-card px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Lote</div>
                <div className="relative flex-1">
                  {months.map((m) => (
                    <span key={+m} className="absolute top-0 flex h-full items-center border-l border-border pl-2 font-mono text-[11px] text-muted-foreground" style={{ left: x(m) }}>
                      {m.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })}
                    </span>
                  ))}
                  <span className="absolute top-1 -translate-x-1/2 rounded-full bg-gold px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white" style={{ left: x(today) }}>hoy</span>
                </div>
              </div>
              {/* rows */}
              <div className="relative">
                <div aria-hidden className="pointer-events-none absolute inset-y-0" style={{ left: LABEL_W, width }}>
                  {weeks.map((w) => <span key={+w} className="absolute inset-y-0 border-l border-dashed border-border/60" style={{ left: x(w) }} />)}
                  {months.map((m) => <span key={+m} className="absolute inset-y-0 border-l border-border" style={{ left: x(m) }} />)}
                  <span className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-gold" style={{ left: x(today) }} />
                </div>
                {batches.map((b) => (
                  <div key={b.id} className="group flex h-14 border-b last:border-b-0">
                    <button
                      onClick={() => navigate(`/lotes/${b.id}`)}
                      style={{ width: LABEL_W }}
                      className="sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r bg-card px-4 text-left transition-colors group-hover:bg-muted"
                    >
                      <span className="truncate text-sm font-medium">{b.typeName}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{b.ref} · {fmtG(greenWeight(b))}{b.status === 'done' ? ' · terminado' : ''}</span>
                    </button>
                    <div className="relative flex-1 cursor-pointer transition-colors group-hover:bg-muted/40" onClick={() => navigate(`/lotes/${b.id}`)}>
                      {segmentsFor(b, today).map((seg, i) => {
                        const left = x(seg.start), w = Math.max(4, x(seg.end) - left);
                        const color = stageVar(seg.s.kind);
                        return (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn('absolute top-3 flex h-8 items-center overflow-hidden whitespace-nowrap px-2 text-[11px] font-medium',
                                  seg.cont ? 'rounded-r-md' : seg.kind === 'real' && !seg.s.done ? 'rounded-l-md' : 'rounded-md',
                                  seg.kind === 'proj' ? 'seg-proj text-foreground/80' : 'text-white shadow-xs',
                                  seg.kind === 'overdue' && 'ring-2 ring-danger ring-offset-1 ring-offset-card')}
                                style={{ left, width: w, ...(seg.kind === 'proj' ? { '--seg': color } : { background: color }) }}
                              >
                                {!seg.cont && w > 64 ? seg.s.kind : ''}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="font-medium">{seg.s.kind} · {seg.kind === 'real' ? (seg.s.done ? 'completada' : 'en curso') : seg.kind === 'proj' ? 'proyectada' : 'vencida'}</div>
                              <div className="opacity-80">{fmtDate(seg.s.startedAt || b.startedAt)} → {fmtDate(seg.s.actualEnd || seg.s.expectedEnd)}</div>
                              {seg.kind === 'overdue' && <div className="opacity-80">Fin esperado {fmtDate(seg.expected)}</div>}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
