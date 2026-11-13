import { useMemo } from 'react';
import { ArrowRight, ChevronRight, CircleCheck, Info, Layers, OctagonAlert, Package, PackageCheck, Plus, Scale, TriangleAlert, Weight } from 'lucide-react';
import { useDB, core } from '@/lib/store';
import { navigate } from '@/lib/router';
import { pending } from '@/lib/notify';
import { AGENDA_KIND, batchRow, fmt, fmtG, greenWeight, stageVar } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { StageDot } from '@/components/stage-dot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const TIER = {
  critical: { icon: OctagonAlert, row: 'border-l-danger', iconCls: 'text-danger bg-danger-soft', badge: 'danger' },
  warning: { icon: TriangleAlert, row: 'border-l-warning', iconCls: 'text-warning bg-warning-soft', badge: 'warning' },
  info: { icon: Info, row: 'border-l-info', iconCls: 'text-info bg-info-soft', badge: 'info' },
};

export function Dashboard() {
  const db = useDB();
  const agenda = core.todaysAgenda();
  const active = db.batches.filter((b) => b.status === 'in_progress');
  const done = db.batches.filter((b) => b.status === 'done');
  const totalG = active.reduce((s, b) => s + greenWeight(b), 0);
  const agendaIds = new Set(agenda.map((i) => i.batchId));

  const rows = active.map(batchRow).filter((r) => r.cs).sort((a, b) => (a.eta ?? 999) - (b.eta ?? 999));

  return (
    <>
      <PageHeader
        eyebrow="Bienvenido a la cava"
        title={<>Panel de <em className="font-semibold italic text-gold-ink">producción</em></>}
        description={`${active.length} lote${active.length === 1 ? '' : 's'} activo${active.length === 1 ? '' : 's'} · ${fmtG(totalG)} en verde · ${db.types.length} recetas madre`}
        actions={
          <>
            <Button variant="outline" onClick={() => pending('La jornada de pesaje')}><Scale /> Jornada de pesaje</Button>
            <Button onClick={() => pending('El asistente de nuevo lote')}><Plus /> Nuevo lote</Button>
          </>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Indicadores">
        <Kpi icon={Package} label="Lotes activos" value={active.length} note="en proceso ahora" />
        <Kpi icon={Weight} label="Peso verde en cava" value={fmt(totalG / 1000, 2)} unit="kg" note="carne cruda ingresada" />
        <Kpi icon={PackageCheck} label="Producidos" value={done.length} note="lotes terminados" />
        <Kpi icon={Layers} label="Recetas" value={db.types.length} note="tipos de madurado" />
      </section>

      <Agenda items={agenda} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl font-semibold">Lotes en curso</CardTitle>
            <CardDescription>Ordenados por lo que vence primero</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => navigate('/lotes')}>Ver todos <ArrowRight /></Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-2">
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin lotes en proceso.</p>
            ) : (
              <ul className="divide-y">
                {rows.slice(0, 8).map(({ b, cs, eta, progress }) => (
                  <li key={b.id}>
                    <button
                      onClick={() => navigate(`/lotes/${b.id}`)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted/60 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_7.5rem]"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-medium">{b.ref}</div>
                        <div className="truncate text-xs text-muted-foreground">{b.typeName}</div>
                      </div>
                      <div className="order-3 col-span-2 flex items-center gap-2 text-sm sm:order-none sm:col-span-1">
                        <StageDot kind={cs.kind} />
                        <span>{cs.kind}</span>
                        {agendaIds.has(b.id) && <Badge variant="gold" className="px-1.5 py-0 text-[10px]">hoy</Badge>}
                      </div>
                      <div className="hidden sm:block">
                        <Progress value={progress} className="h-1.5" indicatorStyle={{ background: stageVar(cs.kind) }} />
                        <div className="mt-1 font-mono text-[11px] tabular text-muted-foreground">{Math.round(progress)}%</div>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <EtaPill eta={eta} />
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Distribution active={active} />
      </div>

    </>
  );
}

function Kpi({ icon: Icon, label, value, unit, note }) {
  return (
    <Card className="gap-3 py-4">
      <CardContent className="px-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="size-4 text-gold" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-mono text-3xl font-medium tabular tracking-tight">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{note}</div>
      </CardContent>
    </Card>
  );
}

export function EtaPill({ eta }) {
  if (eta === null || eta === undefined) return <span className="font-mono text-sm text-muted-foreground">—</span>;
  const overdue = eta < 0, soon = eta >= 0 && eta <= 3;
  return (
    <span className={cn('rounded-md px-2 py-0.5 font-mono text-xs font-medium tabular',
      overdue ? 'bg-danger-soft text-danger' : soon ? 'bg-warning-soft text-warning' : 'text-muted-foreground')}>
      {overdue ? `${-eta} d vencida` : eta === 0 ? 'hoy' : `${eta} d`}
    </span>
  );
}

function Agenda({ items }) {
  const counts = useMemo(() => items.reduce((a, it) => { const t = AGENDA_KIND[it.kind]?.tier || 'info'; a[t] = (a[t] || 0) + 1; return a; }, {}), [items]);
  return (
    <Card>
      <CardHeader className="sm:grid-cols-[1fr_auto]">
        <CardTitle className="font-display text-2xl font-semibold">¿Qué hago hoy?</CardTitle>
        <CardDescription>Alertas HACCP, etapas vencidas y tareas, por urgencia</CardDescription>
        <div className="mt-1 flex flex-wrap gap-1.5 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:justify-end">
          {counts.critical > 0 && <Badge variant="danger">{counts.critical} crítico{counts.critical > 1 ? 's' : ''}</Badge>}
          {counts.warning > 0 && <Badge variant="warning">{counts.warning} alerta{counts.warning > 1 ? 's' : ''}</Badge>}
          {counts.info > 0 && <Badge variant="info">{counts.info} aviso{counts.info > 1 ? 's' : ''}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-success-soft/60 px-4 py-5 text-sm">
            <CircleCheck className="size-5 text-success" />
            <div><div className="font-medium">Todo al día</div><div className="text-muted-foreground">Nada urgente. Buen momento para una cata o planear un lote nuevo.</div></div>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.slice(0, 10).map((it, i) => {
              const k = AGENDA_KIND[it.kind] || { tier: 'info', label: it.kind };
              const t = TIER[k.tier];
              const Icon = t.icon;
              return (
                <li key={i}>
                  <button
                    onClick={() => navigate(`/lotes/${it.batchId}`)}
                    className={cn('flex w-full items-center gap-3 rounded-lg border border-l-[3px] bg-background/50 px-3 py-2.5 text-left transition-colors hover:bg-muted/60', t.row)}
                  >
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-md', t.iconCls)}><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{it.label.replace(/^⚠\s*/, '')}</span>
                      <span className="block truncate text-xs text-muted-foreground">{it.note}</span>
                    </span>
                    <Badge variant={t.badge} className="hidden sm:inline-flex">{k.label}</Badge>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {items.length > 10 && <p className="mt-2 text-center text-xs text-muted-foreground">y {items.length - 10} más…</p>}
      </CardContent>
    </Card>
  );
}

function Distribution({ active }) {
  const byStage = {};
  active.forEach((b) => {
    const s = core.currentStage(b);
    if (!s) return;
    byStage[s.kind] ??= { n: 0, g: 0 };
    byStage[s.kind].n += 1;
    byStage[s.kind].g += greenWeight(b);
  });
  const entries = Object.entries(byStage).sort((a, b) => b[1].n - a[1].n);
  const total = entries.reduce((s, [, v]) => s + v.n, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl font-semibold">Distribución de cava</CardTitle>
        <CardDescription>Lotes activos por etapa actual</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin lotes activos.</p>
        ) : (
          <>
            <div className="mb-5 flex h-3 overflow-hidden rounded-full ring-1 ring-border">
              {entries.map(([k, v]) => <span key={k} title={`${k}: ${v.n}`} style={{ width: `${(100 * v.n) / total}%`, background: stageVar(k) }} />)}
            </div>
            <ul className="space-y-3">
              {entries.map(([k, v]) => (
                <li key={k} className="flex items-center gap-3 text-sm">
                  <StageDot kind={k} />
                  <span className="flex-1">{k}</span>
                  <span className="font-mono text-xs tabular text-muted-foreground">{fmtG(v.g)}</span>
                  <span className="w-14 text-right font-mono text-xs tabular">{v.n} lote{v.n === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
