import { useState } from 'react';
import { useDB, core } from '@/lib/store';
import { bridge, withForm } from '@/lib/core/bridge';
import { Field, SectionLabel, UnitInput } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cancel, Shell } from '@/dialogs/records';

export const CATEGORIES = [['sal', 'Sal'], ['sal-curado', 'Sal de curado'], ['azucar', 'Azúcar'], ['especia', 'Especia'], ['hierba', 'Hierba'], ['aditivo', 'Aditivo'], ['liquido', 'Líquido'], ['cultivo', 'Cultivo'], ['carne', 'Carne']];
const UNITS_NEW = ['g', 'ml', 'tsp', 'tbsp', 'cup'];
const UNITS_EDIT = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'pieza'];
const NUTR = [['kcal', 'Calorías', 'kcal', '143'], ['protein', 'Proteína', 'g', '21.0'], ['water', 'Agua', '%', '72'], ['fat', 'Grasa total', 'g', '6.0'], ['satFat', 'Grasa saturada', 'g', '2.1'], ['transFat', 'Grasa trans', 'g', '0'], ['sodium_mg', 'Sodio', 'mg', '55'], ['cholesterol', 'Colesterol', 'mg', '65'], ['fiber', 'Fibra', 'g', '0']];
const ANIMALS = ['cerdo', 'res', 'pato', 'cordero', 'pollo', 'jabalí', 'otro'];

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
    <Shell title={edit ? 'Editar ingrediente' : 'Nuevo ingrediente'} description={edit ? ing.name : 'Si es una carne, después completás su clasificación y nutrientes.'} className="sm:max-w-2xl" onSubmit={save}
      footer={<><Cancel /><Button type="submit">{edit ? 'Guardar' : 'Crear'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre"><Input autoFocus value={v[k('ing-en', 'ing-n')]} onChange={set(k('ing-en', 'ing-n'))} /></Field>
        <Field label="Unidad"><Sel value={v[k('ing-eu', 'ing-u')]} onChange={set(k('ing-eu', 'ing-u'))} options={(edit ? UNITS_EDIT : UNITS_NEW).map((u) => [u, u])} /></Field>
        <Field label="Categoría"><Sel value={cat} onChange={set(k('ing-ec', 'ing-c'))} options={CATEGORIES} /></Field>
        {isSalt && <Field label="Densidad (para EQ brine)"><UnitInput unit="g/tsp" step="0.1" value={v[k('ing-edens', 'ing-dens')]} onChange={set(k('ing-edens', 'ing-dens'))} placeholder="6.0" inputClassName="pr-14" /></Field>}
        <Field label="Nota" className={isSalt ? 'sm:col-span-2' : ''}><Input value={v[k('ing-en2', 'ing-note')]} onChange={set(k('ing-en2', 'ing-note'))} /></Field>
      </div>
      {edit && cat === 'carne' && (
        <div className="grid gap-5 rounded-lg border bg-muted/40 p-4">
          <div>
            <SectionLabel>Clasificación de la carne</SectionLabel>
            <p className="mb-3 text-xs text-muted-foreground"><b>Genérica</b>: animal + nivel de grasa, típico de embutidos. <b>Corte</b>: una pieza concreta, típico de piezas enteras.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Animal"><Sel value={v['ing-m-animal']} onChange={set('ing-m-animal')} options={ANIMALS.map((a) => [a, a[0].toUpperCase() + a.slice(1)])} /></Field>
              <Field label="Tipo"><Sel value={v['ing-m-kind']} onChange={set('ing-m-kind')} options={[['generica', 'Genérica (por grasa)'], ['corte', 'Corte específico']]} /></Field>
              {v['ing-m-kind'] === 'generica'
                ? <Field label="Nivel de grasa"><Sel value={v['ing-m-fatLevel']} onChange={set('ing-m-fatLevel')} options={[['magro', 'Magro'], ['entreverado', 'Entreverado'], ['grasa', 'Grasa pura']]} /></Field>
                : <Field label="Corte"><Input value={v['ing-m-cut']} onChange={set('ing-m-cut')} placeholder="bondiola, pernil…" /></Field>}
            </div>
          </div>
          <div>
            <SectionLabel>Perfil nutricional · por 100 g crudo</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {NUTR.map(([key, label, unit, ph]) => <Field key={key} label={label}><UnitInput unit={unit} step="0.1" value={v['ing-n-' + key]} onChange={set('ing-n-' + key)} placeholder={ph} inputClassName="pr-12" /></Field>)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Referencia USDA FoodData Central. Se usa en la etiqueta nutricional de las recetas con esta carne.</p>
          </div>
        </div>
      )}
    </Shell>
  );
}
