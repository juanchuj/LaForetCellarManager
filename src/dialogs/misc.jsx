import { useRef } from 'react';
import { Cloud, CloudOff, Download, FilePlus2, FolderOpen, RefreshCw, Unlink, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useDB, core, notify } from '@/lib/store';
import { ask, askNative, closeDialog } from '@/lib/dialogs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StageDot } from '@/components/stage-dot';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cancel, Shell } from '@/dialogs/records';

/* ── Agregar etapa a una receta ─────────────────────────── */
export function AddStageDialog({ typeId }) {
  return (
    <Shell title="Agregar etapa" description="Se agrega al final del flujo; después podés moverla." footer={<Cancel />} className="sm:max-w-xl">
      <div className="grid gap-2 sm:grid-cols-2">
        {core.STAGE_TYPES.map((s) => (
          <button key={s.k} type="button" onClick={() => { core.addStage(typeId, s.k); closeDialog(); }}
            className="rounded-lg border bg-background/50 p-3 text-left transition-colors hover:border-gold/50 hover:bg-gold/5">
            <div className="flex items-center gap-2 text-sm font-medium"><StageDot kind={s.k} />{s.label}
              <span className="ml-auto text-[10px] font-normal text-muted-foreground">{s.recipe === 'required' ? 'receta obligatoria' : s.recipe === 'optional' ? 'receta opcional' : 'sin receta'}</span></div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.note}</div>
          </button>
        ))}
      </div>
    </Shell>
  );
}

/* ── Sincronización con iCloud Drive (File System Access API) ── */
export function SyncDialog() {
  useDB();
  const file = useRef(null);
  const { handle, status } = core.getCloud();
  const supported = core.icloudSupported();
  const importJson = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { try { core.setDB(JSON.parse(ev.target.result)); core.saveDB(); notify(); toast.success('Datos importados'); } catch { toast.error('Archivo inválido'); } };
    r.readAsText(f); e.target.value = '';
  };
  return (
    <Shell title="Sincronización con iCloud" description="Guardá tus datos en un archivo de iCloud Drive para tenerlos en todos tus equipos." footer={<Cancel>Cerrar</Cancel>}>
      <input ref={file} type="file" accept=".json,application/json" className="hidden" onChange={(e) => ask(() => importJson(e))} />
      {!supported ? (
        <>
          <Alert variant="warning"><CloudOff /><AlertDescription>Este navegador no permite guardar archivos directamente (Safari no lo soporta). Usá <b>Chrome, Edge o Brave</b> en tu Mac, o exportá e importá a mano.</AlertDescription></Alert>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => core.exportDB()}><Download /> Exportar JSON</Button>
            <Button type="button" variant="outline" onClick={() => file.current?.click()}><Upload /> Importar JSON</Button>
          </div>
        </>
      ) : !handle ? (
        <>
          <ol className="grid gap-3">
            {[['Elegí una opción', 'Creá un archivo nuevo o abrí uno que ya tengas en iCloud Drive.'], ['Guardalo dentro de iCloud Drive', 'En el diálogo, navegá a iCloud Drive › La Forêt. macOS lo sincroniza solo.'], ['Listo', 'Desde ahí cada cambio se guarda automáticamente en ese archivo.']].map(([t, d], i) => (
              <li key={i} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary font-mono text-xs">{i + 1}</span><div><div className="text-sm font-medium">{t}</div><div className="text-xs text-muted-foreground">{d}</div></div></li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => askNative(() => core.icloudLink())}><FilePlus2 /> Crear archivo nuevo</Button>
            <Button type="button" variant="outline" onClick={() => askNative(() => core.icloudOpenExisting())}><FolderOpen /> Abrir archivo existente</Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <Cloud className={cn('size-6', status === 'error' ? 'text-danger' : status === 'denied' ? 'text-warning' : 'text-success')} />
            <div className="min-w-0">
              <div className="truncate font-mono text-sm">{handle.name || 'archivo.json'}</div>
              <div className={cn('text-xs', status === 'error' ? 'text-danger' : status === 'denied' ? 'text-warning' : 'text-success')}>
                {status === 'error' ? 'Error al escribir el archivo. Probá «Guardar ahora».' : status === 'denied' ? 'El navegador necesita permiso para escribir. Probá «Guardar ahora» y aceptá.' : 'Sincronizado. Cada cambio se guarda solo.'}
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={() => core.icloudPush(true)}><RefreshCw /> Guardar ahora</Button>
            <Button type="button" variant="outline" onClick={() => askNative(() => core.icloudPull())}><Download /> Cargar desde archivo</Button>
            <Button type="button" variant="outline" onClick={() => askNative(() => core.icloudOpenExisting())}><FolderOpen /> Cambiar de archivo</Button>
            <Button type="button" variant="outline" className="text-danger" onClick={() => askNative(() => core.icloudUnlink())}><Unlink /> Desvincular</Button>
          </div>
          <p className="text-xs text-muted-foreground">«Cargar desde archivo» trae la última versión, útil si editaste en otro equipo.</p>
        </>
      )}
    </Shell>
  );
}

/* ── Lotes históricos: vista previa (port de previewHistoricalImport) ── */
export function HistoricalImportDialog({ incoming }) {
  const db = core.getDB();
  const existingRefs = new Set(db.batches.map((b) => b.ref));
  const resolved = [], unresolved = [], duplicates = [];
  incoming.forEach((b) => {
    if (existingRefs.has(b.ref)) { duplicates.push(b); return; }
    let type = db.types.find((t) => t.id === b.typeId);
    if (!type) type = db.types.find((t) => t.name === b.typeName);
    if (!type) type = db.types.find((t) => t.ref === b.typeRef);
    if (!type) { const root = (b.typeName || '').split(' ')[0].toLowerCase(); type = db.types.find((t) => t.name.toLowerCase().startsWith(root)); }
    if (!type) { unresolved.push(b); return; }
    const copy = JSON.parse(JSON.stringify(b)); copy.typeId = type.id; copy.typeName = type.name; copy.typeRef = type.ref;
    resolved.push(copy);
  });
  const byType = {}; resolved.forEach((b) => { byType[b.typeName] = (byType[b.typeName] || 0) + 1; });
  return (
    <Shell title="Importar lotes históricos" className="sm:max-w-2xl"
      footer={<><Cancel /><Button type="button" disabled={!resolved.length} onClick={() => core.commitHistoricalImport(resolved)}>Importar {resolved.length} lote{resolved.length === 1 ? '' : 's'}</Button></>}>
      <div className="grid grid-cols-3 gap-3">
        {[['Importables', resolved.length, 'text-success', 'mapeados a tus tipos'], ['Duplicados', duplicates.length, 'text-warning', 'la ref ya existe · se omiten'], ['Sin tipo', unresolved.length, unresolved.length ? 'text-danger' : 'text-muted-foreground', 'no se encontró el tipo · se omiten']].map(([l, n, c, d]) => (
          <div key={l} className="rounded-lg border bg-background/50 p-3"><div className="text-xs text-muted-foreground">{l}</div><div className={cn('font-mono text-2xl tabular', c)}>{n}</div><div className="text-[11px] text-muted-foreground">{d}</div></div>
        ))}
      </div>
      {resolved.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">{Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => <li key={t} className="flex justify-between px-3 py-1.5"><span>{t}</span><span className="font-mono">{n}</span></li>)}</ul>
      )}
      {unresolved.length > 0 && (
        <Alert variant="danger"><AlertDescription>Sin receta correspondiente (creá el tipo primero o corregí el JSON): {[...new Set(unresolved.map((b) => b.typeName))].slice(0, 10).join(', ')}</AlertDescription></Alert>
      )}
      <p className="text-xs text-muted-foreground">Antes de importar se guarda un backup de tus datos actuales; lo encontrás en Biblioteca si necesitás volver atrás.</p>
    </Shell>
  );
}
