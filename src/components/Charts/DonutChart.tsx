import type { ReactNode } from 'react';

interface DonutChartProps {
  /** 0..1 (clamped). */
  value: number;
  size?: number;
  centerValue?: ReactNode;
  label?: ReactNode;
  color?: string;
}

/** Clean single-color donut: thin 8px stroke on 100px SVG, Syne center number. */
export function DonutChart({ value, size = 100, centerValue, label, color = 'var(--blue)' }: DonutChartProps) {
  const pct = Math.max(0, Math.min(1, value));
  const stroke = size * 0.08;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle cx={mid} cy={mid} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`}
          transform={`rotate(-90 ${mid} ${mid})`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: size * 0.24, color: 'var(--text-primary)', lineHeight: 1 }}>
          {centerValue ?? `${Math.round(pct * 100)}%`}
        </span>
        {label && <span style={{ fontSize: size * 0.1, color: 'var(--text-muted)' }}>{label}</span>}
      </div>
    </div>
  );
}

export default DonutChart;
