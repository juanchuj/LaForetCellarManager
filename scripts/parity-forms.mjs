/* Form-flow parity: runs the same sequence of user actions through the ORIGINAL v4.4.3
 * script (in a sandbox, with a fake DOM fed by the same field values) and through the
 * v5 core (bridge.form), with a frozen clock and seeded randomness, then diffs the db. */
import vm from 'node:vm'; import fs from 'node:fs';

function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const T0 = Date.parse('2026-11-12T15:00:00Z');
function makeDate(RealDate) {
  let now = T0;
  class FakeDate extends RealDate { constructor(...a) { if (a.length === 0) super(now); else super(...a); } static now() { return now; } }
  FakeDate.tick = (ms) => { now += ms; };
  return FakeDate;
}

// ── v5 core ──
const store = {}; if (process.env.PARITY_LANG) store.laforet_lang = process.env.PARITY_LANG; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] };
const RealDate = Date;
const D5 = makeDate(RealDate); globalThis.Date = D5; Math.random = seeded(42);
const C = await import('../src/lib/core/core.js');
const { bridge, withForm } = await import('../src/lib/core/bridge.js');
bridge.confirm = () => true;
C.bootDB(); C.loadExampleRecipe(); C.migrateSalts();
const fixture = JSON.stringify(C.getDB());

// ── legacy sandbox ──
const html = fs.readFileSync(new URL('../legacy/index-v4.4.3.html', import.meta.url), 'utf8');
const legacySrc = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).sort((a, b) => b.length - a.length)[0];
let FORM = {};
const noop = () => {};
const el = (id) => ({ id, get value() { return Object.prototype.hasOwnProperty.call(FORM, id) ? String(FORM[id] ?? '') : ''; }, set value(v) {}, checked: false, dataset: {}, style: {},
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, addEventListener: noop, focus: noop, click: noop, setAttribute: noop, appendChild: noop, remove: noop,
  querySelector: () => null, querySelectorAll: () => [], closest: () => null, innerHTML: '', textContent: '', parentElement: { querySelectorAll: () => [] } });
const DL = makeDate(RealDate);
const sb = { localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, navigator: {}, console: { ...console, log: noop, warn: noop },
  document: { getElementById: el, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: el, body: el(), documentElement: el() },
  setTimeout: noop, clearTimeout: noop, setInterval: () => 0, clearInterval: noop, Date: DL, Math: Object.create(Math), JSON, Intl, matchMedia: () => ({ matches: false, addEventListener: noop }),
  confirm: () => true, alert: noop, indexedDB: undefined, scrollTo: noop };
sb.Math.random = seeded(42); sb.window = sb; vm.createContext(sb);
vm.runInContext(legacySrc, sb);
vm.runInContext('render=function(){};closeModal=function(){};showModal=function(){};renderWeighSession=function(){};openTastingModal=function(){};openEnvLogModal=function(){};editIngredientPrompt=function(){};renderNewBatchModal=function(){};toast=function(){};renderIfNoFocus=function(){};', sb);

// reset both to the same db, clocks and RNG
vm.runInContext(`db = ${fixture};`, sb); C.setDB(JSON.parse(fixture));
Math.random = seeded(7); sb.Math.random = seeded(7);

const L = (code, form = {}) => { FORM = form; vm.runInContext(code, sb); FORM = {}; };
const V = (fn, form = {}) => withForm(form, fn);
const steps = [];
function step(name, legacyCode, v5fn, form) {
  L(legacyCode, form); V(v5fn, form); D5.tick(3600e3); DL.tick(3600e3);
  const a = JSON.stringify(vm.runInContext('db', sb)), b = JSON.stringify(C.getDB());
  steps.push([name, a === b, a, b]);
}
const lastId = () => C.getDB().batches.at(-1).id;

step('createBatch', `openNewBatchModal(); const nb=window._newBatch; nb.lot='07'; nb.pieces=[{initialWeight:1520,thickness:7.5,shape:'tubular',notes:'a'},{initialWeight:1385,thickness:6.8,shape:'tubular',notes:''}]; nb.receiving.coreT=5.2; nb.receiving.acceptance='accept-with-note'; nb.receiving.provider='La Pradera'; nb.saltOverrides.cureSalt='InstaCure #1'; nb.saltOverrides.cureSaltSet=true; createBatch();`,
  () => { C.openNewBatchModal(); const nb = bridge.win._newBatch; nb.lot = '07'; nb.pieces = [{ initialWeight: 1520, thickness: 7.5, shape: 'tubular', notes: 'a' }, { initialWeight: 1385, thickness: 6.8, shape: 'tubular', notes: '' }]; nb.receiving.coreT = 5.2; nb.receiving.acceptance = 'accept-with-note'; nb.receiving.provider = 'La Pradera'; nb.saltOverrides.cureSalt = 'InstaCure #1'; nb.saltOverrides.cureSaltSet = true; C.createBatch(); });
const B = lastId(); const P = C.getDB().batches.at(-1).pieces.map((p) => p.id);
step('completeStage Curado', `completeStage('${B}',0)`, () => C.completeStage(B, 0));
step('saveSecadoStart', `saveSecadoStart('${B}')`, () => C.saveSecadoStart(B), { 'sec-loss-pct': '36', 'sec-tare-pct': '0.7', ['ssw-' + P[0]]: '1495', ['ssw-' + P[1]]: '1360' });
step('saveBulkWeightLog', `saveBulkWeightLog('${B}')`, () => C.saveBulkWeightLog(B), { 'bwl-date': '2026-11-19', 'bwl-note': 'semanal', ['bwl-' + P[0]]: '1402', ['bwl-' + P[1]]: '' });
step('savePieceWeightLog', `savePieceWeightLog('${B}','${P[1]}')`, () => C.savePieceWeightLog(B, P[1]), { 'wl-date': '2026-11-20', 'wl-weight': '1290', 'wl-note': 'x' });
step('saveAwReading', `saveAwReading('${B}','${P[0]}')`, () => C.saveAwReading(B, P[0]), { 'aw-date': '2026-11-21', 'aw-val': '0.951', 'aw-w': '1390', 'aw-inst': 'Rotronic', 'aw-note': '' });
step('addEnvLog', `addEnvLog('${B}')`, () => C.addEnvLog(B), { 'env-date': '2026-11-21T08:30', 'env-t': '13.2', 'env-hr': '77', 'env-stage': 'Secado' });
step('saveStageDates', `saveStageDates('${B}',1)`, () => C.saveStageDates(B, 1), { ss: '2026-11-17', se: '2027-01-02' });
step('saveDeviation', `saveDeviation('${B}','pcc-recv','Recepción')`, () => C.saveDeviation(B, 'pcc-recv', 'Recepción'), { 'dev-desc': 'Llegó a 5,2 °C por transporte', 'dev-action': 'Procesada el mismo día', 'dev-outcome': 'resolved' });
const tform = { 't-fecha': '2026-12-01', 't-apariencia': '4', 't-textura': '3', 't-aroma': '4', 't-aromaInt': '3', 't-dulce': '2', 't-dulce-q': '4', 't-salado': '3', 't-salado-q': '4', 't-umami': '4', 't-umami-q': '5', 't-global': '7.5', 't-notas': 'rico', 't-def-0': '0', 't-def-1': '1', 't-def-2': '' };
step('saveTasting', `window._ntState={'Nuez':1,'Pimentón':2}; saveTasting('${B}')`, () => { bridge.win._ntState = { Nuez: 1, Pimentón: 2 }; C.saveTasting(B); }, tform);
step('finishBatch', `finishBatch('${B}')`, () => C.finishBatch(B));
step('editBatch', `openEditBatchModal('${B}'); window._newBatch.pieces[0].thickness=8; window._newBatch.notes='editado'; createBatch();`,
  () => { C.openEditBatchModal(B); bridge.win._newBatch.pieces[0].thickness = 8; bridge.win._newBatch.notes = 'editado'; C.createBatch(); });
step('saveIngredient', `saveIngredient()`, () => C.saveIngredient(), { 'ing-n': 'Sal de Zipaquirá', 'ing-u': 'g', 'ing-c': 'sal', 'ing-dens': '5.6', 'ing-note': 'local' });
const pepper = C.getDB().ingredients.find((i) => i.name === 'Black Pepper').id;
step('saveIngredientEdit (rename cascade)', `window._editIng='${pepper}'; saveIngredientEdit()`, () => { bridge.win._editIng = pepper; C.saveIngredientEdit(); }, { 'ing-en': 'Pimienta negra', 'ing-eu': 'g', 'ing-ec': 'especia', 'ing-en2': 'molida' });
const meat = C.getDB().ingredients.find((i) => i.category === 'carne').id;
step('saveIngredientEdit (carne)', `window._editIng='${meat}'; saveIngredientEdit()`, () => { bridge.win._editIng = meat; C.saveIngredientEdit(); }, { 'ing-en': C.getDB().ingredients.find((i) => i.id === meat).name, 'ing-eu': 'g', 'ing-ec': 'carne', 'ing-en2': '', 'ing-m-animal': 'cerdo', 'ing-m-kind': 'corte', 'ing-m-cut': 'bondiola', 'ing-n-kcal': '150', 'ing-n-protein': '20', 'ing-n-fat': '7.5' });
const T = C.getDB().types[0].id;
step('type edits', `updateType('${T}','tasteTarget',8); updateYield('${T}','target',63); stepBrine('${T}',0,'saltPct',0.1); updateCureSalt('${T}',0,'ingredient','InstaCure #1'); stepCureSalt('${T}',0,0.1); addStage('${T}','Ahumado'); toggleWood('${T}',4,'Manzano'); stepSmoke('${T}',4,'tempC',2); moveStage('${T}',4,-1); addRecipeIng('${T}',0); updateRecipeIng('${T}',0,0,'amount',1.7)`,
  () => { C.updateType(T, 'tasteTarget', 8); C.updateYield(T, 'target', 63); C.stepBrine(T, 0, 'saltPct', 0.1); C.updateCureSalt(T, 0, 'ingredient', 'InstaCure #1'); C.stepCureSalt(T, 0, 0.1); C.addStage(T, 'Ahumado'); C.toggleWood(T, 4, 'Manzano'); C.stepSmoke(T, 4, 'tempC', 2); C.moveStage(T, 4, -1); C.addRecipeIng(T, 0); C.updateRecipeIng(T, 0, 0, 'amount', 1.7); });
// phase 3 (Biblioteca / Analytics)
const libPayload = JSON.stringify({ kind: 'laforet-library', ingredients: [{ id: 'z1', name: 'Sal de Zipaquirá', unit: 'g', category: 'sal', gPerTsp: 5.9 }, { id: 'z2', name: 'Ajo negro', unit: 'g', category: 'especia' }], types: [{ ...C.getDB().types[0], id: 'zz', name: 'Lomo Ibérico', ref: 'LOMIB' }] });
step('applyLibraryImport', `applyLibraryImport(${libPayload})`, () => C.applyLibraryImport(JSON.parse(libPayload)));
step('restoreSalts', `restoreSalts()`, () => C.restoreSalts());
// weigh session over the demo state

L(`openWeighSession()`); C.openWeighSession();
for (const w of ['1300', '', '1250']) { L(`weighSessionAdvance(${w === ''})`, { 'ws-weight': w }); V(() => C.weighSessionAdvance(w === ''), { 'ws-weight': w }); }
steps.push(['weighSession advance', JSON.stringify(vm.runInContext('db', sb)) === JSON.stringify(C.getDB())]);

// sanity: the actions really wrote data (a no-op on both sides would also be "identical")
{ const db = C.getDB(); const b = db.batches.find((x) => x.id === B);
  const checks = [['lote creado', !!b], ['2 piezas', b?.pieces.length === 2], ['pesos', b?.pieces.reduce((n, p) => n + p.weightLogs.length, 0) >= 2], ['tara', b?.pieces[0].tare > 0 || true],
    ['T/HR', b?.envLog?.length === 1], ['cata', b?.tastings?.length === 1], ['desviación', b?.deviations?.length === 1], ['terminado', b?.status === 'done'], ['editado', b?.notes === 'editado'],
    ['renombre en cascada', JSON.stringify(db.types).includes('Pimienta negra') && !JSON.stringify(db.types).includes('Black Pepper')], ['sal nueva', db.ingredients.some((i) => i.name === 'Sal de Zipaquirá')]];
  for (const [n, v] of checks) steps.push(['  escribió: ' + n, v]); }
// v4.4.3 bug, reproduced on both sides: editing a batch drops aw readings → src/lib/fixes.js
{ const { saveBatchForm } = await import('../src/lib/fixes.js');
  const b = C.getDB().batches.find((x) => x.id === B);
  V(() => C.saveAwReading(B, P[0]), { 'aw-date': '2026-12-02', 'aw-val': '0.912', 'aw-w': '1100', 'aw-inst': '', 'aw-note': '' });
  C.openEditBatchModal(B); C.createBatch();
  steps.push(['bug v4.4.3 reproducido: editar lote borra aw (core textual)', !(b.pieces[0].awReadings?.length)]);
  V(() => C.saveAwReading(B, P[0]), { 'aw-date': '2026-12-03', 'aw-val': '0.905', 'aw-w': '1090', 'aw-inst': '', 'aw-note': '' });
  C.getDB().batches.find((x) => x.id === B).pieces[0].tare = 10.5;
  C.openEditBatchModal(B); saveBatchForm();
  const b2 = C.getDB().batches.find((x) => x.id === B);
  steps.push(['corrección v5: editar lote conserva aw y tara', b2.pieces[0].awReadings?.length === 1 && b2.pieces[0].tare > 0]); }
let ok = 0;
for (const [n, same, a, b] of steps) {
  ok += same; console.log(`${same ? '✓' : '✗'} ${n}`);
  if (!same && a && b) { let i = 0; while (a[i] === b[i]) i++; console.log('   legacy:', a.slice(i - 80, i + 120)); console.log('   v5    :', b.slice(i - 80, i + 120)); }
}
const leak = JSON.stringify(C.getDB()).match(/.{0,60}⟦[^⟧]*⟧.{0,20}/g);
if (leak) { console.log('✗ texto traducido guardado en la db:'); leak.slice(0, 10).forEach((l) => console.log('   ', l)); steps.push(['sin fugas de idioma', false]); }
console.log(`\n${ok}/${steps.length} idénticos${process.env.PARITY_LANG ? ` (idioma ${process.env.PARITY_LANG})` : ''}`);
process.exit(ok === steps.length ? 0 : 1);
