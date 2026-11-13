import { useEffect, useRef, useState } from 'react';
import { CircleCheck, OctagonAlert, Skull, Trash2, TriangleAlert, Upload } from 'lucide-react';
import { useDB, core } from '@/lib/store';
import { bridge, withForm } from '@/lib/core/bridge';
import { ask, closeDialog } from '@/lib/dialogs';
import { fmt, fmtDate, fmtDateShort, fmtG, fmtGExact } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { Field, Metric, SectionLabel, UnitInput } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function Shell({ title, description, children, footer, className, onSubmit }) {
  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className={className}>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          {footer && <DialogFooter>{footer}</DialogFooter>}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const Cancel = ({ children = 'Cancelar' }) => <Button type="button" variant="outline" onClick={closeDialog}>{children}</Button>;
const today = () => core.toISODate(new Date());
const findBatch = (db, id) => db.batches.find((x) => x.id === id);

/* ── Pesar todas las piezas ─────────────────────────────── */
export function BulkWeightDialog({ batchId }) {
  const db = useDB(); const b = findBatch(db, batchId);
  const [v, setV] = useState({ 'bwl-date': today(), 'bwl-note': '' });
  if (!b) return null;
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title="Pesar todas las piezas" description={`${b.ref} · dejá en blanco las piezas que no vas a pesar esta vez.`} className="sm:max-w-2xl"
      onSubmit={() => withForm(v, () => core.saveBulkWeightLog(b.id))}
      footer={<><Cancel /><Button type="submit">Guardar pesos</Button></>}>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label="Fecha"><Input type="date" value={v['bwl-date']} onChange={set('bwl-date')} /></Field>
        <Field label="Nota común (opcional)"><Input value={v['bwl-note']} onChange={set('bwl-note')} placeholder="ej: pesaje semanal" /></Field>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Pieza</TableHead><TableHead className="text-right">Verde</TableHead><TableHead className="text-right">Último</TableHead><TableHead className="text-right">Objetivo</TableHead><TableHead className="w-36">Peso ahora</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {b.pieces.map((p, i) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono font-medium">{p.code}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular">{fmtGExact(p.initialWeight)}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular">{(p.weightLogs || []).length ? fmtGExact(core.latestPieceWeight(p, b)) : '—'}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular text-gold-ink">{fmtGExact(core.pieceTargetWeight(b, p))}</TableCell>
                <TableCell className="py-1.5"><UnitInput unit="g" autoFocus={i === 0} value={v['bwl-' + p.id] || ''} onChange={set('bwl-' + p.id)} placeholder="—" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Shell>
  );
}

/* ── Peso de una pieza ──────────────────────────────────── */
export function PieceWeightDialog({ batchId, pieceId }) {
  const db = useDB(); const b = findBatch(db, batchId); const p = b?.pieces.find((x) => x.id === pieceId);
  const [v, setV] = useState({ 'wl-date': today(), 'wl-weight': '', 'wl-note': '' });
  if (!p) return null;
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title={<>Registrar peso · <span className="font-mono">{p.code}</span></>} onSubmit={() => ask(() => withForm(v, () => core.savePieceWeightLog(b.id, p.id)))}
      footer={<><Cancel /><Button type="submit">Guardar</Button></>}>
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/60 p-3">
        <Metric label="Verde" value={fmtGExact(p.initialWeight)} />
        <Metric label="Último" value={fmtGExact(core.latestPieceWeight(p, b))} />
        <Metric label={`Objetivo (${b.targetYield}%)`} value={fmtGExact(core.pieceTargetWeight(b, p))} valueClassName="text-gold-ink" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha"><Input type="date" value={v['wl-date']} onChange={set('wl-date')} /></Field>
        <Field label="Peso actual"><UnitInput unit="g" autoFocus value={v['wl-weight']} onChange={set('wl-weight')} placeholder="ej: 850" /></Field>
      </div>
      <Field label="Nota (opcional)"><Input value={v['wl-note']} onChange={set('wl-note')} /></Field>
    </Shell>
  );
}

/* ── aw medido ──────────────────────────────────────────── */
export function AwReadingDialog({ batchId, pieceId }) {
  const db = useDB(); const b = findBatch(db, batchId); const p = b?.pieces.find((x) => x.id === pieceId);
  const [v, setV] = useState(() => ({ 'aw-date': today(), 'aw-val': '', 'aw-w': p ? String(core.latestPieceWeight(p, b) || '') : '', 'aw-inst': '', 'aw-note': '' }));
  if (!p) return null;
  const st = core.pieceAwState(b, p);
  const type = db.types.find((t) => t.id === b.typeId);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Shell title={<>Medir aw · <span className="font-mono">{p.code}</span></>}
      description={<>Meta del tipo aw ≤ <b>{core.awTargetForType(type).toFixed(2)}</b> · estimado hoy <b>{st.aw != null ? st.aw.toFixed(3) : '—'}</b> ({st.source})</>}
      onSubmit={() => withForm(v, () => core.saveAwReading(b.id, p.id))}
      footer={<><Cancel /><Button type="submit">Guardar medición</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fecha"><Input type="date" value={v['aw-date']} onChange={set('aw-date')} /></Field>
        <Field label="aw medido"><UnitInput autoFocus step="0.001" value={v['aw-val']} onChange={set('aw-val')} placeholder="0.912" /></Field>
        <Field label="Peso al medir"><UnitInput unit="g" value={v['aw-w']} onChange={set('aw-w')} /></Field>
        <Field label="Equipo (opcional)"><Input value={v['aw-inst']} onChange={set('aw-inst')} placeholder="ej: Rotronic HP23" /></Field>
      </div>
      <Field label="Nota (opcional)"><Input value={v['aw-note']} onChange={set('aw-note')} placeholder="dónde se midió, T de la muestra…" /></Field>
      <p className="text-xs leading-relaxed text-muted-foreground">Medí una muestra del centro, a temperatura estable (~25 °C). Con ≥ {core.AW_CAL_MIN} lecturas del mismo tipo el modelo se calibra solo; una lectura que cumple la meta valida el PCC.</p>
    </Shell>
  );
}

/* ── Inicio de Secado ───────────────────────────────────── */
export function SecadoStartDialog({ batchId }) {
  const db = useDB(); const b = findBatch(db, batchId); const s = b && core.findSecadoStage(b);
  const [v, setV] = useState(() => {
    if (!s) return {};
    const init = { 'sec-loss-pct': String(typeof s.lossTargetPct === 'number' ? s.lossTargetPct : 100 - (b.targetYield || 60)),
      'sec-tare-pct': String(typeof db.tarePct === 'number' ? db.tarePct : 0.75) };
    b.pieces.forEach((p) => { init['ssw-' + p.id] = s.startWeights?.[p.id] ? String(s.startWeights[p.id]) : ''; });
    return init;
  });
  if (!b) return null;
  if (!s) return <Shell title="Sin etapa de Secado" footer={<Cancel>Cerrar</Cancel>}><p className="text-sm">Este lote no tiene etapa de Secado.</p></Shell>;
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const tare = +v['sec-tare-pct'];
  return (
    <Shell title="Iniciar Secado" description="Registrá el peso de cada pieza al empezar el Secado (obligatorio) y confirmá la pérdida objetivo del lote." className="sm:max-w-2xl"
      onSubmit={() => withForm(v, () => core.saveSecadoStart(b.id))}
      footer={<><Cancel /><Button type="submit">Guardar e iniciar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pérdida de peso objetivo" hint={<>Sugerido por receta: <b>{(100 - (b.targetYield || 60)).toFixed(0)}%</b> · típico 35–50%</>}>
          <UnitInput unit="%" step="0.5" value={v['sec-loss-pct']} onChange={set('sec-loss-pct')} />
        </Field>
        <Field label="Tara (malla + papel + gancho)" hint="Ej.: 11 g sobre 1.500 g = 0,73 %. Se descuenta del cálculo de aw.">
          <UnitInput unit="%" step="0.05" value={v['sec-tare-pct']} onChange={set('sec-tare-pct')} />
        </Field>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Pieza</TableHead><TableHead className="text-right">Verde</TableHead><TableHead className="w-40">Peso al iniciar</TableHead><TableHead className="text-right">Tara</TableHead></TableRow></TableHeader>
          <TableBody>
            {b.pieces.map((p) => {
              const w = +v['ssw-' + p.id];
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-medium">{p.code}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">{fmtGExact(p.initialWeight)}</TableCell>
                  <TableCell className="py-1.5"><UnitInput unit="g" value={v['ssw-' + p.id]} onChange={set('ssw-' + p.id)} /></TableCell>
                  <TableCell className="text-right font-mono text-xs tabular text-muted-foreground">{w > 0 && tare >= 0 ? `${(Math.round((w * tare) / 100 * 10) / 10).toFixed(1)} g` : '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Peso objetivo de cada pieza = peso al iniciar Secado × (1 − pérdida/100).</p>
    </Shell>
  );
}

/* ── Ajustar fechas de etapa ────────────────────────────── */
export function StageDatesDialog({ batchId, idx }) {
  const db = useDB(); const b = findBatch(db, batchId); const s = b?.stages[idx];
  const [v, setV] = useState(() => ({ ss: s ? core.toISODate(s.startedAt) : '', se: s ? core.toISODate(s.expectedEnd) : '' }));
  if (!s) return null;
  return (
    <Shell title={`Ajustar fechas · ${s.kind}`} description="Las etapas siguientes se corren automáticamente."
      onSubmit={() => withForm(v, () => core.saveStageDates(b.id, idx))}
      footer={<><Cancel /><Button type="submit">Guardar</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Inicio"><Input type="date" value={v.ss} onChange={(e) => setV({ ...v, ss: e.target.value })} /></Field>
        <Field label="Fin estimado"><Input type="date" value={v.se} onChange={(e) => setV({ ...v, se: e.target.value })} /></Field>
      </div>
    </Shell>
  );
}

/* ── pH de fermentación ─────────────────────────────────── */
const VERDICT = { safe: { v: 'success', i: CircleCheck }, caution: { v: 'warning', i: TriangleAlert }, danger: { v: 'danger', i: Skull } };
export function PhDialog({ batchId, idx }) {
  const db = useDB(); const b = findBatch(db, batchId); const s = b?.stages[idx];
  const existing = (b?.phLogs || []).find((p) => p.stageIdx === idx) || {};
  const [v, setV] = useState({ 'ph-s': existing.phStart ?? '', 'ph-e': existing.phEnd ?? '', 'ph-n': existing.note || '' });
  if (!s?.ph) return null;
  const ctx = s.ph;
  const live = v['ph-e'] !== '' ? +v['ph-e'] : v['ph-s'] !== '' ? +v['ph-s'] : null;
  const verdict = core.phSafetyVerdict(live, ctx);
  const recos = core.phRecommendations(live, ctx);
  const lo = 3.5, hi = 7.0; const pos = (x) => Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100));
  const V = verdict ? VERDICT[verdict.level] : null;
  return (
    <Shell title="Control de fermentación · pH" className="sm:max-w-2xl"
      description={`${b.ref} · ${s.kind} — objetivo inicio ${ctx.start}, fin ${ctx.end} · barrera 5.3 · peligro fuera de ${ctx.dangerLow}–${ctx.dangerHigh}`}
      onSubmit={() => withForm(v, () => core.savePh(b.id, idx))}
      footer={<><Cancel /><Button type="submit">Guardar registro</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="pH inicial (post-mezcla)"><UnitInput step="0.01" value={v['ph-s']} onChange={(e) => setV({ ...v, 'ph-s': e.target.value })} /></Field>
        <Field label="pH actual / final"><UnitInput step="0.01" value={v['ph-e']} onChange={(e) => setV({ ...v, 'ph-e': e.target.value })} /></Field>
      </div>
      <div className="pt-4">
        <div className="relative h-3 rounded-full" style={{ background: 'linear-gradient(90deg, var(--s-mad) 0%, var(--s-mad) 31%, var(--warning) 46%, var(--danger) 100%)' }}>
          {[4.6, 5.3].map((t) => <span key={t} className="absolute -top-1 h-5 w-px bg-foreground/60" style={{ left: `${pos(t)}%` }}><span className="absolute -top-4 -translate-x-1/2 font-mono text-[10px] text-muted-foreground">{t}</span></span>)}
          {[['ini', v['ph-s']], ['fin', v['ph-e']]].filter(([, x]) => x !== '').map(([l, x]) => (
            <span key={l} className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground shadow" style={{ left: `${pos(+x)}%` }} title={`${l} ${x}`} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground"><span>3.5</span><span>7.0</span></div>
      </div>
      {verdict ? (
        <Alert variant={V.v}><V.i /><AlertTitle>{verdict.title}</AlertTitle><AlertDescription>{verdict.desc}</AlertDescription></Alert>
      ) : <p className="text-xs text-muted-foreground">Ingresá un valor de pH para ver el diagnóstico.</p>}
      {recos.length > 0 && (
        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Recomendaciones</div>
          <ul className="list-disc space-y-1 pl-4 text-sm">{recos.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
      <Field label="Nota (opcional)"><Input value={v['ph-n']} onChange={(e) => setV({ ...v, 'ph-n': e.target.value })} /></Field>
    </Shell>
  );
}

/* ── T / HR de la cava + Govee CSV ──────────────────────── */
const localNow = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
export function EnvLogDialog({ batchId }) {
  const db = useDB(); const b = findBatch(db, batchId);
  const [v, setV] = useState({ 'env-date': localNow(), 'env-t': '', 'env-hr': '', 'env-stage': '' });
  const file = useRef(null);
  if (!b) return null;
  const logs = (b.envLog || []).slice().sort((x, y) => new Date(y.date) - new Date(x.date));
  const add = () => { withForm(v, () => core.addEnvLog(b.id)); setV((s) => ({ ...s, 'env-t': '', 'env-hr': '' })); };
  const stats = core.envStats(b);
  return (
    <Shell title={`T / HR de la cava · ${b.ref}`} className="sm:max-w-3xl" description="Alimenta los modelos de secado, case hardening y proteólisis. Podés importar el CSV que exporta la app Govee." onSubmit={add}
      footer={<Cancel>Cerrar</Cancel>}>
      <div className="grid items-end gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-[1.4fr_.8fr_.8fr_1fr_auto]">
        <Field label="Fecha y hora"><Input type="datetime-local" value={v['env-date']} onChange={(e) => setV({ ...v, 'env-date': e.target.value })} /></Field>
        <Field label="Temperatura"><UnitInput unit="°C" step="0.1" value={v['env-t']} onChange={(e) => setV({ ...v, 'env-t': e.target.value })} placeholder="13.0" /></Field>
        <Field label="Humedad"><UnitInput unit="%" step="1" value={v['env-hr']} onChange={(e) => setV({ ...v, 'env-hr': e.target.value })} placeholder="75" /></Field>
        <Field label="Etapa">
          <Select value={v['env-stage'] || 'none'} onValueChange={(x) => setV({ ...v, 'env-stage': x === 'none' ? '' : x })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{[...new Set(b.stages.map((s) => s.kind))].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Button type="submit">Registrar</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={file} type="file" accept=".csv" className="hidden" onChange={(e) => { core.importGoveeCsv(e, b.id); }} />
        <Button type="button" variant="outline" onClick={() => file.current?.click()}><Upload /> Importar CSV de Govee</Button>
        {stats && <span className="text-xs text-muted-foreground">Promedio: <b className="font-mono">{fmt(stats.avgT, 1)} °C</b> · <b className="font-mono">{stats.avgHR != null ? fmt(stats.avgHR, 0) + ' %' : '—'}</b> · {stats.nSamples} lecturas</span>}
      </div>
      {logs.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">Sin registros aún.</p>
      ) : (
        <div className="max-h-80 overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-card"><TableRow className="hover:bg-transparent"><TableHead>Fecha</TableHead><TableHead className="text-right">T</TableHead><TableHead className="text-right">HR</TableHead><TableHead>Etapa</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id || l.date}>
                  <TableCell className="font-mono text-xs tabular">{new Date(l.date).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell className="text-right font-mono tabular">{l.tempC != null ? `${fmt(l.tempC, 1)} °C` : '—'}</TableCell>
                  <TableCell className="text-right font-mono tabular">{l.hr != null ? `${fmt(l.hr, 0)} %` : '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.stageKind || '—'}</TableCell>
                  <TableCell className="py-1">{l.id && <Button type="button" variant="ghost" size="icon-sm" aria-label="Eliminar registro" onClick={() => core.removeEnvLog(b.id, l.id)}><Trash2 className="text-muted-foreground" /></Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Shell>
  );
}

/* ── Jornada de pesaje (secuencial) ─────────────────────── */
export function WeighSessionDialog() {
  const db = useDB();
  const ws = bridge.win._weighSession;
  const [w, setW] = useState('');
  const input = useRef(null);
  useEffect(() => { setW(''); input.current?.focus(); }, [ws?.idx]);
  if (!ws || ws.idx >= ws.list.length) return null;
  const item = ws.list[ws.idx];
  const b = findBatch(db, item.batchId); const p = b?.pieces.find((x) => x.id === item.pieceId);
  if (!p) return null;
  const safety = core.safetyStatus(b, p);
  const advance = (skip) => withForm({ 'ws-weight': w }, () => core.weighSessionAdvance(skip));
  return (
    <Shell title={<span className="flex items-center gap-3">Jornada de pesaje <Badge variant="secondary" className="font-mono">{ws.idx + 1} / {ws.list.length}</Badge></span>}
      onSubmit={() => advance(false)}
      footer={<><Button type="button" variant="ghost" className="sm:mr-auto" onClick={closeDialog}>Salir</Button><Button type="button" variant="outline" onClick={() => advance(true)}>Saltar</Button><Button type="submit">Guardar y siguiente</Button></>}>
      <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gold transition-all" style={{ width: `${(100 * ws.idx) / ws.list.length}%` }} /></div>
      <div className="text-center">
        <div className="font-mono text-4xl font-medium tracking-wide text-gold-ink">{item.code}</div>
        <div className="mt-1 text-sm text-muted-foreground">{item.batchRef} · {item.typeName}</div>
      </div>
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/60 p-3 text-center">
        <Metric label="Último" value={fmtGExact(item.latest)} note={item.daysSince < 999 ? `hace ${item.daysSince} d` : 'nunca'} />
        <Metric label="Objetivo" value={fmtGExact(item.target)} valueClassName="text-gold-ink" />
        <Metric label="aw actual" value={safety.aw ? safety.aw.toFixed(3) : '—'} valueClassName={safety.level === 'green' ? 'text-success' : safety.level === 'red' ? 'text-danger' : 'text-warning'} />
      </div>
      <UnitInput ref={input} unit="g" autoFocus value={w} onChange={(e) => setW(e.target.value)} placeholder="peso ahora" inputClassName="h-14 text-center text-2xl" />
      <p className="text-center text-xs text-muted-foreground">Enter guarda y avanza</p>
    </Shell>
  );
}

/* ── Desviación HACCP ───────────────────────────────────── */
const OUTCOMES = [
  ['accepted', 'Aceptado por criterio del productor · habilita LISTA'], ['resolved', 'Resuelto · lote continúa'], ['monitoring', 'Bajo monitoreo'],
  ['discarded', 'Lote descartado por riesgo'], ['open', 'Pendiente de resolver'],
];
export function DeviationDialog({ batchId, pccId, pccLabel, suggested, preset }) {
  const [v, setV] = useState({ 'dev-desc': suggested || '', 'dev-action': '', 'dev-outcome': preset || 'accepted' });
  return (
    <Shell title="Registrar desviación HACCP" description={<>PCC: <b className="text-danger">{pccLabel || '(sin PCC específico)'}</b></>}
      onSubmit={() => withForm(v, () => core.saveDeviation(batchId, pccId || '', pccLabel || ''))}
      footer={<><Cancel /><Button type="submit">Guardar</Button></>}>
      {v['dev-outcome'] === 'accepted' && (
        <Alert variant="warning"><TriangleAlert /><AlertDescription>Aceptación manual: asumís bajo tu criterio que la pieza es apta. El motivo queda en el registro HACCP (mínimo 10 caracteres).</AlertDescription></Alert>
      )}
      <Field label={v['dev-outcome'] === 'accepted' ? 'Motivo de la aceptación' : '¿Qué pasó?'}>
        <Textarea rows={3} value={v['dev-desc']} onChange={(e) => setV({ ...v, 'dev-desc': e.target.value })} placeholder="ej: pH no cayó a <5.3 en 24 h" />
      </Field>
      <Field label="Acción correctiva tomada"><Textarea rows={3} value={v['dev-action']} onChange={(e) => setV({ ...v, 'dev-action': e.target.value })} placeholder="ej: bajé la T de cava a 13 °C" /></Field>
      <Field label="Resultado">
        <Select value={v['dev-outcome']} onValueChange={(x) => setV({ ...v, 'dev-outcome': x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{OUTCOMES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </Shell>
  );
}

/* ── Borrado seguro: 5 s + escribir ELIMINAR ────────────── */
export function SafeDeleteDialog({ kind, label, details, warning, onConfirm }) {
  const [n, setN] = useState(5);
  const [text, setText] = useState('');
  useEffect(() => { const t = setInterval(() => setN((x) => (x > 0 ? x - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  const ok = n === 0 && text.trim().toUpperCase() === 'ELIMINAR';
  return (
    <Shell title={`Eliminar ${kind}`} onSubmit={() => { if (ok) { closeDialog(); onConfirm?.(); } }}
      footer={<><Cancel /><Button type="submit" variant="destructive" disabled={!ok}>{n > 0 ? `Esperá ${n} s` : 'Eliminar definitivamente'}</Button></>}>
      <Alert variant="danger"><OctagonAlert /><AlertTitle className="line-clamp-none">{label}</AlertTitle>{details && <AlertDescription>{details}</AlertDescription>}</Alert>
      {warning && <p className="text-sm text-muted-foreground">{warning}</p>}
      <Field label={<>Escribí <b className="font-mono text-danger">ELIMINAR</b> para confirmar</>}>
        <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} className="font-mono uppercase" autoComplete="off" />
      </Field>
    </Shell>
  );
}
