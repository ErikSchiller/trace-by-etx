export interface BarDatum { label: string; value: number }

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  showZeroLine?: boolean;
  formatValue?: (v: number) => string;
}

/** Bars: max 24px wide, rounded tops, blue positive / red negative, breathing room. */
export function BarChart({ data, height = 160, showZeroLine = true, formatValue }: BarChartProps) {
  if (data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>Sin datos</div>;
  }
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const hasNeg = data.some(d => d.value < 0);
  const zeroY = hasNeg ? height * 0.5 : height - 18;
  const areaH = hasNeg ? height * 0.42 : height - 26;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, height, position: 'relative' }}>
        {showZeroLine && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: zeroY, height: 1, background: 'var(--border-subtle)' }} />
        )}
        {data.map((d, i) => {
          const pos = d.value >= 0;
          const barH = (Math.abs(d.value) / maxAbs) * areaH;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: pos ? zeroY - barH : zeroY,
                width: '100%', maxWidth: 24, height: Math.max(2, barH),
                background: pos ? 'var(--blue)' : 'var(--red)',
                borderRadius: pos ? '3px 3px 0 0' : '0 0 3px 3px',
              }} />
              <div style={{ position: 'absolute', top: height - 14, fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{d.label}</div>
            </div>
          );
        })}
      </div>
      {formatValue && (
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: d.value >= 0 ? 'var(--blue)' : 'var(--red)' }}>{formatValue(d.value)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BarChart;
