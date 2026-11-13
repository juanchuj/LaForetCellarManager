import { Fragment } from 'react';
import { CircleCheck, Hourglass, Info, OctagonAlert, PencilLine, Plus, Star, TriangleAlert } from 'lucide-react';
import { core } from '@/lib/store';
import { openDialog } from '@/lib/dialogs';
import { fmt, fmtDate, fmtG } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Panel } from './shared';
import { tData, tx, txt } from '@/lib/i18n';


/* ── HACCP ─────────────────────────────────────────────── */
const PCC = {
  pass: { icon: CircleCheck, cls: 'text-success', label: tx('OK') },
  warn: { icon: TriangleAlert, cls: 'text-warning', label: tx('Alerta') },
  fail: { icon: OctagonAlert, cls: 'text-danger', label: tx('Violado') },
  doc: { icon: PencilLine, cls: 'text-warning', label: tx('Desviación documentada') },
  pending: { icon: Hourglass, cls: 'text-muted-foreground', label: tx('Pendiente') },
};
const OUTCOME = { accepted: [tx('Aceptado manualmente'), 'warning'], resolved: [tx('Resuelto'), 'success'], monitoring: [tx('Bajo monitoreo'), 'warning'], discarded: [tx('Lote descartado'), 'danger'], open: [tx('Pendiente'), 'danger'] };

export function HaccpTab({ b }) {
  const type = core.getDB().types.find((t) => t.id === b.typeId);
  const { results, summary } = core.evaluateHaccp(b);
  const devs = (b.deviations || []).slice().sort((x, y) => new Date(y.ts) - new Date(x.ts));
  const head = summary.criticalFails > 0 ? [txt`${summary.criticalFails} PCC crítico violado`, 'danger'] : summary.fail > 0 ? [txt`${summary.fail} PCC violado`, 'danger']
    : summary.documented > 0 ? [txt`${summary.documented} desviación documentada · ${summary.pass}/${summary.total} cumplidos`, 'warning']
      : [txt`${summary.pass}/${summary.total} PCC cumplidos${summary.pending ? txt` · ${summary.pending} pendiente` : ''}`, summary.pending ? 'secondary' : 'success'];
  const r = b.receiving;
  const rt = r && r.coreT != null ? +r.coreT : null;
  return (
    <div className="grid gap-6">
      {results.length > 0 && (
        <Panel title={tx("Puntos críticos de control")} description={txt`PCCs ${(type?.haccpPCCs?.length > 0) ? tx('personalizados en la receta') : tx('por defecto según la categoría')}`} action={<Badge variant={head[1]}>{head[0]}</Badge>} contentClassName="px-0">
          <ul className="divide-y">
            {results.map((x, i) => {
              const m = PCC[x.status] || PCC.pending; const Icon = m.icon;
              const label = x.status === 'doc' && x.dev?.outcome === 'accepted' ? tx('Aceptado manualmente') : m.label;
              return (
                <li key={x.pcc.id || i} className="grid gap-2 px-5 py-3 sm:grid-cols-[1.5rem_1fr_auto] sm:items-start">
                  <Icon className={cn('mt-0.5 size-4', m.cls)} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{tData(x.pcc.label)} <span className={cn('ml-1 text-xs font-normal', m.cls)}>{label}</span></div>
                    <div className="text-xs text-muted-foreground">{x.detail}</div>
                    {x.pcc.hazard && <div className="mt-0.5 text-[11px] text-muted-foreground/80">{tx("Peligro: {0}", [tData(x.pcc.hazard)])}</div>}
                  </div>
                  {(x.status === 'fail' || x.status === 'warn') && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDialog('deviation', { batchId: b.id, pccId: x.pcc.id, pccLabel: x.pcc.label, suggested: x.detail, preset: 'resolved' })}>{tx("Registrar desviación")}</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title={tx("Historial de desviaciones")} description={devs.length ? txt`${devs.length} registrada${devs.length === 1 ? '' : 's'}` : tx('Sin desviaciones')}
          action={<Button size="sm" variant="outline" onClick={() => openDialog('deviation', { batchId: b.id, pccId: '', pccLabel: '', preset: 'open' })}><Plus />{' '}{tx("Registrar")}</Button>}>
          {devs.length === 0 ? <p className="text-sm text-muted-foreground">{tx("Cuando un PCC falle, registrá qué pasó y qué hiciste.")}</p> : (
            <ul className="grid gap-3">
              {devs.map((d, i) => {
                const [ol, ov] = OUTCOME[d.outcome] || [d.outcome, 'secondary'];
                return (
                  <li key={i} className="rounded-lg border bg-background/50 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{fmtDate(d.ts)} {new Date(d.ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span><Badge variant={ov} className="ml-auto">{ol}</Badge></div>
                    {d.pccLabel && <div className="mt-1 text-xs text-danger">{tx("PCC: {0}", [tData(d.pccLabel)])}</div>}
                    <div className="mt-1.5"><b>{tx("Qué pasó:")}</b> {d.description}</div>
                    {d.action && <div className="mt-1 text-muted-foreground"><b className="text-foreground">{tx("Acción:")}</b> {d.action}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title={tx("Recepción de la carne")} description={tx("PCC de temperatura al recibir")}>
          {rt === null ? <p className="text-sm text-muted-foreground">{tx("Sin temperatura de recepción registrada. Editá el lote para agregarla.")}</p> : (
            <div className="grid gap-2 text-sm">
              <Badge variant={rt <= 4 ? 'success' : rt <= 7 ? 'warning' : 'danger'} className="h-7 px-2.5">{tx("Core {0} °C · {1}", [rt.toFixed(1), rt <= 4 ? tx('verde, dentro de rango') : rt <= 7 ? tx('amarilla, documentada') : tx('roja, fuera de rango')])}</Badge>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {[[tx('Proveedor'), r.provider], [tx('Finca'), r.farm], [tx('Sacrificio'), r.slaughterDate], [tx('Corte'), r.cut], [tx('Decisión'), r.acceptance !== 'pending' ? r.acceptance : '']].filter(([, v]) => v).map(([k, v]) => <Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></Fragment>)}
              </dl>
              {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ── Catas ─────────────────────────────────────────────── */
export function TastingsTab({ b }) {
  if (b.status === 'discarded') return <p className="text-sm text-muted-foreground">{tx("Lote descartado.")}</p>;
  const list = core.tastingList(b);
  const type = core.getDB().types.find((t) => t.id === b.typeId);
  const last = list[list.length - 1];
  const win = type ? core.optimalWindow(type.id) : null;
  const rate = (v) => (v != null ? `${v}/5` : '—');
  return (
    <Panel title={tx("Catas")} description={list.length ? txt`${list.length} registrada${list.length === 1 ? '' : 's'}` : tx('Registrá una cata (puede ser a mitad del curado) para calibrar el modelo y encontrar el punto óptimo.')}
      action={<Button size="sm" onClick={() => openDialog('tasting', { batchId: b.id, tastingId: 'new' })}><Plus />{' '}{tx("Nueva cata")}</Button>} contentClassName="grid gap-4">
      {list.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>{tx("Día")}</TableHead><TableHead>{tx("Fecha")}</TableHead><TableHead className="text-right">{tx("Global")}</TableHead><TableHead className="text-right">{tx("Apar.")}</TableHead><TableHead className="text-right">{tx("Aroma")}</TableHead><TableHead className="text-right">{tx("Text.")}</TableHead><TableHead>{tx("Defectos")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((t) => {
                  const d = t.dias ?? core.tastingDays(b, t.fecha); const defs = core.tastingDefects(t);
                  return (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => openDialog('tasting', { batchId: b.id, tastingId: t.id })}>
                      <TableCell className="font-mono">{d ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{t.fecha}</TableCell>
                      <TableCell className="text-right font-mono text-base font-medium text-gold-ink">{t.notaGlobal ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{rate(t.apariencia)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{rate(t.aroma)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{rate(t.textura)}</TableCell>
                      <TableCell className="whitespace-normal">{defs.length ? <div className="flex flex-wrap gap-1">{defs.map((x) => <Badge key={x.name} variant={x.sev === 3 ? 'danger' : x.sev === 2 ? 'warning' : 'success'}>{x.name}</Badge>)}</div> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {type?.tasteTarget && last?.notaGlobal != null && (
            <p className={cn('flex items-center gap-1.5 text-sm', last.notaGlobal >= type.tasteTarget ? 'text-success' : 'text-danger')}>{last.notaGlobal >= type.tasteTarget ? <CircleCheck className="size-4" /> : <TriangleAlert className="size-4" />}{tx("Meta del tipo {0} · última nota {1}", [type.tasteTarget, last.notaGlobal])}</p>
          )}
          {win?.best && !win.weak && <p className="flex items-center gap-1.5 text-sm"><Star className="size-4 text-gold" />{tx("Punto óptimo histórico de {0}: días {1}–{2} (nota prom. {3}, n={4}).", [type.name, win.best.from, win.best.to, win.best.avg.toFixed(1), win.best.n])}</p>}
          {last?.esc === 2 && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{tx("Última cata · sabores (intensidad · calidad)")}</div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {core.FLAVOR_AXES.map((f) => {
                  const v = last[f.k]; const q = last[f.k + 'Q'];
                  if (v == null) return <div key={f.k} className="text-muted-foreground">{f.label} —</div>;
                  const ver = core.flavorVerdict(v, q);
                  const col = q == null ? '' : ver.state === 'ok' ? 'text-success' : ver.state === 'mejorable' ? 'text-warning' : 'text-danger';
                  const tag = ['', tx('no presente'), 'poco', 'balanceado', 'marcado', tx('muy marcado')][v];
                  const fix = ver.state === 'problema' ? (ver.dir === 'mucho' ? tx(' → bajar') : ver.dir === 'poco' ? tx(' → subir') : tx(' → revisar')) : '';
                  return <div key={f.k}><b>{f.label}</b> {v}/5 <span className="text-muted-foreground">({tag})</span>{q != null && <span className={col}>{' '}{tx("· calidad {0}/5{1}", [q, fix])}</span>}</div>;
                })}
              </div>
            </div>
          )}
          {last?.notas && <p className="text-sm italic text-muted-foreground">“{last.notas}”</p>}
        </>
      )}
    </Panel>
  );
}

/* ── Análisis ──────────────────────────────────────────── */
export function AnalysisTab({ b }) {
  const type = core.getDB().types.find((t) => t.id === b.typeId);
  const hasLogs = b.pieces.some((p) => (p.weightLogs || []).length > 0);
  const mb = hasLogs ? core.massBalance(b) : null;
  const cmp = type ? core.compareProfile(type, b) : null;
  const prot = core.batchProteolysis(b);
  const hz = core.hazardsForType(type);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      {mb && (() => {
        const u = Math.abs(mb.unexplainedPct);
        const [lab, v] = u <= 2 ? [tx('Balance cuadra ±2 %'), 'success'] : u <= 5 ? [tx('Discrepancia moderada'), 'warning'] : [tx('Discrepancia grande · revisar'), 'danger'];
        const pct = (g) => `${((100 * g) / mb.greenG).toFixed(1)}%`;
        return (
          <Panel title={tx("Balance de masa")} action={<Badge variant={v}>{lab}</Badge>}>
            <dl className="grid grid-cols-[1fr_auto_4rem] gap-x-4 gap-y-2 text-sm">
              <dt>{tx("Peso verde inicial")}</dt><dd className="text-right font-mono tabular">{fmtG(mb.greenG)}</dd><dd className="text-right font-mono text-xs tabular text-muted-foreground">100%</dd>
              <dt className="text-success">{tx("+ Sal añadida")}</dt><dd className="text-right font-mono tabular text-success">+{fmtG(mb.saltG)}</dd><dd className="text-right font-mono text-xs tabular text-muted-foreground">+{pct(mb.saltG)}</dd>
              <dt className="text-danger">{tx("− Agua evaporada (est.)")}</dt><dd className="text-right font-mono tabular text-danger">−{fmtG(mb.waterLostG)}</dd><dd className="text-right font-mono text-xs tabular text-muted-foreground">−{pct(mb.waterLostG)}</dd>
              {Math.abs(mb.unexplainedG) > 0.5 && <><dt>{mb.unexplainedG > 0 ? tx('− Merma inexplicada') : tx('+ Excedente')}</dt><dd className="text-right font-mono tabular">{mb.unexplainedG > 0 ? '−' : '+'}{fmtG(Math.abs(mb.unexplainedG))}</dd><dd className="text-right font-mono text-xs tabular text-muted-foreground">{fmt(mb.unexplainedPct, 1)}%</dd></>}
              <dt className="border-t pt-2 font-medium">{tx("Peso actual medido")}</dt><dd className="border-t pt-2 text-right font-mono font-medium tabular">{fmtG(mb.currentG)}</dd><dd className="border-t pt-2 text-right font-mono text-xs font-medium tabular text-gold-ink">{pct(mb.currentG)}</dd>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">{tx("Verde + sal = actual + agua evaporada + merma. Si la merma supera ±2 % hay error de medición o pérdidas sin documentar.")}</p>
          </Panel>
        );
      })()}

      {cmp && (() => {
        const pred = cmp.predicted, tasted = cmp.tasted;
        const axes = [['salado', tx('Salado')], ['umami', tx('Umami')], ['dulce', tx('Dulce')], ['acido', tx('Ácido')], ['firmeza', tx('Firmeza')]].concat(pred.ahumado > 0 ? [['ahumado', tx('Ahumado')]] : []);
        return (
          <Panel title={tx("Perfil organoléptico")} description={tasted ? tx('Predicho vs catado') : tx('Predicho · hacé una cata para calibrar')}>
            <div className="grid gap-3">
              {axes.map(([k, l]) => {
                const p = pred[k] || 0; const t = tasted ? tasted[k] : null; const d = t != null ? t - p : null;
                return (
                  <div key={k} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm">
                    <span>{l}</span>
                    <div className="grid gap-1">
                      <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-gold" style={{ width: `${p * 10}%` }} /></div>
                      {tasted && <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-success" style={{ width: `${(t || 0) * 10}%` }} /></div>}
                    </div>
                    <span className="w-24 text-right font-mono text-xs tabular">{p.toFixed(1)}{tasted && <> · {t?.toFixed(1) ?? '—'} <span className={d == null ? '' : Math.abs(d) < 1.5 ? 'text-success' : Math.abs(d) < 3 ? 'text-warning' : 'text-danger'}>({d != null ? (d > 0 ? '+' : '') + d.toFixed(1) : '—'})</span></>}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-gold" />{tx("predicho")}</span>{tasted && <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-success" />{tx("catado")}</span>}
              <span>{tx("{0}% sal · {1} d{2}{3} · rendimiento {4}%{5}", [pred._meta.saltPct.toFixed(1), pred._meta.daysTotal, pred._meta.hasFerm ? tx(' · fermentado') : '', pred._meta.hasSmoke ? tx(' · ahumado') : '', pred._meta.yieldFinal, pred._meta.calibrated ? tx(' · calibrado con tus catas') : ''])}</span></p>
          </Panel>
        );
      })()}

      {prot && (
        <Panel title={tx("Proteólisis")} description={tx("Índice acumulado (jamón ibérico añejo = 100) · Q10 = 2")}>
          <div className="flex items-center gap-5">
            <span className="font-mono text-4xl font-medium tabular text-gold-ink">{prot.index.toFixed(0)}</span>
            <div className="flex-1">
              <div className="relative h-3 overflow-hidden rounded-full bg-muted"><div className="h-full" style={{ width: `${Math.min(100, prot.index / 2)}%`, background: 'linear-gradient(90deg, var(--success), var(--warning), var(--danger))' }} /></div>
              <div className="mt-1.5 text-sm">{prot.label}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{tx("Con la T promedio de Govee y los días en Secado, Balanceo y Madurado. La actividad enzimática se duplica cada 10 °C.")}</p>
        </Panel>
      )}

      {hz && (
        <Panel title={tx("Análisis de peligros")} description={txt`Categoría: ${tx(hz.category)}`} className="lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-3">
            {[[tx('Biológicos'), hz.hazards.biologicos, 'text-danger'], [tx('Químicos'), hz.hazards.quimicos, 'text-warning'], [tx('Físicos'), hz.hazards.fisicos, 'text-muted-foreground']].map(([t, xs, c]) => (
              <div key={t}><div className={cn('mb-2 text-xs font-semibold uppercase tracking-wide', c)}>{t}</div><ul className="list-disc space-y-1 pl-4 text-sm">{xs.map((x, i) => <li key={i}>{tx(x)}</li>)}</ul></div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-px size-3.5 shrink-0" />{tx("Los PCCs del tipo controlan los peligros más críticos; las buenas prácticas de manufactura controlan el resto.")}</p>
        </Panel>
      )}
      {!mb && !cmp && !prot && !hz && <p className="text-sm text-muted-foreground">{tx("Todavía no hay datos para analizar.")}</p>}
    </div>
  );
}
