/* Collects every translatable key (Spanish source) and checks en/it coverage.
 *   node scripts/i18n-check.mjs            → report missing / unused keys, exit 1 if any missing
 *   node scripts/i18n-check.mjs --list     → print all keys as JSON
 * Sources: tx('…') / txt`…` calls in src, the core strings wrapped by gen-core (src/i18n/core-keys.json),
 * and data catalogs that React translates at display time (stage kinds, defects, tasting notes, hazards…). */
import fs from 'node:fs'; import path from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const keys = new Set(JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/core-keys.json'), 'utf8')));
const files = []; (function rec(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!/core$|i18n$/.test(p)) rec(p); } else if (/\.(jsx?|mjs)$/.test(f)) files.push(p); } })(path.join(root, 'src'));
const unq = (s) => JSON.parse(s[0] === "'" ? '"' + s.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"' : s);
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?<![\w.$])tx\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g)) keys.add(unq(m[1]));
  for (const m of src.matchAll(/(?<![\w.$])txt`((?:[^`\\]|\\.)*)`/g)) {
    let i = 0, depth = 0, out = '', s = m[1];
    for (let k = 0; k < s.length; k++) {
      if (depth === 0 && s[k] === '$' && s[k + 1] === '{') { depth = 1; k++; out += `{${i++}}`; continue; }
      if (depth > 0) { if (s[k] === '{') depth++; else if (s[k] === '}') depth--; continue; }
      out += s[k];
    }
    keys.add(out.replace(/\\`/g, '`'));
  }
}
// display-time catalogs (data in the db / core keys)
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const C = await import('../src/lib/core/core.js');
C.STAGE_TYPES.forEach((s) => keys.add(s.k));
C.DEFECT_CATALOG.forEach((d) => keys.add(d.name));
C.NOTE_FAMILIES.forEach((f) => { keys.add(f.f); f.n.forEach((n) => keys.add(n)); }); keys.add('Propias');
Object.entries(C.HAZARD_CATALOG).forEach(([k, v]) => { keys.add(k); Object.values(v).flat().forEach((x) => keys.add(x)); }); keys.add('default');
C.SMOKE_WOODS.forEach((w) => keys.add(w.es));
for (const stages of [[], [{ kind: 'Fermentado' }, { kind: 'Ahumado' }]]) C.defaultPCCsForType({ category: 'embutido', stages }).forEach((p) => { if (!p.label.startsWith('aw final')) keys.add(p.label); keys.add(p.hazard); });
['lote', 'tipo (receta madre)', 'ingrediente', 'aw final ≤ {0}'].forEach((k) => keys.add(k));
['Cerdo', 'Res', 'Pato', 'Cordero', 'Pollo', 'Jabalí', 'Otro'].forEach((k) => keys.add(k));
for (const k of [...keys]) if (!/[A-Za-zÁ-úñÑ]/.test(k)) keys.delete(k);
const all = [...keys].sort((a, b) => a.localeCompare(b, 'es'));
if (process.argv.includes('--list')) { console.log(JSON.stringify(all, null, 1)); process.exit(0); }
let bad = 0;
for (const lang of ['en', 'it']) {
  const dict = (await import(`../src/i18n/${lang}.js`)).default;
  const miss = all.filter((k) => !(k in dict)); const unused = Object.keys(dict).filter((k) => !keys.has(k));
  const ph = all.filter((k) => k in dict).filter((k) => { const want = (k.match(/\{\d+\}/g) || []).sort().join(); return [].concat(dict[k]).slice(0, 2).some((v) => typeof v === 'string' && (v.match(/\{\d+\}/g) || []).filter((x, i, a) => a.indexOf(x) === i).sort().join() !== [...new Set(k.match(/\{\d+\}/g) || [])].sort().join() && !(Array.isArray(dict[k]))); });
  console.log(`${lang}: ${all.length - miss.length}/${all.length} traducidas · ${miss.length} faltan · ${unused.length} sin uso · ${ph.length} con placeholders distintos`);
  if (process.argv.includes('-v')) { miss.slice(0, 40).forEach((k) => console.log('   falta:', JSON.stringify(k))); ph.forEach((k) => console.log('   placeholders:', JSON.stringify(k))); unused.slice(0, 20).forEach((k) => console.log('   sin uso:', JSON.stringify(k))); }
  bad += miss.length + ph.length;
}
process.exit(bad ? 1 : 0);
