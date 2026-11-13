import { CalendarClock, ChevronDown, CircleCheck, Droplets, FlaskConical, Info, Skull, Sparkles, Thermometer, TriangleAlert } from 'lucide-react';
import { core } from '@/lib/store';
import { ask, openDialog } from '@/lib/dialogs';
import { fmt, fmtDate, fmtG, stageVar } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { Metric, SectionLabel } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LEVEL_VARIANT } from './shared';
import { VACUUM } from '@/views/Types';

export function StagesTab({ b }) {
  const curIdx = b.stages.findIndex((x) => !x.done);
  return (
    <ol className="relative mx-auto grid max-w-3xl gap-3">
      {b.stages.map((s, i) => <StageCard key={i} b={b} s={s} idx={i} current={i === curIdx} />)}
    </ol>
  );
}

function StageCard({ b, s, idx, current }) {
  const stg = core.STAGE_MAP[s.kind] || {};
  const start = s.startedAt ? new Date(s.startedAt) : null;
  const end = s.expectedEnd ? new Date(s.expectedEnd) : null;
  const days = start && end ? core.daysBetween(start, end) : s.dEst;
  const left = end && !s.done ? core.daysBetween(new Date(), end) : null;
  const ts = core.timeStatusForStage(s);
  const ws = current && (s.kind === 'Secado' || s.kind === 'Madurado') ? core.weightStatusForBatch(b) : null;

  const head = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-medium text-white" style={{ background: s.done || current ? stageVar(s.kind) : 'var(--muted-foreground)' }}>{idx + 1}</span>
      <div className="min-w-0">
        <div className="font-medium">{s.kind}</div>
        <div className="font-mono text-[11px] tabular text-muted-foreground">{fmtDate(start)} → {fmtDate(s.actualEnd || end)} · {days ? `${fmt(days, 1)} d` : '—'}</div>
      </div>
      <span className="ml-auto">
        {s.done ? <Badge variant="success"><CircleCheck /> Terminada</Badge>
          : current ? <Badge variant={LEVEL_VARIANT[ts.level] || 'gold'}>{left === null ? ts.label : left < 0 ? `${-left} d vencida` : `faltan ${left} d`}</Badge>
            : <Badge variant="secondary">Pendiente</Badge>}
      </span>
    </div>
  );

  const body = (
    <div className="grid gap-5">
      {ws && <div className="flex flex-wrap items-center gap-2 text-sm"><Badge variant={LEVEL_VARIANT[ws.level]}>Peso {fmtG(ws.current)} · objetivo {fmtG(ws.target)} ({ws.deltaPct >= 0 ? '+' : ''}{fmt(ws.deltaPct, 1)}%)</Badge><span className="text-xs text-muted-foreground">{ws.label}</span></div>}
      <StageRecipe b={b} s={s} />
      {s.kind === 'Curado' && s.brine && <BrinePanel b={b} s={s} />}
      {s.inoc && <InoculantPanel b={b} s={s} />}
      {s.kind === 'Ahumado' && s.smoke && <SmokePanel s={s} />}
      {s.env && (
        <div><SectionLabel>Ambiente objetivo</SectionLabel>
          <div className="flex flex-wrap items-center gap-2"><Badge variant="info" className="h-7 px-2.5"><Thermometer />{s.env.tMin}–{s.env.tMax} °C</Badge>{VACUUM.has(s.kind) ? <span className="text-xs text-muted-foreground">Empacado al vacío · no requiere HR específica</span> : <Badge variant="info" className="h-7 px-2.5"><Droplets />{s.env.hMin}–{s.env.hMax} % HR</Badge>}</div>
        </div>
      )}
      {stg.ph && s.ph && <PhPanel b={b} s={s} idx={idx} />}
      {stg.press && s.press && <Badge variant="gold">Prensado activado</Badge>}
      {current && (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button size="sm" onClick={() => ask(() => core.completeStage(b.id, idx))}><CircleCheck /> Marcar terminada</Button>
          <Button size="sm" variant="outline" onClick={() => openDialog('stage-dates', { batchId: b.id, idx })}><CalendarClock /> Ajustar fechas</Button>
        </div>
      )}
    </div>
  );

  if (current) {
    return (
      <li className="rounded-xl border border-gold/40 bg-card p-5 shadow-[0_4px_16px_-8px_rgba(45,41,38,.15)] ring-1 ring-gold/20">
        <div className="mb-5">{head}</div>{body}
      </li>
    );
  }
  return (
    <li>
      <Collapsible className={cn('rounded-xl border bg-card/70', s.done && 'bg-card/50')}>
        <CollapsibleTrigger className="group flex w-full items-center gap-2 p-4 text-left">
          <div className="flex-1">{head}</div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t p-5">{body}</CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function StageRecipe({ b, s }) {
  if (!((s.recipe && s.recipe.length) || (s.kind === 'Curado' && s.brine))) return null;
  const totalKg = b.pieces.reduce((sm, p) => sm + p.initialWeight, 0) / 1000;
  const db = core.getDB();
  const rows = [];
  if (s.kind === 'Curado' && s.brine) {
    const r = core.calcEqBrine(totalKg * 1000, s.brine.saltPct, s.brine.waterPct, s.brine.saltIngredient, s.brine);
    rows.push({ n: s.brine.saltIngredient || 'Sal común', a: `${fmt(r.commonG, 2)} g`, eb: true });
    if (r.cureG > 0 && r.cureIng) rows.push({ n: r.cureIng.name, a: `${fmt(r.cureG, 2)} g`, eb: true });
    if (r.waterG > 0) rows.push({ n: 'Agua destilada', a: `${fmt(r.waterG, 0)} ml`, eb: true });
  }
  (s.recipe || []).forEach((r) => {
    const ing = db.ingredients.find((i) => i.name === r.ingredient);
    rows.push({ n: r.ingredient, note: r.note, a: `${fmt(r.amount * totalKg, 2)} ${core.normalizeUnit(ing?.unit || 'g')}` });
  });
  return (
    <div>
      <SectionLabel>Receta escalada · {fmtG(totalKg * 1000)}</SectionLabel>
      <ul className="divide-y rounded-lg border text-sm">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span>{r.n}{r.note && <span className="ml-1 text-xs text-muted-foreground">({r.note})</span>}{r.eb && <Badge variant="gold" className="ml-2 px-1 py-0 text-[9px]">EQ Brine</Badge>}</span>
            <span className="font-mono tabular">{r.a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Port of renderBrineForStage + renderCureSafetyAlert + renderResidualPanel + renderDecayChart */
function BrinePanel({ b, s }) {
  const meatG = b.pieces.reduce((sm, p) => sm + p.initialWeight, 0);
  const br = s.brine;
  const r = core.calcEqBrine(meatG, br.saltPct, br.waterPct, br.saltIngredient, br);
  const hasCure = r.cureG > 0 && r.cureIng;
  const totalDays = core.totalCureProcessDaysBatch(b);
  const res = hasCure ? core.calcCureResidual({ cureIng: r.cureIng, nitritePpm: r.nitritePpm, nitratePpm: r.nitratePpm }, totalDays, core.DEFAULT_CAVA_TEMP, core.DEFAULT_CAVA_PH) : null;
  return (
    <div className="grid gap-3">
      <SectionLabel className="mb-0">Equilibrium Brine · sobre {fmtG(meatG)}</SectionLabel>
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 sm:grid-cols-5">
        <Metric label={`Sal común (${r.salt.name})`} value={`${fmt(r.commonG, 1)} g`} note={`${fmt(r.commonTsp, 1)} tsp`} />
        {hasCure && <Metric label={`Sal de cura (${r.cureIng.name})`} value={`${fmt(r.cureG, 2)} g`} note={`${fmt(r.cureTsp, 2)} tsp`} valueClassName="text-gold-ink" />}
        <Metric label="Agua" value={`${fmt(r.waterG, 0)} g`} />
        <Metric label="Mezcla total" value={`${fmt(r.totalG, 0)} g`} />
        <Metric label="Sal final" value={`${fmt(r.finalPct, 2)} %`} valueClassName="text-gold-ink" />
      </div>
      {hasCure && (
        <div className="flex flex-wrap gap-2">
          <Badge variant={LEVEL_VARIANT[r.cureLevel]}>Nitrito {fmt(r.nitritePpm, 0)} ppm <span className="opacity-70">/ máx {core.NITRITE_MAX_PPM}</span></Badge>
          {r.nitratePpm > 0 && <Badge variant={r.nitratePpm > core.NITRATE_MAX_PPM ? 'danger' : r.nitratePpm > 1500 ? 'warning' : 'success'}>Nitrato {fmt(r.nitratePpm, 0)} ppm <span className="opacity-70">/ máx {core.NITRATE_MAX_PPM}</span></Badge>}
          <Badge variant="info">Dosis {br.cureSalt.gPerKg} g/kg <span className="opacity-70">/ máx {r.cureIng.maxGPerKg || 4}</span></Badge>
        </div>
      )}
      {r.cureLevel === 'red' && <Alert variant="danger"><Skull /><AlertDescription><b>Peligro sanitario:</b> {[r.nitritePpm > core.NITRITE_MAX_PPM && `nitrito ${fmt(r.nitritePpm, 0)} ppm supera el límite USDA (${core.NITRITE_MAX_PPM})`, r.nitratePpm > core.NITRATE_MAX_PPM && `nitrato ${fmt(r.nitratePpm, 0)} ppm supera el límite USDA (${core.NITRATE_MAX_PPM})`, r.cureG > r.maxCureG && 'la dosis supera el máximo del fabricante'].filter(Boolean).join(' · ')}. Reducí la sal de cura antes de aplicar.</AlertDescription></Alert>}
      {r.cureLevel === 'yellow' && <Alert variant="warning"><TriangleAlert /><AlertDescription>Nitrito elevado ({fmt(r.nitritePpm, 0)} ppm): legal pero por encima del objetivo típico (≤{core.NITRITE_TARGET_PPM} ppm).</AlertDescription></Alert>}
      {r.cureLevel === 'green' && <Alert variant="success"><CircleCheck /><AlertDescription>Nitrito seguro: {fmt(r.nitritePpm, 0)} ppm (objetivo ≤{core.NITRITE_TARGET_PPM}, máx {core.NITRITE_MAX_PPM}).</AlertDescription></Alert>}
      {res && <Residual res={res} totalDays={totalDays} nit={r.nitritePpm} nat={r.nitratePpm} />}
      <p className="text-xs text-muted-foreground">Sal total = (carne + agua) × %/100; la sal común compensa el NaCl que aporta la sal de cura. Mezclar, empacar al vacío, refrigerar a 1–4 °C y voltear cada 12 h.</p>
    </div>
  );
}

function Residual({ res, totalDays, nit, nat }) {
  const nitOk = res.residualNitrite <= 50, natOk = res.residualNitrate <= 200;
  const level = nitOk && natOk ? 'success' : res.residualNitrite <= 100 ? 'warning' : 'danger';
  const w = 560, h = 130, pad = { l: 40, r: 12, t: 12, b: 22 };
  const xMax = Math.max(totalDays, 30), yMax = Math.max(nit || 0, nat || 0, 50) * 1.05;
  const x = (d) => pad.l + (w - pad.l - pad.r) * (d / xMax);
  const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / yMax);
  const pts = Array.from({ length: 61 }, (_, i) => {
    const d = (xMax * i) / 60;
    return { d, nit: core.calcResidualNitrite(nit || 0, d, res.tempC, res.ph) + core.nitriteFromNitrateReduction(nat || 0, d, res.tempC, res.ph), nat: core.calcResidualNitrate(nat || 0, d, res.tempC, res.ph) };
  });
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Degradación durante el proceso</span>
        <span className="text-[11px] text-muted-foreground">Modelo Nordin @ {res.tempC} °C, pH {res.ph} · {totalDays} días</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Nitrito inicial" value={`${fmt(nit, 0)} ppm`} valueClassName="text-muted-foreground" />
        <Metric label="Nitrito residual" value={`${fmt(res.residualNitrite, 1)} ppm`} note={`−${fmt(res.reductionNitrite, 0)}% · t½ ${fmt(res.halfLifeNitrite, 0)} d`} valueClassName={`text-${level}`} />
        {nat > 0 && <Metric label="Nitrato inicial" value={`${fmt(nat, 0)} ppm`} valueClassName="text-muted-foreground" />}
        {nat > 0 && <Metric label="Nitrato residual" value={`${fmt(res.residualNitrate, 1)} ppm`} note={`−${fmt(res.reductionNitrate, 0)}% · t½ ${fmt(res.halfLifeNitrate, 0)} d`} valueClassName={natOk ? 'text-success' : 'text-warning'} />}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-auto w-full" role="img" aria-label="Curva de nitrito residual">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={pad.l} x2={w - pad.r} y1={y(yMax * f)} y2={y(yMax * f)} stroke="var(--border)" strokeWidth="0.6" /><text x={pad.l - 4} y={y(yMax * f) + 3} textAnchor="end" fontSize="8.5" fill="var(--muted-foreground)" fontFamily="JetBrains Mono">{(yMax * f).toFixed(0)}</text></g>)}
        <line x1={x(totalDays)} x2={x(totalDays)} y1={pad.t} y2={h - pad.b} stroke="var(--gold)" strokeDasharray="3 2" />
        <text x={x(totalDays)} y={h - 6} textAnchor="middle" fontSize="9" fill="var(--gold-ink)" fontFamily="JetBrains Mono">{totalDays} d</text>
        <path d={'M ' + pts.map((p) => `${x(p.d).toFixed(1)},${y(p.nit).toFixed(1)}`).join(' L ')} fill="none" stroke="var(--s-ado)" strokeWidth="1.8" />
        {nat > 0 && <path d={'M ' + pts.map((p) => `${x(p.d).toFixed(1)},${y(p.nat).toFixed(1)}`).join(' L ')} fill="none" stroke="var(--success)" strokeWidth="1.6" strokeDasharray="4 2" />}
        <text x={w - pad.r - 4} y={pad.t + 10} textAnchor="end" fontSize="9" fill="var(--s-ado)" fontFamily="JetBrains Mono">NO₂⁻</text>
        {nat > 0 && <text x={w - pad.r - 4} y={pad.t + 21} textAnchor="end" fontSize="9" fill="var(--success)" fontFamily="JetBrains Mono">NO₃⁻</text>}
      </svg>
    </div>
  );
}

function InoculantPanel({ b, s }) {
  const totalKg = b.pieces.reduce((sm, p) => sm + p.initialWeight, 0) / 1000;
  const ing = core.getDB().ingredients.find((x) => x.name === s.inoc.i);
  const sc = ing ? core.scaleInoculant(ing, totalKg) : null;
  return (
    <div>
      <SectionLabel>Inoculación</SectionLabel>
      <div className="rounded-lg border border-success/30 bg-success-soft/30 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="flex items-center gap-1.5 font-medium text-success"><Sparkles className="size-4" />{s.inoc.i}</span><span className="text-xs text-muted-foreground">{fmt(totalKg, 2)} kg ({fmt(totalKg / core.LB_TO_KG, 2)} lb)</span></div>
        {sc ? (
          <>
            <p className="mt-2 text-sm">Rehidratá <b>{core.fmtFrac(sc.starterTsp)} cucharadita{sc.starterTsp >= 1.5 ? 's' : ''}</b> de starter en <b>{fmt(sc.waterMl, 0)} ml</b> de agua destilada durante <b>{sc.rehydMin} min</b>.</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Metric label="Cultivo" value={`${core.fmtFrac(sc.starterTsp)} tsp`} note={`${fmt(sc.starterMl, 1)} ml`} />
              <Metric label="Agua no clorada" value={`${fmt(sc.waterMl, 0)} ml`} note={`${core.fmtFrac(sc.waterCups)} cup`} />
              <Metric label="Rehidratar" value={`${sc.rehydMin} min`} note="temp. ambiente" />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Base: {core.fmtFrac(sc.tspPer5lb)} tsp + {fmt(sc.mlPer5lb, 0)} ml por cada 2,27 kg (5 lb).</p>
          </>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 gap-3"><Metric label="Cultivo" value={`${fmt(s.inoc.a * totalKg, 3)} g`} /><Metric label="Agua" value={`${fmt(s.inoc.water * totalKg, 1)} ml`} /><Metric label="Activación" value={`${s.inoc.act || 30} min`} /></div>
            <p className="mt-2 text-[11px] text-warning">Este cultivo no tiene datos de rehidratación: completalos en Ingredientes.</p>
          </>
        )}
      </div>
    </div>
  );
}

function SmokePanel({ s }) {
  const cat = core.smokeCategoryFor(s.smoke.tempC || 0);
  const range = core.SMOKE_RANGES[cat];
  return (
    <div>
      <SectionLabel>Ahumado</SectionLabel>
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 sm:grid-cols-[auto_auto_1fr]">
        <Metric label="Tiempo" value={`${s.smoke.hours || 0} h`} />
        <Metric label="Temperatura" value={`${s.smoke.tempC || 0} °C`} note={range.label} />
        <div className="col-span-2 sm:col-span-1"><div className="text-[11px] font-medium text-muted-foreground">Maderas</div>
          <div className="mt-1 flex flex-wrap gap-1">{(s.smoke.woods || []).length ? s.smoke.woods.map((nm) => { const wd = core.SMOKE_WOODS.find((x) => x.es === nm || x.en === nm); return <Badge key={nm} variant="outline" title={wd?.note}>{wd?.es || nm}</Badge>; }) : <span className="text-xs text-muted-foreground">Sin definir</span>}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{range.note}</p>
    </div>
  );
}

function PhPanel({ b, s, idx }) {
  const log = (b.phLogs || []).find((p) => p.stageIdx === idx);
  const has = (v) => v !== undefined && v !== null && v !== '';
  const lS = core.phLevel(log?.phStart, s.ph), lE = core.phLevel(log?.phEnd, s.ph);
  const hazard = lS === 'alert' || lE === 'alert';
  const val = (v, l) => has(v) ? <Badge variant={LEVEL_VARIANT[l]} className="h-7 px-2.5 font-mono text-sm">{l === 'alert' && <Skull />}{v}</Badge> : <span className="font-mono text-muted-foreground">—</span>;
  return (
    <div>
      <SectionLabel action={<Button size="sm" variant="outline" className="h-7" onClick={() => openDialog('ph', { batchId: b.id, idx })}><FlaskConical /> Registrar pH</Button>}>Control de pH</SectionLabel>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="grid gap-1"><span className="text-[11px] text-muted-foreground">pH inicial</span>{val(log?.phStart, lS)}</div>
        <div className="grid gap-1"><span className="text-[11px] text-muted-foreground">pH final</span>{val(log?.phEnd, lE)}</div>
        <div className="ml-auto text-xs text-muted-foreground">esperado {s.ph.start} → {s.ph.end} · peligro &lt;{s.ph.dangerLow} o &gt;{s.ph.dangerHigh}</div>
      </div>
      {hazard && <Alert variant="danger" className="mt-3"><Skull /><AlertDescription><b>Peligro sanitario:</b> pH fuera del rango seguro ({s.ph.dangerLow}–{s.ph.dangerHigh}). Evaluá descarte o corrección inmediata.</AlertDescription></Alert>}
    </div>
  );
}
