/* Verifies that src/lib/core/core.js computes exactly what v4.4.3 computes.
 * Runs the ORIGINAL legacy script in a sandbox and the generated module side by side. */
import vm from 'node:vm'; import fs from 'node:fs';
const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
const C = await import('../src/lib/core/core.js');
C.bootDB(); C.loadExampleRecipe(); C.migrateSalts(); // migrateSalts fills nitrite/nitrate % on cure salts, as on real data
const db = C.getDB();

const html = fs.readFileSync(new URL('../legacy/index-v4.4.3.html', import.meta.url), 'utf8');
const legacy = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).sort((a, b) => b.length - a.length)[0];
const el = () => ({ addEventListener() {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, style: {}, dataset: {}, querySelector: () => null, querySelectorAll: () => [], setAttribute() {}, appendChild() {}, closest: () => null });
const sb = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: el, body: el(), documentElement: el() }, navigator: {}, setTimeout, clearTimeout, console: { ...console, log() {} }, Date, Math, JSON, Intl, matchMedia: () => ({ matches: false, addEventListener() {} }) };
sb.window = sb; vm.createContext(sb);
vm.runInContext(legacy + '\n;globalThis.__api={calcEqBrine,calcAw,targetWeightForAw,dryingRateK,fickSaltPenetrationDays,calcFullResidual,vaporPressureDeficit,fickSmokeProfile,ebDays,calcCureContribution};', sb);
const L = sb.__api;

const brine = db.types[0].stages.find((s) => s.brine).brine;
const cases = [
  ['calcEqBrine', [1500, 2.8, 0, C.defaultSaltName(), brine]],
  ['calcEqBrine', [2210, 3.0, 0, C.defaultSaltName(), { cureSalt: { ingredient: 'InstaCure #2', gPerKg: 2.5 } }]],
  ['calcCureContribution', [{ cureSalt: { ingredient: 'InstaCure #1', gPerKg: 2.5 } }, 1800]],
  ['calcAw', [{ greenG: 1500, currentG: 1000, saltPct: 2.8, sucrosePct: 0.5 }]],
  ['targetWeightForAw', [{ greenG: 1500, awTarget: 0.9, saltPct: 2.8 }]],
  ['dryingRateK', [{ tempC: 13, hrPct: 78, thicknessCm: 8 }]],
  ['fickSaltPenetrationDays', [{ thicknessCm: 8, tempC: 4, fatPct: 25 }]],
  ['ebDays', [7.5, 'tubular', true]],
  ['calcFullResidual', [156, 0, 60, 13, 5.6]],
  ['calcFullResidual', [125, 500, 120, 13, 5.4]],
  ['vaporPressureDeficit', [13, 75]],
  ['fickSmokeProfile', [{ thicknessCm: 6, tempC: 25, hours: 6 }]],
];
let ok = 0;
for (const [fn, args] of cases) {
  // legacy needs the same ingredient catalog for cure-salt lookups
  vm.runInContext(`db = ${JSON.stringify(db)};`, sb);
  const a = JSON.stringify(C[fn](...structuredClone(args))), b = JSON.stringify(L[fn](...structuredClone(args)));
  const same = a === b; ok += same;
  console.log(`${same ? '✓' : '✗'} ${fn}  ${a.slice(0, 90)}${same ? '' : `\n   legacy: ${b.slice(0, 90)}`}`);
}
console.log(`\n${ok}/${cases.length} idénticos`);
process.exit(ok === cases.length ? 0 : 1);
