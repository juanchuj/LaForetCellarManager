import { useReducer, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, CircleCheck, Info, OctagonAlert, Plus, Thermometer, Trash2, TriangleAlert } from 'lucide-react';
import { useDB, core } from '@/lib/store';
import { bridge } from '@/lib/core/bridge';
import { closeDialog } from '@/lib/dialogs';
import { saveBatchForm } from '@/lib/fixes';
import { fmt, fmtDate, fmtG, stageVar } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { Field, Metric, NumberField, SectionLabel, UnitInput } from '@/components/form';
import { StageDot } from '@/components/stage-dot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tx, txt } from '@/lib/i18n';

const STEPS = [tx('Tipo'), tx('Recepción'), tx('Piezas'), tx('Proceso'), tx('Resumen')];
const ACCEPT = [['pending', tx('— seleccionar —')], ['accept-with-note', tx('Aceptar con nota')], ['accept-conditional', tx('Aceptar condicional (procesar hoy)')], ['reject', tx('Rechazar lote')]];

/* Same thresholds as v4.4.3 renderReceivingSection */
function coreTLevel(t) {
  if (t === null || t === '' || t === undefined || isNaN(+t)) return { level: 'gray', label: tx('Sin medir · PCC pendiente'), variant: 'secondary', icon: Thermometer };
  if (+t <= 4) return { level: 'green', label: tx('Verde · dentro de rango'), variant: 'success', icon: CircleCheck };
  if (+t <= 7) return { level: 'yellow', label: tx('Amarilla · documentar exposición'), variant: 'warning', icon: TriangleAlert };
  return { level: 'red', label: tx('Roja · decisión obligatoria'), variant: 'danger', icon: OctagonAlert };
}

export function BatchFormDialog() {
  const db = useDB();
  const [, force] = useReducer((x) => x + 1, 0);
  const [step, setStep] = useState(0);
  const nb = bridge.win._newBatch;
  if (!nb) return null;
  const upd = (fn) => { fn(nb); force(); };
  const type = db.types.find((t) => t.id === nb.typeId);
  const editing = !!nb.editingBatchId;
  const totalG = nb.pieces.reduce((s, p) => s + (+p.initialWeight || 0), 0);
  const maxT = Math.max(...nb.pieces.map((p) => +p.thickness || 0), 1);
  const shape = nb.pieces[0]?.shape || 'tubular';

  const body = [
    <StepType key="t" db={db} nb={nb} type={type} upd={upd} editing={editing} totalG={totalG} />,
    <StepReceiving key="r" nb={nb} upd={upd} />,
    <StepPieces key="p" nb={nb} upd={upd} totalG={totalG} />,
    <StepCure key="c" nb={nb} type={type} upd={upd} maxT={maxT} shape={shape} totalG={totalG} />,
    <StepSummary key="s" nb={nb} type={type} upd={upd} editing={editing} totalG={totalG} />,
  ][step];

  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? tx('Editar lote') : tx('Nuevo lote')}</DialogTitle>
          <DialogDescription>{tx("{0} · ref", [type?.name])}{' '}<span className="font-mono text-foreground">{core.previewRef(nb, type, nb.editingBatchId)}</span>{' '}{tx("· {0} en {1} pieza{2}", [fmtG(totalG), nb.pieces.length, nb.pieces.length === 1 ? '' : 's'])}</DialogDescription>
        </DialogHeader>

        <ol className="grid grid-cols-5 gap-1.5" aria-label={tx("Pasos")}>
          {STEPS.map((l, i) => (
            <li key={l}>
              <button type="button" onClick={() => setStep(i)} className="group w-full text-left" aria-current={i === step ? 'step' : undefined}>
                <span className={cn('block h-1 rounded-full transition-colors', i < step ? 'bg-gold' : i === step ? 'bg-foreground' : 'bg-border')} />
                <span className={cn('mt-1.5 flex items-center gap-1 text-[11px] font-medium', i === step ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
                  {i < step && <Check className="size-3 text-gold-ink" />}<span className="hidden sm:inline">{i + 1}.</span> {l}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="min-h-[18rem]">{body}</div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" onClick={step === 0 ? closeDialog : () => setStep(step - 1)}>{step === 0 ? tx('Cancelar') : <><ChevronLeft />{' '}{tx("Atrás")}</>}</Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {editing && step < 4 && <Button type="button" variant="outline" onClick={saveBatchForm}>{tx("Guardar cambios")}</Button>}
            {step < 4 ? <Button type="button" onClick={() => setStep(step + 1)}>{tx("Siguiente")}{' '}<ChevronRight /></Button>
              : <Button type="button" onClick={saveBatchForm}>{editing ? tx('Guardar cambios') : tx('Crear lote')}</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepType({ db, nb, type, upd, editing, totalG }) {
  const hist = type ? core.historicalYieldStats(type.id) : { n: 0 };
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={tx("Tipo de madurado")}>
          <Select value={nb.typeId} disabled={editing} onValueChange={(id) => upd((x) => { x.typeId = id; x.targetYield = db.types.find((t) => t.id === id).yield.target; })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{db.types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label={tx("Lote (define la ref)")} hint={nb.lot ? tx('Ref = tipo + lote') : tx('Vacío: se asigna el siguiente número')}>
          <Input value={nb.lot} onChange={(e) => upd((x) => { x.lot = e.target.value; })} placeholder={tx("ej: 001")} />
        </Field>
        <Field label={tx("Fecha de inicio")}><Input type="date" value={nb.startedAt} onChange={(e) => upd((x) => { x.startedAt = e.target.value; })} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <Field label={txt`Rendimiento objetivo (${type?.yield.min}–${type?.yield.max}%)`}>
          <NumberField unit="%" step="1" value={nb.targetYield} onValue={(v) => upd((x) => { x.targetYield = v ?? 0; })} />
        </Field>
        <div className="grid content-end gap-1 pb-1 text-sm">
          <div>{tx("Peso final objetivo")}{' '}<b className="font-mono">{fmtG((nb.targetYield / 100) * totalG)}</b> <span className="text-muted-foreground">{tx("(pierde {0}%)", [100 - nb.targetYield])}</span></div>
          {hist.n > 0 && (Math.abs(hist.mean - nb.targetYield) < 1
            ? <div className="text-xs text-success">{tx("Tu histórico {0}% (n={1}) coincide con el objetivo.", [hist.mean.toFixed(1), hist.n])}</div>
            : <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{tx("Histórico del tipo")}{' '}<b className="font-mono text-foreground">{hist.mean.toFixed(1)}%</b> ±{hist.std.toFixed(1)} (n={hist.n})
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-gold-ink" onClick={() => upd((x) => { x.targetYield = Math.round(hist.mean); })}>{tx("Usar {0}%", [Math.round(hist.mean)])}</Button></div>)}
        </div>
      </div>
    </div>
  );
}

function StepReceiving({ nb, upd }) {
  const r = nb.receiving || (nb.receiving = { coreT: null, provider: '', farm: '', slaughterDate: '', cut: '', acceptance: 'pending', notes: '' });
  const lv = coreTLevel(r.coreT);
  const set = (k) => (e) => upd(() => { r[k] = e.target.value; });
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/40 p-4">
        <Field label={tx("Temperatura interna al recibir")} className="w-44">
          <NumberField unit="°C" step="0.1" value={r.coreT} onValue={(v) => upd(() => { r.coreT = v; })} placeholder="2.3" inputClassName="h-11 text-lg" />
        </Field>
        <div className="grid gap-1 pb-1">
          <Badge variant={lv.variant} className="h-7 gap-1.5 px-2.5 text-xs"><lv.icon />{lv.label}</Badge>
          <span className="text-xs text-muted-foreground">{tx("Sonda Lavatools · USDA/EFSA: ≤4 °C verde · 4–7 amarilla · >7 roja")}</span>
        </div>
      </div>
      {(lv.level === 'yellow' || lv.level === 'red') && (
        <Field label={tx("Decisión de aceptación (obligatoria)")}>
          <Select value={r.acceptance || 'pending'} onValueChange={(x) => upd(() => { r.acceptance = x; })}>
            <SelectTrigger className={lv.level === 'red' ? 'border-danger/50' : 'border-warning/50'}><SelectValue /></SelectTrigger>
            <SelectContent>{ACCEPT.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tx("Proveedor")}><Input value={r.provider || ''} onChange={set('provider')} placeholder={tx("ej: Carnes Suárez")} /></Field>
        <Field label={tx("Finca / matadero")}><Input value={r.farm || ''} onChange={set('farm')} placeholder={tx("opcional")} /></Field>
        <Field label={tx("Fecha de sacrificio")}><Input type="date" value={r.slaughterDate || ''} onChange={set('slaughterDate')} /></Field>
        <Field label={tx("Canal / corte")}><Input value={r.cut || ''} onChange={set('cut')} placeholder={tx("ej: solomo, pernil")} /></Field>
      </div>
      <Field label={tx("Notas de recepción (opcional)")}><Input value={r.notes || ''} onChange={set('notes')} placeholder={tx("transporte, condiciones visuales, olor…")} /></Field>
    </div>
  );
}

function StepPieces({ nb, upd, totalG }) {
  return (
    <div className="grid gap-3">
      <div className="hidden grid-cols-[2.5rem_1fr_1fr_1fr_1.4fr_2.25rem] gap-2 px-1 text-[11px] font-medium text-muted-foreground sm:grid">
        <span>#</span><span>{tx("Peso verde")}</span><span>{tx("Grosor")}</span><span>{tx("Forma")}</span><span>{tx("Notas")}</span><span />
      </div>
      {nb.pieces.map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border bg-background/50 p-2 sm:grid-cols-[2.5rem_1fr_1fr_1fr_1.4fr_2.25rem] sm:items-center sm:border-0 sm:bg-transparent sm:p-0">
          <span className="col-span-2 font-mono text-sm font-medium sm:col-span-1">{p.code || `P${i + 1}`}</span>
          <NumberField unit="g" step="10" value={p.initialWeight} onValue={(v) => upd(() => { p.initialWeight = v ?? 0; })} aria-label={tx("Peso verde")} />
          <NumberField unit="cm" step="0.5" value={p.thickness} onValue={(v) => upd(() => { p.thickness = v ?? 0; })} aria-label={tx("Grosor")} />
          <Select value={p.shape} onValueChange={(x) => upd(() => { p.shape = x; })}>
            <SelectTrigger aria-label={tx("Forma")}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="tubular">{tx("Tubular")}</SelectItem><SelectItem value="flat">{tx("Plana")}</SelectItem></SelectContent>
          </Select>
          <Input value={p.notes || ''} onChange={(e) => upd(() => { p.notes = e.target.value; })} placeholder={tx("opcional")} aria-label={tx("Notas")} />
          <Button type="button" variant="ghost" size="icon" aria-label={tx("Quitar pieza")} disabled={nb.pieces.length === 1} onClick={() => upd((x) => { x.pieces.splice(i, 1); })}><Trash2 className="text-muted-foreground" /></Button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" size="sm" onClick={() => upd((x) => { x.pieces.push({ initialWeight: 1000, thickness: 6, shape: 'tubular', notes: '' }); })}><Plus />{' '}{tx("Otra pieza")}</Button>
        <span className="text-sm text-muted-foreground">{tx("Total")}{' '}<b className="font-mono text-foreground">{fmtG(totalG)}</b></span>
      </div>
    </div>
  );
}

/* Ports v4.4.3 renderEstimatedTimeline / renderSaltOverrideSection / renderScaledRecipes (display only). */
function StepCure({ nb, type, upd, maxT, shape, totalG }) {
  if (!type) return null;
  const eb = core.ebDays(maxT, shape, nb.ebPlus20 !== false);
  let cursor = core.parseLocalDate(nb.startedAt); let total = 0;
  const rows = type.stages.map((s) => {
    const d = s.kind === 'Curado' && s.eb ? core.ebDays(maxT, shape, nb.ebPlus20 !== false) : s.dEst;
    const start = new Date(cursor); const end = new Date(core.addDays(cursor, d)); cursor = end; total += d;
    return { kind: s.kind, start, end, d };
  });
  const cur = (type.stages || []).filter((s) => s.kind === 'Curado' && s.brine);
  const smoke = type.stages.find((s) => s.kind === 'Ahumado')?.smoke;
  const profile = smoke ? core.fickSmokeProfile({ thicknessCm: maxT, tempC: smoke.tempC || 25, hours: smoke.hours || 6 }) : null;
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <Switch id="eb20" checked={nb.ebPlus20} onCheckedChange={(c) => upd((x) => { x.ebPlus20 = c; })} />
        <Label htmlFor="eb20">{tx("Margen de seguridad")}{' '}<b className="text-gold-ink">+20 %</b>{' '}{tx("en Curado EB")}</Label>
        <span className="ml-auto text-xs text-muted-foreground">{tx("pieza más gruesa {0} cm {1} →", [maxT, shape === 'flat' ? 'plana' : 'tubular'])}{' '}<b className="font-mono text-foreground">{fmt(eb, 1)} d</b>{' '}{tx("de curado")}</span>
      </div>

      <div>
        <SectionLabel>{tx("Cronograma estimado")}</SectionLabel>
        <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-border">{rows.map((r, i) => <span key={i} title={`${tx(r.kind)} ${fmt(r.d, 1)} d`} style={{ width: `${(100 * r.d) / total}%`, background: stageVar(r.kind) }} />)}</div>
        <div className="mt-3 grid gap-1.5 text-sm">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
              <span className="flex items-center gap-2"><StageDot kind={r.kind} />{tx(r.kind)}</span>
              <span className="font-mono text-xs tabular text-muted-foreground">{fmtDate(r.start)} → {fmtDate(r.end)}</span>
              <span className="w-14 text-right font-mono text-xs tabular">{fmt(r.d, 1)} d</span>
            </div>
          ))}
          <div className="mt-1 flex justify-end gap-2 border-t pt-2 text-sm">{tx("Ciclo total")}{' '}<b className="font-mono">{Math.round(total)} d</b><span className="text-muted-foreground">{tx("({0} meses)", [(total / 30).toFixed(1)])}</span></div>
        </div>
      </div>

      <SaltPenetration nb={nb} type={type} maxT={maxT} shape={shape} rows={rows} />

      {profile && (
        <div>
          <SectionLabel>{tx("Penetración del humo (Fick)")}</SectionLabel>
          <div className="flex h-12 items-end gap-0.5">{profile.map((p, i) => <div key={i} className="flex-1 rounded-t-sm" title={txt`${p.depthMm} mm: ${p.saturationPct.toFixed(0)}%`} style={{ height: `${Math.max(4, p.saturationPct)}%`, background: p.saturationPct > 80 ? 'var(--danger)' : p.saturationPct > 50 ? 'var(--warning)' : p.saturationPct > 20 ? 'var(--success)' : 'var(--muted-foreground)' }} />)}</div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{tx("Superficie")}</span><span>{tx("Centro ({0} mm) · {1} h a {2} °C", [((maxT / 2) * 10).toFixed(0), smoke.hours || 6, smoke.tempC || 25])}</span></div>
        </div>
      )}

      {cur.length > 0 && <SaltOverride nb={nb} brine={cur[0].brine} upd={upd} />}

      <div>
        <SectionLabel>{tx("Receta escalada · {0} de carne", [fmtG(totalG)])}</SectionLabel>
        <ScaledRecipes type={type} totalKg={totalG / 1000} pieces={nb.pieces} overrides={nb.saltOverrides} />
      </div>
    </div>
  );
}

/* Salt reaching the centre (Fick diffusion), compared against THIS batch's real curing days.
 * v4.4.3 compared the recipe's fixed Curado days and ignored the Equilibrium Brine duration. */
function SaltPenetration({ nb, type, maxT, shape, rows }) {
  const cur = type.stages.find((s) => s.kind === 'Curado');
  if (!cur) return null;
  const tempC = cur.env?.T ?? 5;               // same inputs as v4.4.3 evaluateFickSalt
  const need = core.fickSaltPenetrationDays({ thicknessCm: maxT, shape, tempC, fatPct: type.fatPct ?? 20 });
  if (!need) return null;
  const curDays = rows.find((r) => r.kind === 'Curado')?.d ?? cur.dEst;
  // salt keeps equalising after the curing bag: up to the end of Secado + Balanceo
  const iEnd = Math.max(rows.findLastIndex((r) => r.kind === 'Secado' || r.kind === 'Balanceo'), rows.findIndex((r) => r.kind === 'Curado'));
  const untilEq = rows.slice(rows.findIndex((r) => r.kind === 'Curado'), iEnd + 1).reduce((s2, r) => s2 + r.d, 0);
  const [variant, Icon, title, text] = curDays >= need
    ? ['success', CircleCheck, tx('La sal llega al centro durante el curado'), txt`Con ${fmt(curDays, 1)} d de curado alcanza; el modelo estima ${Math.round(need)} d para esta pieza.`]
    : untilEq >= need
      ? ['info', Info, tx('La sal termina de igualarse después del curado'), txt`El curado dura ${fmt(curDays, 1)} d y el modelo estima ${Math.round(need)} d para que la sal llegue al centro. Como la sal sigue igualándose durante el secado y el balanceo (${Math.round(untilEq)} d en total), es lo normal en piezas gruesas.`]
      : ['warning', TriangleAlert, tx('El centro podría quedar con poca sal'), txt`El modelo estima ${Math.round(need)} d para que la sal llegue al centro, pero hasta el fin del ${rows.some((r) => r.kind === 'Balanceo') ? 'balanceo' : 'secado'} hay ${Math.round(untilEq)} d. Considerá un curado más largo o piezas más delgadas.`];
  return (
    <Alert variant={variant}>
      <Icon /><AlertTitle className="line-clamp-none">{title}</AlertTitle>
      <AlertDescription>
        <p>{text}</p>
        <p className="text-xs opacity-80">{tx("Estimación por difusión (ley de Fick) con la pieza más gruesa: {0} cm, {1}, a {2} °C. Es orientativa y conservadora; no reemplaza tu experiencia con el corte.", [maxT, shape === 'flat' ? 'plana' : 'tubular', tempC])}</p>
      </AlertDescription>
    </Alert>
  );
}

function SaltOverride({ nb, brine, upd }) {
  const commons = core.commonSaltIngredients(); const cures = core.cureSaltIngredients();
  const typeCommon = brine.saltIngredient || core.defaultCommonSaltName();
  const typeCure = brine.cureSalt?.ingredient || null;
  const effCommon = nb.saltOverrides?.commonSalt || typeCommon;
  const effCure = nb.saltOverrides?.cureSaltSet ? nb.saltOverrides.cureSalt : typeCure;
  const tpl = { ...brine, saltIngredient: effCommon, cureSalt: { ...(brine.cureSalt || { ingredient: null, gPerKg: 0 }), ingredient: effCure } };
  const demo = core.calcEqBrine(1000, tpl.saltPct, tpl.waterPct, effCommon, tpl);
  return (
    <div>
      <SectionLabel>{tx("Sales para este lote")}</SectionLabel>
      <p className="mb-3 text-xs text-muted-foreground">{tx("La receta pide")}{' '}<b>{tx("{0}% NaCl", [tpl.saltPct])}</b>{tx(". Si usás otra sal, los gramos se ajustan por su densidad; el NaCl efectivo no cambia. Valores por kg de carne.")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={<>{tx("Sal común")}{' '}{effCommon !== typeCommon && <Badge variant="gold" className="ml-1">{tx("modificada")}</Badge>}</>} hint={<>{tx("Receta: {0} ·", [typeCommon])}{' '}<b className="font-mono">{fmt(demo.commonG, 2)} g</b>{' '}{tx("= {0} tsp", [fmt(demo.commonTsp, 2)])}</>}>
          <Select value={effCommon} onValueChange={(x) => upd(() => { nb.saltOverrides.commonSalt = x; })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{commons.map((s) => <SelectItem key={s.name} value={s.name}>{tx("{0} · {1} g/tsp", [s.name, +s.gPerTsp || 6])}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label={<>{tx("Sal de cura")}{' '}{effCure !== typeCure && <Badge variant="gold" className="ml-1">{tx("modificada")}</Badge>}</>} hint={<>{tx("Receta: {0}", [typeCure || 'ninguna'])}{demo.cureG > 0 && <> · <b className="font-mono">{fmt(demo.cureG, 2)} g</b>{' '}{tx("· {0} ppm nitrito{1}", [fmt(demo.nitritePpm, 0), demo.nitratePpm > 0 ? txt` · ${fmt(demo.nitratePpm, 0)} ppm nitrato` : ''])}</>}</>}>
          <Select value={effCure || 'none'} onValueChange={(x) => upd(() => { nb.saltOverrides.cureSalt = x === 'none' ? null : x; nb.saltOverrides.cureSaltSet = true; })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">{tx("— Sin sal de cura —")}</SelectItem>{cures.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

export function ScaledRecipes({ type, totalKg, pieces, overrides }) {
  const db = core.getDB();
  const stages = type.stages.filter((s) => (s.recipe && s.recipe.length) || (s.kind === 'Curado' && s.brine) || s.inoc);
  if (!stages.length) return <p className="text-sm text-muted-foreground">{tx("Esta receta no tiene ingredientes.")}</p>;
  const meatG = totalKg * 1000;
  return (
    <div className="grid gap-4">
      {stages.map((s, si) => {
        const rows = []; let brineMix = 0, recipeMix = 0;
        if (s.kind === 'Curado' && s.brine) {
          const effCommon = overrides?.commonSalt || s.brine.saltIngredient;
          const effCure = overrides?.cureSaltSet ? overrides.cureSalt : s.brine.cureSalt?.ingredient || null;
          const eff = { ...s.brine, saltIngredient: effCommon, cureSalt: { ...(s.brine.cureSalt || { ingredient: null, gPerKg: 0 }), ingredient: effCure } };
          const r = core.calcEqBrine(meatG, eff.saltPct, eff.waterPct, effCommon, eff);
          brineMix = r.commonG + r.cureG;
          rows.push({ n: effCommon || tx('Sal común'), a: `${fmt(r.commonG, 2)} g`, sub: txt`${fmt(r.commonTsp, 1)} tsp`, eb: true });
          if (r.cureG > 0 && r.cureIng) rows.push({ n: r.cureIng.name, a: `${fmt(r.cureG, 2)} g`, sub: txt`${fmt(r.cureTsp, 3)} tsp`, eb: true });
          if (r.waterG > 0) rows.push({ n: tx('Agua destilada'), a: `${fmt(r.waterG, 0)} ml`, eb: true });
        }
        (s.recipe || []).forEach((r) => {
          const ing = db.ingredients.find((i) => i.name === r.ingredient);
          const amt = r.amount * totalKg; const unit = ing?.unit || 'g';
          if (unit === 'g' || !unit) recipeMix += amt;
          rows.push({ n: r.ingredient, a: `${fmt(amt, 2)} ${unit}` });
        });
        if (s.inoc) {
          const ci = db.ingredients.find((x) => x.name === s.inoc.i);
          const sc = ci ? core.scaleInoculant(ci, totalKg) : null;
          rows.push(sc ? { n: txt`${s.inoc.i} + ${fmt(sc.waterMl, 0)} ml agua destilada`, a: `${core.fmtFrac(sc.starterTsp)} tsp`, inoc: true }
            : { n: txt`${s.inoc.i} + ${fmt((s.inoc.water || 0) * totalKg, 1)} ml agua`, a: `${fmt((s.inoc.a || 0) * totalKg, 3)} g`, inoc: true });
        }
        const mix = brineMix + recipeMix;
        return (
          <div key={si} className="rounded-lg border bg-background/50">
            <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium"><StageDot kind={s.kind} />{tx(s.kind)}</div>
            <ul className="divide-y text-sm">
              {rows.map((r, i) => (
                <li key={i} className={cn('flex items-center justify-between gap-3 px-3 py-1.5', r.inoc && 'text-success')}>
                  <span className="min-w-0">{r.n}{r.eb && <Badge variant="gold" className="ml-2 px-1 py-0 text-[9px]">{tx("EQ Brine")}</Badge>}</span>
                  <span className="shrink-0 text-right font-mono tabular">{r.a}{r.sub && <span className="ml-2 text-xs text-muted-foreground">{r.sub}</span>}</span>
                </li>
              ))}
            </ul>
            {s.kind === 'Curado' && mix > 0 && pieces?.length > 1 && (
              <div className="border-t bg-muted/40 px-3 py-2">
                <div className="mb-1.5 text-xs font-medium">{tx("Mix seco por pieza")}{' '}<span className="font-normal text-muted-foreground">{tx("· total {0} g, proporcional al peso verde", [fmt(mix, 2)])}</span></div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {pieces.map((p, i) => { const share = (+p.initialWeight || 0) / 1000 / totalKg; return (
                    <div key={i} className="flex justify-between font-mono text-xs tabular"><span>{p.code || `P${i + 1}`} · {fmtG(p.initialWeight)}</span><b>{fmt(mix * share, 2)} g</b></div>
                  ); })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepSummary({ nb, type, upd, editing, totalG }) {
  const lv = coreTLevel(nb.receiving?.coreT);
  const needsDecision = (lv.level === 'yellow' || lv.level === 'red') && (!nb.receiving?.acceptance || nb.receiving.acceptance === 'pending');
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-4">
        <Metric label={tx("Ref")} value={core.previewRef(nb, type, nb.editingBatchId)} />
        <Metric label={tx("Inicio")} value={fmtDate(core.parseLocalDate(nb.startedAt))} />
        <Metric label={tx("Carne")} value={fmtG(totalG)} note={txt`${nb.pieces.length} pieza${nb.pieces.length === 1 ? '' : 's'}`} />
        <Metric label={tx("Objetivo")} value={fmtG((nb.targetYield / 100) * totalG)} note={txt`rendimiento ${nb.targetYield}%`} />
      </div>
      {lv.level === 'gray' && <Alert variant="info"><Info /><AlertDescription>{tx("Sin temperatura de recepción: el PCC queda pendiente. Podés completarlo después editando el lote.")}</AlertDescription></Alert>}
      {needsDecision && <Alert variant="warning"><TriangleAlert /><AlertDescription>{tx("La temperatura de recepción pide una decisión de aceptación (paso 2).")}</AlertDescription></Alert>}
      {nb.receiving?.acceptance === 'reject' && <Alert variant="danger"><OctagonAlert /><AlertDescription>{tx("Marcaste la carne como rechazada.")}</AlertDescription></Alert>}
      <Field label={tx("Observaciones del lote")}><Textarea rows={3} value={nb.notes || ''} onChange={(e) => upd((x) => { x.notes = e.target.value; })} placeholder={tx("notas iniciales")} /></Field>
      {!editing && <p className="text-xs text-muted-foreground">{tx("Al crear el lote se generan todas las etapas de «{0}» con las fechas del cronograma.", [type?.name])}</p>}
    </div>
  );
}
