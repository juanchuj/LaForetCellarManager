/* View-model helpers: thin read-only wrappers over the verbatim core logic. */
import { core } from './store.js';

export const STAGE_VARS = {
  Curado: '--s-cur', Salmuera: '--s-sal', Salazon: '--s-slz', Adobado: '--s-ado', Fermentado: '--s-fer',
  Secado: '--s-sec', Balanceo: '--s-bal', Madurado: '--s-mad', Ahumado: '--s-ahum',
};
export const stageVar = (kind) => `var(${STAGE_VARS[kind] || '--muted-foreground'})`;

export const STATUS = {
  in_progress: { label: 'En proceso', variant: 'gold' },
  done: { label: 'Terminado', variant: 'success' },
  draft: { label: 'Borrador', variant: 'secondary' },
  discarded: { label: 'Descartado', variant: 'danger' },
};

export const greenWeight = (b) => (b.pieces || []).reduce((s, p) => s + (+p.initialWeight || 0), 0);

/* Agenda kinds → severity tiers for the "¿Qué hago hoy?" card */
export const AGENDA_KIND = {
  'pcc-fail': { tier: 'critical', label: 'HACCP' },
  danger: { tier: 'critical', label: 'Peligro' },
  pcc: { tier: 'warning', label: 'PCC' },
  ferm: { tier: 'warning', label: 'Fermento' },
  stage: { tier: 'warning', label: 'Etapa' },
  ch: { tier: 'warning', label: 'Costra' },
  weigh: { tier: 'warning', label: 'Pesar' },
  ready: { tier: 'info', label: 'Lista' },
  tasting: { tier: 'info', label: 'Cata' },
};

export function batchRow(b) {
  const cs = core.currentStage(b);
  const green = greenWeight(b);
  const current = core.latestWeight(b);
  const finalEnd = b.stages?.[b.stages.length - 1]?.expectedEnd;
  const eta = cs?.expectedEnd ? core.daysBetween(new Date(), cs.expectedEnd) : null;
  return {
    b, cs, green, current, finalEnd, eta,
    progress: core.batchProgressPct(b),
    yieldReal: current ? (current / green) * 100 : null,
    yieldTarget: b.targetYield,
  };
}

export const fmt = (...a) => core.fmt(...a);
export const fmtG = (n) => core.fmtG(n);
export const fmtGExact = (n) => core.fmtGExact(n);
export const fmtDate = (d) => core.fmtDate(d);
export const fmtDateShort = (d) => core.fmtDateShort(d);
