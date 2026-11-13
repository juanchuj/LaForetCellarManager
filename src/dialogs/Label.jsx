import { CircleCheck, Download, TriangleAlert } from 'lucide-react';
import { core } from '@/lib/store';
import { closeDialog } from '@/lib/dialogs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SectionLabel } from '@/components/form';
import { tx, txt } from '@/lib/i18n';

/* Inline preview: drop fixed width/height so the SVG scales; downloads use the original string. */
const fluid = (s) => s.replace(/\swidth="[^"]+"/, '').replace(/\sheight="[^"]+"/, '').replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:auto" ');

const THRESHOLDS = (n) => [
  [tx('Sodio'), txt`${Math.round(n.per100g.sodium_mg)} mg`, n.per100g.sodium_mg >= 400, tx('400 mg')],
  [tx('Grasa saturada'), `${n.per100g.satFat.toFixed(1)} g`, n.per100g.satFat >= 4, '4 g'],
  [tx('Grasa trans'), `${n.per100g.transFat.toFixed(2)} g`, n.per100g.transFat >= 1, '1 g'],
  [tx('Azúcares'), `${n.per100g.sugars.toFixed(1)} g`, n.per100g.sugars >= 10, '10 g'],
];

/** Port of openLabelModal: nutrition table + front-of-pack seals (Res. 810/2021 + 2492/2022). */
export function LabelDialog({ typeId, batchId }) {
  const db = core.getDB();
  const type = db.types.find((t) => t.id === typeId);
  const batch = batchId ? db.batches.find((b) => b.id === batchId) : null;
  const n = type ? core.computeNutrition(type) : null;
  if (!type || !n) {
    return (
      <Dialog open onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tx("Etiqueta nutricional")}</DialogTitle><DialogDescription>{tx("No se pudo calcular la nutrición: revisá la carne base y la receta del tipo.")}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={closeDialog}>{tx("Cerrar")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  const sellos = core.requiredSellos(type);
  const table = core.renderNutritionTableSVG(type, batch, null);
  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{tx("Etiqueta para el diseñador · {0}", [type.name])}</DialogTitle>
          <DialogDescription>{tx("Solo contenido regulatorio, sin marca (INVIMA Res. 810/2021 + 2492/2022). PNG en alta resolución o SVG vectorial para Illustrator o Figma.")}</DialogDescription>
        </DialogHeader>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>
            <SectionLabel action={<span className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7" onClick={() => core.exportNutritionTablePNG(type, batch, null)}><Download />{' '}{tx("PNG")}</Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => core.exportNutritionTableSVGFile(type, batch, null)}>{tx("SVG")}</Button></span>}>{tx("1 · Tabla nutricional")}</SectionLabel>
            <div className="max-h-[62vh] overflow-auto rounded-lg border bg-white p-3">
              <div className="mx-auto max-w-[440px] leading-[0]" dangerouslySetInnerHTML={{ __html: fluid(table) }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{tx("Formato tabular INVIMA. Valores por porción de")}{' '}<b>{n.servingG} g</b>{tx("; %VD sobre una dieta de 2.000 kcal.")}</p>
          </div>
          <div className="grid gap-5">
            <div>
              <SectionLabel action={sellos.length > 1 && <Button size="sm" variant="ghost" className="h-7" onClick={() => core.exportAllSellos(sellos)}><Download />{' '}{tx("Todos")}</Button>}>{tx("2 · Sellos frontales {0}", [sellos.length ? `(${sellos.length})` : ''])}</SectionLabel>
              {sellos.length ? (
                <ul className="grid gap-2.5">
                  {sellos.map((k) => (
                    <li key={k} className="flex items-center gap-3 rounded-lg border bg-background/50 p-3">
                      <div className="grid size-16 shrink-0 place-items-center rounded-md border bg-white p-1" dangerouslySetInnerHTML={{ __html: fluid(core.renderSelloSVG(k)) }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold tracking-wide">{core.SELLO_META[k].title}</div>
                        <div className="text-xs text-muted-foreground">{core.selloReasonText(k, n)}</div>
                      </div>
                      <div className="flex flex-col gap-1 sm:flex-row">
                        <Button size="sm" variant="outline" className="h-7" onClick={() => core.exportSelloPNG(k)}>{tx("PNG")}</Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => core.exportSelloSVGFile(k)}>{tx("SVG")}</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Alert variant="success"><CircleCheck /><AlertDescription>{tx("Esta receta")}{' '}<b>{tx("no requiere sellos frontales")}</b>{tx(": todos los nutrientes están por debajo de los umbrales.")}</AlertDescription></Alert>
              )}
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{tx("Umbrales Res. 810/2021 · por 100 g")}</div>
              <ul className="grid gap-1.5 text-sm">
                {THRESHOLDS(n).map(([l, v, over, lim]) => (
                  <li key={l} className="flex items-center justify-between gap-3">
                    <span>{l}</span>
                    <span className="flex items-center gap-2"><b className="font-mono tabular">{v}</b><span className={cn('w-16 text-right text-xs', over ? 'text-danger' : 'text-success')}>{over ? `≥ ${lim}` : `< ${lim}`}</span></span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <Alert variant="warning"><TriangleAlert /><AlertDescription>{tx("Valores calculados desde la receta, pendientes de validación por un laboratorio bromatológico para venta comercial. El diseñador debe respetar la proporción y el tamaño mínimo de los sellos (Res. 2492/2022).")}</AlertDescription></Alert>
        <DialogFooter><Button variant="outline" onClick={closeDialog}>{tx("Cerrar")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
