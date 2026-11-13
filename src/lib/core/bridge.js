/* The seam between the verbatim legacy core and the React UI.
 * core.js calls these; React (store.js / notify.js / dialogs) replaces the no-ops at boot. */
const noop = () => {};

/** Fake DOM field: legacy save functions read `document.getElementById(id).value`;
 *  React fills `bridge.form` with { id: value } right before calling them. */
function field(id) {
  const v = Object.prototype.hasOwnProperty.call(bridge.form, id) ? bridge.form[id] : '';
  return { id, value: v == null ? '' : String(v), checked: !!v, dataset: {}, style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    focus: noop, textContent: '', innerHTML: '', querySelector: () => null, querySelectorAll: () => [], closest: () => null };
}

export const bridge = {
  form: {},
  win: {},                       // replaces window._newBatch, window._ntState, window._weighSession…
  el: field,
  confirm: () => true,
  alert: noop,
  render: noop, toast: noop, closeModal: noop, renderIfNoFocus: noop, goto: noop, showModal: noop, updateNavCounts: noop,
  openBulkWeightModal: noop, openTastingModal: noop, openEnvLogModal: noop, openSafeDeleteModal: noop,
  renderIcloudStatus: noop, renderSyncModalBody: noop, renderNewBatchModal: noop, renderWeighSession: noop,
  editIngredientPrompt: noop, renderFlowStage: () => '', openSecadoStartModal: noop,
  onSave: noop,
};

/** Run a legacy form-driven function with the given field values. */
export function withForm(values, fn) {
  bridge.form = values || {};
  try { return fn(); } finally { bridge.form = {}; }
}
