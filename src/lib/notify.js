/* Sonner + dialog wiring for everything the legacy core asks of the UI. */
import { toast } from 'sonner';
import { bridge } from './core/bridge.js';
import { navigate, legacyViewToPath } from './router.js';
import { openDialog, closeDialog, legacyConfirm } from './dialogs.js';
import { notify } from './store.js';

/** Legacy messages carry their tone in a leading glyph (✓ / ⚠ / ✗). */
export function legacyToast(msg) {
  const s = String(msg ?? '').trim();
  if (/^[✓✔]/.test(s)) return toast.success(s.replace(/^[✓✔]\s*/, ''));
  if (/^⚠/.test(s)) return toast.warning(s.replace(/^⚠\s*/, ''));
  if (/^[✗✕×]/.test(s) || /^error|no se pudo|denegado|falta|faltan|requerid|ingres[aá]|seleccion|agrega al menos|ya existe/i.test(s)) return toast.error(s.replace(/^[✗✕×]\s*/, ''));
  if (/registrad|guardad|cread|actualizad|iniciad|vinculad|cargad|terminad|completad|eliminad|descartad/i.test(s)) return toast.success(s);
  return toast(s);
}

bridge.toast = legacyToast;
bridge.alert = (m) => toast.error(String(m));
bridge.confirm = legacyConfirm;
bridge.goto = (view, opts) => navigate(legacyViewToPath(view, opts));
bridge.closeModal = closeDialog;
bridge.showModal = () => {};
bridge.openBulkWeightModal = (batchId) => openDialog('bulk-weight', { batchId });
bridge.openTastingModal = (batchId, tastingId) => openDialog('tasting', { batchId, tastingId });
bridge.openEnvLogModal = (batchId) => openDialog('env-log', { batchId });
bridge.openSafeDeleteModal = (opts) => openDialog('safe-delete', opts);
bridge.openSecadoStartModal = (batchId) => openDialog('secado-start', { batchId });
bridge.editIngredientPrompt = (id) => openDialog('ingredient', { id });
bridge.renderNewBatchModal = () => openDialog('batch-form');
bridge.renderWeighSession = () => {
  const ws = bridge.win._weighSession;
  if (!ws) return;
  if (ws.idx >= ws.list.length) {
    closeDialog();
    toast.success(`Jornada completada: ${ws.count} pieza${ws.count === 1 ? '' : 's'} pesada${ws.count === 1 ? '' : 's'}`);
    bridge.win._weighSession = null;
    notify();
    return;
  }
  openDialog('weigh-session');
};
bridge.renderSyncModalBody = notify;
bridge.renderIcloudStatus = notify;

