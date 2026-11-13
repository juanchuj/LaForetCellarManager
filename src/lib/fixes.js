/* Fixes on top of the verbatim v4.4.3 core. Each one is a wrapper — core.js stays identical
 * to the legacy code (see scripts/parity-*.mjs) and the fix is documented here. */
import * as core from './core/core.js';
import { bridge } from './core/bridge.js';

/** v4.4.3 bug: editing a batch rebuilds every piece with only
 *  {id, code, initialWeight, thickness, shape, notes, weightLogs}, which silently deletes
 *  aw readings (awReadings), the drying tare (tare) and any other per-piece data.
 *  This keeps those fields for pieces that still exist after the edit. */
export function saveBatchForm() {
  const nb = bridge.win._newBatch;
  const before = nb?.editingBatchId ? core.getDB().batches.find((b) => b.id === nb.editingBatchId) : null;
  const kept = before ? Object.fromEntries(before.pieces.map((p) => [p.id, { ...p }])) : null;
  core.createBatch();
  if (!kept) return;
  const after = core.getDB().batches.find((b) => b.id === nb.editingBatchId);
  if (!after) return;
  let restored = false;
  after.pieces.forEach((p) => {
    const old = kept[p.id]; if (!old) return;
    for (const [k, v] of Object.entries(old)) if (!(k in p)) { p[k] = v; restored = true; }
  });
  if (restored) core.saveDB();
}
