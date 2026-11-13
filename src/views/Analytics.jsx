import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChartLine, History, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useDB, core } from '@/lib/store';
import { navigate, useRoute } from '@/lib/router';
import { fmtDate, fmtDateShort, stageVar } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StageDot } from '@/components/stage-dot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tx, txt } from '@/lib/i18n';

/* Every section below ports a v4.4.3 render* function: same data, same thresholds, new presentation. */

const tone = (c) => ({ sage: 'text-success', amber: 'text-warning', rust: 'text-danger', muted: 'text-muted-foreground', brand: 'text-gold-ink' }[c] || '');

function Section({ title, description, action, children, empty }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="grid gap-5">{empty ? <p className="text-sm text-muted-foreground">{empty}</p> : children}</CardContent>
    </Card>
  );
}
const Foot = ({ children }) => <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
const SubHead = ({ children, note, action }) => <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><b>{children}</b>{note && <span className="text-xs text-muted-foreground">· {note}</span>}{action && <span className="ml-auto">{action}</span>}</div>;
const R = (props) => <TableHead {...props} className={cn('text-right', props.className)} />;
const RC = ({ className, ...p }) => <TableCell {...p} className={cn('text-right font-mono tabular', className)} />;
function T({ head, children }) {
  return <div className="overflow-hidden rounded-lg border"><Table><TableHeader><TableRow className="hover:bg-transparent">{head}</TableRow></TableHeader><TableBody>{children}</TableBody></Table></div>;
}

export function Analytics() {
  const db = useDB();
  const { path } = useRoute();
  const parts = path.split('/').filter(Boolean);
  if (parts[1] === 'comparar') return <Compare ids={(parts[2] || '').split(',').filter(Boolean)} />;

  const typesWithData = db.types.map((t) => ({ type: t, stats: core.historicalYieldStats(t.id), batches: db.batches.filter((b) => b.typeId === t.id && b.status === 'done') }))
    .map((x) => ({ ...x, n: x.batches.length })).filter((x) => x.n > 0);
  const anyTasting = db.batches.some((b) => core.tastingList(b).length);
  const head = (
    <PageHeader eyebrow={tx("Análisis multi-lote")} title={tx("Analytics")} description={tx("Rendimiento, catas, defectos y tendencias de tus lotes.")}
      actions={<Button variant="outline" onClick={() => navigate('/biblioteca')}><History />{' '}{tx("Importar históricos")}</Button>} />
  );
  if (!typesWithData.length) {
    return (
      <>
        {head}
        {anyTasting && <div className="mb-6 grid gap-6"><TastingInsights /></div>}
        <EmptyState icon={ChartLine} title={tx("Aún no hay lotes terminados")} action={<Button variant="outline" onClick={() => navigate('/biblioteca')}>{tx("Importar lotes históricos")}</Button>}>{tx("La estadística multi-lote necesita al menos 3 o 4 lotes terminados del mismo tipo. Si tenés lotes anteriores, importalos desde Biblioteca.")}</EmptyState>
      </>
    );
  }
  return (
    <>
      {head}
      <div className="grid gap-6">
        <YieldRealVsExpected rows={typesWithData} />
        <AwCalibration />
        <TastingInsights />
        <Correlations rows={typesWithData} />
        <StageLoss rows={typesWithData} />
        <Seasonal />
        <ComparePicker rows={typesWithData} />
      </div>
    </>
  );
}

function YieldRealVsExpected({ rows }) {
  return (
    <Section title={tx("Rendimiento real vs esperado")} description={tx("Promedio y desviación del rendimiento real de los lotes terminados, por tipo.")}>
      <T head={<><TableHead>{tx("Tipo")}</TableHead><R>{tx("Lotes")}</R><R>{tx("Objetivo")}</R><R>{tx("Real")}</R><R>σ</R><R>{tx("Rango")}</R><TableHead>{tx("Diagnóstico")}</TableHead></>}>
        {rows.filter((r) => r.stats.n).map(({ type, stats }) => {
          const target = type.yield?.target || null; const d = target !== null ? stats.mean - target : null;
          const [diag, c] = d === null ? ['—', 'muted'] : Math.abs(d) < 1 ? [tx('Cuadra con la receta'), 'sage'] : d < 0 ? [txt`Pierde ${Math.abs(d).toFixed(1)} % más · considerá ajustar a ${stats.mean.toFixed(0)} %`, 'amber'] : [txt`Pierde ${d.toFixed(1)} % menos · considerá ajustar a ${stats.mean.toFixed(0)} %`, 'sage'];
          return (
            <TableRow key={type.id}>
              <TableCell className="font-medium">{type.name}</TableCell><RC>{stats.n}</RC><RC>{target ? `${target}%` : '—'}</RC>
              <RC className="font-medium text-gold-ink">{stats.mean.toFixed(1)}%</RC><RC className="text-xs">±{stats.std.toFixed(1)}</RC><RC className="text-xs">{stats.min.toFixed(0)}–{stats.max.toFixed(0)}%</RC>
              <TableCell className={cn('whitespace-normal text-xs', tone(c))}>{diag}</TableCell>
            </TableRow>
          );
        })}
      </T>
      <Foot>{tx("Sirve para calibrar las expectativas de cada receta al microclima real de tu cava.")}</Foot>
    </Section>
  );
}

function AwCalibration() {
  const db = core.getDB();
  const rows = db.types.map((t) => {
    const reads = [];
    db.batches.filter((b) => b.typeId === t.id).forEach((b) => (b.pieces || []).forEach((p) => core.awReadings(p).forEach((r) => reads.push({ b, p, r, m: r.weightG > 0 ? core.pieceAwModel(b, p, r.weightG, t) : null }))));
    return { t, reads, cal: core.typeAwCalibration(t.id) };
  }).filter((x) => x.reads.length);
  if (!rows.length) return null;
  return (
    <Section title={tx("Calibración del modelo de aw")} description={tx("aw medido contra el estimado por balance de masa.")}>
      {rows.map(({ t, reads, cal }) => (
        <div key={t.id} className="grid gap-2">
          <SubHead note={txt`${cal.n} lectura${cal.n === 1 ? '' : 's'} · sesgo ${cal.bias >= 0 ? '+' : ''}${cal.bias.toFixed(3)}`} action={cal.applied ? <Badge variant="success">{tx("aplicado a las estimaciones")}</Badge> : <Badge variant="secondary">{tx("se aplica desde {0} lecturas", [core.AW_CAL_MIN])}</Badge>}>{t.name}</SubHead>
          <T head={<><TableHead>{tx("Pieza")}</TableHead><TableHead>{tx("Fecha")}</TableHead><R>{tx("Modelo")}</R><R>{tx("Medido")}</R><R>Δ</R></>}>
            {reads.map((x, i) => { const d = x.m != null ? x.r.aw - x.m : null; return (
              <TableRow key={i}><TableCell className="font-mono text-xs">{x.p.code}</TableCell><TableCell className="text-xs">{fmtDateShort(x.r.date)}</TableCell><RC>{x.m != null ? x.m.toFixed(3) : '—'}</RC><RC>{x.r.aw.toFixed(3)}</RC>
                <RC className={d == null ? '' : Math.abs(d) < 0.01 ? 'text-success' : Math.abs(d) < 0.03 ? 'text-warning' : 'text-danger'}>{d != null ? (d > 0 ? '+' : '') + d.toFixed(3) : '—'}</RC></TableRow>
            ); })}
          </T>
        </div>
      ))}
      <Foot>{tx("Δ negativo: la pieza estaba más seca de lo que decía el modelo (el modelo fue conservador).")}</Foot>
    </Section>
  );
}

function TastingInsights() {
  const db = core.getDB();
  const types = db.types.filter((t) => core.tastedBatches(t.id).length > 0);
  if (!types.length) return <Section title={tx("Catas: calidad, defectos y punto óptimo")} empty={tx("Aún no hay catas registradas. Con catas (idealmente varias por lote: 30, 60 y 90 días) aparecen aquí la calidad por tipo, los defectos, la receta ganadora y el punto óptimo.")} />;
  return <><QualityTable types={types} /><OptimalWindows types={types} /><DefectInsights /><FlavorBalance types={types} /><WinningRecipes types={types} /><ModelCalibration types={types} /></>;
}

function QualityTable({ types }) {
  const rows = types.map((t) => {
    const q = core.typeQuality(t.id); const ys = core.historicalYieldStats(t.id);
    const yieldMean = ys.n ? ys.mean : t.yield?.target ?? null;
    const days = core._avg(core.tastedBatches(t.id).map((b) => core._safeFeatures(b)?.daysTotal)) ?? core.typeTotalDaysSafe(t);
    const rev = t.priceKg != null && yieldMean != null ? (t.priceKg * yieldMean) / 100 : null;
    const margin = rev != null && t.costKg != null ? rev - t.costKg : null;
    return { t, q, yieldMean, margin, perDay: margin != null && days ? margin / days : null };
  });
  return (
    <Section title={tx("Calidad y rentabilidad por tipo")}>
      <T head={<><TableHead>{tx("Tipo")}</TableHead><R>{tx("Lotes catados")}</R><R>{tx("Catas")}</R><R>{tx("Nota prom.")}</R><R>{tx("Meta")}</R><R>{tx("Con defecto")}</R><TableHead>{tx("Defecto frecuente")}</TableHead><R>{tx("Rend.")}</R><R>{tx("Margen/kg")}</R><R>{tx("Margen/día")}</R></>}>
        {rows.map(({ t, q, yieldMean, margin, perDay }) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.name}</TableCell><RC>{q.nBatches}</RC><RC>{q.nTastings}</RC>
            <RC className="font-medium text-gold-ink">{q.avg != null ? q.avg.toFixed(1) : '—'}</RC>
            <RC className={!t.tasteTarget || q.avg == null ? '' : q.avg >= t.tasteTarget ? 'text-success' : 'text-danger'}>{t.tasteTarget ?? '—'}</RC>
            <RC className={q.defRate > 0.3 ? 'text-danger' : q.defRate > 0 ? 'text-warning' : 'text-success'}>{q.defRate != null ? `${Math.round(q.defRate * 100)}%` : '—'}</RC>
            <TableCell className="text-xs">{q.topDefect ? `${tx(q.topDefect.name).split(' (')[0]} ×${q.topDefect.n}` : '—'}</TableCell>
            <RC className="text-xs">{yieldMean != null ? `${yieldMean.toFixed(0)}%` : '—'}</RC><RC className="text-xs">{core._cop(margin)}</RC><RC className="text-xs">{core._cop(perDay)}</RC>
          </TableRow>
        ))}
      </T>
      <Foot>{tx("Nota prom. = cata más reciente de cada lote. Margen = precio × rendimiento − costo de materia prima (cargalos en el editor del tipo, «Calidad y negocio»). El margen por día premia los productos rápidos.")}</Foot>
    </Section>
  );
}

function OptimalWindows({ types }) {
  const blocks = types.map((t) => ({ t, w: core.optimalWindow(t.id) })).filter((x) => x.w);
  return (
    <Section title={tx("Punto óptimo de consumo")} empty={!blocks.length && tx('Se necesitan al menos 3 catas con nota global por tipo, idealmente en distintos momentos del curado.')}>
      {blocks.map(({ t, w }) => {
        const max = Math.max(...w.rows.map((r) => r.avg), 10);
        return (
          <div key={t.id} className="grid gap-1.5">
            <SubHead note={txt`${w.total} catas${w.weak ? tx(' · aún un solo tramo: registrá catas en otros momentos') : ''}`}>{t.name}</SubHead>
            {w.rows.map((r, i) => {
              const best = !w.weak && r === w.best;
              return (
                <div key={i} className="grid grid-cols-[6rem_1fr_7rem] items-center gap-3 text-sm">
                  <span className="font-mono text-xs">{tx("días {0}–{1}", [r.from, r.to])}</span>
                  <div className="h-2 rounded-full bg-muted"><div className={cn('h-full rounded-full', best ? 'bg-success' : 'bg-gold/70')} style={{ width: `${(r.avg / max) * 100}%` }} /></div>
                  <span className="text-right font-mono text-xs tabular">{r.avg.toFixed(1)} · n={r.n}{best && <Star className="ml-1 inline size-3 fill-current text-success" />}</span>
                </div>
              );
            })}
          </div>
        );
      })}
      {blocks.length > 0 && <Foot>{tx("Nota global promedio por tramo de 30 días desde el inicio del lote. La estrella marca el tramo con mejor nota: tu referencia de «listo para vender».")}</Foot>}
    </Section>
  );
}

function DefectInsights() {
  const db = core.getDB();
  const all = db.batches.filter((b) => b.status !== 'discarded' && core.tastingList(b).length > 0);
  const feats = new Map(all.map((b) => [b.id, core._safeFeatures(b)]));
  const stats = {};
  all.forEach((b) => {
    const per = {};
    core.tastingList(b).forEach((t) => core.tastingDefects(t).forEach((d) => { per[d.name] = Math.max(per[d.name] || 0, d.sev); }));
    Object.entries(per).forEach(([name, sev]) => { (stats[name] ??= { name, batches: [], sevs: [], types: new Set() }); stats[name].batches.push(b.id); stats[name].sevs.push(sev); stats[name].types.add(b.typeName || ''); });
  });
  const list = Object.values(stats).sort((a, b) => b.batches.length - a.batches.length);
  if (!list.length) return <Section title={tx("Defectos y sus causas probables")}><p className="text-sm text-success">{tx("Ninguna cata tiene defectos marcados. Si notás alguno, marcalo en la ficha de cata para cruzarlo con T/HR, sal y días.")}</p></Section>;
  return (
    <Section title={tx("Defectos y sus causas probables")} description={txt`${all.length} lotes catados`}>
      {list.map((d) => {
        const cat = core.DEFECT_CATALOG.find((x) => x.name === d.name);
        const withIds = new Set(d.batches);
        const fWith = all.filter((b) => withIds.has(b.id)).map((b) => feats.get(b.id)).filter(Boolean);
        const fWithout = all.filter((b) => !withIds.has(b.id) && core.tastingList(b).some((t) => core.defectsEvaluatedIn(t, d.name))).map((b) => feats.get(b.id)).filter(Boolean);
        const diffs = d.batches.length >= 2 && fWithout.length >= 2 ? core.INS_PARAMS.map((p) => {
          const a = core._avg(fWith.map((f) => f[p.k])), c = core._avg(fWithout.map((f) => f[p.k]));
          if (a == null || c == null || c === 0) return null;
          const rel = (a - c) / Math.abs(c);
          return Math.abs(rel) >= 0.1 ? { p, a, c, rel } : null;
        }).filter(Boolean).sort((x, y) => Math.abs(y.rel) - Math.abs(x.rel)).slice(0, 3) : [];
        const sevAvg = d.sevs.reduce((s, v) => s + v, 0) / d.sevs.length;
        return (
          <div key={d.name} className="grid gap-1.5 border-t pt-4 first:border-0 first:pt-0">
            <SubHead note={txt`${d.batches.length} lote${d.batches.length === 1 ? '' : 's'} · severidad prom. ${sevAvg.toFixed(1)}/3 · ${[...d.types].filter(Boolean).join(', ')}`}>{tx(d.name)}</SubHead>
            {diffs.length > 0 ? <p className="text-sm"><b>{tx("Lo que cambia en esos lotes:")}</b> {diffs.map((x, i) => <span key={x.p.k}>{tx("{0}{1} {2} vs {3} sin el defecto (", [i > 0 && ' · ', x.p.label, x.a.toFixed(x.p.d), x.c.toFixed(x.p.d)])}<span className={x.rel > 0 ? 'text-danger' : 'text-info'}>{x.rel > 0 ? '+' : ''}{Math.round(x.rel * 100)}%</span>)</span>)}</p>
              : d.batches.length >= 2 && <p className="text-xs text-muted-foreground">{tx("Sin diferencias claras (≥10 %) en los parámetros registrados.")}</p>}
            {cat && <p className="text-xs text-muted-foreground"><b className="text-success">{tx("Prevención:")}</b> {cat.prevent}</p>}
          </div>
        );
      })}
      <Foot>{tx("Compara lotes con y sin el defecto, de cualquier tipo. Con pocos lotes es una pista, no una prueba.")}</Foot>
    </Section>
  );
}

function FlavorBalance({ types }) {
  const perfil = (v) => (v <= 1.5 ? 'ausente' : v <= 2.5 ? 'suave' : v < 3.5 ? 'equilibrado' : v < 4.5 ? 'marcado' : tx('muy marcado'));
  return (
    <Section title={tx("Equilibrio de sabor: ¿qué ajustar?")}>
      {types.map((t) => {
        const last = core.tastedBatches(t.id).map((b) => core.tastingList(b).slice(-1)[0]).filter(Boolean);
        const rows = core.FLAVOR_AXES.map((f) => {
          const items = last.map((x) => ({ v: core.flavorVal(x, f.k), q: core.flavorVal(x, f.k + 'Q') })).filter((i) => i.v != null);
          if (!items.length) return null;
          const vAvg = items.reduce((a, i) => a + i.v, 0) / items.length;
          const withQ = items.filter((i) => i.q != null);
          const qAvg = withQ.length ? withQ.reduce((a, i) => a + i.q, 0) / withQ.length : null;
          const c = { ok: 0, mejorable: 0, problema: 0, sinq: 0 };
          items.forEach((i) => { c[core.flavorVerdict(i.v, i.q).state]++; });
          let msg, col;
          if (qAvg == null) { const d = core.flavorDiag(Math.round(vAvg)); msg = d === 'ok' ? tx('intensidad equilibrada · registrá la calidad para un veredicto') : txt`intensidad ${d === 'mucho' ? 'alta' : 'baja'} · registrá la calidad para saber si es un problema o tu gusto`; col = 'muted'; }
          else if (qAvg >= 4) { msg = 'logrado' + (Math.abs(vAvg - 3) >= 1 ? txt` (${perfil(vAvg)} y se siente rico: es tu perfil)` : ''); col = 'sage'; }
          else {
            const bad = withQ.filter((i) => i.q <= 3); const M = bad.filter((i) => i.v > 3).length, P = bad.filter((i) => i.v < 3).length, K = bad.filter((i) => i.v === 3).length;
            msg = M > P && M >= K ? txt`${perfil(vAvg)} y calidad ${qAvg.toFixed(1)} → bajar ${f.adj[0]}` : P > M && P >= K ? txt`${perfil(vAvg)} y calidad ${qAvg.toFixed(1)} → subir ${f.adj[0]}` : txt`intensidad correcta pero calidad ${qAvg.toFixed(1)} → no es cuestión de cantidad: revisá ingrediente o proceso`;
            col = qAvg < 3 ? 'rust' : 'amber';
          }
          return { f, n: items.length, vAvg, qAvg, c, msg, col };
        }).filter(Boolean);
        if (!rows.length) return <SubHead key={t.id} note={tx("aún sin sabores registrados con la escala 1–5")}>{t.name}</SubHead>;
        return (
          <div key={t.id} className="grid gap-2">
            <SubHead>{t.name}</SubHead>
            <T head={<><TableHead>{tx("Sabor")}</TableHead><R>{tx("Intensidad")}</R><R>{tx("Calidad")}</R><R>{tx("Logrado / mejorable / problema")}</R><TableHead>{tx("Lectura")}</TableHead></>}>
              {rows.map((r) => (
                <TableRow key={r.f.k}>
                  <TableCell>{r.f.label}</TableCell><RC className="text-xs">{r.vAvg.toFixed(1)} · {perfil(r.vAvg)}</RC>
                  <RC className={r.qAvg == null ? 'text-muted-foreground' : r.qAvg >= 4 ? 'text-success' : r.qAvg >= 3 ? 'text-warning' : 'text-danger'}>{r.qAvg != null ? r.qAvg.toFixed(1) : '—'}</RC>
                  <RC className="text-xs">{r.c.ok} / {r.c.mejorable} / {r.c.problema}{r.c.sinq ? ` (+${r.c.sinq})` : ''}</RC>
                  <TableCell className={cn('whitespace-normal text-xs', tone(r.col))}>{r.msg} <span className="text-muted-foreground">(n={r.n})</span></TableCell>
                </TableRow>
              ))}
            </T>
          </div>
        );
      })}
      <Foot>{tx("La calidad manda: con calidad 4–5 el sabor está logrado aunque sea muy intenso o muy suave. Con 3 o menos, la intensidad indica hacia dónde corregir.")}</Foot>
    </Section>
  );
}

function WinningRecipes({ types }) {
  const blocks = types.map((t) => {
    const bs = core.tastedBatches(t.id).filter((b) => core.batchScore(b) != null);
    if (!bs.length) return null;
    const sevSum = (b) => { const l = core.tastingList(b).slice(-1)[0]; return l ? core.tastingDefects(l).reduce((s, d) => s + d.sev, 0) : 0; };
    bs.sort((a, b) => core.batchScore(b) - core.batchScore(a) || sevSum(a) - sevSum(b));
    const best = bs[0]; const fb = core._safeFeatures(best) || {}; const fo = bs.slice(1).map(core._safeFeatures).filter(Boolean);
    return { t, best, fb, fo };
  }).filter(Boolean);
  return (
    <Section title={tx("Receta ganadora: ¿cómo repetir el mejor lote?")}>
      {blocks.map(({ t, best, fb, fo }) => (
        <div key={t.id} className="grid gap-2">
          <SubHead action={<Button size="sm" variant="ghost" className="h-7 text-gold-ink" onClick={() => navigate(`/lotes/${best.id}`)}>{tx("Mejor lote {0} · nota {1}", [best.ref, core.batchScore(best)])} <ArrowRight /></Button>}>{t.name}</SubHead>
          <T head={<><TableHead>{tx("Parámetro")}</TableHead><R>{tx("Mejor lote")}</R>{fo.length > 0 && <><R>{tx("Prom. otros")}</R><R>Δ</R></>}</>}>
            {core.INS_PARAMS.map((p) => {
              const v = fb[p.k]; if (v == null) return null;
              const o = fo.length ? core._avg(fo.map((f) => f[p.k])) : null; const d = o != null ? v - o : null;
              return <TableRow key={p.k}><TableCell>{p.label}</TableCell><RC>{v.toFixed(p.d)}</RC>{fo.length > 0 && <><RC className="text-xs">{o != null ? o.toFixed(p.d) : '—'}</RC><RC className="text-xs">{d != null ? (d > 0 ? '+' : '') + d.toFixed(p.d) : '—'}</RC></>}</TableRow>;
            })}
          </T>
          {!fo.length && <p className="text-xs text-muted-foreground">{tx("Un solo lote catado: es tu referencia. Con más lotes vas a ver qué tuvo distinto.")}</p>}
        </div>
      ))}
      <Foot>{tx("Ordena por nota global (desempate: menos defectos). Los Δ más grandes son las variables a replicar o investigar.")}</Foot>
    </Section>
  );
}

function ModelCalibration({ types }) {
  const labels = { salado: tx('Salado'), umami: tx('Umami'), dulce: tx('Dulce'), acido: tx('Ácido'), firmeza: tx('Firmeza') };
  return (
    <Section title={tx("Calibración del modelo de perfil")}>
      {types.map((t) => {
        const mb = core.modelBias(t.id);
        if (!mb || !mb.bias) return <SubHead key={t.id} note={txt`${mb ? mb.n : 0} lote(s) catado(s) con perfil; se necesitan 2 o más para calibrar`}>{t.name}</SubHead>;
        const cal = t.tasteBias;
        return (
          <div key={t.id} className="grid gap-2">
            <SubHead note={txt`n=${mb.n} lotes`} action={<span className="flex gap-1.5">{cal && <><Badge variant="success">{tx("calibrado")}</Badge><Button size="sm" variant="ghost" className="h-7" onClick={() => core.clearModelBias(t.id)}>{tx("Quitar")}</Button></>}
              <Button size="sm" variant={cal ? 'outline' : 'default'} className="h-7" onClick={() => core.applyModelBias(t.id)}>{cal ? tx('Recalibrar') : tx('Aplicar corrección')}</Button></span>}>{t.name}</SubHead>
            <T head={<><TableHead>{tx("Eje")}</TableHead><R>{tx("Sesgo (catado − predicho)")}</R><TableHead>{tx("Lectura")}</TableHead>{cal && <R>{tx("Corrección activa")}</R>}</>}>
              {Object.entries(mb.bias).map(([k, v]) => (
                <TableRow key={k}><TableCell>{labels[k]}</TableCell>
                  <RC className={Math.abs(v) < 1.5 ? 'text-success' : Math.abs(v) < 3 ? 'text-warning' : 'text-danger'}>{v > 0 ? '+' : ''}{v.toFixed(1)}</RC>
                  <TableCell className="whitespace-normal text-xs">{Math.abs(v) < 1 ? tx('modelo acertado') : v > 0 ? txt`el modelo predice menos ${labels[k].toLowerCase()} del que catás como ideal` : txt`el modelo predice más ${labels[k].toLowerCase()} del que catás como ideal`}</TableCell>
                  {cal && <RC className="text-xs">{cal[k] != null ? (cal[k] > 0 ? '+' : '') + cal[k] : '—'}</RC>}</TableRow>
              ))}
            </T>
          </div>
        );
      })}
      <Foot>{tx("Compara la predicción (0–10) con tus catas de sabor (escala 1–5 llevada a 0–10). «Aplicar corrección» ajusta la predicción de ese tipo con tu sesgo medido.")}</Foot>
    </Section>
  );
}

function Correlations({ rows }) {
  const correlatable = rows.filter(({ batches }) => batches.filter((b) => b.tasting?.notaGlobal != null).length >= 4);
  const VARS = [[tx('aw final'), 'aw'], [tx('rendimiento real %'), 'yieldReal'], [tx('sal %'), 'saltPct'], [tx('días totales'), 'daysTotal'], [tx('T promedio cava'), 'avgT'], [tx('HR promedio cava'), 'avgHR'], [tx('T core recepción'), 'coreT'], [tx('grosor medio'), 'avgThickness']];
  return (
    <Section title={tx("Correlación cata vs parámetros")} description={tx("Pearson r entre cada variable y la nota global")} empty={!correlatable.length && tx('Se necesitan al menos 4 lotes catados del mismo tipo para calcular correlaciones estables.')}>
      {correlatable.map(({ type, batches }) => {
        const tasted = batches.filter((b) => b.tasting?.notaGlobal != null);
        const features = tasted.map(core.batchFeatures); const notes = features.map((f) => f.notaGlobal);
        const rs = VARS.map(([label, key]) => ({ label, pr: core.pearson(features.map((f) => f[key]), notes) })).filter((r) => r.pr !== null).sort((a, b) => Math.abs(b.pr.r) - Math.abs(a.pr.r));
        if (!rs.length) return null;
        return (
          <div key={type.id} className="grid gap-2">
            <SubHead note={txt`n=${tasted.length} lotes catados`}>{type.name}</SubHead>
            <T head={<><TableHead>{tx("Variable")}</TableHead><R>r</R><R>n</R><TableHead>{tx("Lectura")}</TableHead></>}>
              {rs.map((r) => {
                const a = Math.abs(r.pr.r);
                const [s, c] = a > 0.7 ? [r.pr.r > 0 ? tx('Fuerte +') : tx('Fuerte −'), r.pr.r > 0 ? 'sage' : 'rust'] : a > 0.4 ? [r.pr.r > 0 ? tx('Moderada +') : tx('Moderada −'), 'amber'] : a > 0.2 ? [tx('Débil'), 'muted'] : [tx('Ninguna'), 'muted'];
                return <TableRow key={r.label}><TableCell>{r.label}</TableCell><RC className={tone(c)}>{r.pr.r > 0 ? '+' : ''}{r.pr.r.toFixed(2)}</RC><RC className="text-xs">{r.pr.n}</RC><TableCell className={cn('text-xs', tone(c))}>{s}</TableCell></TableRow>;
              })}
            </T>
          </div>
        );
      })}
      {correlatable.length > 0 && <Foot>{tx("|r| > 0,7 fuerte · 0,4–0,7 moderada · 0,2–0,4 débil. Correlación no implica causalidad: indica una dirección a investigar.")}</Foot>}
    </Section>
  );
}

export function StageLossBars({ batches, refs }) {
  const bds = batches.map((b) => ({ b, bd: core.stageLossBreakdown(b) }));
  const maxTotal = Math.max(...bds.map(({ bd }) => bd.reduce((s, x) => s + Math.max(0, x.lossPct), 0)), 1);
  const kinds = [...new Set(bds.flatMap(({ bd }) => bd.filter((x) => x.lossPct > 0).map((x) => x.kind)))];
  return (
    <div className="grid gap-1.5">
      {bds.map(({ b, bd }) => {
        const total = bd.reduce((s, x) => s + Math.max(0, x.lossPct), 0);
        return (
          <div key={b.id} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3">
            <button className="truncate text-left font-mono text-xs text-gold-ink hover:underline" onClick={() => navigate(`/lotes/${b.id}`)} style={refs?.[b.id] ? { color: refs[b.id] } : undefined}>{b.ref}</button>
            <div className="flex h-5 overflow-hidden rounded bg-muted">
              {bd.filter((x) => x.lossPct > 0).map((x, i) => (
                <div key={i} title={`${tx(x.kind)}: ${x.lossPct.toFixed(1)}%`} className="flex items-center overflow-hidden px-1 text-[10px] font-medium text-white" style={{ width: `${(x.lossPct / maxTotal) * 100}%`, background: stageVar(x.kind) }}>{x.lossPct >= 4 ? `${x.lossPct.toFixed(0)}%` : ''}</div>
              ))}
            </div>
            <span className="text-right font-mono text-xs tabular">{total.toFixed(0)}%</span>
          </div>
        );
      })}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{kinds.map((k) => <span key={k} className="inline-flex items-center gap-1.5"><StageDot kind={k} className="size-2" />{k}</span>)}</div>
    </div>
  );
}

function StageLoss({ rows }) {
  const candidates = rows.filter(({ n }) => n >= 3);
  return (
    <Section title={tx("Pérdida de peso por etapa")} description={tx("Dos lotes con la misma pérdida total pueden repartirla muy distinto: señal de proceso inconsistente.")} empty={!candidates.length && tx('Se necesitan 3 o más lotes terminados del mismo tipo.')}>
      {candidates.map(({ type, batches }) => <div key={type.id} className="grid gap-2"><SubHead note={txt`${batches.length} lotes`}>{type.name}</SubHead><StageLossBars batches={batches} /></div>)}
    </Section>
  );
}

function Seasonal() {
  const db = core.getDB();
  const done = db.batches.filter((b) => b.status === 'done' && b.startedAt);
  if (done.length < 6) return <Section title={tx("Tendencias estacionales")} empty={tx("Se necesitan al menos 6 lotes terminados distribuidos en varios meses para detectar patrones estacionales.")} />;
  const byMonth = {};
  done.forEach((b) => { const m = new Date(b.startedAt).getUTCMonth() + 1; byMonth[m] ??= { yields: [], notes: [], n: 0 }; const f = core.batchFeatures(b); byMonth[m].n++; if (f.yieldReal !== null) byMonth[m].yields.push(f.yieldReal); if (f.notaGlobal !== null) byMonth[m].notes.push(f.notaGlobal); });
  const M = [tx('Ene'), tx('Feb'), tx('Mar'), tx('Abr'), tx('May'), tx('Jun'), tx('Jul'), tx('Ago'), tx('Sep'), tx('Oct'), tx('Nov'), tx('Dic')];
  const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  return (
    <Section title={tx("Tendencias estacionales")} description={tx("Promedios por mes de inicio (todos los años juntos)")}>
      <T head={<><TableHead>{tx("Mes")}</TableHead><R>{tx("Lotes")}</R><R>{tx("Rendimiento")}</R><R>{tx("Cata")}</R></>}>
        {Object.keys(byMonth).map(Number).sort((a, b) => a - b).map((m) => { const y = avg(byMonth[m].yields), n = avg(byMonth[m].notes); return (
          <TableRow key={m}><TableCell className="font-mono">{M[m - 1]}</TableCell><RC className="text-xs">{byMonth[m].n}</RC><RC>{y !== null ? `${y.toFixed(1)}%` : '—'}</RC>
            <RC className={n === null ? 'text-muted-foreground' : n >= 8 ? 'text-success' : n >= 6 ? 'text-warning' : 'text-danger'}>{n !== null ? `${n.toFixed(1)} / 10` : '—'}</RC></TableRow>
        ); })}
      </T>
      <Foot>{tx("Diferencias grandes entre meses sugieren un efecto del clima sobre tu cava.")}</Foot>
    </Section>
  );
}

function ComparePicker({ rows }) {
  const comparable = rows.filter(({ n }) => n >= 2);
  const [sel, setSel] = useState({});
  return (
    <Section title={tx("Comparar lotes del mismo tipo")} description={tx("Elegí entre 2 y 4 lotes para verlos lado a lado.")} empty={!comparable.length && tx('Necesitás 2 o más lotes terminados del mismo tipo para comparar.')}>
      {comparable.map(({ type }) => {
        const all = core.getDB().batches.filter((b) => b.typeId === type.id && (b.status === 'done' || b.status === 'in_progress'));
        const chosen = sel[type.id] || [];
        const toggle = (id) => setSel((s) => { const cur = s[type.id] || []; return { ...s, [type.id]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }; });
        return (
          <div key={type.id} className="grid gap-3 rounded-lg border p-4">
            <SubHead note={txt`${all.length} lotes disponibles`}>{type.name}</SubHead>
            <div className="flex flex-wrap gap-2">
              {all.map((b) => {
                const on = chosen.includes(b.id);
                return <button key={b.id} type="button" onClick={() => toggle(b.id)} aria-pressed={on} className={cn('rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted', on && 'border-gold bg-gold/10')}><span className="font-mono font-medium">{b.ref}</span> <span className="text-muted-foreground">{fmtDateShort(b.startedAt)}</span></button>;
              })}
            </div>
            <div><Button size="sm" disabled={chosen.length < 2} onClick={() => { if (chosen.length > 4) { toast.error(tx('Máximo 4 lotes')); return; } navigate(`/analytics/comparar/${chosen.join(',')}`); }}>{tx("Comparar {0} lotes", [chosen.length >= 2 ? chosen.length : ''])}{' '}<ArrowRight /></Button></div>
          </div>
        );
      })}
    </Section>
  );
}

/* ── Comparador (port de viewCompare) ──────────────────── */
const PALETTE = ['#A7782F', '#3F7699', '#5C7A2B', '#973527'];
function Compare({ ids }) {
  const db = core.getDB();
  const batches = ids.map((id) => db.batches.find((b) => b.id === id)).filter(Boolean);
  if (!batches.length) return <EmptyState title={tx("Sin lotes seleccionados")} action={<Button variant="outline" onClick={() => navigate('/analytics')}><ArrowLeft />{' '}{tx("Analytics")}</Button>} />;
  const type = db.types.find((t) => t.id === batches[0].typeId);
  const F = batches.map(core.batchFeatures);
  const col = Object.fromEntries(batches.map((b, i) => [b.id, PALETTE[i % 4]]));
  const row = (label, fn, cls) => <TableRow><TableCell className="text-xs text-muted-foreground">{label}</TableCell>{F.map((f, i) => <RC key={i} className={cls?.(f)}>{fn(f, batches[i])}</RC>)}</TableRow>;
  const nota = (v) => (v == null ? '' : v >= 8 ? 'text-success' : v >= 6 ? 'text-warning' : 'text-danger');
  return (
    <>
      <button onClick={() => navigate('/analytics')} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{' '}{tx("Analytics")}</button>
      <PageHeader eyebrow={tx("Comparador")} title={type?.name || tx('Lotes')} description={txt`${batches.length} lotes · ${batches.map((b) => b.ref).join(' · ')}`} />
      <div className="grid gap-6">
        <Section title={tx("Resumen comparativo")}>
          <T head={<><TableHead>{tx("Métrica")}</TableHead>{batches.map((b) => <R key={b.id}><span className="font-mono" style={{ color: col[b.id] }}>{b.ref}</span></R>)}</>}>
            {row(tx('Iniciado'), (f) => fmtDate(f.startedAt), () => 'text-xs')}
            {row(tx('Estado'), (f, b) => (b.status === 'done' ? tx('Terminado') : tx('En proceso')), () => 'text-xs font-sans')}
            {row(tx('Rendimiento real'), (f) => (f.yieldReal !== null ? `${f.yieldReal.toFixed(1)}%` : '—'))}
            {row(tx('Días totales'), (f) => (f.daysTotal !== null ? f.daysTotal.toFixed(0) : '—'))}
            {row(tx('Sal total'), (f) => (f.saltPct !== null ? `${f.saltPct.toFixed(2)}%` : '—'))}
            {row(tx('T promedio cava'), (f) => (f.avgT !== null ? `${f.avgT.toFixed(1)} °C` : '—'))}
            {row(tx('HR promedio cava'), (f) => (f.avgHR !== null ? `${f.avgHR.toFixed(0)}%` : '—'))}
            {row(tx('aw estimada final'), (f) => (f.aw !== null ? f.aw.toFixed(3) : '—'))}
            {row(tx('T core recepción'), (f) => (f.coreT !== null ? `${f.coreT.toFixed(1)} °C` : '—'))}
            {row(tx('Nota de cata'), (f) => (f.notaGlobal !== null ? f.notaGlobal.toFixed(1) : '—'), (f) => cn('text-base font-medium', nota(f.notaGlobal)))}
            {row(tx('Aroma'), (f) => `${f.aroma ?? '—'}/5`, () => 'text-xs')}
            {row(tx('Textura'), (f) => `${f.textura ?? '—'}/5`, () => 'text-xs')}
            {row(tx('Apariencia'), (f) => `${f.apariencia ?? '—'}/5`, () => 'text-xs')}
          </T>
        </Section>
        <Section title={tx("Curvas de peso superpuestas")} description={tx("% del peso verde según los días desde el inicio de cada lote")}><CompareChart batches={batches} col={col} /></Section>
        <Section title={tx("Pérdida por etapa")}><StageLossBars batches={batches} refs={col} /></Section>
      </div>
    </>
  );
}

function CompareChart({ batches, col }) {
  const w = 720, h = 260, pad = { l: 44, r: 16, t: 14, b: 28 }; const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const DAY = 864e5;
  const maxDays = Math.max(...batches.map((b) => ((b.finishedAt ? new Date(b.finishedAt) : new Date()) - new Date(b.startedAt)) / DAY), 30);
  const yMin = 50, yMax = 102;
  const x = (d) => pad.l + (iw * d) / maxDays, y = (p) => pad.t + ih * (1 - (p - yMin) / (yMax - yMin));
  const series = batches.map((b) => {
    const green = b.pieces.reduce((s, p) => s + p.initialWeight, 0); const start = new Date(b.startedAt).getTime();
    const dates = new Set(); b.pieces.forEach((p) => (p.weightLogs || []).filter((l) => !l.outlier).forEach((l) => dates.add(l.date)));
    const sorted = [b.startedAt, ...[...dates].sort((a, z) => new Date(a) - new Date(z))];
    const pts = sorted.map((d) => {
      let W = 0;
      b.pieces.forEach((p) => { if (d === b.startedAt) { W += p.initialWeight; return; } let wt = p.initialWeight; (p.weightLogs || []).filter((l) => !l.outlier).slice().sort((a, z) => new Date(a.date) - new Date(z.date)).forEach((l) => { if (new Date(l.date) <= new Date(d)) wt = l.weight; }); W += wt; });
      return { x: x((new Date(d) - start) / DAY), y: y((100 * W) / green) };
    });
    return { b, pts };
  });
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={tx("Curvas de peso de los lotes comparados")}>
        {[50, 60, 70, 80, 90, 100].map((p) => <g key={p}><line x1={pad.l} x2={w - pad.r} y1={y(p)} y2={y(p)} stroke="var(--border)" strokeWidth="0.6" /><text x={pad.l - 6} y={y(p) + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)" fontFamily="JetBrains Mono">{p}%</text></g>)}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <text key={f} x={x(maxDays * f)} y={h - pad.b + 15} textAnchor="middle" fontSize="9" fill="var(--muted-foreground)" fontFamily="JetBrains Mono">{(maxDays * f).toFixed(0)} d</text>)}
        {series.map(({ b, pts }) => (
          <g key={b.id}>
            {pts.length > 1 && <path d={'M ' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} fill="none" stroke={col[b.id]} strokeWidth="2" strokeLinejoin="round" />}
            {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={col[b.id]} />)}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">{batches.map((b) => <span key={b.id} className="inline-flex items-center gap-1.5 text-xs"><span className="h-0.5 w-4 rounded-full" style={{ background: col[b.id] }} /><span className="font-mono" style={{ color: col[b.id] }}>{b.ref}</span></span>)}</div>
    </div>
  );
}
