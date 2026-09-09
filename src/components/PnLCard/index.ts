import type { VariantId, CardOpts } from './shared';

export { PnLCard } from './PnLCard';
export type { CardData, CardOpts, VariantId, CardFormat } from './shared';

export const VARIANTS: { id: VariantId; name: string }[] = [
  { id: 'radar', name: 'Radar' },
  { id: 'terminal', name: 'Terminal' },
  { id: 'bold', name: 'Bold' },
  { id: 'editorial', name: 'Editorial' },
  { id: 'eclipse', name: 'Eclipse' },
  { id: 'dossier', name: 'Dossier' },
];

/** True when v is one of the current (non-legacy) variants. */
export function isCurrentVariant(v: string): v is VariantId {
  return VARIANTS.some(x => x.id === v);
}

export function defaultOpts(partial?: Partial<CardOpts>): CardOpts {
  const base: CardOpts = {
    variant: 'radar',
    format: 'vertical',
    pnlMode: 'abs',
    showSetup: true,
    showRR: true,
    showSession: true,
    showAccount: false,
    showDate: false,
    showScore: true,
    showStreak: true,
    showHandle: false,
    showQR: true,
    note: '',
  };
  if (!partial) return base;
  // Ignore undefined values so a missing default (e.g. from settings) doesn't wipe a field.
  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined) (base as unknown as Record<string, unknown>)[k] = v;
  }
  return base;
}
