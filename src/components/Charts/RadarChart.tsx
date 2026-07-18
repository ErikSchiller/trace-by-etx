interface RadarChartProps {
  /** Each value 0..1, same order as labels. */
  values: number[];
  labels: string[];
  size?: number;
  centerLabel?: string | number;
}

/** Hex/radar for TRACE Score dimensions. Subtle rings, blue polygon, outside labels. */
export function RadarChart({ values, labels, size = 200, centerLabel }: RadarChartProps) {
  const cx = size / 2, cy = size / 2;
  const rMax = size * 0.35;
  const n = labels.length;
  const angles = labels.map((_, i) => (2 * Math.PI / n) * i - Math.PI / 2);
  const ring = (f: number) => angles.map(a => `${cx + rMax * f * Math.cos(a)},${cy + rMax * f * Math.sin(a)}`).join(' ');
  const pts = angles.map((a, i) => {
    const v = Math.max(0, Math.min(1, values[i] ?? 0));
    return [cx + rMax * v * Math.cos(a), cy + rMax * v * Math.sin(a)] as const;
  });
  const poly = pts.map(p => p.join(',')).join(' ');

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.33, 0.66, 1].map(f => (
        <polygon key={f} points={ring(f)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + rMax * Math.cos(a)} y2={cy + rMax * Math.sin(a)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      <polygon points={poly} fill="rgba(79,143,255,0.15)" stroke="var(--blue)" strokeWidth="1.5" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="var(--blue)" />)}
      {angles.map((a, i) => {
        const lx = cx + (rMax + 16) * Math.cos(a), ly = cy + (rMax + 16) * Math.sin(a);
        return (
          <text key={i} x={lx} y={ly} fontSize="7.5" fill="var(--text-muted)"
            fontFamily="'Space Grotesk', sans-serif" textAnchor="middle" dominantBaseline="middle">
            {labels[i]}
          </text>
        );
      })}
      {centerLabel !== undefined && (
        <text x={cx} y={cy + 5} fontSize={size * 0.11} fill="var(--text-primary)"
          fontFamily="'Syne', sans-serif" fontWeight="800" textAnchor="middle">{centerLabel}</text>
      )}
    </svg>
  );
}

export default RadarChart;
