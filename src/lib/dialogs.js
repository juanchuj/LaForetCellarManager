/* One dialog open at a time (same model as the legacy showModal/closeModal).
 * Legacy openers routed through the bridge land here. */
import { useSyncExternalStore } from 'react';

let current = null; // { name, props, key }
let seq = 0;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

const same = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every((k) => a[k] === b[k]); };
/** Re-opening the dialog that is already open with the same props keeps its state (legacy "refresh" calls). */
export function openDialog(name, props = {}) {
  if (current && current.name === name && same(current.props, props)) current = { ...current };
  else current = { name, props, key: ++seq };
  emit();
}
export function closeDialog() { if (current) { current = null; emit(); } }
export function useDialog() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => current);
}

/* ── confirm(): legacy code asks synchronously; we ask with an AlertDialog and re-run. ── */
let confirmState = null; // { message, onOk, destructive }
const cListeners = new Set();
const cEmit = () => cListeners.forEach((l) => l());
export function useConfirmState() {
  return useSyncExternalStore((l) => { cListeners.add(l); return () => cListeners.delete(l); }, () => confirmState);
}
export function resolveConfirm(ok) {
  const s = confirmState; confirmState = null; cEmit();
  if (ok && s) s.onOk();
}

let mode = 'capture';   // 'capture' | 'yes' | 'native'
let captured = null;
export function legacyConfirm(message) {
  if (mode === 'yes') return true;
  if (mode === 'native') return window.confirm(message);
  captured = captured ?? message;
  return false;
}

/** Runs a legacy action. If it asks confirm(), shows an AlertDialog; on "Aceptar" re-runs it with confirm() = true. */
export function ask(fn, { destructive } = {}) {
  captured = null; mode = 'capture';
  const r = fn();
  if (captured) {
    const message = captured; captured = null;
    confirmState = { message, destructive: destructive ?? /eliminar|borra|descartar|reemplaz/i.test(message),
      onOk: () => { mode = 'yes'; try { fn(); } finally { mode = 'capture'; } } };
    cEmit();
  }
  return r;
}

/** For async legacy flows (iCloud) where confirm() happens after a file picker. */
export async function askNative(fn) {
  mode = 'native';
  try { return await fn(); } finally { mode = 'capture'; }
}

/** Ask a confirmation from React code (not legacy). */
export function confirmThen(message, onOk, { destructive = false } = {}) {
  confirmState = { message, onOk, destructive }; cEmit();
}
