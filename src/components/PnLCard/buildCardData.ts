import { getUserTrades, getTraceScore, type Trade } from '../../store/tradeStore';
import type { PropFirmAccount } from '../../store/propFirmStore';
import type { CardData } from './shared';

export interface BuildCtx {
  accounts: PropFirmAccount[];
  currencySymbol: string;
  accountSize: number;
  /** Raw handle string (from settings or user name); normalized to @handle. */
  handleRaw?: string;
  /** Optional pre-computed streak label (e.g. "7 días"). */
  streakLabel?: string;
}

export function normalizeHandle(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw.startsWith('@') ? raw : `@${raw.replace(/\s+/g, '').toLowerCase()}`;
}

/** Builds the CardData for a trade, shared by the generator modal and the gallery. */
export function buildCardData(trade: Trade, ctx: BuildCtx): CardData {
  const dayTrades = getUserTrades().filter(t => t.date === trade.date);
  const acc = ctx.accounts.find(a => a.id === trade.accountId);
  return {
    asset: trade.asset,
    direction: trade.direction,
    pnl: trade.pnl,
    pnlPct: (trade.pnl / (acc?.accountSize || ctx.accountSize || 100000)) * 100,
    realRR: trade.realRR || (trade.pnl >= 0 ? 1 : -1),
    setup: trade.setup,
    session: trade.session,
    date: trade.date,
    time: trade.time,
    currencySymbol: ctx.currencySymbol,
    traceScore: getTraceScore(dayTrades),
    accountLabel: acc ? `${acc.firm} $${Math.round(acc.accountSize / 1000)}K` : undefined,
    screenshots: trade.screenshots,
    handle: normalizeHandle(ctx.handleRaw),
    streakLabel: ctx.streakLabel,
  };
}
