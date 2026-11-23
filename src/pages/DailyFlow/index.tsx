import { useMemo, useState } from 'react';
import { useUserTrades } from '../../store/tradeStore';
import {
  useDailyFlowStore, useDailyFlowDay, localDateKey, stepComplete, stepSkipped,
  STEP_ORDER, type StepId,
} from '../../store/dailyFlowStore';
import { StepCard, DF } from '../../components/DailyFlow/StepCard';
import { STEP_META, describeStep } from '../../components/DailyFlow/steps';
import { PreMarketModal, DisciplineModal, TradeRecapModal, DayWrapModal } from '../../components/DailyFlow/StepModals';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function DailyFlow() {
  const today = localDateKey();
  const day = useDailyFlowDay(today);
  const skipPreMarket = useDailyFlowStore(s => s.skipPreMarket);
  const trades = useUserTrades();
  const todayTrades = useMemo(() => trades.filter(t => t.date === today).sort((a, b) => a.time.localeCompare(b.time)), [trades, today]);
  const todayTradeIds = useMemo(() => todayTrades.map(t => t.id), [todayTrades]);
  const [openStep, setOpenStep] = useState<StepId | null>(null);

  const completed = STEP_ORDER.filter(s => stepComplete(day, s)).length;
  const next = STEP_ORDER.find(s => !stepComplete(day, s) && !stepSkipped(day, s)) ?? null;
  const now = new Date();
  const dateLabel = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div style={{ padding: '32px 36px 56px', maxWidth: 1180, margin: '0 auto', fontFamily: fontBody }}>
      <style>{`
        .df-step-card:hover { border-color: rgba(79,143,255,0.3) !important; transform: translateY(-2px); }
        @keyframes dfPulse { 0%, 100% { opacity: 0.9; } 50% { opacity: 1; } }
        .df-next-badge { animation: dfPulse 2s ease-in-out infinite; }
        .df-item .df-item-x { opacity: 0; transition: opacity 0.12s; }
        .df-item:hover .df-item-x { opacity: 1; }
        @media (max-width: 1000px) { .df-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.8rem', color: DF.text, margin: 0 }}>Daily Flow</h1>
          <div style={{ fontSize: '0.9rem', color: DF.muted, marginTop: 6 }}>Tu ritual diario en 4 pasos — opera con intención.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          <span style={{ background: DF.card, border: `1px solid ${DF.border}`, borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', color: DF.text2 }}>{dateLabel}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {STEP_ORDER.map(s => (
                <span key={s} title={STEP_META[s].title} style={{ width: 34, height: 6, borderRadius: 3, background: stepComplete(day, s) ? DF.blue : stepSkipped(day, s) ? DF.indigo : '#1e2029' }} />
              ))}
            </div>
            <span style={{ fontSize: '0.8rem', color: DF.text2 }}><b style={{ color: DF.text }}>{completed}</b> / 4 completados hoy</span>
          </div>
        </div>
      </div>

      {/* steps */}
      <div className="df-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {STEP_ORDER.map(s => {
          const meta = STEP_META[s];
          const { state, text } = describeStep(s, day, todayTradeIds);
          return (
            <StepCard key={s} number={meta.number} title={meta.title} description={meta.description} Icon={meta.Icon}
              state={state} statusText={text} isNext={next === s}
              onOpen={() => setOpenStep(s)}
              onSkip={s === 'pre_market' ? () => skipPreMarket(today) : undefined} />
          );
        })}
      </div>

      {openStep === 'pre_market' && <PreMarketModal date={today} onClose={() => setOpenStep(null)} onContinue={() => setOpenStep('discipline')} />}
      {openStep === 'discipline' && <DisciplineModal date={today} onClose={() => setOpenStep(null)} />}
      {openStep === 'trade_recap' && <TradeRecapModal date={today} trades={todayTrades} onClose={() => setOpenStep(null)} />}
      {openStep === 'day_wrap' && <DayWrapModal date={today} onClose={() => setOpenStep(null)} />}
    </div>
  );
}

export default DailyFlow;
