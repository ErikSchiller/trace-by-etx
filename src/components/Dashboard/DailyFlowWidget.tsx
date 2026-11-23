import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trade } from '../../store/tradeStore';
import {
  useDailyFlowDay, localDateKey, stepComplete, stepHandled, STEP_ORDER, STEP_NAME,
} from '../../store/dailyFlowStore';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";

/** Compact Daily Flow progress row for the Dashboard. */
export function DailyFlowWidget({ trades }: { trades: Trade[] }) {
  const navigate = useNavigate();
  const today = localDateKey();
  const day = useDailyFlowDay(today);
  const hasTradesToday = useMemo(() => trades.some(t => t.date === today), [trades, today]);

  const done = STEP_ORDER.filter(s => stepComplete(day, s)).length;
  const next = STEP_ORDER.find(s => !stepHandled(day, s)) ?? null;
  const complete = next === null; // every step done (a skipped pre-market still closes the day)

  let subtitle: string;
  if (complete) subtitle = 'Día completado ✓ Sigue así.';
  else if (next === 'trade_recap' && !hasTradesToday) subtitle = 'Aún sin trades hoy';
  else if (done === 0 && next === 'pre_market') subtitle = 'Empieza tu ritual diario';
  else if (done === 3) subtitle = `Casi listo — solo falta ${STEP_NAME[next!]}`;
  else subtitle = `Vas por el paso ${STEP_ORDER.indexOf(next!) + 1}: ${STEP_NAME[next!]}`;

  // Progress ring
  const size = 56, stroke = 5, r = (size - stroke) / 2, circ = 2 * Math.PI * r;

  return (
    <div style={{ background: '#111113', border: '1px solid #1e2029', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, fontFamily: fontBody }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2029" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#4f8fff" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - done / 4)} style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
        </svg>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontHead, fontWeight: 700, fontSize: '0.92rem', color: '#f7f8fa' }}>{done}/4</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#f7f8fa' }}>Daily Flow</div>
        <div style={{ fontSize: '0.82rem', color: complete ? '#4f8fff' : '#6b7382', marginTop: 3 }}>{subtitle}</div>
      </div>

      <button onClick={() => navigate('/daily-flow')} style={complete
        ? { background: 'transparent', color: '#d0d0dc', border: '1px solid #1e2029', borderRadius: 9, padding: '9px 16px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, whiteSpace: 'nowrap' }
        : { background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, whiteSpace: 'nowrap' }}>
        {complete ? 'Ver detalle →' : 'Continuar →'}
      </button>
    </div>
  );
}
