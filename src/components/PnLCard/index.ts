import type { VariantId, CardOpts } from './shared';

export { PnLCard } from './PnLCard';
export type { CardData, CardOpts, VariantId, CardFormat } from './shared';

export const VARIANTS: { id: VariantId; name: string }[] = [
  { id: 'clasico', name: 'Clásico' },
  { id: 'minimo', name: 'Mínimo' },
  { id: 'ganador', name: 'Ganador' },
  { id: 'retro', name: 'Retro' },
  { id: 'cinematico', name: 'Cinemático' },
];

export function defaultOpts(partial?: Partial<CardOpts>): CardOpts {
  const base: CardOpts = {
    variant: 'clasico',
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
