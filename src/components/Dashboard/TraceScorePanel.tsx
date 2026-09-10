import { useMemo, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import type { Trade } from '../../store/tradeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useRoutineStore, dayRatio } from '../../store/routineStore';
import { useUserNotes } from '../../store/notebookStore';
import { getUserTrades } from '../../store/tradeStore';
import { computeStreaks } from '../../utils/streaks';
import { traceBreakdown, type TraceCtx } from '../../utils/traceScore';
import { TraceScoreModal } from '../Modals/TraceScoreModal';

const HEAD = "'Syne', sans-serif";
const BODY = "'Space Grotesk', sans-serif";
const C = { card: '#15171d', border: '#1e2029', blue: '#4f8fff', red: '#ef4444', text: '#f7f8fa', text2: '#c8d4e8', muted: '#6b7280' };

/** 0..1 average routine completion over the last 30 calendar days. */
function useHabitRate(): number {
  const routine = useRoutineStore(s => s.routine);
  const completions = useRoutineStore(s => s.completions);
  return useMemo(() => {
    if (!routine || routine.habits.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      sum += dayRatio(routine, completions[key]);
    }
    return sum / 30;
  }, [routine, completions]);
}

export function TraceScorePanel({ trades, prevTrades, rangeLabel }: { trades: Trade[]; prevTrades?: Trade[] | null; rangeLabel?: string }) {
  const dailyLossLimit = useSettingsStore(s => s.dailyLossLimit);
  const routine = useRoutineStore(s => s.routine);
  const completions = useRoutineStore(s => s.completions);
  const notes = useUserNotes();
  const habitRate01 = useHabitRate();
  const [modalOpen, setModalOpen] = useState(false);

  const streaks = useMemo(
    () => computeStreaks({ routine, completions, trades: getUserTrades(), notes, dailyLossLimit }),
    [routine, completions, notes, dailyLossLimit],
  );
  const ctx: TraceCtx = { dailyLossLimit, habitRate01, profitableStreak: streaks.profitable.current };

  const bd = useMemo(() => traceBreakdown(trades, ctx), [trades, ctx]);
  const prevTotal = useMemo(() => (prevTrades && prevTrades.length ? traceBreakdown(prevTrades, ctx).total : null), [prevTrades, ctx]);
  const delta = prevTotal !== null ? bd.total - prevTotal : null;

  // Short axis labels so they don't clip in the narrow dashboard column
  // (full names appear in the breakdown rows + modal).
  const SHORT: Record<string, string> = { winRate: 'Win %', pf: 'PF', discipline: 'Disc.', consistency: 'Cons.', rr: 'R:R', habit: 'Hábito' };
  const radarData = bd.dims.map(d => ({ axis: SHORT[d.key] ?? d.label, value: Math.round((d.score / d.max) * 100) }));

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '22px 26px', minHeight: 340, display: 'flex', flexDirection: 'column', fontFamily: BODY }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.95rem', color: C.text }}>TRACE Score</div>
        <button onClick={() => setModalOpen(true)} title="Cómo se calcula" aria-label="Cómo se calcula" style={{ width: 24, height: 24, borderRadius: '50%', background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>?</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
        <span style={{ fontSize: '0.72rem', color: C.muted }}>Basado en tus {trades.length} operaciones del periodo</span>
        {rangeLabel && <span style={{ fontSize: '0.66rem', color: C.blue, background: 'rgba(79,143,255,0.1)', border: '1px solid rgba(79,143,255,0.2)', borderRadius: 20, padding: '2px 10px' }}>Rango: {rangeLabel}</span>}
      </div>

      {/* body split */}
      <div className="ts-split" style={{ display: 'flex', gap: 16, marginTop: 10, flex: 1, minHeight: 0 }}>
        {/* radar */}
        <div style={{ flex: '1 1 56%', minWidth: 0, minHeight: 210 }}>
          <ResponsiveContainer width="100%" height="100%" minHeight={210}>
            <RadarChart data={radarData} outerRadius="64%" margin={{ top: 14, right: 40, bottom: 14, left: 40 }}>
              <PolarGrid stroke="rgba(255,255,255,0.07)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: BODY }} />
              <Radar dataKey="value" stroke={C.blue} fill={C.blue} fillOpacity={0.16} strokeWidth={2} isAnimationActive animationDuration={500} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* right column */}
        <div style={{ flex: '1 1 44%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>Tu puntuación</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: '3.4rem', color: bd.grade.color, lineHeight: 1, textShadow: bd.grade.glow ? `0 0 24px ${bd.grade.color}66` : 'none' }}>{bd.total}</div>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.95rem', color: bd.grade.color }}>{bd.grade.label}</div>
          </div>
          {delta !== null && (
            <div style={{ fontSize: '0.72rem', color: delta >= 0 ? C.blue : C.red, marginTop: 4 }}>
              {delta >= 0 ? '↗' : '↘'} {delta >= 0 ? '+' : ''}{delta} vs periodo anterior
            </div>
          )}

          {/* breakdown rows */}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
            {bd.dims.map(d => {
              const p = (d.score / d.max);
              return (
                <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.72rem', color: C.text2, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
                  <span style={{ fontSize: '0.68rem', color: C.muted, fontVariantNumeric: 'tabular-nums', width: 46, textAlign: 'right' }}>{d.score.toFixed(0)}/{d.max}</span>
                  <span style={{ width: 56, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
                    <span style={{ display: 'block', width: `${p * 100}%`, height: '100%', background: C.blue, opacity: 0.5 + p * 0.5, borderRadius: 2 }} />
                  </span>
                </div>
              );
            })}
          </div>

          <button onClick={() => setModalOpen(true)} style={{ alignSelf: 'flex-start', marginTop: 8, background: 'transparent', border: 'none', color: C.blue, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600, padding: 0, fontFamily: BODY }}>Ver desglose completo →</button>
        </div>
      </div>

      <TraceScoreModal open={modalOpen} onClose={() => setModalOpen(false)} breakdown={bd} />
      <style>{`@media (max-width: 1200px){ .ts-split{ flex-direction: column !important; } }`}</style>
    </div>
  );
}

export default TraceScorePanel;
