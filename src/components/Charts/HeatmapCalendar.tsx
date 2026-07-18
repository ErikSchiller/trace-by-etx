export interface HeatCell {
  date: string;         // YYYY-MM-DD
  day: number;          // day-of-month
  pnl: number | null;   // null = no trades
  isToday?: boolean;
}

interface HeatmapCalendarProps {
  cells: HeatCell[];        // includes leading empty placeholders (day = 0)
  selected?: string | null;
  onSelect?: (date: string) => void;
  formatValue?: (pnl: number) => string;
  compact?: boolean;
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function colorFor(pnl: number | null): { bg: string; text: string } {
  if (pnl === null) return { bg: '#1a1c22', text: 'var(--text-muted)' };
  if (pnl === 0) return { bg: 'rgba(255,255,255,0.05)', text: 'var(--text-secondary)' };
  if (pnl > 0) {
    const a = pnl < 100 ? 0.15 : pnl < 300 ? 0.3 : 0.6;
    return { bg: `rgba(79,143,255,${a})`, text: 'var(--blue)' };
  }
  const abs = Math.abs(pnl);
  const a = abs < 100 ? 0.15 : abs < 300 ? 0.3 : 0.6;
  return { bg: `rgba(239,68,68,${a})`, text: 'var(--red)' };
}

/** Monthly heatmap. rounded 6px cells, 6px gap, intensity by PnL. */
export function HeatmapCalendar({ cells, selected, onSelect, formatValue, compact }: HeatmapCalendarProps) {
  const cellH = compact ? 34 : 64;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif" }}>{compact ? d[0] : d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((c, i) => {
          if (c.day === 0) return <div key={`e${i}`} style={{ height: cellH }} />;
          const has = c.pnl !== null;
          const { bg, text } = colorFor(c.pnl);
          const isSel = selected === c.date;
          return (
            <div
              key={c.date}
              onClick={() => has && onSelect?.(c.date)}
              style={{
                height: cellH, borderRadius: 6, background: bg,
                border: isSel ? '2px solid var(--blue)' : c.isToday ? '1px solid var(--blue)' : '1px solid transparent',
                padding: compact ? '3px 4px' : '6px 8px', cursor: has ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: compact ? 8 : 11, color: 'var(--text-muted)' }}>{c.day}</div>
              {has && !compact && (
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: text, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {formatValue ? formatValue(c.pnl as number) : c.pnl}
                </div>
              )}
              {has && compact && (c.pnl as number) !== 0 && (
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: text, alignSelf: 'flex-start' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HeatmapCalendar;
