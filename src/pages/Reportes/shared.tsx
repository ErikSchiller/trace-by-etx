import { useNavigate } from 'react-router-dom';
import { getProfitFactor, type Trade } from '../../store/tradeStore';
import { LineChart } from '../../components/Charts/LineChart';

export const fontHead = "'Syne', sans-serif";
export const fontBody = "'Space Grotesk', sans-serif";

export const card: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '16px 18px', position: 'relative',
};
export const label: React.CSSProperties = {
  fontSize: '0.62rem', color: '#4a4a60', letterSpacing: '0.08em',
  textTransform: 'uppercase', fontWeight: 600, marginBottom: 8,
};
export const big: React.CSSProperties = {
  fontFamily: fontHead, fontWeight: 800, fontSize: '1.5rem', color: '#fff', lineHeight: 1,
};

export const SESSION_LABEL: Record<string, string> = { london: 'Londres', new_york: 'Nueva York', asia: 'Asia', premarket: 'Pre-market' };
export const SESSION_FLAG: Record<string, string> = { london: '🇬🇧', new_york: '🇺🇸', asia: '🇯🇵', premarket: '🌅' };
export const SESSIONS = ['london', 'new_york', 'asia', 'premarket'] as const;
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const EMOJIS: Record<number, string> = { 1: '😌', 2: '🙂', 3: '😐', 4: '😟', 5: '😰' };
export const EMOTION_LABEL: Record<number, string> = { 1: 'Calmado', 2: 'Confiado', 3: 'Neutral', 4: 'Ansioso', 5: 'Estresado' };

export function fmt(n: number) {
  if (!isFinite(n)) return '—';
  return `${n >= 0 ? '+' : '-'}€${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
export function fmtPlain(n: number) {
  if (!isFinite(n)) return '—';
  return `€${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
export function pnlColor(n: number) { return n >= 0 ? 'var(--blue)' : 'var(--red)'; }
export function rOf(t: Trade) { return t.realRR || (t.pnl > 0 ? 1 : t.pnl < 0 ? -1 : 0); }
export function expectancyR(list: Trade[]) { return list.length ? list.reduce((s, t) => s + rOf(t), 0) / list.length : 0; }

export interface GroupStats {
  n: number; pnl: number; wr: number; pf: number; aw: number; al: number;
  best: number; worst: number; exp: number;
}
export function statsFor(list: Trade[]): GroupStats {
  const wins = list.filter(t => t.pnl > 0);
  const losses = list.filter(t => t.pnl < 0);
  return {
    n: list.length,
    pnl: list.reduce((s, t) => s + t.pnl, 0),
    wr: list.length ? (wins.length / list.length) * 100 : 0,
    pf: getProfitFactor(list),
    aw: wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
    al: losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0,
    best: list.length ? Math.max(...list.map(t => t.pnl)) : 0,
    worst: list.length ? Math.min(...list.map(t => t.pnl)) : 0,
    exp: expectancyR(list),
  };
}

export function groupBy<K extends string | number>(trades: Trade[], key: (t: Trade) => K) {
  const map = new Map<K, Trade[]>();
  for (const t of trades) { const k = key(t); if (!map.has(k)) map.set(k, []); map.get(k)!.push(t); }
  return map;
}

/** Cumulative equity points for a sparkline / line chart. */
export function equityPoints(trades: Trade[]): { value: number }[] {
  const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  let cum = 0;
  return sorted.map(t => { cum += t.pnl; return { value: cum }; });
}

export function Sparkline({ trades, color }: { trades: Trade[]; color?: string }) {
  const pts = equityPoints(trades);
  if (pts.length < 2) return <div style={{ height: 30, marginTop: 6 }} />;
  return <div style={{ marginTop: 6 }}><LineChart data={pts} height={30} showGrid={false} showPeak={false} color={color} /></div>;
}

/** Section-level empty state with a CTA. */
export function SectionEmpty({ icon, title, desc, ctaLabel, href }: { icon: string; title: string; desc: string; ctaLabel?: string; href?: string }) {
  const navigate = useNavigate();
  return (
    <div style={{ ...card, padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#4a4a60', maxWidth: 380, margin: '0 auto 16px' }}>{desc}</div>
      {ctaLabel && href && (
        <button onClick={() => navigate(href)} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>{ctaLabel}</button>
      )}
    </div>
  );
}

/** Skeleton placeholder while a widget computes. */
export function WidgetSkeleton({ height = 120 }: { height?: number }) {
  return (
    <div style={{ ...card, height, overflow: 'hidden' }}>
      <div style={{ width: '40%', height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 14 }} />
      <div style={{ width: '70%', height: 26, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }} />
      <div className="rep-shimmer" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)' }} />
      <style>{`@keyframes repShimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} } .rep-shimmer{ animation: repShimmer 1.4s infinite; }`}</style>
    </div>
  );
}

export function Mini({ label: l, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.58rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
      <div style={{ fontSize: '0.9rem', color: color || '#fff', marginTop: 3, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
