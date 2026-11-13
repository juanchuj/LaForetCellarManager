import { ArrowDown, ArrowLeft, ArrowUp, BookOpenText, ChevronDown, CircleCheck, Copy, Minus, Plus, Sparkles, Tag, Trash2, TriangleAlert } from 'lucide-react';
import { useDB, core } from '@/lib/store';
import { navigate } from '@/lib/router';
import { ask, openDialog } from '@/lib/dialogs';
import { fmt, stageVar } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Field, Metric, SectionLabel, UnitInput } from '@/components/form';
import { StageDot } from '@/components/stage-dot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/* ── Lista de recetas madre ────────────────────────────── */
export function Types() {
  const db = useDB();
  return (
    <>
      <PageHeader eyebrow="Recetario" title="Tipos de madurado" description="Recetas madre: etapas, salmuera, condiciones y metas. Cada lote copia la receta al crearse."
        actions={<Button onClick={() => core.createNewType()}><Plus /> Nuevo tipo</Button>} />
      {db.types.length === 0 ? (
        <EmptyState icon={BookOpenText} title="Sin recetas" action={<Button variant="outline" onClick={() => core.loadExampleRecipe()}>Cargar receta de ejemplo</Button>}>Creá un tipo o cargá el ejemplo de Lomo Español.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {db.types.map((t) => {
            const days = core.typeTotalDays(t, 6);
            const total = t.stages.reduce((s, x) => s + (+x.dEst || 0), 0) || 1;
            const nBatches = db.batches.filter((b) => b.typeId === t.id).length;
            return (
              <button key={t.id} onClick={() => navigate(`/tipos/${t.id}`)} className="group rounded-xl border bg-card p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-2xl font-semibold leading-tight">{t.name}</h3>
                  <span className="rounded border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{t.ref}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t.category === 'entera' ? 'Pieza entera' : 'Embutido'} · rendimiento {t.yield.target}% ({t.yield.min}–{t.yield.max}) · ~{Math.round(days)} d</p>
                <div className="mt-4 flex h-2 overflow-hidden rounded-full ring-1 ring-border">{t.stages.map((s, i) => <span key={i} style={{ width: `${(100 * (+s.dEst || 0)) / total}%`, background: stageVar(s.kind) }} />)}</div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{t.stages.map((s, i) => <span key={i} className="inline-flex items-center gap-1.5"><StageDot kind={s.kind} className="size-2" />{s.kind}</span>)}</div>
                <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">{nBatches ? `${nBatches} lote${nBatches === 1 ? '' : 's'}` : 'Sin lotes todavía'}</div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── Editor de receta ──────────────────────────────────── */
/** Stages done vacuum-packed: no relative-humidity requirement. */
export const VACUUM = new Set(['Balanceo']);
const updStage = (t, i, field, value) => { t.stages[i][field] = value; core.saveDB(); };

export function TypeEditor({ id }) {
  const db = useDB();
  const t = db.types.find((x) => x.id === id);
  if (!t) return <EmptyState title="Receta no encontrada" action={<Button variant="outline" onClick={() => navigate('/tipos')}><ArrowLeft /> Tipos</Button>} />;
  return (
    <>
      <button onClick={() => navigate('/tipos')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Tipos</button>
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="mb-1.5 font-mono text-xs tracking-wider text-gold-ink">{t.ref}</p><h1 className="font-display text-4xl font-semibold leading-tight">{t.name}</h1></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openDialog('label', { typeId: t.id })}><Tag /> Etiqueta</Button>
          <Button variant="outline" onClick={() => core.duplicateType(t.id)}><Copy /> Duplicar</Button>
          <Button variant="outline" className="text-danger hover:text-danger" onClick={() => core.deleteType(t.id)}><Trash2 /> Eliminar</Button>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <GeneralCard t={t} />
        <Card>
          <CardHeader><CardTitle className="font-display text-2xl font-semibold">Duración del ciclo</CardTitle><CardDescription>Según el grosor de una pieza tubular</CardDescription></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">{[3, 5, 7, 9, 12].map((cm) => { const d = core.typeTotalDays(t, cm); return <li key={cm} className="flex items-center justify-between py-2"><span className="font-mono">{cm} cm</span><span><b className="font-mono text-gold-ink">{Math.round(d)} d</b><span className="ml-2 text-xs text-muted-foreground">≈ {(d / 30).toFixed(1)} m</span></span></li>; })}</ul>
          </CardContent>
        </Card>
      </div>

      <BaseMeatCard t={t} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-2xl font-semibold">Flujo de proceso</CardTitle>
          <CardDescription>{t.stages.length} etapa{t.stages.length === 1 ? '' : 's'} · usá las flechas de cada etapa para reordenar</CardDescription>
          <CardAction><Button size="sm" onClick={() => openDialog('add-stage', { typeId: t.id })}><Plus /> Agregar etapa</Button></CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {t.stages.map((s, i) => (
              <div key={s.id || i} className="flex items-center gap-2">
                <a href={`#stage-${i}`} className="rounded-lg border bg-background/60 px-3 py-2 text-sm transition-colors hover:border-gold/40" style={{ borderTopColor: stageVar(s.kind), borderTopWidth: 3 }}>
                  <div className="flex items-center gap-2 font-medium">{s.kind}<span className="font-mono text-xs text-muted-foreground">{s.dEst} d</span></div>
                  {(s.recipe?.length > 0 || s.inoc) && <div className="text-[11px] text-muted-foreground">{s.recipe?.length ? `${s.recipe.length} ingredientes` : ''}{s.inoc ? ` · ${s.inoc.i}` : ''}</div>}
                </a>
                {i < t.stages.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4">
        {t.stages.map((s, i) => <StageEditor key={s.id || `${s.kind}-${i}`} t={t} s={s} i={i} />)}
      </div>
    </>
  );
}

function GeneralCard({ t }) {
  const awT = core.awTargetForType(t);
  return (
    <Card>
      <CardHeader><CardTitle className="font-display text-2xl font-semibold">Información general</CardTitle></CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre"><Input defaultValue={t.name} onChange={(e) => core.updateType(t.id, 'name', e.target.value)} /></Field>
          <Field label="Referencia (6 caracteres)"><Input defaultValue={t.ref} maxLength={6} className="font-mono uppercase" onChange={(e) => core.updateType(t.id, 'ref', e.target.value.toUpperCase())} /></Field>
          <Field label="Categoría">
            <Select value={t.category} onValueChange={(v) => core.updateType(t.id, 'category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="entera">Pieza entera (whole muscle)</SelectItem><SelectItem value="embutido">Embutido / molida</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Notas"><Input defaultValue={t.notes || ''} onChange={(e) => core.updateType(t.id, 'notes', e.target.value)} /></Field>
        </div>
        <div>
          <SectionLabel>Rendimiento objetivo · peso final / verde</SectionLabel>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Objetivo"><UnitInput unit="%" defaultValue={t.yield.target} onChange={(e) => core.updateYield(t.id, 'target', +e.target.value)} /></Field>
            <Field label="Mínimo (más húmedo)"><UnitInput unit="%" defaultValue={t.yield.min} onChange={(e) => core.updateYield(t.id, 'min', +e.target.value)} /></Field>
            <Field label="Máximo (más seco)"><UnitInput unit="%" defaultValue={t.yield.max} onChange={(e) => core.updateYield(t.id, 'max', +e.target.value)} /></Field>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Rango sugerido al crear un lote; cada lote lo ajusta según el cliente.</p>
        </div>
        <Fold title="Modelo de aw" hint="opcional">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="aw objetivo"><UnitInput step="0.01" defaultValue={t.awTarget ?? ''} placeholder={awT.toFixed(2)} onChange={(e) => core.updateType(t.id, 'awTarget', e.target.value === '' ? null : +e.target.value)} /></Field>
            <Field label="Humedad carne verde"><UnitInput unit="%" defaultValue={t.waterFrac ? Math.round(t.waterFrac * 100) : ''} placeholder="74" onChange={(e) => core.updateType(t.id, 'waterFrac', e.target.value === '' ? null : +e.target.value / 100)} /></Field>
            <Field label="Ajuste manual (± aw)"><UnitInput step="0.005" defaultValue={t.awOffset ?? ''} placeholder="0" onChange={(e) => core.updateType(t.id, 'awOffset', e.target.value === '' ? null : +e.target.value)} /></Field>
          </div>
          <Field label="Justificación del límite (aparece en HACCP)" className="mt-4"><Input defaultValue={t.awJustification || ''} placeholder="ej.: meta 0.93 con nitrito + sal 2.8 % + cava ≤ 15 °C + 60 días" onChange={(e) => core.updateType(t.id, 'awJustification', e.target.value)} /></Field>
          {+t.awTarget > core.AW_NO_BARRIER && <Alert variant="danger" className="mt-3"><TriangleAlert /><AlertDescription>Un objetivo sobre {core.AW_NO_BARRIER.toFixed(2)} no es una barrera de aw real (Salmonella y <i>C. botulinum</i> pueden crecer).</AlertDescription></Alert>}
          <p className="mt-2 text-xs text-muted-foreground">El aw objetivo es el límite crítico del PCC y de «LISTA». Meta práctica 0.92–0.93; 0.95 es un valor de paso, no final. Humedad aprox.: magra 74 %.</p>
        </Fold>
        <Fold title="Calidad y negocio" hint="opcional">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nota objetivo de cata"><UnitInput unit="/10" step="0.5" defaultValue={t.tasteTarget ?? ''} placeholder="8" onChange={(e) => core.updateType(t.id, 'tasteTarget', e.target.value === '' ? null : +e.target.value)} inputClassName="pr-12" /></Field>
            <Field label="Precio de venta"><UnitInput unit="COP/kg" step="1000" defaultValue={t.priceKg ?? ''} placeholder="120000" onChange={(e) => core.updateType(t.id, 'priceKg', e.target.value === '' ? null : +e.target.value)} inputClassName="pr-16" /></Field>
            <Field label="Costo materia prima"><UnitInput unit="COP/kg" step="500" defaultValue={t.costKg ?? ''} placeholder="28000" onChange={(e) => core.updateType(t.id, 'costKg', e.target.value === '' ? null : +e.target.value)} inputClassName="pr-16" /></Field>
          </div>
        </Fold>
      </CardContent>
    </Card>
  );
}

function Fold({ title, hint, children, defaultOpen = false }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-lg border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">{title}{hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}<ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
      <CollapsibleContent className="border-t px-4 py-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/* Port of renderBaseMeatCard (seeds/normalizes composition on view, like v4.4.3) */
function BaseMeatCard({ t }) {
  if (!t.baseMeat || !t.baseMeat.composition) {
    const spec = core.BASE_MEAT_COMPOSITIONS[t.name];
    t.baseMeat = { composition: spec ? JSON.parse(JSON.stringify(spec)) : [{ ingredient: 'Cerdo magro (cañón/lomo/pernil)', pct: 100, note: '' }] };
  }
  t.baseMeat.composition = core.normalizeComposition(t.baseMeat.composition);
  const comp = t.baseMeat.composition;
  const total = comp.reduce((s, c) => s + (+c.pct || 0), 0);
  const ok = Math.abs(total - 100) < 0.1;
  const mix = core.mixMeats(comp);
  const meats = core.meatIngredients();
  const missing = comp.filter((c) => !core.meatNutrFor(c.ingredient));
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="font-display text-2xl font-semibold">Carne base</CardTitle>
        <CardDescription>Carnes del catálogo de ingredientes (categoría carne)</CardDescription>
        <CardAction><Badge variant={ok ? 'success' : 'danger'}>{total.toFixed(1)}% {ok ? '' : '· debe sumar 100%'}</Badge></CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {missing.length > 0 && <Alert variant="danger"><TriangleAlert /><AlertDescription>Sin perfil nutricional: {missing.map((m) => m.ingredient).join(', ')}. Editá el ingrediente para agregar kcal, proteína y grasa.</AlertDescription></Alert>}
        {comp.map((c, i) => (
          <div key={`${i}-${comp.length}`} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_7rem_9rem_1.5fr_2.25rem] sm:items-center">
            <div className="col-span-2 sm:col-span-1">
              <Select value={c.ingredient} onValueChange={(v) => core.updateBaseMeatPart(t.id, i, 'ingredient', v)}>
                <SelectTrigger><SelectValue placeholder="Elegí una carne" /></SelectTrigger>
                <SelectContent>{meats.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}{!m.nutr ? ' ⚠' : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <UnitInput unit="%" step="0.1" defaultValue={c.pct} onBlur={(e) => core.updateBaseMeatPart(t.id, i, 'pct', +e.target.value)} aria-label="Porcentaje" />
            <Select value={c.form || 'entero'} onValueChange={(v) => core.updateBaseMeatPart(t.id, i, 'form', v)}>
              <SelectTrigger aria-label="Forma"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(core.MEAT_FORMS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Input defaultValue={c.note || ''} placeholder="nota" onChange={(e) => core.updateBaseMeatPart(t.id, i, 'note', e.target.value)} className="col-span-2 sm:col-span-1" aria-label="Nota" />
            <Button variant="ghost" size="icon" disabled={comp.length <= 1} aria-label="Quitar" onClick={() => core.removeBaseMeatPart(t.id, i)}><Trash2 className="text-muted-foreground" /></Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => core.addBaseMeatPart(t.id)}><Plus /> Añadir corte</Button><Button size="sm" variant="ghost" onClick={() => navigate('/ingredientes')}>Editar carnes del catálogo</Button></div>
        {mix && (
          <div className="mt-2 rounded-lg border border-dashed bg-muted/40 p-4">
            <div className="mb-3 text-xs font-medium text-muted-foreground">Perfil nutricional calculado · por 100 g crudo</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Energía" value={`${Math.round(mix.kcal)} kcal`} /><Metric label="Proteína" value={`${mix.protein.toFixed(1)} g`} /><Metric label="Grasa total" value={`${mix.fat.toFixed(1)} g`} />
              <Metric label="Grasa saturada" value={`${mix.satFat.toFixed(1)} g`} valueClassName={mix.satFat >= 4 ? 'text-danger' : ''} /><Metric label="Sodio" value={`${Math.round(mix.sodium_mg)} mg`} />
              <Metric label="Colesterol" value={`${Math.round(mix.cholesterol || 0)} mg`} /><Metric label="Agua" value={`${(mix.water || 0).toFixed(0)}%`} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StageEditor({ t, s, i }) {
  const meta = core.STAGE_MAP[s.kind] || {};
  const db = core.getDB();
  return (
    <Card id={`stage-${i}`} className="scroll-mt-6 gap-0 overflow-hidden py-0">
      <div className="flex items-center gap-3 border-b px-5 py-3" style={{ borderTop: `3px solid ${stageVar(s.kind)}` }}>
        <span className="font-mono text-xs text-muted-foreground">E{i + 1}</span>
        <span className="font-medium">{s.kind}</span>
        <span className="ml-auto flex gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Subir" disabled={i === 0} onClick={() => core.moveStage(t.id, i, -1)}><ArrowUp /></Button>
          <Button size="icon-sm" variant="ghost" aria-label="Bajar" disabled={i === t.stages.length - 1} onClick={() => core.moveStage(t.id, i, 1)}><ArrowDown /></Button>
          <Button size="icon-sm" variant="ghost" aria-label="Eliminar etapa" onClick={() => ask(() => core.removeStage(t.id, i))}><Trash2 className="text-muted-foreground" /></Button>
        </span>
      </div>
      <div className="grid gap-6 p-5">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <Field label="Duración estimada" className="w-36"><UnitInput unit="días" step="0.5" defaultValue={s.dEst} onChange={(e) => updStage(t, i, 'dEst', +e.target.value)} inputClassName="pr-12" /></Field>
          {s.kind === 'Curado' && (
            <>
              <div className="flex items-center gap-2 pb-2"><Switch id={`eb-${i}`} checked={!!s.eb} onCheckedChange={(c) => updStage(t, i, 'eb', c)} /><Label htmlFor={`eb-${i}`}>Duración por Equilibrium Brine (auto por grosor)</Label></div>
              <Field label="Forma de la pieza" className="w-40">
                <Select value={s.shape || 'tubular'} onValueChange={(v) => updStage(t, i, 'shape', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tubular">Tubular</SelectItem><SelectItem value="flat">Plana</SelectItem></SelectContent></Select>
              </Field>
            </>
          )}
          {meta.press && <div className="flex items-center gap-2 pb-2"><Switch id={`pr-${i}`} checked={!!s.press} onCheckedChange={(c) => updStage(t, i, 'press', c)} /><Label htmlFor={`pr-${i}`}>Prensado</Label></div>}
        </div>

        {s.kind === 'Curado' && <BrineEditor t={t} s={s} i={i} />}
        {s.kind === 'Ahumado' && <SmokeEditor t={t} s={s} i={i} />}

        {meta.env && (
          <div><SectionLabel>{VACUUM.has(s.kind) ? 'Temperatura' : 'Ambiente'}</SectionLabel>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[['tMin', 'T mín', '°C', '0.5'], ['tMax', 'T máx', '°C', '0.5'], ['hMin', 'HR mín', '%', '1'], ['hMax', 'HR máx', '%', '1']].filter(([k]) => !(VACUUM.has(s.kind) && k[0] === 'h')).map(([k, l, u, st]) => (
                <Field key={k} label={l}><UnitInput unit={u} step={st} defaultValue={s.env?.[k] ?? ''} onChange={(e) => core.updateEnv(t.id, i, k, +e.target.value)} /></Field>
              ))}
            </div>
          </div>
        )}
        {meta.env && VACUUM.has(s.kind) && <p className="-mt-3 text-xs text-muted-foreground">Al vacío: la humedad de la cava no influye, así que no tiene rango de HR.</p>}
        {meta.ph && (
          <div><SectionLabel>Control de pH</SectionLabel>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[['start', 'Esperado inicio'], ['end', 'Esperado fin'], ['dangerLow', 'Peligro bajo'], ['dangerHigh', 'Peligro alto']].map(([k, l]) => (
                <Field key={k} label={l}><UnitInput step="0.1" defaultValue={s.ph?.[k] ?? ''} onChange={(e) => core.updatePh(t.id, i, k, +e.target.value)} /></Field>
              ))}
            </div>
          </div>
        )}
        {meta.recipe !== 'none' && <RecipeEditor t={t} s={s} i={i} required={meta.recipe === 'required'} />}

        <div>
          <SectionLabel>Inoculante (cultivo / hongo)</SectionLabel>
          {s.inoc ? (() => {
            const ci = db.ingredients.find((x) => x.name === s.inoc.i);
            const spec = ci && +ci.starterTsp > 0;
            const one = ci ? core.scaleInoculant(ci, 1) : null;
            return (
              <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
                <Field label="Cultivo" hint={spec ? `Base: ${core.fmtFrac(ci.starterTsp)} tsp + ${fmt(+ci.waterMlPer5lb || (+ci.waterCupsPer5lb || 0) * 236.588, 0)} ml por 2,27 kg · ${ci.rehydMin || 30} min` : 'Este cultivo no tiene datos de rehidratación.'}>
                  <Select value={s.inoc.i || 'none'} onValueChange={(v) => core.updateInoc(t.id, i, 'i', v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">— ninguno —</SelectItem>{db.ingredients.filter((x) => x.category === 'cultivo').map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <div className="pb-2 text-sm">{one ? <span className="flex items-center gap-1.5 text-success"><Sparkles className="size-4" />por kg: <b className="font-mono">{core.fmtFrac(one.starterTsp, 3)} tsp</b> + <b className="font-mono">{fmt(one.waterMl, 1)} ml</b></span> : <span className="text-muted-foreground">Sin datos</span>}</div>
                <Button variant="ghost" className="text-danger" onClick={() => core.removeInoc(t.id, i)}>Quitar</Button>
              </div>
            );
          })() : <Button size="sm" variant="outline" onClick={() => core.addInoc(t.id, i)}><Plus /> Agregar inoculante</Button>}
        </div>
      </div>
    </Card>
  );
}

function Stepper({ value, unit, onDec, onInc, pct, digits = 1, children }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="icon" variant="outline" onClick={onDec} aria-label="Bajar"><Minus /></Button>
      <div className="relative h-9 flex-1 overflow-hidden rounded-md border bg-card">
        <div className="absolute inset-y-0 left-0 bg-gold/15" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        {children}
        <div className="relative grid h-full place-items-center font-mono text-sm tabular"><span><b>{(+value || 0).toFixed(digits)}</b> <span className="text-muted-foreground">{unit}</span></span></div>
      </div>
      <Button type="button" size="icon" variant="outline" onClick={onInc} aria-label="Subir"><Plus /></Button>
    </div>
  );
}

/* Port of renderBrineEditor + renderTypeResidualPreview */
function BrineEditor({ t, s, i }) {
  const br = s.brine || { saltPct: 2.8, waterPct: 0, saltIngredient: core.defaultCommonSaltName(), cureSalt: { ingredient: null, gPerKg: 0 } };
  if (!br.cureSalt) br.cureSalt = { ingredient: null, gPerKg: 0 };
  const commons = core.commonSaltIngredients(); const cures = core.cureSaltIngredients();
  const name = br.saltIngredient || core.defaultCommonSaltName();
  const salt = core.saltByName(name) || { name, gPerTsp: core.DEFAULT_G_PER_TSP };
  const cureName = br.cureSalt.ingredient || '';
  const cureIng = cureName ? core.cureSaltByName(cureName) : null;
  const demo = core.calcEqBrine(1000, br.saltPct, br.waterPct, name, br);
  const totalSalt = demo.commonG + demo.cureG;
  const share = totalSalt > 0 ? (demo.cureG / totalSalt) * 100 : 0;
  const days = core.totalCureProcessDays(t);
  const res = demo.cureG > 0 && days ? core.calcCureResidual({ cureIng: demo.cureIng, nitritePpm: demo.nitritePpm, nitratePpm: demo.nitratePpm }, days, core.DEFAULT_CAVA_TEMP, core.DEFAULT_CAVA_PH) : null;
  const shortWithNitrate = demo.nitratePpm > 0 && days < 30;
  const longNitriteOnly = demo.nitratePpm === 0 && days > 60;
  return (
    <div className="grid gap-5">
      <SectionLabel className="mb-0">Equilibrium Brine · sales</SectionLabel>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Sal total objetivo (NaCl en la carne)" hint="Típico de curado: 2,8–3,0 %">
          <Stepper value={br.saltPct} unit="%" pct={(br.saltPct / 5) * 100} onDec={() => core.stepBrine(t.id, i, 'saltPct', -0.1)} onInc={() => core.stepBrine(t.id, i, 'saltPct', 0.1)} />
        </Field>
        <Field label="Agua añadida" hint="0 % = seco al vacío (salazón) · 10–25 % mejora la distribución">
          <Stepper value={br.waterPct} unit="%" digits={0} pct={(br.waterPct / 50) * 100} onDec={() => core.stepBrine(t.id, i, 'waterPct', -1)} onInc={() => core.stepBrine(t.id, i, 'waterPct', 1)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-3 rounded-lg border p-4">
          <div className="text-sm font-medium">Sal común <span className="text-xs font-normal text-muted-foreground">· NaCl</span></div>
          {commons.length ? (
            <>
              <Select value={name} onValueChange={(v) => core.updateBrine(t.id, i, 'saltIngredient', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{commons.map((x) => <SelectItem key={x.name} value={x.name}>{x.name}</SelectItem>)}</SelectContent></Select>
              <p className="text-xs text-muted-foreground">{salt.note || `Densidad ${+salt.gPerTsp || core.DEFAULT_G_PER_TSP} g por cucharadita`}</p>
              <Metric label="Por kg de carne" value={`${fmt(demo.commonG, 1)} g`} note={`${fmt(demo.commonTsp, 1)} tsp · ${(100 - share).toFixed(0)}% de la sal`} />
            </>
          ) : <p className="text-xs text-warning">No hay sales comunes en el catálogo.</p>}
        </div>
        <div className={cn('grid content-start gap-3 rounded-lg border p-4', cureName && 'border-gold/40 bg-gold/5')}>
          <div className="text-sm font-medium">Sal de cura <span className="text-xs font-normal text-muted-foreground">· aporta nitrito / nitrato</span></div>
          {cures.length ? (
            <>
              <Select value={cureName || 'none'} onValueChange={(v) => core.updateCureSalt(t.id, i, 'ingredient', v === 'none' ? '' : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">— Sin sal de cura —</SelectItem>{cures.map((x) => <SelectItem key={x.name} value={x.name}>{x.name}</SelectItem>)}</SelectContent></Select>
              {cureIng && <p className="text-xs text-muted-foreground">{+cureIng.nitritePct || 0}% nitrito{cureIng.nitratePct > 0 ? ` · ${cureIng.nitratePct}% nitrato` : ''} · {+cureIng.naclPct || 0}% NaCl</p>}
              {cureName && (
                <>
                  <Field label="Dosis" hint={`Típico 2,5 g/kg · máximo del fabricante ${cureIng?.maxGPerKg || 4} g/kg`}>
                    <Stepper value={br.cureSalt.gPerKg} unit="g/kg" pct={((br.cureSalt.gPerKg || 0) / (cureIng?.maxGPerKg || 4)) * 100} onDec={() => core.stepCureSalt(t.id, i, -0.1)} onInc={() => core.stepCureSalt(t.id, i, 0.1)} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={demo.cureLevel === 'red' ? 'danger' : demo.cureLevel === 'yellow' ? 'warning' : 'success'}>Nitrito {fmt(demo.nitritePpm, 0)} ppm</Badge>
                    {demo.nitratePpm > 0 && <Badge variant={demo.nitratePpm > core.NITRATE_MAX_PPM ? 'danger' : demo.nitratePpm > 1500 ? 'warning' : 'success'}>Nitrato {fmt(demo.nitratePpm, 0)} ppm</Badge>}
                    <span className="text-xs text-muted-foreground">{fmt(demo.cureG, 2)} g/kg · aporta {fmt(demo.naclFromCure, 2)} g NaCl</span>
                  </div>
                </>
              )}
            </>
          ) : <p className="text-xs text-warning">Sin sales de cura en el catálogo.</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/50 px-4 py-3 font-mono text-sm tabular">
        <span className="font-sans text-xs text-muted-foreground">Por kg:</span>
        <span>{fmt(demo.commonG, 1)} g</span><span className="text-muted-foreground">+</span><span>{fmt(demo.cureG, 2)} g</span><span className="text-muted-foreground">=</span><b>{fmt(totalSalt, 2)} g de sal</b>
        <span className="text-muted-foreground">→</span><b className="text-gold-ink">{fmt(demo.finalPct, 2)}% NaCl</b>
        {br.waterPct > 0 && <span className="font-sans text-xs text-muted-foreground">· + {fmt(demo.waterG, 0)} g de agua destilada</span>}
      </div>
      {res && (
        <div className="grid gap-2 rounded-lg border p-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium">Al final del proceso completo</span><span className="text-xs text-muted-foreground">{days} días @ {res.tempC} °C, pH {res.ph}</span></div>
          <div>Nitrito <b className="font-mono">{fmt(demo.nitritePpm, 0)}</b> → <b className="font-mono">{fmt(res.residualNitrite, 1)} ppm</b> <span className="text-xs text-muted-foreground">(−{fmt(res.reductionNitrite, 0)}%)</span></div>
          {demo.nitratePpm > 0 && <div>Nitrato <b className="font-mono">{fmt(demo.nitratePpm, 0)}</b> → <b className="font-mono">{fmt(res.residualNitrate, 1)} ppm</b> <span className="text-xs text-muted-foreground">(−{fmt(res.reductionNitrate, 0)}%)</span></div>}
          {shortWithNitrate && <Alert variant="warning"><TriangleAlert /><AlertDescription>Sal con nitrato en un proceso corto ({days} d): el nitrato apenas se convierte y queda residual alto. Considerá InstaCure #1.</AlertDescription></Alert>}
          {longNitriteOnly && <Alert variant="warning"><TriangleAlert /><AlertDescription>Solo nitrito en un proceso largo ({days} d): se agota temprano y pierde efecto. Considerá InstaCure #2.</AlertDescription></Alert>}
          {days >= 30 && !shortWithNitrate && !longNitriteOnly && <Alert variant="success"><CircleCheck /><AlertDescription>La sal de cura es adecuada para la duración del proceso.</AlertDescription></Alert>}
        </div>
      )}
    </div>
  );
}

function SmokeEditor({ t, s, i }) {
  const sm = s.smoke || { hours: 6, tempC: 22, woods: ['Nogal'] };
  const cat = core.smokeCategoryFor(sm.tempC || 0);
  const range = core.SMOKE_RANGES[cat];
  const woods = sm.woods || [];
  return (
    <div className="grid gap-5">
      <SectionLabel className="mb-0">Ahumado</SectionLabel>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tiempo" hint="Rango típico 2–24 h"><Stepper value={sm.hours} unit="h" digits={0} pct={(sm.hours / 48) * 100} onDec={() => core.stepSmoke(t.id, i, 'hours', -1)} onInc={() => core.stepSmoke(t.id, i, 'hours', 1)} /></Field>
        <Field label="Temperatura" hint={<><b>{range.label}:</b> {range.note}</>}><Stepper value={sm.tempC} unit="°C" digits={0} pct={(sm.tempC / 120) * 100} onDec={() => core.stepSmoke(t.id, i, 'tempC', -2)} onInc={() => core.stepSmoke(t.id, i, 'tempC', 2)} /></Field>
      </div>
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Maderas (una o más)</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {core.SMOKE_WOODS.map((w) => {
            const on = woods.includes(w.es);
            return (
              <button key={w.es} type="button" onClick={() => core.toggleWood(t.id, i, w.es)} className={cn('rounded-lg border p-3 text-left transition-colors hover:bg-muted/60', on && 'border-gold/60 bg-gold/10')}>
                <div className="flex items-center gap-2 text-sm"><span className={cn('grid size-4 place-items-center rounded border', on && 'border-gold bg-gold text-white')}>{on && <CircleCheck className="size-3" />}</span><b>{w.es}</b><span className="text-xs text-muted-foreground">({w.en})</span><span className="ml-auto text-[10px] text-muted-foreground">{w.intensity}</span></div>
                <p className="mt-1 text-xs text-muted-foreground">{w.note}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RecipeEditor({ t, s, i, required }) {
  const db = core.getDB();
  const opts = db.ingredients.filter((x) => x.category !== 'carne' && !(s.kind === 'Curado' && (x.category === 'sal' || x.category === 'sal-curado')));
  const demo = s.kind === 'Curado' && s.brine ? core.calcEqBrine(1000, s.brine.saltPct, s.brine.waterPct, s.brine.saltIngredient, s.brine) : null;
  const cureIng = s.brine?.cureSalt?.ingredient ? core.cureSaltByName(s.brine.cureSalt.ingredient) : null;
  return (
    <div>
      <SectionLabel>Receta {required ? '(obligatoria)' : '(opcional)'} · por kg de carne</SectionLabel>
      <div className="grid gap-2">
        {demo && (
          <ul className="divide-y rounded-lg border border-dashed bg-muted/30 text-sm">
            <li className="flex justify-between px-3 py-1.5"><span>{s.brine.saltIngredient || 'Sal común'} <Badge variant="gold" className="ml-1 px-1 py-0 text-[9px]">auto</Badge></span><span className="font-mono tabular">{fmt(demo.commonG, 2)} g/kg</span></li>
            {demo.cureG > 0 && cureIng && <li className="flex justify-between px-3 py-1.5"><span>{cureIng.name} <Badge variant="gold" className="ml-1 px-1 py-0 text-[9px]">auto</Badge></span><span className="font-mono tabular">{fmt(demo.cureG, 2)} g/kg</span></li>}
            {demo.waterG > 0 && <li className="flex justify-between px-3 py-1.5"><span>Agua destilada <Badge variant="gold" className="ml-1 px-1 py-0 text-[9px]">auto</Badge></span><span className="font-mono tabular">{fmt(demo.waterG, 0)} ml/kg</span></li>}
          </ul>
        )}
        {(s.recipe || []).map((r, ri) => {
          const ing = db.ingredients.find((x) => x.name === r.ingredient);
          return (
            <div key={`${ri}-${s.recipe.length}`} className="flex flex-wrap items-center gap-2">
              <div className="min-w-48 flex-[2]">
                <Select value={r.ingredient} onValueChange={(v) => core.updateRecipeIng(t.id, i, ri, 'ingredient', v)}>
                  <SelectTrigger><SelectValue placeholder="Ingrediente" /></SelectTrigger>
                  <SelectContent>{opts.map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <UnitInput className="w-32" unit={`${ing?.unit || 'g'}/kg`} step="0.01" defaultValue={r.amount} onChange={(e) => core.updateRecipeIng(t.id, i, ri, 'amount', +e.target.value)} inputClassName="pr-14" aria-label="Cantidad por kg" />
              <Input defaultValue={r.note || ''} placeholder="nota" onChange={(e) => core.updateRecipeIng(t.id, i, ri, 'note', e.target.value)} className="min-w-32 flex-1" aria-label="Nota" />
              <Button variant="ghost" size="icon" aria-label="Quitar ingrediente" onClick={() => core.removeRecipeIng(t.id, i, ri)}><Trash2 className="text-muted-foreground" /></Button>
            </div>
          );
        })}
        <div><Button size="sm" variant="outline" onClick={() => core.addRecipeIng(t.id, i)}><Plus /> Agregar ingrediente</Button></div>
      </div>
    </div>
  );
}
