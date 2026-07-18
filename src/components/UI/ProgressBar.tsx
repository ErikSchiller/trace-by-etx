interface ProgressBarProps {
  /** 0..1 (values outside are clamped). */
  value: number;
  color?: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
  trackColor?: string;
}

export function ProgressBar({
  value, color = 'var(--blue)', height = 6, label, showPercent = false,
  trackColor = 'var(--border-subtle)',
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div>
      {(label || showPercent) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          {label && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{label}</span>}
          {showPercent && <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: "'Space Grotesk', sans-serif" }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{ height, background: trackColor, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

export default ProgressBar;
