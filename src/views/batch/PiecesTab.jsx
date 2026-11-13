import { ChevronDown, CircleSlash, FlaskConical, Flag, Plus, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import { core } from '@/lib/store';
import { ask, openDialog } from '@/lib/dialogs';
import { fmt, fmtDate, fmtDateShort, fmtG, fmtGExact } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { Metric } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Panel } from './shared';

/* Piece colors, tuned for cream backgrounds */
export const PIECE_COLORS = ['#A7782F', '#5C7A2B', '#7E5B28', '#973527', '#3F7699', '#B85724', '#6E5446', '#8A6A9A', '#2F6E6A', '#9A4D6B'];

export function PiecesTab({ b, onTab }) {
  const nLogs = b.pieces.reduce((s, p) => s + (p.weightLogs || []).length, 0);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Panel title="Curvas de peso" description={`% del peso verde · ${nLogs} registro${nLogs === 1 ? '' : 's'}`}>
        <WeightChart b={b} />
      </Panel>
      <div className="grid gap-6">
        <Panel title="Piezas" description="Abrí el detalle con la flecha de cada pieza"
          action={<Button size="sm" variant="outline" onClick={() => openDialog('secado-start', { batchId: b.id })}><Flag /> Inicio Secado</Button>}
          contentClassName="grid gap-2.5">
          {b.pieces.map((p, i) => <PieceCard key={p.id} b={b} p={p} idx={i} onTab={onTab} />)}
        </Panel>
        {b.notes && <Panel title="Observaciones"><p className="whitespace-pre-line text-sm">{b.notes}</p></Panel>}
      </div>
    </div>
  );
}

/* Port of v4.4.3 renderWeightChart: real curves per piece, theoretical drying curve (dashed), target line, today line. */
function WeightChart({ b }) {
  const finalEnd = b.stages[b.stages.length - 1]?.expectedEnd;
  const w = 560, h = 240, pad = { l: 40, r: 12, t: 14, b: 26 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const t0 = new Date(b.startedAt).getTime();
  const tEnd = new Date(finalEnd || Date.now()).getTime();
  const targetPct = b.targetYield;
  const yMin = Math.min(targetPct - 5, 40), yMax = 102;
  const x = (d) => pad.l + (iw * (new Date(d).getTime() - t0)) / (tEnd - t0 || 1);
  const y = (pct) => pad.t + ih * (1 - (pct - yMin) / (yMax - yMin));
  const grid = Array.from({ length: 6 }, (_, i) => yMin + ((yMax - yMin) / 5) * i);
  const nowX = x(new Date());
  const env = core.envStats(b, 'Secado') || core.envStats(b, 'Madurado') || core.envStats(b);
  const sec = core.findSecadoStage(b);

  const theory = env && sec?.startedAt ? b.pieces.map((p, idx) => {
    const startW = core.pieceStartWeight(b, p); const target = core.pieceTargetWeight(b, p);
    if (!startW || !target || target >= startW) return null;
    const k = core.dryingRateK({ tempC: env.avgT ?? 13, hrPct: env.avgHR ?? 75, thicknessCm: p.thickness, shape: p.shape });
    if (k <= 0) return null;
    const s0 = new Date(sec.startedAt).getTime(); const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = ((tEnd - s0) * (i / 40)) / 86400000; if (t < 0) continue;
      const wt = core.theoreticalWeightAt({ W0: startW, Wtarget: target, k, t });
      const xx = x(s0 + t * 86400000), yy = y((100 * wt) / p.initialWeight);
      if (xx >= pad.l && xx <= w - pad.r && yy >= pad.t && yy <= h - pad.b) pts.push(`${xx.toFixed(1)},${yy.toFixed(1)}`);
    }
    return pts.length > 1 ? <path key={'t' + idx} d={'M ' + pts.join(' L ')} fill="none" stroke={PIECE_COLORS[idx % 10]} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" /> : null;
  }) : null;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Curvas de peso por pieza">
        {grid.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="0.7" />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)" fontFamily="JetBrains Mono">{v.toFixed(0)}%</text>
          </g>
        ))}
        <line x1={pad.l} x2={w - pad.r} y1={y(targetPct)} y2={y(targetPct)} stroke="var(--success)" strokeDasharray="5 4" strokeWidth="1.2" />
        <text x={w - pad.r - 4} y={y(targetPct) - 5} textAnchor="end" fontSize="10" fill="var(--success)" fontFamily="JetBrains Mono">objetivo {targetPct}%</text>
        <line x1={pad.l} x2={w - pad.r} y1={y(100)} y2={y(100)} stroke="var(--muted-foreground)" strokeDasharray="2 3" strokeWidth="0.7" opacity="0.5" />
        {theory}
        {b.pieces.map((p, idx) => {
          const c = PIECE_COLORS[idx % 10];
          const logs = (p.weightLogs || []).slice().sort((a, z) => new Date(a.date) - new Date(z.date));
          const pts = [{ date: b.startedAt, weight: p.initialWeight }, ...logs].map((pt) => ({ x: x(pt.date), y: y((100 * pt.weight) / p.initialWeight), o: pt.outlier }));
          const line = pts.filter((pt) => !pt.o);
          return (
            <g key={p.id}>
              <title>{p.code}</title>
              {line.length > 1 && <path d={'M ' + line.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' L ')} fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />}
              {pts.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r="2.8" fill={pt.o ? 'var(--card)' : c} stroke={c} strokeWidth={pt.o ? 1 : 0} strokeDasharray={pt.o ? '1 1' : undefined} />)}
            </g>
          );
        })}
        {nowX >= pad.l && nowX <= w - pad.r && (
          <g><line x1={nowX} x2={nowX} y1={pad.t} y2={h - pad.b} stroke="var(--gold)" strokeWidth="1.2" /><text x={nowX} y={h - pad.b + 14} textAnchor="middle" fontSize="9" fill="var(--gold-ink)" fontFamily="JetBrains Mono">hoy</text></g>
        )}
        <text x={pad.l} y={h - 6} fontSize="9" fill="var(--muted-foreground)" fontFamily="JetBrains Mono">{fmtDateShort(b.startedAt)}</text>
        <text x={w - pad.r} y={h - 6} textAnchor="end" fontSize="9" fill="var(--muted-foreground)" fontFamily="JetBrains Mono">{fmtDateShort(finalEnd)}</text>
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {b.pieces.map((p, idx) => {
          const st = core.weightStatusForPiece(b, p);
          return <span key={p.id} className="inline-flex items-center gap-1.5 text-xs"><span className="h-0.5 w-3.5 rounded-full" style={{ background: PIECE_COLORS[idx % 10] }} /><span className="font-mono font-medium">{p.code}</span><span className="text-muted-foreground">{st.hasLog ? `${fmt(st.pct, 0)}%` : '—'}</span></span>;
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{env ? `Punteado: curva teórica con T ${env.avgT?.toFixed(1)} °C y HR ${env.avgHR?.toFixed(0)} % (promedio Govee).` : 'Sin registros de T/HR: registrá la cava para ver la curva teórica de secado.'}</p>
    </div>
  );
}

function PieceCard({ b, p, idx, onTab }) {
  const st = core.weightStatusForPiece(b, p);
  const logs = (p.weightLogs || []).slice().sort((a, z) => new Date(z.date) - new Date(a.date));
  const latest = core.latestPieceWeight(p, b);
  const startW = core.pieceStartWeight(b, p);
  const startExplicit = core.pieceStartWeightExplicit(b, p);
  const baseW = startW || p.initialWeight;
  const lossPct = baseW > 0 ? 100 * (1 - latest / baseW) : 0;
  const est = core.pieceEstimation(b, p);
  const safety = core.safetyStatus(b, p);
  const type = core.getDB().types.find((t) => t.id === b.typeId);
  const awTarget = core.awTargetForType(type);
  const awBasedTarget = core.targetWeightForAwPiece(b, p, awTarget);
  const awSt = core.pieceAwState(b, p);
  const awReads = core.awReadings(p).slice().reverse();
  const blocked = safety.level === 'red' && !!safety.haccpBlock;
  const safeLvl = safety.level === 'red' && !blocked ? 'muted' : safety.level;
  const pct = st.hasLog ? Math.max(0, Math.min(100, st.pct || 0)) : 0;
  const chip = st.needsStart ? 'Sin registros' : blocked || safeLvl === 'green' || safeLvl === 'yellow' ? safety.label.split(' · ')[0] : st.label;
  const chipVariant = blocked ? 'danger' : safeLvl === 'green' ? 'success' : safeLvl === 'yellow' ? 'warning' : 'secondary';

  return (
    <Collapsible className={cn('rounded-lg border bg-background/50', blocked && 'border-danger/40 bg-danger-soft/30')}>
      <div className="flex items-stretch gap-3 p-3">
        <span className="w-1 shrink-0 rounded-full" style={{ background: PIECE_COLORS[idx % 10] }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono text-sm font-medium">{p.code}</span>
            <span className="font-mono text-xs tabular text-muted-foreground">{st.hasLog ? fmtG(latest) : '—'} → <span className="text-gold-ink">{fmtG(st.target)}</span></span>
            <span className="ml-auto flex flex-wrap items-center gap-1.5">
              {safety.aw !== null && (
                <Tooltip><TooltipTrigger asChild><span className="cursor-default rounded-md border bg-card px-1.5 py-0.5 font-mono text-[11px] tabular">aw {safety.awSource === 'medido' ? safety.aw.toFixed(3) : `≈${safety.aw.toFixed(2)}`}</span></TooltipTrigger>
                  <TooltipContent>{safety.awSource === 'medido' ? 'Anclado a una medición real' : `Estimado por balance de masa, no medido (± ${core.AW_UNC_EST.toFixed(2)})`}</TooltipContent></Tooltip>
              )}
              <Tooltip><TooltipTrigger asChild><span><Badge variant={chipVariant} className="cursor-default">{blocked && <TriangleAlert />}{chip}</Badge></span></TooltipTrigger><TooltipContent>{safety.label}</TooltipContent></Tooltip>
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', st.level === 'green' ? 'bg-success' : 'bg-gold')} style={{ width: `${pct}%` }} /></div>
          <div className="mt-1 flex justify-between text-[11px] tabular text-muted-foreground">
            <span>{st.hasLog && baseW > 0 ? `perdió ${fmt(lossPct, 1)} %` : 'sin pesar'}</span>
            <span>{st.hasLog ? `${fmt(st.pct, 0)} % del camino al objetivo` : ''}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-1 sm:flex-row sm:items-center">
          <Button size="sm" variant="outline" onClick={() => openDialog('piece-weight', { batchId: b.id, pieceId: p.id })}><Plus /> Peso</Button>
          <div className="flex gap-1">
            <Tooltip><TooltipTrigger asChild><Button size="icon-sm" variant="outline" aria-label="Medir aw" onClick={() => openDialog('aw-reading', { batchId: b.id, pieceId: p.id })}><FlaskConical /></Button></TooltipTrigger><TooltipContent>Medir aw</TooltipContent></Tooltip>
            <CollapsibleTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Ver detalle" className="group"><ChevronDown className="transition-transform group-data-[state=open]:rotate-180" /></Button></CollapsibleTrigger>
          </div>
        </div>
      </div>
      {blocked && safety.haccpWhy && <div className="-mt-1 px-3 pb-3 text-xs text-danger">Bloqueada: {safety.haccpWhy} <button className="font-medium underline" onClick={() => onTab('haccp')}>Ver HACCP</button></div>}
      <CollapsibleContent className="grid gap-3 border-t px-3 py-3 text-sm">
        {st.needsStart && <div className="flex flex-wrap items-center gap-2 rounded-md bg-warning-soft/60 px-3 py-2 text-xs text-warning"><TriangleAlert className="size-4" />Sin registros de peso. Registrá el peso al iniciar Secado para calcular el objetivo.<Button size="sm" className="ml-auto h-7" onClick={() => openDialog('secado-start', { batchId: b.id })}>Registrar inicio</Button></div>}
        {startW && !startExplicit && <p className="text-xs text-muted-foreground">Peso inicial inferido del primer registro ({fmtG(startW)}). <button className="text-gold-ink underline" onClick={() => openDialog('secado-start', { batchId: b.id })}>Ajustar</button></p>}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Metric label="Verde" value={fmtGExact(p.initialWeight)} />
          <Metric label="Inicio Secado" value={startW ? fmtGExact(startW) : '—'} />
          <Metric label="Actual" value={st.hasLog ? fmtGExact(latest) : '—'} />
          <Metric label="Objetivo %" value={fmtGExact(st.target)} valueClassName="text-gold-ink" />
          {awBasedTarget ? <Metric label={`Objetivo aw ≤${awTarget.toFixed(2)}`} value={fmtGExact(awBasedTarget)} valueClassName="text-warning" /> : <span />}
          <Metric label="Pérdida" value={st.hasLog && baseW > 0 ? `${fmt(lossPct, 1)}%` : '—'} />
        </div>
        <p className="text-xs">
          {awSt.last
            ? <>aw medido <b className="font-mono">{awSt.last.aw.toFixed(3)}</b> el {fmtDateShort(awSt.last.date)}{awSt.last.instrument ? ` (${awSt.last.instrument})` : ''} · hoy ≈ <b className="font-mono">{awSt.aw.toFixed(3)}</b></>
            : <>aw <b>estimado</b> ≈ <b className="font-mono">{awSt.aw.toFixed(3)} ± {awSt.unc.toFixed(2)}</b> · no medido (balance de masa){awSt.saltAssumed && <span className="text-warning"> · sal supuesta 2,8 %</span>}</>}
        </p>
        {startW && st.hasLog && <p className="text-xs text-muted-foreground"><span className="font-mono">{fmtGExact(startW)} × (1 − {core.batchLossTargetPct(b)}%) = <b className="text-gold-ink">{fmtGExact(st.target)}</b></span> · faltan <b className="font-mono">{fmtGExact(Math.max(0, latest - st.target))}</b></p>}
        {est?.hasEnough ? (
          <div className="grid grid-cols-3 gap-3 rounded-md bg-muted/60 p-2.5">
            <Metric label="Progreso (exponencial)" value={`${fmt(est.pctComplete, 0)}%`} valueClassName="text-gold-ink" />
            <Metric label="Días restantes" value={est.daysRemaining < 1 ? '<1' : fmt(est.daysRemaining, 1)} />
            <Metric label="Fin estimado" value={fmtDate(est.estCompletion)} valueClassName="text-success" />
          </div>
        ) : est?.note ? <p className="text-xs text-muted-foreground">{est.note}</p> : null}
        <p className="text-xs text-muted-foreground">Seguridad: {safety.label}{safety.aw !== null ? ` · objetivo aw ≤ ${safety.awTarget.toFixed(2)}` : ''}</p>
        {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
        {awReads.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs"><span className="text-muted-foreground">Mediciones de aw:</span>
            {awReads.map((r) => <Badge key={r.id} variant="outline" className="gap-1 font-mono">{fmtDateShort(r.date)} {r.aw.toFixed(3)}<button aria-label="Eliminar medición" onClick={() => ask(() => core.removeAwReading(b.id, p.id, r.id))}><Trash2 className="text-muted-foreground hover:text-danger" /></button></Badge>)}
          </div>
        )}
        {logs.length > 0 && (
          <ul className="divide-y rounded-md border text-xs">
            {logs.slice(0, 6).map((l) => (
              <li key={l.id || l.date} className={cn('grid grid-cols-[4.5rem_1fr_auto_auto_auto] items-center gap-2 px-2.5 py-1.5', l.outlier && 'opacity-50 line-through')}>
                <span className="font-mono tabular">{fmtDateShort(l.date)}{l.suspicious && !l.outlier && <TriangleAlert className="ml-1 inline size-3 text-warning" />}</span>
                <span className="truncate text-muted-foreground">{l.note || ''}</span>
                <span className="font-mono tabular">{fmtGExact(l.weight)}</span>
                <span className="w-12 text-right font-mono tabular text-muted-foreground">{fmt(100 * (1 - l.weight / p.initialWeight), 1)}%</span>
                <span className="flex">
                  {l.id && <Tooltip><TooltipTrigger asChild><Button size="icon-sm" variant="ghost" className="size-7" aria-label={l.outlier ? 'Reincluir' : 'Marcar outlier'} onClick={() => core.toggleOutlier(b.id, p.id, l.id)}>{l.outlier ? <RotateCcw /> : <CircleSlash />}</Button></TooltipTrigger><TooltipContent>{l.outlier ? 'Reincluir en el ajuste' : 'Marcar como outlier (no cuenta en el ajuste)'}</TooltipContent></Tooltip>}
                  {l.id && <Button size="icon-sm" variant="ghost" className="size-7" aria-label="Eliminar registro" onClick={() => ask(() => core.removePieceWeightLog(b.id, p.id, l.id))}><Trash2 /></Button>}
                </span>
              </li>
            ))}
            {logs.length > 6 && <li className="px-2.5 py-1.5 text-center text-muted-foreground">y {logs.length - 6} más antiguos</li>}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
