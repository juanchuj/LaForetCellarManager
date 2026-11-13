import { useRef } from 'react';
import { ArchiveRestore, BookOpenText, Cloud, Database, Download, FileUp, History, OctagonAlert, RotateCcw, Upload, Wheat } from 'lucide-react';
import { toast } from 'sonner';
import { useDB, core, notify } from '@/lib/store';
import { ask, confirmThen, openDialog } from '@/lib/dialogs';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** Reads a picked JSON file and hands the parsed object to `fn`. */
function useJsonPicker(fn) {
  const ref = useRef(null);
  const input = (
    <input ref={ref} type="file" accept=".json,application/json" className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => { try { fn(JSON.parse(ev.target.result)); } catch (err) { toast.error('Archivo inválido: ' + err.message); } };
        r.readAsText(f); e.target.value = '';
      }} />
  );
  return [input, () => ref.current?.click()];
}

export function Library() {
  const db = useDB();
  const backups = core.listBackups();
  const [libInput, pickLib] = useJsonPicker((payload) => core.applyLibraryImport(payload));
  const [histInput, pickHist] = useJsonPicker((data) => {
    const incoming = Array.isArray(data) ? data : data.batches || [];
    if (!incoming.length) { toast.error('No se encontraron lotes en el JSON'); return; }
    openDialog('historical-import', { incoming });
  });
  const [dbInput, pickDb] = useJsonPicker((data) => confirmThen(
    `Restaurar desde el archivo reemplazará TODOS los datos actuales (${db.batches.length} lotes, ${db.types.length} recetas, ${db.ingredients.length} ingredientes). ¿Continuar?`,
    () => { core.setDB(data); core.saveDB(); notify(); toast.success('Datos importados'); }, { destructive: true }));
  const { handle } = core.getCloud();

  return (
    <>
      <PageHeader eyebrow="Datos" title="Biblioteca" description="Respaldos, importación y exportación. Todo vive en este navegador; descargá copias para guardarlas afuera." />
      {libInput}{histInput}{dbInput}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl font-semibold">Recetas e ingredientes</CardTitle>
            <CardDescription>Sin lotes. Para compartir tu recetario o moverlo entre equipos. Al importar se combinan por nombre: lo que existe se actualiza y lo nuevo se agrega.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3 text-center">
              <div><div className="font-mono text-2xl tabular">{db.types.length}</div><div className="text-xs text-muted-foreground">recetas</div></div>
              <div><div className="font-mono text-2xl tabular">{db.ingredients.length}</div><div className="text-xs text-muted-foreground">ingredientes</div></div>
              <div><div className="font-mono text-2xl tabular">{db.ingredients.filter((i) => i.category === 'carne').length}</div><div className="text-xs text-muted-foreground">carnes</div></div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Exportar</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => core.exportLibrary('all')}><Download /> Biblioteca completa</Button>
                <Button variant="outline" onClick={() => core.exportLibrary('types')}><BookOpenText /> Solo recetas</Button>
                <Button variant="outline" onClick={() => core.exportLibrary('ingredients')}><Wheat /> Solo ingredientes</Button>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Importar</div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={pickLib}><Upload /> Importar recetas o ingredientes</Button>
                <Button variant="ghost" onClick={() => core.restoreSalts()}><RotateCcw /> Reponer sales base</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl font-semibold">Backups automáticos</CardTitle>
            <CardDescription>Una copia diaria de todo (con lotes). Se guardan los últimos 30 días y uno por mes del último año.</CardDescription>
            <CardAction><Button size="sm" variant="outline" onClick={() => core.downloadBackup()}><Download /> Descargar el último</Button></CardAction>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">Sin backups aún. Se crea uno automáticamente al modificar datos.</p>
            ) : (
              <div className="max-h-80 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-card"><TableRow className="hover:bg-transparent"><TableHead>Fecha</TableHead><TableHead>Hora</TableHead><TableHead className="text-right">Tamaño</TableHead><TableHead className="w-28" /></TableRow></TableHeader>
                  <TableBody>
                    {backups.map((b, i) => (
                      <TableRow key={b.key}>
                        <TableCell className="font-mono text-sm">{b.date.replace('-pre-import', '')}{b.date.endsWith('-pre-import') && <Badge variant="gold" className="ml-2">antes de importar</Badge>}{i === 0 && <Badge variant="success" className="ml-2">último</Badge>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.ts ? new Date(b.ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                        <TableCell className="text-right font-mono text-xs tabular">{(b.size / 1024).toFixed(1)} KB</TableCell>
                        <TableCell className="py-1.5 text-right"><Button size="sm" variant="ghost" onClick={() => ask(() => core.restoreBackup(b.key), { destructive: true })}><ArchiveRestore /> Restaurar</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl font-semibold">Lotes históricos</CardTitle>
            <CardDescription>Importá lotes anteriores desde un JSON. Se combinan por referencia sin duplicar, y antes de importar se guarda un backup.</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" onClick={pickHist}><History /> Importar lotes históricos</Button></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl font-semibold">Sincronización</CardTitle>
            <CardDescription>{handle ? `Vinculada a ${handle.name || 'un archivo'} en iCloud Drive.` : 'Guardá tus datos en un archivo de iCloud Drive para tenerlos en todos tus equipos.'}</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" onClick={() => openDialog('sync')}><Cloud /> {handle ? 'Ver sincronización' : 'Configurar iCloud'}</Button></CardContent>
        </Card>

        <Card className="border-danger/30 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-2xl font-semibold text-danger"><Database className="size-5" /> Base de datos completa</CardTitle>
            <CardDescription>Todo junto (ingredientes, recetas y lotes) en un solo JSON. Restaurar o borrar reemplaza lo que tenés ahora.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => core.exportDB()}><Download /> Exportar todo</Button>
            <Button variant="outline" onClick={pickDb}><FileUp /> Restaurar todo desde JSON</Button>
            <Button variant="ghost" className="text-danger hover:text-danger sm:ml-auto" onClick={() => ask(() => core.resetDB(), { destructive: true })}><OctagonAlert /> Borrar todos los datos</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
