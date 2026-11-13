import { useState } from 'react';
import { MoreHorizontal, Pencil, Plus, Search, Trash2, TriangleAlert, Wheat } from 'lucide-react';
import { useDB, core } from '@/lib/store';
import { navigate } from '@/lib/router';
import { openDialog } from '@/lib/dialogs';
import { fmt } from '@/lib/domain';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { tx, txt } from '@/lib/i18n';

const CATS = [['sal', tx('Sal')], ['sal-curado', tx('Sales de curado')], ['azucar', tx('Azúcares')], ['especia', tx('Especias')], ['hierba', tx('Hierbas')], ['aditivo', tx('Aditivos')], ['liquido', tx('Líquidos')], ['cultivo', tx('Cultivos')], ['carne', tx('Carnes')]];

export function Ingredients() {
  const db = useDB();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const counts = Object.fromEntries(CATS.map(([k]) => [k, db.ingredients.filter((i) => i.category === k).length]));
  const needle = q.trim().toLowerCase();
  const list = db.ingredients
    .filter((i) => cat === 'all' || i.category === cat)
    .filter((i) => !needle || [i.name, i.note].some((v) => String(v || '').toLowerCase().includes(needle)))
    .sort((a, b) => (CATS.findIndex(([k]) => k === a.category) - CATS.findIndex(([k]) => k === b.category)) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  const catLabel = Object.fromEntries(CATS);

  return (
    <>
      <PageHeader eyebrow={tx("Catálogo")} title={tx("Ingredientes")} description={tx("Sales, sales de curado, especias, cultivos y carnes. Renombrar actualiza todas las recetas y lotes.")}
        actions={<Button onClick={() => openDialog('ingredient', {})}><Plus />{' '}{tx("Nuevo ingrediente")}</Button>} />
      {db.ingredients.length === 0 ? (
        <EmptyState icon={Wheat} title={tx("Catálogo vacío")} action={<div className="flex gap-2"><Button variant="outline" onClick={() => navigate('/biblioteca')}>{tx("Ir a Biblioteca")}</Button><Button onClick={() => core.loadExampleRecipe()}>{tx("Cargar receta de ejemplo")}</Button></div>}>{tx("Importalos desde Biblioteca o creá uno por uno.")}</EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <Tabs value={cat} onValueChange={setCat} className="max-w-full overflow-x-auto">
              <TabsList>
                <TabsTrigger value="all">{tx("Todos")}<span className="font-mono text-[11px] text-muted-foreground">{db.ingredients.length}</span></TabsTrigger>
                {CATS.filter(([k]) => counts[k]).map(([k, l]) => <TabsTrigger key={k} value={k}>{l}<span className="font-mono text-[11px] text-muted-foreground">{counts[k]}</span></TabsTrigger>)}
              </TabsList>
            </Tabs>
            <div className="relative lg:ml-auto lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("Buscar ingrediente")} className="pl-9" aria-label={tx("Buscar ingredientes")} />
            </div>
          </div>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">{tx("Nombre")}</TableHead><TableHead>{tx("Categoría")}</TableHead><TableHead>{tx("Unidad")}</TableHead><TableHead>{tx("Detalle")}</TableHead><TableHead className="text-right">{tx("Uso")}</TableHead><TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((i) => {
                  const u = core.ingredientUsage(i.name);
                  const isSalt = i.category === 'sal' || i.category === 'sal-curado';
                  const isMeat = i.category === 'carne';
                  const detail = isSalt ? (i.gPerTsp ? txt`${fmt(+i.gPerTsp, 1)} g/tsp` : '') : isMeat ? core.meatMetaTag(i) : '';
                  return (
                    <TableRow key={i.id} className="cursor-pointer" onClick={() => openDialog('ingredient', { id: i.id })}>
                      <TableCell className="pl-5 font-medium">
                        <span className="inline-flex items-center gap-1.5">{i.name}{isMeat && !i.nutr && <Tooltip><TooltipTrigger asChild><TriangleAlert className="size-3.5 text-danger" /></TooltipTrigger><TooltipContent>{tx("Sin perfil nutricional")}</TooltipContent></Tooltip>}</span>
                        {i.note && <div className="max-w-md truncate text-xs font-normal text-muted-foreground">{i.note}</div>}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{catLabel[i.category] || i.category}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{i.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{detail || '—'}</TableCell>
                      <TableCell className="text-right text-xs">{u.total === 0 ? <span className="text-muted-foreground">{tx("sin uso")}</span> : <span title={core.ingredientUsageDetail(u)}>{tx("{0} receta{1}{2}", [u.types, u.types === 1 ? '' : 's', u.batches ? txt` · ${u.batches} lote${u.batches === 1 ? '' : 's'}` : ''])}</span>}</TableCell>
                      <TableCell className="pr-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={txt`Acciones de ${i.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openDialog('ingredient', { id: i.id })}><Pencil />{' '}{tx("Editar")}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => core.deleteIngredient(i.id)}><Trash2 />{' '}{tx("Eliminar…")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">{tx("Sin resultados.")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
