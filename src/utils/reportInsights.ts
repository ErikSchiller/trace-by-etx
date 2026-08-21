import type { Trade } from '../store/tradeStore';
import { useTradeStore } from '../store/tradeStore';
import { type PropFirmAccount, getActiveAccounts, computeAccountStatus, getTotalInvested, getNetPnL } from '../store/propFirmStore';

export type InsightSeverity = 'warning' | 'positive' | 'info';
export type InsightTab = 'tecnico' | 'psicologico' | 'propfirms' | 'overview';

export interface Insight {
  id: string;
  category: string;
  severity: InsightSeverity;
  emoji: string;
  title: string;
  description: string;
  impact: number;          // 0-100
  actionLabel?: string;
  actionTab?: InsightTab;   // switch to this Reportes tab
  actionHref?: string;      // or navigate to a route
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SESSION_LABEL: Record<string, string> = { london: 'Londres', new_york: 'Nueva York', asia: 'Asia', premarket: 'Pre-market' };

function money(n: number) { return `${n >= 0 ? '+' : '-'}€${Math.abs(Math.round(n)).toLocaleString('en-US')}`; }
function moneyPlain(n: number) { return `€${Math.abs(Math.round(n)).toLocaleString('en-US')}`; }
function rOf(t: Trade) { return t.realRR || (t.pnl > 0 ? 1 : t.pnl < 0 ? -1 : 0); }
function expectancy(list: Trade[]) { return list.length ? list.reduce((s, t) => s + rOf(t), 0) / list.length : 0; }
function winRate(list: Trade[]) { return list.length ? (list.filter(t => t.pnl > 0).length / list.length) * 100 : 0; }
function net(list: Trade[]) { return list.reduce((s, t) => s + t.pnl, 0); }

/* ============ Rule sets ============ */

function winRateInsights(trades: Trade[]): Insight[] {
  if (trades.length < 10) return [];
  const out: Insight[] = [];
  const avgWr = winRate(trades);
  for (let d = 0; d < 7; d++) {
    const list = trades.filter(t => new Date(`${t.date}T00:00:00`).getDay() === d);
    if (list.length < 5) continue;
    const wr = winRate(list);
    if (wr >= avgWr + 15) {
      out.push({ id: `wr-good-${d}`, category: 'win_rate', severity: 'positive', emoji: '🌟',
        title: `Los ${WEEKDAYS[d]} rindes mejor`, description: `Win rate del ${wr.toFixed(0)}% vs ${avgWr.toFixed(0)}% promedio. Aprovecha ese día.`,
        impact: 50 + Math.min(30, wr - avgWr), actionLabel: 'Ver por día', actionTab: 'tecnico' });
    } else if (wr <= avgWr - 15) {
      out.push({ id: `wr-bad-${d}`, category: 'win_rate', severity: 'warning', emoji: '⚠️',
        title: `Los ${WEEKDAYS[d]} rindes peor`, description: `Win rate del ${wr.toFixed(0)}% vs ${avgWr.toFixed(0)}% promedio. Considera reducir tamaño o no operar.`,
        impact: 55 + Math.min(30, avgWr - wr), actionLabel: 'Ver por día', actionTab: 'tecnico' });
    }
  }
  return out;
}

function sessionInsights(trades: Trade[]): Insight[] {
  const sessions = ['london', 'new_york', 'asia', 'premarket'];
  const rows = sessions.map(s => ({ s, list: trades.filter(t => t.session === s) })).filter(r => r.list.length >= 5);
  if (rows.length < 2) return [];
  const withExp = rows.map(r => ({ s: r.s, exp: expectancy(r.list), n: r.list.length })).sort((a, b) => b.exp - a.exp);
  const best = withExp[0], worst = withExp[withExp.length - 1];
  if (best.exp > 0 && worst.exp !== 0 && best.exp > 2 * Math.abs(worst.exp)) {
    return [{ id: 'session-best', category: 'session', severity: 'positive', emoji: '🎯',
      title: `Tu mejor sesión es ${SESSION_LABEL[best.s]}`, description: `Expectancy de ${best.exp.toFixed(1)}R vs ${worst.exp.toFixed(1)}R en ${SESSION_LABEL[worst.s]}.`,
      impact: 60, actionLabel: 'Ver sesiones', actionTab: 'tecnico' }];
  }
  return [];
}

function setupInsights(trades: Trade[]): Insight[] {
  const out: Insight[] = [];
  const setups = new Map<string, Trade[]>();
  for (const t of trades) { const k = t.setup || 'Sin setup'; if (!setups.has(k)) setups.set(k, []); setups.get(k)!.push(t); }
  for (const [setup, list] of setups) {
    if (list.length < 10) continue;
    const wr = winRate(list); const p = net(list);
    if (wr >= 70) out.push({ id: `setup-king-${setup}`, category: 'setup', severity: 'positive', emoji: '✨',
      title: `Tu setup rey es ${setup}`, description: `${wr.toFixed(0)}% win rate en ${list.length} operaciones. Apuéstale más.`,
      impact: 65, actionLabel: 'Ver setups', actionTab: 'tecnico' });
    if (p < 0) out.push({ id: `setup-bad-${setup}`, category: 'setup', severity: 'warning', emoji: '📉',
      title: `${setup} te está costando dinero`, description: `${money(p)} en ${list.length} trades. Considera pausarlo hasta revisar.`,
      impact: 70, actionLabel: 'Ver setups', actionTab: 'tecnico' });
  }
  return out;
}

function timingInsights(trades: Trade[]): Insight[] {
  if (trades.length < 10) return [];
  const out: Insight[] = [];
  const byHour = new Map<number, Trade[]>();
  for (const t of trades) { const h = parseInt(t.time.slice(0, 2), 10); if (isNaN(h)) continue; if (!byHour.has(h)) byHour.set(h, []); byHour.get(h)!.push(t); }
  const avgExp = expectancy(trades);
  for (const [h, list] of byHour) {
    if (list.length < 5) continue;
    const exp = expectancy(list);
    if (avgExp > 0 && exp > 2 * avgExp) {
      out.push({ id: `time-good-${h}`, category: 'timing', severity: 'positive', emoji: '🕐',
        title: `Tu mejor franja: ${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`, description: `Expectancy ${exp.toFixed(1)}R (media ${avgExp.toFixed(1)}R).`,
        impact: 55, actionLabel: 'Ver horarios', actionTab: 'tecnico' });
    }
    const p = net(list);
    if (p < 0 && list.length >= 5) {
      out.push({ id: `time-bad-${h}`, category: 'timing', severity: 'warning', emoji: '🚨',
        title: `Pierdes sistemáticamente ${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`, description: `Total ${money(p)} en ${list.length} trades. Evita esa ventana.`,
        impact: 62, actionLabel: 'Ver horarios', actionTab: 'tecnico' });
    }
  }
  return out;
}

function consistencyInsights(trades: Trade[]): Insight[] {
  const total = net(trades);
  if (total <= 0) return [];
  const byDay = new Map<string, number>();
  for (const t of trades) byDay.set(t.date, (byDay.get(t.date) || 0) + t.pnl);
  let bestDay = 0;
  for (const v of byDay.values()) if (v > bestDay) bestDay = v;
  const pct = (bestDay / total) * 100;
  if (pct > 40) return [{ id: 'consistency', category: 'consistency', severity: 'warning', emoji: '⚖️',
    title: `Un solo día es el ${pct.toFixed(0)}% de tu PnL`, description: `Cuidado con la consistency rule de las prop firms — tu resultado depende demasiado de un día.`,
    impact: 58, actionTab: 'overview' }];
  return [];
}

function streakInsights(trades: Trade[]): Insight[] {
  const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const out: Insight[] = [];
  // trailing losing streak
  let losing = 0;
  for (let i = sorted.length - 1; i >= 0; i--) { if (sorted[i].pnl < 0) losing++; else break; }
  if (losing >= 3) out.push({ id: 'streak-loss', category: 'streak', severity: 'warning', emoji: '🛑',
    title: `Llevas ${losing} operaciones perdedoras`, description: `Considera parar y revisar antes de seguir operando.`, impact: 75 });
  // profitable-day streak
  const byDay = new Map<string, number>();
  for (const t of trades) byDay.set(t.date, (byDay.get(t.date) || 0) + t.pnl);
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let dayStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i][1] > 0) dayStreak++; else break; }
  if (dayStreak > 3) out.push({ id: 'streak-profit', category: 'streak', severity: 'positive', emoji: '🔥',
    title: `Racha activa: ${dayStreak} días profitable`, description: `Sigue así — la consistencia es lo que separa a los rentables.`, impact: 48 });
  return out;
}

function emotionalInsights(trades: Trade[]): Insight[] {
  const bad = trades.filter(t => t.emotionalState <= 2);
  if (bad.length < 5) return [];
  const wr = winRate(bad);
  if (wr < 30) return [{ id: 'emotion-bad', category: 'emotional', severity: 'warning', emoji: '🧠',
    title: `Operando mal ganas solo ${wr.toFixed(0)}%`, description: `Reconoce tu estado emocional antes de entrar — es tu mayor fuga.`,
    impact: 66, actionLabel: 'Ver psicología', actionTab: 'psicologico' }];
  return [];
}

function errorTagInsights(trades: Trade[]): Insight[] {
  if (trades.length < 5) return [];
  const out: Insight[] = [];
  const counts = new Map<string, number>();
  for (const t of trades) for (const tag of t.errorTags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  for (const [tag, n] of counts) {
    const pct = (n / trades.length) * 100;
    if (pct > 20) out.push({ id: `tag-${tag}`, category: 'error_tag', severity: 'warning', emoji: '🎯',
      title: `Tag más frecuente: ${tag}`, description: `Aparece en el ${pct.toFixed(0)}% de tus operaciones. Es tu área prioritaria.`,
      impact: 60, actionLabel: 'Ver errores', actionTab: 'psicologico' });
  }
  return out;
}

function propFirmInsights(accounts: PropFirmAccount[]): Insight[] {
  if (accounts.length === 0) return [];
  const out: Insight[] = [];
  const trades = useTradeStore.getState().trades as { accountId?: string; pnl: number; date: string; time: string }[];
  const linkedFor = (id: string) => trades.filter(t => t.accountId === id);
  for (const a of getActiveAccounts(accounts)) {
    const st = computeAccountStatus(a, linkedFor(a.id));
    if (st.ddBufferPct <= 0.15 && st.ddBufferPct >= 0) {
      out.push({ id: `pf-dd-${a.id}`, category: 'prop_firm', severity: 'warning', emoji: '🚨',
        title: `${a.firm} $${Math.round(a.accountSize / 1000)}K cerca del drawdown`, description: `A ${(st.ddBufferPct * 100).toFixed(0)}% del máximo permitido. Opera con precaución.`,
        impact: 80, actionLabel: 'Ver cuenta', actionHref: `/prop-firms/${a.id}` });
    }
  }
  const invested = getTotalInvested(accounts);
  const netPnl = getNetPnL(accounts);
  if (invested > 0) {
    const roi = (netPnl / invested) * 100;
    if (roi > 200) out.push({ id: 'pf-roi', category: 'prop_firm', severity: 'positive', emoji: '💰',
      title: `ROI en prop firms del ${roi.toFixed(0)}%`, description: `Estás rentabilizando muy bien la inversión (${moneyPlain(invested)} invertidos).`,
      impact: 55, actionLabel: 'Ver prop firms', actionTab: 'propfirms' });
  }
  return out;
}

/**
 * Runs all rule sets over the data and returns insights sorted by weighted
 * impact (warnings weighted 1.5x). Use `pickTopInsights` for a varied top-N.
 */
export function generateInsights(trades: Trade[], accounts: PropFirmAccount[]): Insight[] {
  const all = [
    ...winRateInsights(trades), ...sessionInsights(trades), ...setupInsights(trades),
    ...timingInsights(trades), ...consistencyInsights(trades), ...streakInsights(trades),
    ...emotionalInsights(trades), ...errorTagInsights(trades), ...propFirmInsights(accounts),
  ];
  return all.sort((a, b) => weighted(b) - weighted(a));
}

function weighted(i: Insight) { return i.impact * (i.severity === 'warning' ? 1.5 : 1); }

/** Top-N insights with severity variety (avoid showing only warnings). */
export function pickTopInsights(insights: Insight[], n = 3): Insight[] {
  const picked: Insight[] = [];
  let warnings = 0;
  for (const ins of insights) {
    if (picked.length >= n) break;
    if (ins.severity === 'warning' && warnings >= n - 1 && insights.some(x => x.severity !== 'warning' && !picked.includes(x))) continue;
    picked.push(ins);
    if (ins.severity === 'warning') warnings++;
  }
  // top up if we skipped some
  for (const ins of insights) { if (picked.length >= n) break; if (!picked.includes(ins)) picked.push(ins); }
  return picked;
}
