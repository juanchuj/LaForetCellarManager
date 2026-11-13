/* Single source of truth = the legacy `db` object inside core.js (mutated in place
 * by the verbatim data actions). React subscribes to a version counter that bumps
 * whenever the core saves or asks for a render. */
import { useSyncExternalStore } from 'react';
import * as core from './core/core.js';
import { bridge } from './core/bridge.js';

let version = 0;
const listeners = new Set();
export function notify() { version++; listeners.forEach((l) => l()); }
function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }

/** Returns the live db; the component re-renders on every save. */
export function useDB() {
  useSyncExternalStore(subscribe, () => version);
  return core.getDB();
}

bridge.onSave = notify;
bridge.render = notify;
bridge.renderIfNoFocus = notify;
bridge.updateNavCounts = () => {};

core.bootDB();

// Another tab (e.g. v4.4.3 open side by side) wrote the same storage key → reload.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === core.LS_KEY) { core.loadDB(); notify(); }
  });
}

export { core };
