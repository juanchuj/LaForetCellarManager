import { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, Leaf, Plus, Sparkles, Star, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useDB, core } from '@/lib/store';
import { bridge, withForm } from '@/lib/core/bridge';
import { ask, closeDialog, openDialog } from '@/lib/dialogs';
import { cn } from '@/lib/utils';
import { Field, Rich, SectionLabel } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PILL = {
  red: 'data-[on=true]:bg-danger data-[on=true]:border-danger',
  orange: 'data-[on=true]:bg-[#C0662E] data-[on=true]:border-[#C0662E]',
  amber: 'data-[on=true]:bg-[#B7862C] data-[on=true]:border-[#B7862C]',
  lime: 'data-[on=true]:bg-[#7E9A3A] data-[on=true]:border-[#7E9A3A]',
  green: 'data-[on=true]:bg-success data-[on=true]:border-success',
};
const DOT = { red: 'bg-danger', orange: 'bg-[#C0662E]', amber: 'bg-[#B7862C]', lime: 'bg-[#7E9A3A]', green: 'bg-success' };
const SEV = [['', 'Sin evaluar'], ['0', 'No hay'], ['1', 'Leve'], ['2', 'Moderado'], ['3', 'Grave']];
const SEV_ON = { '': 'data-[on=true]:bg-muted-foreground', 0: 'data-[on=true]:bg-success', 1: 'data-[on=true]:bg-[#B7862C]', 2: 'data-[on=true]:bg-[#C0662E]', 3: 'data-[on=true]:bg-danger' };

function Pills({ gk, value, onChange, size = 'md' }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => {
        const col = core.pillColor(gk, i);
        return (
          <button key={i} type="button" data-on={String(value) === String(i)} title={core.catShortName(gk, i) || String(i)}
            onClick={() => onChange(String(value) === String(i) ? '' : String(i))}
            className={cn('grid place-items-center rounded-md border bg-card font-mono text-sm tabular transition-colors hover:bg-muted data-[on=true]:text-white', size === 'sm' ? 'size-8' : 'size-9', PILL[col])}>
            {i}
          </button>
        );
      })}
    </div>
  );
}

function ScoreRow({ label, gk, value, onChange, hint }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{value ? <b className="text-foreground">{core.catShortName(gk, value)}</b> : hint}</div>
      </div>
      <Pills gk={gk} value={value} onChange={onChange} />
    </div>
  );
}

export function TastingDialog({ batchId, tastingId }) {
  const db = useDB();
  const b = db.batches.find((x) => x.id === batchId);
  const list = b ? core.tastingList(b) : [];
  const cur = tastingId && tastingId !== 'new' ? list.find((x) => x.id === tastingId) : null;
  const t = cur || {};
  const legacyScale = !!cur && cur.esc !== 2 && core.FLAVOR_AXES.some((f) => cur[f.k] != null);
  const flav = (k) => (legacyScale ? '' : t[k] ?? '');
  const s = (x) => (x == null ? '' : String(x));

  const [v, setV] = useState(() => {
    const o = { 't-fecha': t.fecha || core.toISODate(new Date()), 't-apariencia': s(t.apariencia), 't-textura': s(t.textura), 't-aroma': s(t.aroma), 't-aromaInt': s(t.aromaInt), 't-notas': t.notas || '' };
    core.FLAVOR_AXES.forEach((f) => { o['t-' + f.k] = s(flav(f.k)); o['t-' + f.k + '-q'] = s(flav(f.k + 'Q')); });
    core.DEFECT_CATALOG.forEach((d, i) => { o['t-def-' + i] = core.defState(t, d.name); });
    return o;
  });
  const [globalManual, setGlobalManual] = useState(t.notaGlobal != null ? s(t.notaGlobal) : null);
  const [notes, setNotes] = useState(() => Object.fromEntries((t.notasSab || []).map((x) => [x.n, x.s])));
  const [newNote, setNewNote] = useState('');
  const set = (k) => (val) => setV((o) => ({ ...o, [k]: val }));

  const suggested = useMemo(() => withForm(v, () => core.suggestTastingScore(core.readTastingForm())), [v]);
  const global = globalManual ?? (suggested != null ? String(suggested) : '');
  if (!b) return null;
  const type = db.types.find((x) => x.id === b.typeId);
  const win = type ? core.optimalWindow(type.id) : null;
  const days = core.tastingDays(b, v['t-fecha']);

  const defVals = core.DEFECT_CATALOG.map((_, i) => v['t-def-' + i]);
  const ev = defVals.filter((x) => x !== '').length, nd = defVals.filter((x) => x !== '' && +x > 0).length;
  const offNotes = Object.entries(notes).filter(([n, x]) => x > 0 && core.noteIsOff(n)).map(([n]) => n);

  const cycle = (n) => setNotes((st) => {
    const nx = ((st[n] || 0) + 1) % 3;
    const out = { ...st };
    if (nx === 2 && Object.values(st).filter((x) => x === 2).length >= core.NOTE_MAX_STAR) { toast.warning(`Máximo ${core.NOTE_MAX_STAR} notas protagonistas`); delete out[n]; return out; }
    if (nx === 0) delete out[n]; else out[n] = nx;
    return out;
  });
  /* same rules as v4.4.3 addCustomNote(): new names are saved to db.notasPropias */
  const addNote = () => {
    const n = newNote.trim(); if (!n) return;
    const all = core.noteFamilies().flatMap((f) => f.n);
    if (!all.some((x) => x.toLowerCase() === n.toLowerCase())) { db.notasPropias = db.notasPropias || []; db.notasPropias.push(n); core.saveDB(); }
    const real = all.find((x) => x.toLowerCase() === n.toLowerCase()) || n;
    setNotes((st) => ({ ...st, [real]: st[real] || 1 })); setNewNote('');
  };
  const save = () => {
    bridge.win._ntState = notes;
    withForm({ ...v, 't-global': global }, () => core.saveTasting(b.id, cur ? cur.id : undefined));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cur ? 'Editar cata' : 'Nueva cata'} · <span className="font-mono">{b.ref}</span></DialogTitle>
          <DialogDescription>Podés registrar varias catas por lote (a los 30, 60 y 90 días) para encontrar el punto óptimo.</DialogDescription>
        </DialogHeader>

        {list.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {list.map((x) => {
              const d = x.dias ?? core.tastingDays(b, x.fecha);
              return <Button key={x.id} size="sm" variant={cur?.id === x.id ? 'default' : 'outline'} onClick={() => openDialog('tasting', { batchId, tastingId: x.id })}>{d != null ? `Día ${d}` : x.fecha}{x.notaGlobal != null && <span className="font-mono opacity-70">· {x.notaGlobal}</span>}</Button>;
            })}
            <Button size="sm" variant={!cur ? 'default' : 'outline'} onClick={() => openDialog('tasting', { batchId, tastingId: 'new' })}><Plus /> Nueva</Button>
          </div>
        )}
        {win?.best && !win.weak && <p className="flex items-center gap-1.5 text-xs text-success"><Star className="size-3.5" /> En {type.name} la mejor nota histórica está entre los días {win.best.from}–{win.best.to} (prom. {win.best.avg.toFixed(1)}, n={win.best.n}).</p>}

        <Collapsible>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium"><BookOpen className="size-4 text-gold-ink" /> Cómo catar: guía rápida <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-md border bg-background/60 p-3 text-sm">
            <ul className="list-disc space-y-1 pl-4">{core.CATA_PROTOCOL.map((x, i) => <Rich as="li" key={i} html={x} />)}</ul>
            <p className="mt-2 text-xs text-muted-foreground">La intensidad mide cuánto se siente (3 = balanceado); la calidad, si es rico o maluco. La calidad manda.</p>
          </CollapsibleContent>
        </Collapsible>

        <div className="grid items-end gap-3 sm:grid-cols-[180px_1fr]">
          <Field label="Fecha de cata"><Input type="date" value={v['t-fecha']} onChange={(e) => set('t-fecha')(e.target.value)} /></Field>
          <div className="pb-2 text-sm text-muted-foreground">{days != null && <>Día <b className="font-mono text-foreground">{days}</b> desde el inicio del lote</>}</div>
        </div>

        {legacyScale && <Alert variant="warning"><TriangleAlert /><AlertDescription>Esta cata usa la escala anterior (0–5). Los sabores quedaron en blanco: volvé a calificarlos con la escala nueva.</AlertDescription></Alert>}

        <div>
          <SectionLabel>Apariencia y textura</SectionLabel>
          <div className="divide-y">
            <ScoreRow label="Apariencia" gk="apariencia" hint="1 mala · 5 excelente" value={v['t-apariencia']} onChange={set('t-apariencia')} />
            <ScoreRow label="Textura" gk="textura" hint="1 mala · 5 excelente" value={v['t-textura']} onChange={set('t-textura')} />
          </div>
        </div>

        <div>
          <SectionLabel>Aroma y sabor</SectionLabel>
          <div className="mb-2 hidden grid-cols-[1fr_auto_auto] gap-x-6 px-1 text-[11px] font-medium text-muted-foreground sm:grid"><span /><span className="w-[13.5rem] text-center">Intensidad · 3 balanceado</span><span className="w-[13.5rem] text-center">Calidad · 5 muy rico</span></div>
          <div className="divide-y">
            {[{ k: 'aroma', label: 'Aroma', i: 't-aromaInt', q: 't-aroma' }].concat(core.FLAVOR_AXES.map((f) => ({ k: f.k, label: f.label, i: 't-' + f.k, q: 't-' + f.k + '-q' }))).map((r) => (
              <div key={r.k} className="grid gap-2 py-2 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-x-6">
                <div className="text-sm font-medium">{r.label}</div>
                <div className="flex items-center gap-2"><span className="w-16 text-[11px] text-muted-foreground sm:hidden">Intensidad</span><Pills size="sm" gk={'int:' + r.k} value={v[r.i]} onChange={set(r.i)} /></div>
                <div className="flex items-center gap-2"><span className="w-16 text-[11px] text-muted-foreground sm:hidden">Calidad</span><Pills size="sm" gk={'qual:' + r.k} value={v[r.q]} onChange={set(r.q)} /></div>
              </div>
            ))}
          </div>
        </div>

        <Collapsible defaultOpen={Object.keys(notes).length > 0}>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left">
            <span className="font-brand text-[11px] uppercase tracking-[0.18em] text-gold-ink">Notas identificables</span>
            <span className="h-px flex-1 bg-border" />
            {Object.keys(notes).length > 0 && <Badge variant="gold">{Object.keys(notes).length}</Badge>}
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">Un toque = presente · dos = protagonista ★ (máx. {core.NOTE_MAX_STAR}) · tres = quitar. No entra en la nota global.</p>
            {core.noteFamilies().map((f) => (
              <div key={f.f}>
                <div className={cn('mb-1.5 text-xs font-medium', f.off ? 'text-danger' : 'text-muted-foreground')}>{f.f}</div>
                <div className="flex flex-wrap gap-1.5">
                  {f.n.map((n) => {
                    const x = notes[n] || 0;
                    return (
                      <button key={n} type="button" onClick={() => cycle(n)}
                        className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted',
                          x === 1 && (f.off ? 'border-danger/50 bg-danger-soft text-danger' : 'border-success/40 bg-success-soft text-success'),
                          x === 2 && (f.off ? 'border-danger bg-danger text-white' : 'border-gold bg-gold text-white'))}>
                        {x === 2 && <Star className="size-3 fill-current" />}{n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {offNotes.length > 0 && <p className="text-xs text-danger">Marcaste notas fuera de lugar ({offNotes.join(', ')}): revisá si corresponde un defecto.</p>}
            <div className="flex gap-2"><Input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }} placeholder="Otra nota (ej. coco, anís)…" /><Button type="button" variant="outline" onClick={addNote}><Leaf /> Agregar</Button></div>
          </CollapsibleContent>
        </Collapsible>

        <div>
          <SectionLabel>Nota global</SectionLabel>
          <div className="flex flex-wrap items-center gap-4">
            <Input type="number" min="0" max="10" step="0.5" value={global} onChange={(e) => setGlobalManual(e.target.value)} className="h-14 w-28 text-center font-mono text-2xl tabular" aria-label="Nota global" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="text-xs text-muted-foreground">0 a 10, admite medios puntos{type?.tasteTarget ? ` · meta ${type.tasteTarget}` : ''}</div>
              {suggested == null ? <div className="text-muted-foreground">Completá la evaluación y la nota se sugiere sola.</div>
                : globalManual != null && +globalManual !== suggested ? (
                  <div className="flex flex-wrap items-center gap-2">Sugerida: <b className="font-mono">{suggested}</b><Button type="button" size="sm" variant="ghost" onClick={() => setGlobalManual(null)}><Sparkles /> Usar sugerida</Button></div>
                ) : <div className="text-muted-foreground">{globalManual != null ? `Coincide con la sugerida (${suggested}).` : `Sugerida automáticamente (${suggested}) — editala si tu criterio es otro.`}</div>}
              {global !== '' && <Rich as="div" className="mt-1 text-xs" html={core.catGuideLine('global', global)} />}
            </div>
          </div>
        </div>

        <Collapsible defaultOpen={nd > 0}>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left">
            <span className="font-brand text-[11px] uppercase tracking-[0.18em] text-gold-ink">Defectos observados</span>
            <span className="h-px flex-1 bg-border" />
            <span className={cn('text-xs', nd > 0 ? 'text-danger' : ev === defVals.length ? 'text-success' : 'text-muted-foreground')}>
              {ev === 0 ? `Sin evaluar · ${defVals.length} defectos` : nd > 0 ? `${nd} marcado${nd === 1 ? '' : 's'} · ${ev}/${defVals.length} revisados` : `Sin problemas · ${ev}/${defVals.length} revisados`}
            </span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <p className="mb-2 text-xs text-muted-foreground"><b>Leve</b>: solo se nota si lo buscás · <b>Moderado</b>: lo nota cualquiera, se vende con descuento · <b>Grave</b>: no se vende.</p>
            <div className="divide-y rounded-lg border">
              {core.DEFECT_CATALOG.map((d, i) => (
                <div key={d.name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" title={d.visual}>
                  <span className="text-sm">{d.name}</span>
                  <div className="flex gap-1">
                    {SEV.map(([k, l]) => (
                      <button key={k} type="button" data-on={v['t-def-' + i] === k} onClick={() => set('t-def-' + i)(k)}
                        className={cn('rounded-md border bg-card px-2 py-1 text-[11px] transition-colors hover:bg-muted data-[on=true]:border-transparent data-[on=true]:text-white', SEV_ON[k])}>{l}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Field label="Observaciones"><Textarea rows={3} value={v['t-notas']} onChange={(e) => set('t-notas')(e.target.value)} placeholder="aromas, destacados, qué cambiarías" /></Field>

        <DialogFooter>
          {cur && <Button type="button" variant="ghost" className="text-danger sm:mr-auto" onClick={() => ask(() => core.deleteTasting(b.id, cur.id))}>Eliminar cata</Button>}
          <Button type="button" variant="outline" onClick={closeDialog}>Cerrar sin guardar</Button>
          <Button type="button" onClick={save}>Guardar cata</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
