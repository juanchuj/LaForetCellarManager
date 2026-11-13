import { useState } from 'react';
import { ChevronDown, Search, ShieldAlert } from 'lucide-react';
import { core } from '@/lib/store';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const PARTS = [['visual', 'Cómo se ve', 'text-muted-foreground'], ['cause', 'Causa', 'text-danger'], ['prevent', 'Prevención', 'text-success'], ['action', 'Qué hacer si aparece', 'text-warning']];

export function Defects() {
  const [q, setQ] = useState('');
  const [all, setAll] = useState(null); // null = per-item, true/false = forced
  const needle = q.trim().toLowerCase();
  const list = core.DEFECT_CATALOG.map((d, i) => ({ d, i })).filter(({ d }) => !needle || PARTS.some(([k]) => d[k].toLowerCase().includes(needle)) || d.name.toLowerCase().includes(needle));
  return (
    <>
      <PageHeader eyebrow="Referencia" title="Defectos" description={`${core.DEFECT_CATALOG.length} defectos típicos de la charcutería madurada: cómo se ven, por qué ocurren, cómo prevenirlos y qué hacer.`}
        actions={<Button variant="outline" onClick={() => setAll(all === true ? false : true)}>{all === true ? 'Contraer todo' : 'Expandir todo'}</Button>} />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: moho, costra, ácido…" className="pl-9" aria-label="Buscar defectos" />
      </div>
      {list.length === 0 ? <EmptyState icon={ShieldAlert} title="Sin resultados">Probá con otra palabra.</EmptyState> : (
        <div className="grid gap-3">
          {list.map(({ d, i }) => (
            <Collapsible key={d.name + all} defaultOpen={all === true || (!!needle && list.length <= 3)} className="rounded-xl border bg-card shadow-xs">
              <CollapsibleTrigger className="group flex w-full items-center gap-4 px-5 py-4 text-left">
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-semibold">{d.name}</span>
                  <span className="block truncate text-sm text-muted-foreground group-data-[state=open]:hidden">{d.visual}</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="grid gap-4 border-t px-5 py-4 sm:grid-cols-2">
                {PARTS.map(([k, l, c]) => (
                  <div key={k}><div className={`mb-1 text-[11px] font-semibold uppercase tracking-wider ${c}`}>{l}</div><p className="text-sm leading-relaxed">{d[k]}</p></div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </>
  );
}
