/* Sonner integration: legacy toast() messages + "coming in phase 2" notices. */
import { toast } from 'sonner';
import { bridge } from './core/bridge.js';
import { navigate, legacyViewToPath } from './router.js';

export const LEGACY_URL = './v4/';

/** Legacy messages carry their tone in a leading glyph (✓ / ⚠ / ✗). */
export function legacyToast(msg) {
  const s = String(msg ?? '').trim();
  if (/^[✓✔]/.test(s)) return toast.success(s.replace(/^[✓✔]\s*/, ''));
  if (/^[⚠]/.test(s)) return toast.warning(s.replace(/^⚠\s*/, ''));
  if (/^[✗✕×]/.test(s) || /^error/i.test(s)) return toast.error(s.replace(/^[✗✕×]\s*/, ''));
  return toast(s);
}

export function pending(feature) {
  toast.info(`${feature} llega en la fase 2 de v5`, {
    description: 'Mientras tanto hacelo en v4.4.3: usa los mismos datos de este navegador.',
    action: { label: 'Abrir v4.4.3', onClick: () => window.open(LEGACY_URL, '_blank', 'noopener') },
  });
}

bridge.toast = legacyToast;
bridge.goto = (view, opts) => navigate(legacyViewToPath(view, opts));
bridge.closeModal = () => {};
bridge.showModal = () => pending('Este diálogo');
bridge.openBulkWeightModal = () => pending('El registro de pesos');
bridge.openTastingModal = () => pending('La cata');
bridge.openEnvLogModal = () => pending('El registro ambiental');
bridge.openSafeDeleteModal = () => pending('El borrado seguro');
