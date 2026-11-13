/* i18n — Spanish is the source language: every key IS the Spanish text.
 * t('Lotes') → 'Batches' (en) / 'Lotti' (it); missing keys fall back to Spanish.
 * Placeholders: t('{0} piezas', [n])  or  t('Hola {name}', { name }).
 * The language is fixed for the life of the page (module-level catalogs are built
 * with it), so setLang() stores the choice and reloads. */
import en from '../i18n/en.js';
import it from '../i18n/it.js';

export const LANGS = [
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'it', label: 'Italiano', short: 'IT' },
];
const SUPPORTED = LANGS.map((l) => l.code);
const STORAGE_KEY = 'laforet_lang';
const DICTS = { en, it };
const LOCALES = { es: 'es-CO', en: 'en-US', it: 'it-IT' };

function detect() {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved) || saved === 'xx') return saved; // xx = pseudo-locale for tests
  } catch { /* private mode */ }
  if (typeof window === 'undefined') return 'es'; // node scripts (tests, generators): Spanish unless PARITY_LANG sets it
  const nav = globalThis.navigator;
  for (const l of nav?.languages?.length ? nav.languages : [nav?.language]) {
    const code = String(l || '').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(code)) return code;
  }
  return 'es';
}

export const lang = detect();
export const LOCALE = LOCALES[lang] || 'es-CO';
const dict = DICTS[lang] || null;
export const missing = new Set();

/* A translation can be [singular, plural] (or [singular, plural, i] to count by var i):
 * the Spanish source often builds plurals with an 's' suffix placeholder that other languages can't use. */
function pick(v, vars) {
  if (!Array.isArray(v)) return v;
  const n = vars == null ? NaN : Number(Array.isArray(vars) ? vars[v[2] ?? 0] : Object.values(vars)[v[2] ?? 0]);
  return Math.abs(n) === 1 ? v[0] : v[1];
}

function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : vars[k] === false ? '' : String(vars[k])));
}

/** Translate a Spanish source string. */
export function t(s, vars) {
  if (typeof s !== 'string') return s;
  let out = s;
  if (lang === 'xx') out = `⟦${s}⟧`;
  else if (dict) {
    if (Object.prototype.hasOwnProperty.call(dict, s)) out = pick(dict[s], vars);
    else if (/[A-Za-zÁ-ú]/.test(s)) missing.add(s);
  }
  const res = vars == null ? out : fill(out, vars);
  if (out !== s) remember(res, vars == null ? s : fill(s, vars));
  return res;
}

/* translated text → Spanish source, so tone detection (toasts, destructive confirms) keeps working */
const reverse = new Map();
function remember(res, src) { reverse.set(res, src); if (reverse.size > 400) reverse.delete(reverse.keys().next().value); }
export const sourceOf = (s) => reverse.get(s) ?? s;

/** Tagged template used by the generated core: __tt`Lote ${ref} guardado` → key 'Lote {0} guardado'. */
/* Values that live in the db in Spanish (stage kinds, default CCP labels and hazards) but
 * appear inside generated messages: name them in the UI language. User-entered text never matches. */
const DATA_TERMS = new Set(['Curado', 'Salmuera', 'Salazon', 'Adobado', 'Fermentado', 'Secado', 'Balanceo', 'Madurado', 'Ahumado',
  'Recepción core T ≤ 4°C', 'Fermentación: pH ≤ 5.3 en 48h', 'Ahumado: T superficie ≤ límite del método',
  'Crecimiento mesófilos pre-cura', 'Agua libre para patógenos', 'C. botulinum / S. aureus (ventana)', 'HAPs del humo (ahumado alto)']);
export function tData(v) {
  if (typeof v !== 'string') return v;
  if (DATA_TERMS.has(v)) return t(v);
  const aw = /^aw final ≤ (.+)$/.exec(v);
  return aw ? t('aw final ≤ {0}', [aw[1]]) : v;
}
export function __tt(strings, ...vals) {
  vals = vals.map(tData);
  const key = strings.reduce((acc, q, i) => acc + q + (i < vals.length ? `{${i}}` : ''), '');
  return t(key, vals);
}
export const __t = (s) => t(s);
export const tt = __tt;
export { t as tx, __tt as txt };

export function setLang(code) {
  if (!SUPPORTED.includes(code) || code === lang) return;
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  location.reload();
}

if (typeof window !== 'undefined') window.__i18nMissing = missing;
