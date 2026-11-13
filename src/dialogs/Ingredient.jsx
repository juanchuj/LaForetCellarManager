import { useState } from 'react';
import { useDB, core } from '@/lib/store';
import { bridge, withForm } from '@/lib/core/bridge';
import { Field, SectionLabel, UnitInput } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cancel, Shell } from '@/dialogs/records';
import { tx } from '@/lib/i18n';

export const CATEGORIES = [['sal', tx('Sal')], ['sal-curado', tx('Sal de curado')], ['azucar', tx('Azúcar')], ['especia', tx('Especia')], ['hierba', tx('Hierba')], ['aditivo', tx('Aditivo')], ['liquido', tx('Líquido')], ['cultivo', tx('Cultivo')], ['carne', tx('Carne')]];
const UNITS_NEW = ['g', 'ml', 'tsp', 'tbsp', 'cup'];
const UNITS_EDIT = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pieza'];
const NUTR = [['kcal', 'Calorías', 'kcal', '143'], ['protein', 'Proteína', 'g', '21.0'], ['water', 'Agua', '%', '72'], ['fat', 'Grasa total', 'g', '6.0'], ['satFat', 'Grasa saturada', 'g', '2.1'], ['transFat', 'Grasa trans', 'g', '0'], ['sodium_mg', 'Sodio', 'mg', '55'], ['cholesterol', 'Colesterol', 'mg', '65'], ['fiber', 'Fibra', 'g', '0']];
const ANIMALS = ['cerdo', 'res', 'pato', 'cordero', 'pollo', 'jabalí', 'otro'];
const ANIMAL_LABEL = (a) => tx(a[0].toUpperCase() + a.slice(1));

function Sel({ value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
    </Select>
  );
}

/** New ingredient (saveIngredient) or edit (saveIngredientEdit) — both verbatim from v4.4.3. */
export function IngredientDialog({ id }) {
  const db = useDB();
  const ing = id ? db.ingredients.find((i) => i.id === id) : null;
  const [v, setV] = useState(() => {
    if (!ing) return { 'ing-n': '', 'ing-u': 'g', 'ing-c': 'especia', 'ing-dens': '', 'ing-note': '' };
    const n = ing.nutr || {}; const m = ing.meat || {};
    const o = { 'ing-en': ing.name, 'ing-eu': ing.unit || 'g', 'ing-ec': ing.category || 'especia', 'ing-edens': ing.gPerTsp ?? '', 'ing-en2': ing.note || '',
      'ing-m-animal': m.animal || 'cerdo', 'ing-m-kind': m.kind || 'generica', 'ing-m-fatLevel': m.fatLevel || 'magro', 'ing-m-cut': m.cut || '' };
    NUTR.forEach(([k]) => { o['ing-n-' + k] = n[k] ?? (k === 'transFat' || k === 'fiber' ? 0 : ''); });
    return o;
  });
  const set = (k) => (x) => setV((o) => ({ ...o, [k]: x?.target ? x.target.value : x }));
  const edit = !!ing;
  const cat = v[edit ? 'ing-ec' : 'ing-c'];
  const isSalt = cat === 'sal' || cat === 'sal-curado';
  const save = () => {
    if (edit) { bridge.win._editIng = ing.id; withForm(v, () => core.saveIngredientEdit()); }
    else { const f = { ...v }; if (!isSalt) delete f['ing-dens']; withForm(f, () => core.saveIngredient()); }
  };
  const k = (a, b) => (edit ? a : b);
  return (
    <Shell title={edit ? tx('Editar ingrediente') : tx('Nuevo ingrediente')} description={edit ? ing.name : tx('Si es una carne, después completás su clasificación y nutrientes.')} className="sm:max-w-2xl" onSubmit={save}
      footer={<><Cancel /><Button type="submit">{edit ? tx('Guardar') : tx('Crear')}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tx("Nombre")}><Input autoFocus value={v[k('ing-en', 'ing-n')]} onChange={set(k('ing-en', 'ing-n'))} /></Field>
        <Field label={tx("Unidad")}><Sel value={v[k('ing-eu', 'ing-u')]} onChange={set(k('ing-eu', 'ing-u'))} options={(edit ? UNITS_EDIT : UNITS_NEW).map((u) => [u, u])} /></Field>
        <Field label={tx("Categoría")}><Sel value={cat} onChange={set(k('ing-ec', 'ing-c'))} options={CATEGORIES} /></Field>
        {isSalt && <Field label={tx("Densidad (para EQ brine)")}><UnitInput unit="g/tsp" step="0.1" value={v[k('ing-edens', 'ing-dens')]} onChange={set(k('ing-edens', 'ing-dens'))} placeholder="6.0" inputClassName="pr-14" /></Field>}
        <Field label={tx("Nota")} className={isSalt ? 'sm:col-span-2' : ''}><Input value={v[k('ing-en2', 'ing-note')]} onChange={set(k('ing-en2', 'ing-note'))} /></Field>
      </div>
      {edit && cat === 'carne' && (
        <div className="grid gap-5 rounded-lg border bg-muted/40 p-4">
          <div>
            <SectionLabel>{tx("Clasificación de la carne")}</SectionLabel>
            <p className="mb-3 text-xs text-muted-foreground"><b>{tx("Genérica")}</b>{tx(": animal + nivel de grasa, típico de embutidos.")}{' '}<b>{tx("Corte")}</b>{tx(": una pieza concreta, típico de piezas enteras.")}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tx("Animal")}><Sel value={v['ing-m-animal']} onChange={set('ing-m-animal')} options={ANIMALS.map((a) => [a, ANIMAL_LABEL(a)])} /></Field>
              <Field label={tx("Tipo")}><Sel value={v['ing-m-kind']} onChange={set('ing-m-kind')} options={[['generica', tx('Genérica (por grasa)')], ['corte', tx('Corte específico')]]} /></Field>
              {v['ing-m-kind'] === 'generica'
                ? <Field label={tx("Nivel de grasa")}><Sel value={v['ing-m-fatLevel']} onChange={set('ing-m-fatLevel')} options={[['magro', tx('Magro')], ['entreverado', tx('Entreverado')], ['grasa', tx('Grasa pura')]]} /></Field>
                : <Field label={tx("Corte")}><Input value={v['ing-m-cut']} onChange={set('ing-m-cut')} placeholder={tx("bondiola, pernil…")} /></Field>}
            </div>
          </div>
          <div>
            <SectionLabel>{tx("Perfil nutricional · por 100 g crudo")}</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {NUTR.map(([key, label, unit, ph]) => <Field key={key} label={label}><UnitInput unit={unit} step="0.1" value={v['ing-n-' + key]} onChange={set('ing-n-' + key)} placeholder={ph} inputClassName="pr-12" /></Field>)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{tx("Referencia USDA FoodData Central. Se usa en la etiqueta nutricional de las recetas con esta carne.")}</p>
          </div>
        </div>
      )}
    </Shell>
  );
}
