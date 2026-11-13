import { ArrowLeft, CircleCheck, Clock, Droplets, Hourglass, Info, MoreHorizontal, OctagonAlert, Scale, Thermometer, TriangleAlert } from 'lucide-react';
import { useDB, core } from '@/lib/store';
import { navigate } from '@/lib/router';
import { pending } from '@/lib/notify';
import { fmt, fmtDate, fmtDateShort, fmtG, fmtGExact, greenWeight, stageVar } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/views/Batches';
import { EtaPill } from '@/views/Dashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const LEVEL = { green: 'success', yellow: 'warning', red: 'danger', gray: 'secondary' };
const PCC = {
  pass: { icon: CircleCheck, cls: 'text-success', label: 'OK' },
  warn: { icon: TriangleAlert, cls: 'text-warning', label: 'Alerta' },
  fail: { icon: OctagonAlert, cls: 'text-danger', label: 'Violado' },
  doc: { icon: Info, cls: 'text-warning', label: 'Documentado' },
  pending: { icon: Hourglass, cls: 'text-muted-foreground', label: 'Pendiente' },
};

export function BatchOverview({ id }) {
  const db = useDB();
  const b = db.batches.find((x) => x.id === id);
  if (!b) {
    return <EmptyState title="Lote no encontrado" action={<Button variant="outline" onClick={() => navigate('/lotes')}><ArrowLeft /> Volver a lotes</Button>}>Puede haber sido borrado en otra pestaña.</EmptyState>;
  }

  const green = greenWeight(b);
  const current = core.latestWeight(b);
  const target = (b.targetYield / 100) * green;
  const lossTarget = 100 - b.targetYield;
  const loss = current ? 100 * (1 - current / green) : null;
  const lastLog = b.pieces.flatMap((p) => p.weightLogs || []).sort((x, y) => new Date(y.date) - new Date(x.date))[0];
  const cs = core.currentStage(b);
  const { results, summary } = core.evaluateHaccp(b);
  const env = core.envStats(b, cs?.kind) || core.envStats(b);
  const today = new Date();

  return (
    <>
      <button onClick={() => navigate('/lotes')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Lotes
      </button>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1.5 font-mono text-xs tracking-wider text-gold-ink">{b.ref}</p>
          <h1 className="font-display text-4xl font-semibold leading-tight">{b.typeName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={b.status} />
            <span>Iniciado {fmtDate(b.startedAt)}</span>
            <span aria-hidden>·</span>
            <span>Lote {b.lot || '—'}</span>
            <span aria-hidden>·</span>
            <span>{b.pieces.length} pieza{b.pieces.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => core.openWeightLogModal(b.id)}><Scale /> Registrar pesos</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Más acciones"><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Acciones del lote</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => pending('Completar etapa')}>Completar etapa actual</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => pending('El registro de pH')}>Registrar pH</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => pending('El registro ambiental')}>Importar Govee</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => pending('La etiqueta nutricional')}>Etiqueta nutricional</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => pending('El borrado seguro')}>Descartar lote…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Peso verde" value={fmtG(green)} note={`${b.pieces.length} pieza${b.pieces.length === 1 ? '' : 's'}`} />
        <Stat label="Peso actual" value={current ? fmtG(current) : '—'} note={lastLog ? `medido ${fmtDate(lastLog.date)}` : 'sin registros de peso'} />
        <Stat label="Objetivo" value={fmtG(target)} note={`rendimiento ${fmt(b.targetYield, 0)}% · pierde ${fmt(lossTarget, 0)}%`} />
        <Stat label="Pérdida actual" value={loss != null ? `${fmt(loss, 1)}%` : '—'} note={`de ${fmt(lossTarget, 0)}% objetivo`}>
          {loss != null && <Progress value={Math.min(100, (100 * loss) / lossTarget)} className="mt-2 h-1.5" indicatorClassName="bg-gold" />}
        </Stat>
      </section>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-display text-2xl font-semibold">Etapas</CardTitle>
          <CardDescription>{b.stages.filter((s) => s.done).length} de {b.stages.length} completadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {b.stages.map((s, i) => {
              const isCur = s === cs;
              const overdue = isCur && s.expectedEnd && new Date(s.expectedEnd) < today;
              const eta = s.expectedEnd ? core.daysBetween(today, s.expectedEnd) : null;
              return (
                <li key={i} className={cn('relative rounded-lg border bg-background/50 p-3.5', isCur && 'border-gold/50 bg-gold/5 ring-1 ring-gold/30', overdue && 'border-danger/40 bg-danger-soft/40 ring-danger/30')}>
                  <div className="mb-2 h-1 rounded-full" style={{ background: s.done || isCur ? stageVar(s.kind) : 'var(--border)' }} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium"><span className="mr-1.5 font-mono text-xs text-muted-foreground">{i + 1}</span>{s.kind}</span>
                    {s.done ? <Badge variant="success">Completada</Badge> : isCur ? <EtaPill eta={eta} /> : <Badge variant="secondary">Pendiente</Badge>}
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] tabular text-muted-foreground">
                    {fmtDateShort(s.startedAt)} → {fmtDateShort(s.actualEnd || s.expectedEnd)} · {Math.round(s.dEst)} d
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="pb-2">
          <CardHeader>
            <CardTitle className="font-display text-2xl font-semibold">Piezas</CardTitle>
            <CardDescription>aw estimada con el modelo de v4.4.3 hasta que registres una medición</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Pieza</TableHead>
                <TableHead className="text-right">Verde</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Pérdida</TableHead>
                <TableHead className="text-right">aw</TableHead>
                <TableHead className="pr-5">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {b.pieces.map((p) => {
                const logs = p.weightLogs || [];
                const cur = logs.length ? core.latestPieceWeight(p, b) : null;
                const st = core.safetyStatus(b, p);
                const aw = core.pieceAwState(b, p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-5"><div className="font-mono text-sm font-medium">{p.code}</div><div className="text-xs text-muted-foreground">{fmt(p.thickness, 1)} cm · {logs.length} registro{logs.length === 1 ? '' : 's'}</div></TableCell>
                    <TableCell className="text-right font-mono text-sm tabular">{fmtGExact(p.initialWeight)}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular">{cur ? fmtGExact(cur) : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular">{cur ? `${fmt(100 * (1 - cur / p.initialWeight), 1)}%` : '—'}</TableCell>
                    <TableCell className="text-right font-mono tabular">
                      {logs.length && aw.aw != null ? (
                        <>
                          <div className="text-sm">{aw.source === 'medido' ? '' : '≈'}{aw.aw.toFixed(3)}</div>
                          <div className="text-[10px] text-muted-foreground">{aw.source === 'medido' ? 'medido' : `±${aw.unc.toFixed(2)} est.`}</div>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="pr-5">
                      <Tooltip>
                        <TooltipTrigger asChild><span><Badge variant={LEVEL[st.level] || 'secondary'} className="cursor-default">{shortStatus(st.label)}</Badge></span></TooltipTrigger>
                        <TooltipContent>{st.label}{st.haccpWhy ? ` — ${st.haccpWhy}` : ''}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl font-semibold">HACCP</CardTitle>
              <CardDescription>
                {summary.criticalFails > 0 ? `${summary.criticalFails} PCC crítico violado` : summary.fail > 0 ? `${summary.fail} PCC violado` : `${summary.pass} de ${summary.total} en regla`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {results.map((r, i) => {
                  const m = PCC[r.status] || PCC.pending; const Icon = m.icon;
                  return (
                    <li key={r.pcc.id || i} className="flex gap-3">
                      <Icon className={cn('mt-0.5 size-4 shrink-0', m.cls)} />
                      <div className="min-w-0 text-sm">
                        <div className="font-medium">{r.pcc.label} <span className={cn('ml-1 text-xs font-normal', m.cls)}>{m.label}</span></div>
                        {r.detail && <div className="text-xs text-muted-foreground">{r.detail}</div>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl font-semibold">Ambiente</CardTitle>
              <CardDescription>{env ? `Promedio ${cs ? `en ${cs.kind}` : 'del lote'} · ${env.nSamples} lecturas` : 'Sin registros ambientales'}</CardDescription>
            </CardHeader>
            {env && (
              <CardContent className="grid grid-cols-2 gap-3">
                <EnvTile icon={Thermometer} label="Temperatura" value={env.avgT != null ? `${fmt(env.avgT, 1)} °C` : '—'} />
                <EnvTile icon={Droplets} label="Humedad relativa" value={env.avgHR != null ? `${fmt(env.avgHR, 0)} %` : '—'} />
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" /> Las pestañas de piezas, etapas, catas y análisis con edición completa llegan en la fase 2.</p>
    </>
  );
}

/* Legacy labels look like "NO CONSUMIR AÚN · aw ≈ 0.951 est." → "No consumir aún" */
function shortStatus(label) {
  const head = String(label).split(' · ')[0];
  return head === head.toUpperCase() ? head.charAt(0) + head.slice(1).toLowerCase() : head;
}

function Stat({ label, value, note, children }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-2 font-mono text-2xl font-medium tabular tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{note}</div>
        {children}
      </CardContent>
    </Card>
  );
}

function EnvTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</div>
      <div className="mt-1 font-mono text-lg tabular">{value}</div>
    </div>
  );
}
