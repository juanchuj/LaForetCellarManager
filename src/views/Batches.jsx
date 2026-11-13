import { useState } from 'react';
import { ChevronRight, Package, Plus, Search } from 'lucide-react';
import { useDB, core } from '@/lib/store';
import { navigate } from '@/lib/router';
import { STATUS, batchRow, fmt, fmtDate, fmtG, stageVar } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StageLabel } from '@/components/stage-dot';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tx } from '@/lib/i18n';

const FILTERS = [['all', tx('Todos')], ['in_progress', tx('En proceso')], ['done', tx('Terminados')], ['draft', tx('Borradores')], ['discarded', tx('Descartados')]];

export function Batches() {
  const db = useDB();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const counts = Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? db.batches.length : db.batches.filter((b) => b.status === k).length]));
  const needle = q.trim().toLowerCase();
  const rows = db.batches
    .filter((b) => filter === 'all' || b.status === filter)
    .filter((b) => !needle || [b.ref, b.typeName, b.lot].some((v) => String(v ?? '').toLowerCase().includes(needle)))
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .map(batchRow);

  return (
    <>
      <PageHeader
        eyebrow={tx("Producción")}
        title={tx("Lotes")}
        description={tx("Todos los lotes, del más reciente al más antiguo.")}
        actions={<Button onClick={() => core.openNewBatchModal()}><Plus />{' '}{tx("Nuevo lote")}</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <Tabs value={filter} onValueChange={setFilter} className="max-w-full overflow-x-auto">
          <TabsList>
            {FILTERS.map(([k, l]) => (
              <TabsTrigger key={k} value={k} disabled={k !== 'all' && counts[k] === 0}>
                {l}<span className="font-mono text-[11px] tabular text-muted-foreground">{counts[k]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative md:ml-auto md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("Buscar por ref, producto o lote")} className="pl-9" aria-label={tx("Buscar lotes")} />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Package} title={db.batches.length ? tx('Sin resultados') : tx('Sin lotes')}>
          {db.batches.length ? tx('Probá con otro filtro o búsqueda.') : tx('Creá tu primer lote para empezar.')}
        </EmptyState>
      ) : (
        <>
          {/* desktop table */}
          <Card className="hidden py-0 md:flex">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">{tx("Lote")}</TableHead>
                  <TableHead>{tx("Estado")}</TableHead>
                  <TableHead>{tx("Inicio")}</TableHead>
                  <TableHead className="text-right">{tx("Verde")}</TableHead>
                  <TableHead>{tx("Etapa actual")}</TableHead>
                  <TableHead className="w-40">{tx("Progreso")}</TableHead>
                  <TableHead>{tx("Fin estimado")}</TableHead>
                  <TableHead className="text-right">{tx("Rendimiento")}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.b.id} className="cursor-pointer" onClick={() => navigate(`/lotes/${r.b.id}`)}>
                    <TableCell className="pl-5">
                      <div className="font-mono text-sm font-medium">{r.b.ref}</div>
                      <div className="text-xs text-muted-foreground">{tx("{0} · {1} pieza{2}", [r.b.typeName, r.b.pieces.length, r.b.pieces.length === 1 ? '' : 's'])}</div>
                    </TableCell>
                    <TableCell><StatusBadge status={r.b.status} /></TableCell>
                    <TableCell className="font-mono text-xs tabular">{fmtDate(r.b.startedAt)}</TableCell>
                    <TableCell className="text-right font-mono text-sm tabular">{fmtG(r.green)}</TableCell>
                    <TableCell className="text-sm"><StageLabel kind={r.cs?.kind} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.progress} className="h-1.5" indicatorStyle={r.cs ? { background: stageVar(r.cs.kind) } : undefined} />
                        <span className="w-9 text-right font-mono text-[11px] tabular text-muted-foreground">{Math.round(r.progress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular">{fmtDate(r.finalEnd)}</TableCell>
                    <TableCell className="text-right"><YieldCell r={r} /></TableCell>
                    <TableCell className="pr-4"><ChevronRight className="size-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.b.id}>
                <button onClick={() => navigate(`/lotes/${r.b.id}`)} className="w-full rounded-xl border bg-card p-4 text-left shadow-xs active:bg-muted">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm font-medium">{r.b.ref}</div>
                      <div className="text-xs text-muted-foreground">{r.b.typeName} · {fmtG(r.green)}</div>
                    </div>
                    <StatusBadge status={r.b.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <StageLabel kind={r.cs?.kind} />
                    <span className="font-mono text-xs text-muted-foreground">{tx("fin {0}", [fmtDate(r.finalEnd)])}</span>
                  </div>
                  <Progress value={r.progress} className="mt-2 h-1.5" indicatorStyle={r.cs ? { background: stageVar(r.cs.kind) } : undefined} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

/* Current weight as % of green vs the target. While a batch is still drying, a
   high % just means "not dry yet", so it is shown neutral — not as a success. */
function YieldCell({ r }) {
  return (
    <div className="font-mono text-xs tabular leading-relaxed">
      <div>{r.yieldReal != null ? <span className="text-sm font-medium">{fmt(r.yieldReal, 1)}%</span> : <span className="text-muted-foreground">{tx("sin pesar")}</span>}</div>
      <div className="text-muted-foreground">{tx("obj. {0}% · {1}", [fmt(r.yieldTarget, 0), fmtG((r.yieldTarget / 100) * r.green)])}</div>
    </div>
  );
}
