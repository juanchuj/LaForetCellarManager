/* Hash router: works on GitHub Pages with no server rewrites. */
import { useSyncExternalStore } from 'react';

const subscribe = (cb) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };
const getHash = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute() {
  const path = useSyncExternalStore(subscribe, getHash);
  const parts = path.split('/').filter(Boolean);
  return { path, section: parts[0] || 'panel', id: parts[1] ? decodeURIComponent(parts[1]) : null };
}

export function navigate(to) {
  if (getHash() !== to) window.location.hash = to;
  window.scrollTo({ top: 0 });
}

/* Legacy view names used by goto(view, opts) inside core.js */
export function legacyViewToPath(view, opts = {}) {
  switch (view) {
    case 'dashboard': return '/';
    case 'timeline': return '/cava';
    case 'batches': return '/lotes';
    case 'batch-detail': return opts.batchId ? `/lotes/${opts.batchId}` : '/lotes';
    case 'types': return '/tipos';
    case 'type-editor': return opts.typeId ? `/tipos/${opts.typeId}` : '/tipos';
    case 'ingredients': return '/ingredientes';
    case 'library': return '/biblioteca';
    case 'analytics': case 'compare': return '/analytics';
    case 'defects': return '/defectos';
    default: return '/';
  }
}
