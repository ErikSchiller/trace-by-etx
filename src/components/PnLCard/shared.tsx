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

/**
 * TR∧CE wordmark — the blue chevron replaces the letter A (taller than TR/CE,
 * peak above cap-height, clear spacing). Matches LogoMark's geometry exactly.
 */
export function Wordmark({ size, color = '#fff', accent = BLUE, byEtx = true, letterSpacing = '0.05em' }: { size: number; color?: string; accent?: string; byEtx?: boolean; letterSpacing?: string }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: size, lineHeight: 1 }}>
      <span style={{ fontFamily: HEAD, fontWeight: 800, color, letterSpacing, display: 'inline-flex', alignItems: 'flex-end', gap: '0.12em', lineHeight: 1 }}>
        <span>TR</span>
        <svg viewBox="0 0 65 100" style={{ width: '0.78em', height: '1.2em', display: 'inline-block', marginBottom: '-0.02em', overflow: 'visible' }}>
          <polyline points="9,94 32.5,6 56,94" fill="none" stroke={accent} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>CE</span>
      </span>
      {byEtx && (
        <span style={{ fontFamily: HEAD, display: 'inline-flex', gap: '0.4em', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.32em', marginTop: '0.6em', lineHeight: 1 }}>
          <span style={{ color: accent }}>by</span>
          <span style={{ color }}>ETX</span>
        </span>
      )}
    </span>
  );
}

export function Chevron({ size, color = BLUE, opacity = 1 }: { size: number; color?: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size * 0.78, height: size, display: 'block', fill: 'none', opacity, overflow: 'visible' }}>
      <polyline points="10,90 50,10 90,90" fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
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
