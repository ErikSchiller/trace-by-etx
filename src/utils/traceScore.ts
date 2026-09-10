import { getWinRate, getProfitFactor, type Trade } from '../store/tradeStore';

/**
 * Transparent TRACE Score breakdown (0-100) across 6 dimensions.
 * Uses only data the app already tracks — no new metrics. This powers the
 * dashboard panel + explanation modal (the canonical getTraceScore in
 * tradeStore is left untouched for the PnL cards / per-day scope).
 */
export interface TraceDimension {
  key: string;
  label: string;
  score: number;        // points earned
  max: number;          // max points
  valueLabel: string;   // human value, e.g. "58.3%"
  explanation: string;  // plain-Spanish formula
  tip: string;          // how to improve
}

export interface TraceGrade { label: string; color: string; glow: boolean }

export interface TraceBreakdown {
  total: number;
  grade: TraceGrade;
  dims: TraceDimension[];
}

export interface TraceCtx {
  dailyLossLimit: number;
  habitRate01: number;      // 0..1 routine completion rate
  profitableStreak: number; // consecutive profitable days
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pct = (n: number) => `${n.toFixed(1)}%`;

export function traceGrade(total: number): TraceGrade {
  if (total >= 85) return { label: 'Elite', color: '#4f8fff', glow: true };
  if (total >= 70) return { label: 'Excelente', color: '#6b9fff', glow: false };
  if (total >= 50) return { label: 'Sólido', color: '#4f8fff', glow: false };
  if (total >= 30) return { label: 'En construcción', color: '#f59e0b', glow: false };
  return { label: 'Empezando', color: '#ef4444', glow: false };
}

export function traceBreakdown(trades: Trade[], ctx: TraceCtx): TraceBreakdown {
  const n = trades.length;

  // 1 · Win Rate (0-25) — max at 60%+
  const wr = getWinRate(trades);
  const winRate: TraceDimension = {
    key: 'winRate', label: 'Win Rate', max: 25,
    score: n ? Math.min(25, (wr / 60) * 25) : 0,
    valueLabel: pct(wr),
    explanation: 'Tu porcentaje de operaciones ganadoras dividido entre 60%, por 25 puntos. Alcanzas el máximo con un win rate del 60% o superior.',
    tip: 'Prioriza tu setup de mayor probabilidad y evita entradas exploratorias que bajan tu media.',
  };

  // 2 · Profit Factor (0-20) — max at 2.0+
  const pf = getProfitFactor(trades);
  const pfShown = isFinite(pf) ? pf : (n ? Infinity : 0);
  const profitFactor: TraceDimension = {
    key: 'pf', label: 'Profit Factor', max: 20,
    score: n ? Math.min(20, (isFinite(pf) ? pf : 3) / 2 * 20) : 0,
    valueLabel: isFinite(pfShown) ? pfShown.toFixed(2) : '∞',
    explanation: 'Ganancia bruta ÷ pérdida bruta, dividido entre 2.0, por 20 puntos. Máximo con un profit factor de 2.0 o más.',
    tip: 'Corta las pérdidas antes y deja correr los ganadores para subir la ratio bruto/pérdidas.',
  };

  // 3 · Discipline (0-15) — SL respected · plan-based · within daily loss limit
  const slRespected = n ? 1 - trades.filter(t => t.errorTags.includes('Movió SL')).length / n : 0;
  const planBased = n ? trades.filter(t => t.isPlanBased).length / n : 0;
  const byDay: Record<string, number> = {};
  trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const days = Object.values(byDay);
  const lossOk = days.length ? days.filter(d => d >= -Math.abs(ctx.dailyLossLimit || 0)).length / days.length : 0;
  const disc01 = n ? (slRespected + planBased + lossOk) / 3 : 0;
  const discipline: TraceDimension = {
    key: 'discipline', label: 'Disciplina', max: 15,
    score: disc01 * 15,
    valueLabel: pct(disc01 * 100),
    explanation: 'Promedio de: operaciones con stop respetado, operaciones según tu plan, y días dentro de tu límite de pérdida diaria.',
    tip: 'Respeta siempre el stop inicial y cierra la sesión al tocar tu límite de pérdida diaria.',
  };

  // 4 · Consistency (0-15) — penalize concentration of profits in one day
  const posDays = days.filter(d => d > 0);
  const sumPos = posDays.reduce((s, d) => s + d, 0);
  const maxShare = sumPos > 0 ? Math.max(...posDays) / sumPos : 0;
  const cons01 = days.length <= 1 ? 0.5 : clamp01(1 - Math.max(0, maxShare - 0.3) / 0.7);
  const consistency: TraceDimension = {
    key: 'consistency', label: 'Consistencia', max: 15,
    score: n ? cons01 * 15 : 0,
    valueLabel: sumPos > 0 ? `${Math.round(maxShare * 100)}% en tu mejor día` : '—',
    explanation: 'Penaliza si un solo día concentra más del 30% de tus ganancias. Cuanto más repartidos, mayor la puntuación.',
    tip: 'Busca beneficios repartidos entre sesiones en vez de depender de un único día extraordinario.',
  };

  // 5 · R:R realizado (0-15) — max at 2R average
  const rrs = trades.map(t => t.realRR).filter(r => isFinite(r));
  const avgR = rrs.length ? rrs.reduce((s, r) => s + r, 0) / rrs.length : 0;
  const rr: TraceDimension = {
    key: 'rr', label: 'R:R', max: 15,
    score: n ? Math.min(15, Math.max(0, avgR) / 2 * 15) : 0,
    valueLabel: `${avgR.toFixed(2)}R`,
    explanation: 'Tu R:R medio realizado dividido entre 2R, por 15 puntos. Máximo con una media de 2R o más.',
    tip: 'Sube el objetivo de tus mejores entradas: con 2R de media el sistema tolera menor win rate.',
  };

  // 6 · Frecuencia & Hábito (0-10) — routine completion + profitable streak
  const freq01 = 0.6 * clamp01(ctx.habitRate01) + 0.4 * clamp01(ctx.profitableStreak / 5);
  const habit: TraceDimension = {
    key: 'habit', label: 'Hábito', max: 10,
    score: freq01 * 10,
    valueLabel: `${Math.round(ctx.habitRate01 * 100)}% rutina · ${ctx.profitableStreak}d racha`,
    explanation: 'Combina tu constancia con la rutina diaria (60%) y tu racha de días rentables (40%).',
    tip: 'Completa tu rutina cada día operado: la constancia es lo que compone resultados a largo plazo.',
  };

  const dims = [winRate, profitFactor, discipline, consistency, rr, habit];
  const total = Math.round(clamp01(dims.reduce((s, d) => s + d.score, 0) / 100) * 100);
  return { total, grade: traceGrade(total), dims };
}
