/* Regenerates src/lib/core/core.js from a legacy single-file index.html.
 * Keeps every pure calculation / data-model / data-action declaration VERBATIM,
 * drops the HTML-string and DOM UI layer, and routes UI side effects through bridge.js.
 * Usage: node scripts/gen-core.mjs <legacy.html> <out.js> */
import * as acorn from 'acorn'; import * as walk from 'acorn-walk'; import fs from 'fs'; import MagicString from 'magic-string';
const [inFile, outFile] = process.argv.slice(2);
const html = fs.readFileSync(inFile, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const src = scripts.sort((a, b) => b.length - a.length)[0];
const ast = acorn.parse(src, { ecmaVersion: 'latest' });
const isDecl = n => ['FunctionDeclaration', 'VariableDeclaration', 'ClassDeclaration'].includes(n.type);
const namesOf = n => n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name).filter(Boolean) : [n.id.name];
const classify = code => /\bdocument\.|\bwindow\.|innerHTML|querySelector|addEventListener|navigator\./.test(code) ? 'dom'
  : /<(div|span|button|svg|table|input|section)\b/.test(code) ? 'html' : 'logic';
// UI calls that logic is allowed to make — forwarded to React through the bridge
const BRIDGED = ['render', 'toast', 'closeModal', 'renderIfNoFocus', 'goto', 'openBulkWeightModal', 'openTastingModal',
  'openEnvLogModal', 'openSafeDeleteModal', 'renderIcloudStatus', 'renderSyncModalBody', 'showModal', 'updateNavCounts',
  'renderNewBatchModal', 'renderWeighSession', 'editIngredientPrompt', 'renderFlowStage', 'openSecadoStartModal'];
// Form-driven data writes: kept VERBATIM, only their DOM reads are rewired —
//   document.getElementById(id) → __el(id)  (reads the React form state in bridge.form)
//   window._state               → __win._state
const FORM = new Set(['createBatch', 'openNewBatchModal', 'openEditBatchModal', 'saveStageDates', 'saveSecadoStart',
  'savePieceWeightLog', 'saveAwReading', 'saveBulkWeightLog', 'savePh', 'openWeighSession', 'weighSessionAdvance',
  'addEnvLog', 'saveTasting', 'readTastingForm', 'saveIngredient', 'saveIngredientEdit', 'saveDeviation',
  'icloudSupported', 'icloudLink', 'icloudPull', 'icloudOpenExisting', 'ensureHandlePermission', 'exportDB', 'exportLibrary', 'downloadBackup']);
// String generators for labels/seals and their file exporters: domain output, kept verbatim
const FORCE = new Set(['renderSelloSVG', 'renderNutritionTableSVG', 'exportSVGasPNG', 'exportSVGFile']);
const all = {}; ast.body.forEach((n, i) => isDecl(n) && namesOf(n).forEach(x => (all[x] = i)));
const keep = new Set();
ast.body.forEach((n, i) => {
  if (!isDecl(n)) return; const names = namesOf(n);
  if (names.some(x => BRIDGED.includes(x))) return;
  if (classify(src.slice(n.start, n.end)) === 'logic' || names.some(x => FORCE.has(x) || FORM.has(x))) keep.add(i);
});
const kept = new Set([...keep].flatMap(i => namesOf(ast.body[i])));
const missing = new Map();
for (const i of keep) walk.full(ast.body[i], x => {
  if (x.type === 'Identifier' && all[x.name] !== undefined && !kept.has(x.name) && !BRIDGED.includes(x.name))
    missing.set(x.name, namesOf(ast.body[i]).join(','));
});
if (missing.size) { console.error('Unresolved UI dependencies (add to BRIDGED or FORCE):', Object.fromEntries(missing)); process.exit(1); }

/* ── i18n ──
 * User-facing strings are wrapped so they translate at runtime:  'Texto' → __t('Texto'),  `A ${x}` → __tt`A ${x}`.
 * In Spanish both are the identity, so the Spanish build is byte-for-byte equivalent in behavior.
 * Strings that are DATA (seeds, catalog keys, values stored in the db, comparisons, lookups) are never wrapped;
 * React translates those at display time.  parity-forms runs in en/it too and fails if any wrapped text reaches the db. */
// Declarations whose literals are data: only their toast/confirm/alert messages are translated.
const I18N_DATA_DECLS = new Set(['LS_KEY', 'APP_TZ', 'BACKUP_PREFIX', 'BACKUP_LAST_KEY', 'IDB_NAME', 'IDB_STORE', 'EB_TABLE',
  'SEED_SALTS', 'SEED_INGREDIENTS', 'SEED_TYPES', 'MEAT_NUTR_SEEDS', 'MEAT_META_SEEDS', 'BASE_MEAT_COMPOSITIONS', 'CUT_TO_INGREDIENT',
  'MEAT_CUTS', 'MEAT_PROFILES', 'NOTE_FAMILIES', 'noteFamilies', 'SMOKE_WOODS', 'stepSmoke', 'toggleWood', 'HAZARD_CATALOG',
  'defaultPCCsForType', 'pccsForType', 'migrateSalts', 'migrateBackfillBrineOnBatches', 'migrateStripSaltFromCureBatches',
  'migrateWeightLogsToPieces', 'migrateMeatIngredients', 'migrateBaseMeat', 'migrateTastings', 'loadExampleRecipe', 'createNewType',
  'duplicateType', 'importGoveeCsv', 'addBaseMeatPart', 'seedDB', 'restoreSalts', 'commitHistoricalImport', 'calcEqBrine', 'recordDeviation']);
const I18N_SKIP_PROPS = new Set(['k', 'n', 'i', 'f', 'es', 'en', 'id', 'key', 'kind', 'type', 'cat', 'category', 'unit', 'ref', 'form',
  'saltIngredient', 'ingredient', 'notes', 'name', 'intensity', 'cls', 'color', 'level', 'status', 'tier', 'icon', 'shape']);
const I18N_WRAP_CALLS = new Set(['toast', '__confirm', '__alert', 'confirm', 'alert', 'push', 'unshift', 'Error']);
const isHuman = (s) => /[A-Za-zÁÉÍÓÚáéíóúñÑ]{2,}/.test(s)
  && (/\s/.test(s.trim()) || /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(s) || /^[A-ZÁÉÍÓÚ¿¡]/.test(s.trim()))
  && !/^(var\(|rgba?\(|M\d|data:|https?:|#[0-9a-f]{3})/i.test(s.trim()) && !/<[a-z/]/i.test(s);
const declName = (n) => namesOf(n)[0];
const ms = new MagicString(src);
const i18nKeys = new Set();
const i18nSkipped = [];
// Display text compared against itself (e.g. bolding the INGREDIENTES line): wrap both sides
const I18N_FORCE = new Set(['INGREDIENTES']);
function i18nWrap(declNode) {
  const dataDecl = I18N_DATA_DECLS.has(declName(declNode));
  // Markup templates (label SVGs): translate the text nodes, e.g. `<text…>Calorías ${k}</text>` → `<text…>${__tt`Calorías ${k}`}</text>`
  walk.full(declNode, (n) => {
    if (n.type !== 'TemplateLiteral' || !n.quasis.some((q) => q.value.raw.includes('<'))) return;
    let inText = false, runStart = 0, key = '', ph = 0;
    n.quasis.forEach((q, qi) => {
      const raw = q.value.raw;
      for (let k = 0; k < raw.length; k++) {
        const pos = q.start + k;
        if (raw[k] === '>') { inText = true; runStart = pos + 1; key = ''; ph = 0; }
        else if (raw[k] === '<') {
          if (inText && isHuman(key.replace(/\{\d+\}/g, '')) && /[A-Za-zÁ-ú]{3}/.test(key)) {
            ms.appendLeft(runStart, '${__tt`'); ms.prependRight(pos, '`}'); i18nKeys.add(key.trim() === key ? key : key);
          }
          inText = false;
        } else if (inText) key += raw[k];
      }
      if (inText && qi < n.expressions.length) key += `{${ph++}}`;
    });
  });
  walk.fullAncestor(declNode, (n, _s, anc) => {
    let text;
    if (n.type === 'Literal' && typeof n.value === 'string') text = n.value;
    else if (n.type === 'TemplateLiteral') text = n.quasis.map((q, i) => q.value.cooked + (i < n.expressions.length ? `{${i}}` : '')).join('');
    else return;
    if (!isHuman(text)) return;
    const parent = anc[anc.length - 2];
    if (!parent || parent.type === 'TaggedTemplateExpression' || parent.type === 'ImportDeclaration') return;
    if (parent.type === 'Property' && parent.key === n) return;
    // climb through expressions that just pass the string along
    let cur = n, i = anc.length - 2, p = anc[i];
    while (p && ((p.type === 'ConditionalExpression' && p.test !== cur) || p.type === 'LogicalExpression'
      || (p.type === 'BinaryExpression' && p.operator === '+') || p.type === 'TemplateLiteral')) { cur = p; p = anc[--i]; }
    let ok;
    if (!p) ok = false;
    else if (p.type === 'BinaryExpression' || p.type === 'SwitchCase') ok = false;               // comparisons
    else if (p.type === 'MemberExpression') ok = false;                                           // obj['key']
    else if (p.type === 'Property') ok = p.value === cur && !I18N_SKIP_PROPS.has(p.key.name ?? p.key.value);
    else if (p.type === 'CallExpression' || p.type === 'NewExpression') {
      const c = p.callee; const name = c.type === 'MemberExpression' ? c.property.name : c.name;
      ok = p.callee !== cur && I18N_WRAP_CALLS.has(name);
      if (dataDecl && !['toast', '__confirm', '__alert', 'confirm', 'alert'].includes(name)) ok = false;
      if (ok && dataDecl) { /* allowed: message calls only */ }
    } else ok = true;                                                                           // return / assignment / array / init
    if (dataDecl && !(p && (p.type === 'CallExpression') && ok)) {
      // inside a data declaration only literals that end up in a message call are translated
      const msgCall = anc.slice(0, -1).some((a) => a.type === 'CallExpression' && ['toast', '__confirm', '__alert', 'confirm', 'alert'].includes(a.callee.name));
      ok = msgCall;
    }
    if (!ok && I18N_FORCE.has(text)) ok = true;
    if (!ok) { i18nSkipped.push([declName(declNode), p ? p.type + (p.callee ? ':' + (p.callee.property?.name || p.callee.name) : p.key ? ':' + (p.key.name ?? p.key.value) : '') : '?', text]); return; }
    i18nKeys.add(text);
    if (n.type === 'Literal') { ms.appendLeft(n.start, '__t('); ms.prependRight(n.end, ')'); }
    else ms.appendLeft(n.start, '__tt');
  });
}

let out = `/* La Forêt · Cellar Manager — core domain module.
 * GENERATED by scripts/gen-core.mjs from ${inFile.split('/').pop()} — do not hand-edit.
 * Calculations, data model and data actions are copied VERBATIM from the legacy app.
 * UI side effects (render, toast, modals, navigation) go through ./bridge.js. */
/* eslint-disable */
import { bridge } from './bridge.js';
import { __t, __tt, LOCALE as __LOC } from '../i18n.js';
${BRIDGED.map(b => `const ${b} = (...a) => bridge.${b}(...a);`).join('\n')}
const __el = (id) => bridge.el(id);
const __win = bridge.win;
const __confirm = (msg) => bridge.confirm(msg);
const __alert = (msg) => bridge.alert(msg);
`;
const rewire = (code, form) => {
  let c = code.replace(/'es-CO'/g, '__LOC').replace(/(?<![.\w])confirm\(/g, '__confirm(').replace(/(?<![.\w])alert\(/g, '__alert(');
  if (form) c = c.replace(/document\.getElementById\(/g, '__el(').replace(/window\._/g, '__win._');
  return c;
};
for (const i of [...keep].sort((a, b) => a - b)) {
  const n = ast.body[i];
  i18nWrap(n);
  out += '\n' + rewire(ms.slice(n.start, n.end), namesOf(n).some(x => FORM.has(x))) + '\n';
}
out += `
/* ── bridge glue ── */
const __saveOrig = saveDB;
saveDB = function(){ __saveOrig(); bridge.onSave(db); };
export function getDB(){ return db; }
export function getCloud(){ return { handle: _cloudHandle, status: _cloudStatus }; }
export function setDB(next){ db = next; }
export function bootDB(){ if(!loadDB()){ seedDB(); } return db; }
export { ${[...kept].filter(n => n !== 'saveDB').join(', ')}, saveDB };
`;
fs.writeFileSync(outFile, out);
if (process.env.I18N_REPORT) fs.writeFileSync(process.env.I18N_REPORT, i18nSkipped.map((r) => r.join('\t')).join('\n'));
fs.writeFileSync(new URL('../src/i18n/core-keys.json', import.meta.url), JSON.stringify([...i18nKeys].sort(), null, 1) + '\n');
console.log(`core: ${keep.size} declarations, ${i18nKeys.size} i18n strings, ${out.split('\n').length} lines → ${outFile}`);
