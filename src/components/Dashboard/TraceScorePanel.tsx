import { useMemo, useState } from 'react';
import { RadarChart } from '../Charts/RadarChart';
import type { Trade } from '../../store/tradeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useRoutineStore, dayRatio } from '../../store/routineStore';
import { useUserNotes } from '../../store/notebookStore';
import { getUserTrades } from '../../store/tradeStore';
import { computeStreaks } from '../../utils/streaks';
import { traceBreakdown, type TraceCtx } from '../../utils/traceScore';
import { TraceScoreModal } from '../Modals/TraceScoreModal';
import { useInsightPanel } from '../../store/insightPanelStore';

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
      sum += dayRatio(routine, completions[d.toISOString().slice(0, 10)]);
    }
    return sum / 30;
  }, [routine, completions]);
}

const SHORT: Record<string, string> = { winRate: 'Win %', pf: 'PF', discipline: 'Disc.', consistency: 'Cons.', rr: 'R:R', habit: 'Hábito' };

export function TraceScorePanel({ trades, prevTrades }: { trades: Trade[]; prevTrades?: Trade[] | null; rangeLabel?: string }) {
  const dailyLossLimit = useSettingsStore(s => s.dailyLossLimit);
  const routine = useRoutineStore(s => s.routine);
  const completions = useRoutineStore(s => s.completions);
  const notes = useUserNotes();
  const habitRate01 = useHabitRate();
  const openInsight = useInsightPanel(s => s.open);
  const [modalOpen, setModalOpen] = useState(false);

  const streaks = useMemo(
    () => computeStreaks({ routine, completions, trades: getUserTrades(), notes, dailyLossLimit }),
    [routine, completions, notes, dailyLossLimit],
  );
  const ctx: TraceCtx = { dailyLossLimit, habitRate01, profitableStreak: streaks.profitable.current };

  const bd = useMemo(() => traceBreakdown(trades, ctx), [trades, ctx]);
  const prevTotal = useMemo(() => (prevTrades && prevTrades.length ? traceBreakdown(prevTrades, ctx).total : null), [prevTrades, ctx]);
  const delta = prevTotal !== null ? bd.total - prevTotal : null;

  const values = bd.dims.map(d => d.score / d.max);
  const labels = bd.dims.map(d => SHORT[d.key] ?? d.label);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', fontFamily: BODY }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.85rem', color: C.text2 }}>TRACE Score</div>
        <button onClick={() => setModalOpen(true)} title="Cómo se calcula" aria-label="Cómo se calcula" style={{ width: 22, height: 22, borderRadius: '50%', background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>?</button>
      </div>

      {/* body split: radar left, score + grade + bar right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: '0 0 150px' }}>
          <RadarChart values={values} labels={labels} size={168} centerLabel={bd.total} onAxisClick={i => openInsight({ type: 'score_dimension', value: bd.dims[i].key, label: bd.dims[i].label })} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>Tu puntuación</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: '2.8rem', color: bd.grade.color, lineHeight: 1, textShadow: bd.grade.glow ? `0 0 20px ${bd.grade.color}66` : 'none' }}>{bd.total}</div>
            <div style={{ fontSize: '0.8rem', color: C.muted }}>/100</div>
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '0.9rem', color: bd.grade.color, marginTop: 2 }}>{bd.grade.label}</div>
          {delta !== null && (
            <div style={{ fontSize: '0.7rem', color: delta >= 0 ? C.blue : C.red, marginTop: 3 }}>
              {delta >= 0 ? '↗' : '↘'} {delta >= 0 ? '+' : ''}{delta} este periodo
            </div>
          )}
          {/* gradient scale bar */}
          <div style={{ position: 'relative', height: 6, borderRadius: 3, marginTop: 12, background: 'linear-gradient(to right, var(--red), #f59e0b, var(--blue))' }}>
            <div style={{ position: 'absolute', left: `${bd.total}%`, top: -3, width: 4, height: 12, background: '#fff', borderRadius: 2, transform: 'translateX(-50%)' }} />
          </div>
          <button onClick={() => setModalOpen(true)} style={{ marginTop: 10, background: 'transparent', border: 'none', color: C.blue, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, padding: 0, fontFamily: BODY }}>Ver desglose completo →</button>
        </div>
      </div>

      <TraceScoreModal open={modalOpen} onClose={() => setModalOpen(false)} breakdown={bd} />
    </div>
  );
}

export default TraceScorePanel;
