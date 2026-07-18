import type { ReactNode } from 'react';

interface ProgressCircleProps {
  /** 0..1 (clamped). */
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Big center number (defaults to rounded percentage). */
  centerValue?: ReactNode;
  label?: ReactNode;
}

/** Elegant single-color progress ring for win rate / TRACE Score / gauges. */
export function ProgressCircle({
  value, size = 100, strokeWidth = 8,
  color = 'var(--blue)', trackColor = 'rgba(255,255,255,0.05)',
  centerValue, label,
}: ProgressCircleProps) {
  const pct = Math.max(0, Math.min(1, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: size * 0.26, color: 'var(--text-primary)', lineHeight: 1 }}>
          {centerValue ?? `${Math.round(pct * 100)}%`}
        </span>
        {label && <span style={{ fontSize: size * 0.1, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{label}</span>}
      </div>
    </div>
  );
}

export default ProgressCircle;
