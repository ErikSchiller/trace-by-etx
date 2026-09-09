import { BLUE, RED } from './shared';

/* ── Deterministic pseudo-random so a given trade always renders the same art ── */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * A stylised intraday path (decorative — we only persist the final PnL, so this
 * is a deterministic illustration, not tick data). Trends down for a loss on a
 * long / up for a win, with seeded noise. Returns points in a 0..1 box.
 */
export function synthPath(seed: string, win: boolean, n = 48): { x: number; y: number }[] {
  const r = rng(hashStr(seed));
  const pts: { x: number; y: number }[] = [];
  let v = 0.5;
  const drift = win ? 0.0135 : -0.0145;
  for (let i = 0; i < n; i++) {
    const noise = (r() - 0.5) * 0.11;
    v = v + drift + noise;
    v = Math.max(0.05, Math.min(0.95, v));
    pts.push({ x: i / (n - 1), y: v });
  }
  // Force the endpoint to clearly reflect the outcome.
  pts[pts.length - 1].y = win ? Math.max(pts[pts.length - 1].y, 0.82) : Math.min(pts[pts.length - 1].y, 0.2);
  return pts;
}

interface ChartProps {
  w: number; h: number; seed: string; win: boolean;
  color?: string; strokeWidth?: number;
  grid?: boolean; axes?: boolean; dot?: boolean;
  fill?: boolean; xLabels?: string[];
}
/** Synthetic equity/price line chart used across several variants. */
export function SynthLineChart({ w, h, seed, win, color, strokeWidth = 3, grid = false, axes = false, dot = true, fill = false, xLabels }: ChartProps) {
  const c = color ?? (win ? BLUE : RED);
  const padR = axes ? 96 : 0;
  const padB = xLabels ? 40 : 0;
  const cw = w - padR;
  const ch = h - padB;
  const pts = synthPath(seed, win);
  const toXY = (p: { x: number; y: number }) => ({ x: p.x * cw, y: (1 - p.y) * ch });
  const xy = pts.map(toXY);
  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${cw},${ch} L0,${ch} Z`;
  const end = xy[xy.length - 1];
  // Decorative price ladder derived from the seed (stylised, consistent per trade).
  const base = 20600 + (hashStr(seed) % 6) * 100;
  const yLabels = axes ? [base + 600, base + 400, base + 200, base] : [];
  const gid = `pnlgrad-${hashStr(seed)}-${win ? 'w' : 'l'}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid && [0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={`h${i}`} x1={0} x2={cw} y1={g * ch} y2={g * ch} stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="2 6" />
      ))}
      {grid && [0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={`v${i}`} x1={g * cw} x2={g * cw} y1={0} y2={ch} stroke="rgba(255,255,255,0.05)" strokeWidth={1} strokeDasharray="2 6" />
      ))}
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={c} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      {dot && <circle cx={end.x} cy={end.y} r={strokeWidth * 2.4} fill={c} />}
      {dot && <circle cx={end.x} cy={end.y} r={strokeWidth * 4.6} fill="none" stroke={c} strokeOpacity="0.35" strokeWidth={2} />}
      {axes && yLabels.map((v, i) => (
        <text key={`y${i}`} x={cw + 16} y={(i / (yLabels.length - 1)) * ch * 0.92 + ch * 0.04} fill="rgba(255,255,255,0.42)" fontSize={22} fontFamily="'Space Grotesk', sans-serif" dominantBaseline="middle">{v.toLocaleString('en-US')}</text>
      ))}
      {xLabels && xLabels.map((l, i) => (
        <text key={`x${i}`} x={(i / (xLabels.length - 1)) * cw} y={ch + 28} fill="rgba(255,255,255,0.4)" fontSize={22} fontFamily="'Space Grotesk', sans-serif" textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}>{l}</text>
      ))}
    </svg>
  );
}

/** Concentric radar/target grid with a crosshair (Radar variant background). */
export function RadarGrid({ size, color = 'rgba(255,255,255,0.05)', cx = size / 2, cy = size / 2 }: { size: number; color?: string; cx?: number; cy?: number }) {
  const rings = [0.22, 0.42, 0.62, 0.82, 1];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', overflow: 'visible' }}>
      {rings.map((r, i) => <circle key={i} cx={cx} cy={cy} r={(size / 2) * r} fill="none" stroke={color} strokeWidth={2} />)}
      <line x1={cx} y1={0} x2={cx} y2={size} stroke={color} strokeWidth={2} />
      <line x1={0} y1={cy} x2={size} y2={cy} stroke={color} strokeWidth={2} />
      <line x1={cx} y1={cy - 22} x2={cx} y2={cy + 22} stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
      <line x1={cx - 22} y1={cy} x2={cx + 22} y2={cy} stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
    </svg>
  );
}

/** Decorative candlestick silhouette (Dossier background). */
export function Candlesticks({ w, h, seed, opacity = 0.16, trend = 'up' }: { w: number; h: number; seed: string; opacity?: number; trend?: 'up' | 'down' }) {
  const r = rng(hashStr(seed + 'candles'));
  const n = Math.max(10, Math.floor(w / 34));
  const cw = w / n;
  const bodyW = cw * 0.5;
  let level = trend === 'up' ? 0.72 : 0.3;
  const candles = Array.from({ length: n }, (_, i) => {
    const drift = trend === 'up' ? -0.02 : 0.02; // y grows downward
    level = Math.max(0.12, Math.min(0.85, level + drift + (r() - 0.5) * 0.16));
    const bodyH = (0.05 + r() * 0.16) * h;
    const cy = level * h;
    const wick = (0.04 + r() * 0.05) * h;
    const up = r() > 0.48;
    return { x: i * cw + cw / 2, cy, bodyH, wick, up };
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', opacity }}>
      {candles.map((c, i) => {
        const col = c.up ? BLUE : RED;
        return (
          <g key={i} stroke={col} fill={col}>
            <line x1={c.x} x2={c.x} y1={c.cy - c.wick} y2={c.cy + c.bodyH + c.wick} strokeWidth={2} />
            <rect x={c.x - bodyW / 2} y={c.cy} width={bodyW} height={c.bodyH} rx={1} />
          </g>
        );
      })}
    </svg>
  );
}
