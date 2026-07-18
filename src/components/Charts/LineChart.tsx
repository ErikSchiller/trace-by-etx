import { useId } from 'react';

export interface LinePoint { label?: string; value: number }

interface LineChartProps {
  data: LinePoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showPeak?: boolean;
  showXLabels?: boolean;
  showYLabels?: boolean;
  emptyLabel?: string;
}

const W = 320;

/** Premium equity/PnL line: 1.5px stroke, gradient underfill, subtle grid, peak dot. */
export function LineChart({
  data, height = 130, color = 'var(--blue)',
  showGrid = true, showPeak = true, showXLabels = false, showYLabels = false,
  emptyLabel = 'Sin datos suficientes',
}: LineChartProps) {
  const gid = useId().replace(/:/g, '');
  if (data.length < 2) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 11,
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 6px, transparent 6px 12px)',
        borderRadius: 8,
      }}>{emptyLabel}</div>
    );
  }

  const ys = data.map(p => p.value);
  const min = Math.min(...ys, 0);
  const max = Math.max(...ys, 0);
  const range = max - min || 1;
  const padL = showYLabels ? 30 : 0;
  const chartW = W - padL;
  const toX = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => height - 12 - ((v - min) / range) * (height - 24);

  const path = data.map((p, i) => `${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(' ');
  const peakIdx = ys.indexOf(Math.max(...ys));
  const gridLines = showGrid ? [0.25, 0.5, 0.75].map(f => 12 + f * (height - 24)) : [];
  const yTicks = showYLabels ? [max, (max + min) / 2, min] : [];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`lg-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f8fff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#4f8fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridLines.map((y, i) => (
        <line key={i} x1={padL} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
      ))}
      {yTicks.map((v, i) => (
        <text key={i} x={padL - 6} y={[16, height / 2, height - 12][i]} textAnchor="end"
          fontSize="7.5" fill="var(--text-muted)" fontFamily="'Space Grotesk', sans-serif">
          {Math.round(v)}
        </text>
      ))}
      <polygon points={`${padL},${height} ${path} ${W},${height}`} fill={`url(#lg-${gid})`} />
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {showPeak && peakIdx >= 0 && (
        <g>
          <circle cx={toX(peakIdx)} cy={toY(ys[peakIdx])} r="3.5" fill="var(--blue)" opacity="0.25">
            <animate attributeName="r" values="3.5;6;3.5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={toX(peakIdx)} cy={toY(ys[peakIdx])} r="2.5" fill="var(--blue)" />
        </g>
      )}
      {showXLabels && (
        <>
          <text x={padL} y={height} fontSize="7.5" fill="var(--text-muted)" fontFamily="'Space Grotesk', sans-serif">{data[0].label}</text>
          <text x={W} y={height} textAnchor="end" fontSize="7.5" fill="var(--text-muted)" fontFamily="'Space Grotesk', sans-serif">{data[data.length - 1].label}</text>
        </>
      )}
    </svg>
  );
}

export default LineChart;
