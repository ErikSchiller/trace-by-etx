export interface MonteCarloParams {
  winRate: number;        // 0-1
  avgWinnerR: number;     // multiple of risk (e.g. 1.5)
  avgLoserR: number;      // negative multiple (e.g. -1)
  riskPerTrade: number;   // $
  tradesPerDay: number;
  profitTarget: number;   // $
  maxDrawdown: number;    // $
  drawdownType: 'trailing' | 'static';
  dailyLossLimit?: number | null;
  minDays?: number;
  consistencyRule?: number | null; // 0-1
  timeLimit?: number | null;       // days
  simulations?: number;
}

export type Outcome = 'pass' | 'blown' | 'timeout';

export interface SimResult {
  outcome: Outcome;
  finalEquity: number;
  daysToFinish: number;
  equityCurve: number[];
  breached: boolean;
  breachReason?: string;
}

export interface MonteCarloResult {
  passRate: number;
  blowoutRate: number;
  timeoutRate: number;
  passWithoutBreachRate: number;
  avgDaysToPass: number;
  medianDaysToPass: number;
  p10Days: number;
  p90Days: number;
  medianEquityCurve: number[];
  samplePaths: number[][];   // up to 200 sampled curves for rendering
  finalEquities: number[];
  total: number;
}

function avg(arr: number[]) { return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0; }
function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

export function runMonteCarloSimulation(params: MonteCarloParams): MonteCarloResult {
  const {
    winRate, avgWinnerR, avgLoserR, riskPerTrade, tradesPerDay,
    profitTarget, maxDrawdown, drawdownType,
    dailyLossLimit, minDays = 0, consistencyRule, timeLimit,
    simulations = 1000,
  } = params;

  const results: SimResult[] = [];
  const maxDays = timeLimit || 365;

  for (let i = 0; i < simulations; i++) {
    let equity = 0, peak = 0, daysTraded = 0, bestDay = 0;
    let breached = false, breachReason = '';
    const curve = [0];

    while (daysTraded < maxDays) {
      let dayPnL = 0;
      const tradesToday = Math.max(1, Math.round(tradesPerDay + (Math.random() - 0.5) * 2));

      for (let t = 0; t < tradesToday; t++) {
        const isWin = Math.random() < winRate;
        const res = (isWin ? avgWinnerR : avgLoserR) * riskPerTrade;
        equity += res; dayPnL += res;
        if (equity > peak) peak = equity;
        curve.push(equity);

        if (dailyLossLimit && dayPnL <= -dailyLossLimit) { breached = true; breachReason = 'daily_loss'; break; }
        const dd = drawdownType === 'trailing' ? peak - equity : -equity;
        if (dd >= maxDrawdown) { breached = true; breachReason = 'max_drawdown'; break; }
      }
      if (breached) break;

      daysTraded++;
      bestDay = Math.max(bestDay, dayPnL);

      if (equity >= profitTarget && daysTraded >= minDays) {
        if (consistencyRule && consistencyRule > 0) {
          const allowedMax = equity * consistencyRule;
          if (bestDay > allowedMax) continue; // can't pass yet
        }
        results.push({ outcome: 'pass', finalEquity: equity, daysToFinish: daysTraded, equityCurve: curve, breached: false });
        break;
      }
    }

    if (results.length <= i) {
      results.push({ outcome: breached ? 'blown' : 'timeout', finalEquity: equity, daysToFinish: daysTraded, equityCurve: curve, breached, breachReason });
    }
  }

  const passes = results.filter(r => r.outcome === 'pass');
  const passDays = passes.map(r => r.daysToFinish).sort((a, b) => a - b);

  // Median equity curve: resample each curve to a fixed length, take per-step median
  const STEPS = 60;
  const resample = (curve: number[]) => {
    const out: number[] = [];
    for (let s = 0; s < STEPS; s++) {
      const idx = Math.round((s / (STEPS - 1)) * (curve.length - 1));
      out.push(curve[idx] ?? curve[curve.length - 1]);
    }
    return out;
  };
  const resampled = results.map(r => resample(r.equityCurve));
  const medianEquityCurve: number[] = [];
  for (let s = 0; s < STEPS; s++) {
    const col = resampled.map(c => c[s]).sort((a, b) => a - b);
    medianEquityCurve.push(col[Math.floor(col.length / 2)]);
  }
  // Sample up to 200 paths for rendering
  const samplePaths = resampled.filter((_, i) => i % Math.max(1, Math.floor(simulations / 200)) === 0).slice(0, 200);

  return {
    passRate: passes.length / simulations,
    blowoutRate: results.filter(r => r.outcome === 'blown').length / simulations,
    timeoutRate: results.filter(r => r.outcome === 'timeout').length / simulations,
    passWithoutBreachRate: passes.filter(r => !r.breached).length / simulations,
    avgDaysToPass: Math.round(avg(passDays)),
    medianDaysToPass: passDays.length ? passDays[Math.floor(passDays.length / 2)] : 0,
    p10Days: percentile(passDays, 10),
    p90Days: percentile(passDays, 90),
    medianEquityCurve,
    samplePaths,
    finalEquities: results.map(r => r.finalEquity),
    total: simulations,
  };
}
