import { useState } from 'react';
import { ArrowLeft, Ban, CircleCheck, ClipboardList, MoreHorizontal, Pencil, RotateCcw, Scale, Tag, Thermometer, Trash2, TriangleAlert, Wine } from 'lucide-react';
import { useDB, core } from '@/lib/store';
import { navigate } from '@/lib/router';
import { ask, openDialog } from '@/lib/dialogs';
import { fmt, fmtDate, greenWeight } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/views/Batches';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PiecesTab } from './PiecesTab';
import { StagesTab } from './StagesTab';
import { AnalysisTab, HaccpTab, TastingsTab } from './OtherTabs';
import { Dot } from './shared';

let lastTab = 'piezas'; // remembered across batches, like v4.4.3 batchTab

export function BatchDetail({ id }) {
  const db = useDB();
  const [tab, setTabState] = useState(lastTab);
  const setTab = (t) => { lastTab = t; setTabState(t); };
  const b = db.batches.find((x) => x.id === id);
  if (!b) return <EmptyState title="Lote no encontrado" action={<Button variant="outline" onClick={() => navigate('/lotes')}><ArrowLeft /> Volver a lotes</Button>}>Puede haber sido borrado en otra pestaña.</EmptyState>;

  const green = greenWeight(b);
  const target = (b.targetYield / 100) * green;
  const cw = core.latestWeight(b);
  const loss = cw !== undefined && cw ? 100 * (1 - cw / green) : null;
  const lossTarget = 100 - b.targetYield;
  const nCat = core.tastingList(b).length;

  // tab dots — same rules as v4.4.3
  let hac = null; try { hac = core.evaluateHaccp(b).summary; } catch { /* */ }
  const agenda = (b.status === 'in_progress' ? core.todaysAgenda() || [] : []).filter((i) => i.batchId === b.id);
  const has = (...k) => agenda.some((i) => k.includes(i.kind));
  const nSt = b.stages.length, now = Date.now();
  const reached = b.stages.filter((s) => s.done || (s.startedAt && new Date(s.startedAt).getTime() <= now)).length;
  const allDone = nSt > 0 && b.stages.every((s) => s.done);
  const tabs = [
    ['piezas', 'Piezas', b.pieces.length, has('weigh', 'ready')],
    ['etapas', 'Etapas', !nSt || allDone ? null : `${Math.min(reached, nSt)}/${nSt}`, has('stage', 'ferm', 'ch', 'danger')],
    ['haccp', 'HACCP', null, (hac && hac.criticalFails > 0) || has('pcc', 'pcc-fail')],
    ['catas', 'Catas', nCat || null, has('tasting')],
    ['analisis', 'Análisis', null, false],
  ];

  const sec = core.findSecadoStage(b);
  const thick = b.pieces.reduce((a, x) => ((a.thickness || 0) > (x.thickness || 0) ? a : x), b.pieces[0]);
  const ch = sec && !sec.done && sec.startedAt && b.envLog?.length && thick ? core.caseHardeningRisk(b, thick) : null;

  return (
    <>
      <button onClick={() => navigate('/lotes')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Lotes</button>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1.5 font-mono text-xs tracking-wider text-gold-ink">{b.ref}</p>
          <h1 className="font-display text-4xl font-semibold leading-tight">{b.typeName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={b.status} /><span>Iniciado {fmtDate(b.startedAt)}</span>
            {b.lot && <><span aria-hidden>·</span><span>Lote {b.lot}</span></>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {b.status === 'in_progress' && <Button variant="outline" onClick={() => openDialog('bulk-weight', { batchId: b.id })}><Scale /> Pesar piezas</Button>}
          {b.status === 'done' && <Button variant="outline" onClick={() => openDialog('tasting', { batchId: b.id, tastingId: 'new' })}><Wine /> Nueva cata</Button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><MoreHorizontal /> Acciones</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Registros</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => openDialog('bulk-weight', { batchId: b.id })}><Scale /> Pesar todas las piezas</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openDialog('env-log', { batchId: b.id })}><Thermometer /> T / HR de la cava</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openDialog('tasting', { batchId: b.id, tastingId: 'new' })}><Wine /> Nueva cata{nCat ? ` (${nCat})` : ''}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => ask(() => core.openEditBatchModal(b.id))}><Pencil /> Editar lote</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openDialog('label', { typeId: b.typeId, batchId: b.id })}><Tag /> Etiqueta nutricional</DropdownMenuItem>
              {b.status === 'in_progress' && <DropdownMenuItem onSelect={() => ask(() => core.finishBatch(b.id))}><CircleCheck /> Marcar terminado</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => ask(() => core.discardBatch(b.id))}>{b.status === 'discarded' ? <><RotateCcw /> Reactivar lote</> : <><Ban /> Descartar (recuperable)</>}</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => core.deleteBatchHard(b.id)}><Trash2 /> Eliminar permanentemente</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Peso verde" value={`${fmt(green / 1000, 2)} kg`} note={`${b.pieces.length} pieza${b.pieces.length === 1 ? '' : 's'}`} />
        <Stat label="Peso actual" value={cw ? `${fmt(cw / 1000, 2)} kg` : '—'} note={cw ? `medido ${fmtDate(new Date(core.latestBatchMeasurementDate(b)))}` : 'sin registros'} />
        <Stat label="Objetivo" value={`${fmt(target / 1000, 2)} kg`} note={`rendimiento ${b.targetYield}% · pierde ${fmt(lossTarget, 0)}%`} />
        <Stat label="Pérdida actual" value={loss === null ? '—' : `${fmt(loss, 1)}%`} note={`de ${lossTarget}% objetivo`} valueClassName={loss === null ? '' : loss >= lossTarget ? 'text-success' : ''}>
          {loss !== null && <Progress value={Math.min(100, (100 * loss) / lossTarget)} className="mt-2 h-1.5" indicatorClassName={loss >= lossTarget ? 'bg-success' : 'bg-gold'} />}
        </Stat>
      </section>

      {ch?.risk && (
        <Alert variant="warning" className="mb-6"><TriangleAlert /><AlertTitle>Riesgo de case hardening · pieza más gruesa {thick.thickness} cm</AlertTitle>
          <AlertDescription>{ch.msg}. Promedio T {ch.avgT.toFixed(1)} °C · HR {ch.avgHR.toFixed(0)} % · VPD {ch.vpd.toFixed(2)} kPa (seguro ~{ch.safeVpd.toFixed(2)} kPa).</AlertDescription></Alert>
      )}

      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList className="h-10 max-w-full justify-start overflow-x-auto">
          {tabs.map(([k, l, n, dot]) => (
            <TabsTrigger key={k} value={k} className="relative px-3">
              {l}{n != null && <span className="font-mono text-[11px] tabular text-muted-foreground">{n}</span>}{dot && <Dot />}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="piezas"><PiecesTab b={b} onTab={setTab} /></TabsContent>
        <TabsContent value="etapas"><StagesTab b={b} /></TabsContent>
        <TabsContent value="haccp"><HaccpTab b={b} /></TabsContent>
        <TabsContent value="catas"><TastingsTab b={b} /></TabsContent>
        <TabsContent value="analisis"><AnalysisTab b={b} /></TabsContent>
      </Tabs>
    </>
  );
}

function Stat({ label, value, note, children, valueClassName }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={cn('mt-2 font-mono text-2xl font-medium tabular tracking-tight', valueClassName)}>{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{note}</div>
        {children}
      </CardContent>
    </Card>
  );
}
