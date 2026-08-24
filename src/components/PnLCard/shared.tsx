export type VariantId = 'clasico' | 'minimo' | 'ganador' | 'retro' | 'cinematico';
export type CardFormat = 'square' | 'vertical';

export interface CardData {
  asset: string;
  direction: 'long' | 'short';
  pnl: number;
  pnlPct?: number;         // PnL as % of account size (optional)
  realRR: number;
  setup: string;
  session: string;         // session key
  date: string;            // YYYY-MM-DD
  time: string;            // HH:MM
  currencySymbol: string;
  traceScore?: number;
  accountLabel?: string;
  screenshots?: string[];
  handle?: string;
  streakLabel?: string;    // e.g. "5-day streak"
}

export interface CardOpts {
  variant: VariantId;
  format: CardFormat;
  pnlMode: 'abs' | 'pct';
  showSetup: boolean;
  showRR: boolean;
  showSession: boolean;
  showAccount: boolean;
  showDate: boolean;
  showScore: boolean;
  showStreak: boolean;
  showHandle: boolean;
  showQR: boolean;
  note: string;
  screenshot?: string;     // selected screenshot data URL to embed
  qrDataUrl?: string;      // pre-generated QR image
}

export const BLUE = '#4f8fff';
export const BLUE_BRIGHT = '#6b9fff';
export const RED = '#ef4444';
export const HEAD = "'Syne', sans-serif";
export const BODY = "'Space Grotesk', sans-serif";

export const DIMS: Record<CardFormat, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  vertical: { w: 1080, h: 1920 },
};

export const SESSION_LABEL: Record<string, string> = {
  london: 'London', new_york: 'New York', asia: 'Asia', premarket: 'Premarket',
};

export function isWin(pnl: number) { return pnl >= 0; }
export function pnlColor(pnl: number) { return isWin(pnl) ? BLUE : RED; }

export function fmtMoney(n: number, sym: string) {
  return `${n >= 0 ? '+' : '-'}${sym}${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
export function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}
export function heroValue(data: CardData, opts: CardOpts) {
  if (opts.pnlMode === 'pct' && data.pnlPct !== undefined) return fmtPct(data.pnlPct);
  return fmtMoney(data.pnl, data.currencySymbol);
}
export function fmtRR(rr: number) {
  return `${rr >= 0 ? '' : ''}${rr.toFixed(1)}R`;
}

/** Subtitle line combining the enabled secondary fields. */
export function subtitleParts(data: CardData, opts: CardOpts): string[] {
  const parts: string[] = [data.asset, data.direction === 'long' ? 'LONG' : 'SHORT'];
  if (opts.showRR) parts.push(fmtRR(data.realRR));
  if (opts.showSetup && data.setup) parts.push(data.setup);
  if (opts.showSession) parts.push(SESSION_LABEL[data.session] ?? data.session);
  if (opts.showDate) parts.push(data.date);
  if (opts.showAccount && data.accountLabel) parts.push(data.accountLabel);
  return parts;
}

/** TR∧CE wordmark rendered with an inline caret that scales with font size. */
export function Wordmark({ size, color = '#fff', accent = BLUE, byEtx = true, letterSpacing = '0.02em' }: { size: number; color?: string; accent?: string; byEtx?: boolean; letterSpacing?: string }) {
  return (
    <span style={{ display: 'inline-block', fontSize: size, lineHeight: 1, textAlign: 'center' }}>
      <span style={{ fontFamily: HEAD, fontWeight: 800, color, letterSpacing, display: 'inline-flex', alignItems: 'baseline', lineHeight: 1 }}>
        <span>TR</span>
        <svg viewBox="0 0 28 32" style={{ width: '0.72em', height: '1em', display: 'inline-block', position: 'relative', top: '0.05em', fill: 'none' }}>
          <polyline points="14,2 2,30 26,30" stroke={accent} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>CE</span>
      </span>
      {byEtx && (
        <span style={{ fontFamily: BODY, display: 'block', fontWeight: 500, color: '#6b7280', letterSpacing: '0.28em', textTransform: 'uppercase', fontSize: '0.34em', marginTop: '0.35em' }}>by etx</span>
      )}
    </span>
  );
}

export function Chevron({ size, color = BLUE, opacity = 1 }: { size: number; color?: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 28 32" style={{ width: size * 0.72, height: size, display: 'block', fill: 'none', opacity }}>
      <polyline points="14,2 2,30 26,30" stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DirectionBadge({ direction, scale = 1 }: { direction: 'long' | 'short'; scale?: number }) {
  const isLong = direction === 'long';
  const c = isLong ? BLUE : RED;
  return (
    <span style={{
      display: 'inline-block', fontFamily: BODY, fontWeight: 700, fontSize: 26 * scale,
      letterSpacing: '0.18em', color: c, background: `${c}1f`, border: `1px solid ${c}55`,
      padding: `${8 * scale}px ${20 * scale}px`, borderRadius: 999,
    }}>{isLong ? 'LONG' : 'SHORT'}</span>
  );
}

export function StreakBadge({ label, scale = 1 }: { label: string; scale?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 * scale, fontFamily: BODY, fontWeight: 600, fontSize: 22 * scale, color: '#e0e0e8', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: `${6 * scale}px ${14 * scale}px`, borderRadius: 999 }}>
      🔥 {label}
    </span>
  );
}

export function QRTag({ dataUrl, scale = 1 }: { dataUrl?: string; scale?: number; dark?: boolean }) {
  if (!dataUrl) return null;
  const size = 96 * scale;
  return (
    <img src={dataUrl} alt="traceetx.com" style={{ width: size, height: size, borderRadius: 8 * scale, background: '#fff', padding: 4 * scale }} />
  );
}
