import type { Trade, Session } from '../store/tradeStore';
import type { PropFirmAccount } from '../store/propFirmStore';
import type { TradeFilters } from '../store/filterStore';

/**
 * Contextual insight engine — powers the click-to-explore ChartInsightPanel.
 * Rule-based (no AI): given a clicked chart element, returns stats, detected
 * patterns, recommendations and the related trades.
 */

export type InsightContextType =
  | 'weekday' | 'session' | 'setup' | 'hourslot' | 'errortag' | 'emotional'
  | 'rbucket' | 'month' | 'date' | 'score_dimension' | 'firm' | 'routine_day';

export interface InsightContext { type: InsightContextType; value: string | number; label?: string }
export interface InsightStat { label: string; value: string; tone?: 'blue' | 'red' | 'muted' }
export interface InsightPattern { emoji: string; text: string }
export interface InsightRec { title: string; description: string }
export interface InsightPanelData {
  tag: string;
  title: string;
  stats: InsightStat[];
  patterns: InsightPattern[];
  recommendations: InsightRec[];
  relatedTrades: Trade[];
  filter?: Partial<TradeFilters>;
  noteSeed?: string;
}

const WD = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SESS: Record<string, string> = { london: 'Londres', new_york: 'Nueva York', asia: 'Asia', premarket: 'Pre-market' };
const EMO: Record<number, string> = { 1: 'Muy tranquilo', 2: 'Tranquilo', 3: 'Neutral', 4: 'Estresado', 5: 'Muy estresado' };

function money(n: number, sym: string) { return `${n >= 0 ? '+' : '-'}${sym}${Math.abs(Math.round(n)).toLocaleString('en-US')}`; }
function rOfT(t: Trade) { return t.realRR || (t.pnl > 0 ? 1 : t.pnl < 0 ? -1 : 0); }

interface Agg { n: number; pnl: number; wr: number; pf: number; avg: number; expR: number }
function agg(list: Trade[]): Agg {
  const wins = list.filter(t => t.pnl > 0);
  const grossW = wins.reduce((s, t) => s + t.pnl, 0);
  const grossL = Math.abs(list.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const pnl = list.reduce((s, t) => s + t.pnl, 0);
  return {
    n: list.length, pnl,
    wr: list.length ? (wins.length / list.length) * 100 : 0,
    pf: grossL > 0 ? grossW / grossL : (grossW > 0 ? Infinity : 0),
    avg: list.length ? pnl / list.length : 0,
    expR: list.length ? list.reduce((s, t) => s + rOfT(t), 0) / list.length : 0,
  };
}

function baseStats(a: Agg, sym: string): InsightStat[] {
  return [
    { label: 'Net PnL', value: money(a.pnl, sym), tone: a.pnl >= 0 ? 'blue' : 'red' },
    { label: 'Win rate', value: `${a.wr.toFixed(0)}%` },
    { label: 'Operaciones', value: String(a.n) },
    { label: 'Profit Factor', value: isFinite(a.pf) ? a.pf.toFixed(2) : '∞' },
    { label: 'Avg / trade', value: money(a.avg, sym), tone: a.avg >= 0 ? 'blue' : 'red' },
    { label: 'Expectancy', value: `${a.expR >= 0 ? '+' : ''}${a.expR.toFixed(2)}R`, tone: a.expR >= 0 ? 'blue' : 'red' },
  ];
}

const recent = (list: Trade[], n = 10) => [...list].sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time)).slice(0, n);
const wdOf = (t: Trade) => new Date(`${t.date}T00:00:00`).getDay();
const hourOf = (t: Trade) => parseInt((t.time || '00:00').slice(0, 2), 10);

export function getInsightsForContext(ctx: InsightContext, trades: Trade[], accounts: PropFirmAccount[], sym = '$'): InsightPanelData {
  const all = agg(trades);
  const patterns: InsightPattern[] = [];
  const recommendations: InsightRec[] = [];
  let subset: Trade[] = [];
  let tag = 'INSIGHT';
  let title = String(ctx.value);
  let filter: Partial<TradeFilters> | undefined;
  let noteSeed: string | undefined;

  const compareVs = (a: Agg, label: string) => {
    if (all.n && a.n) {
      const diff = a.wr - all.wr;
      if (Math.abs(diff) >= 5) patterns.push({ emoji: diff >= 0 ? '📈' : '📉', text: `Tu win rate ${diff >= 0 ? 'sube' : 'cae'} ${Math.abs(diff).toFixed(0)} pts vs tu media (${all.wr.toFixed(0)}%) ${label}.` });
      const share = all.pnl !== 0 ? (a.pnl / all.pnl) * 100 : 0;
      if (a.pnl !== 0 && Math.abs(share) >= 30) patterns.push({ emoji: '💰', text: `Concentra el ${Math.abs(share).toFixed(0)}% de tu PnL total.` });
    }
  };
  const perfRec = (a: Agg, label: string) => {
    if (a.n >= 3 && a.wr < 45) recommendations.push({ title: `Reduce tamaño ${label}`, description: `Tu win rate ${label} es del ${a.wr.toFixed(0)}%. Considera operar con la mitad de tu size habitual hasta recuperar consistencia.` });
    else if (a.n >= 3 && a.pnl > 0 && a.wr >= 55) recommendations.push({ title: `Aprovecha tu ventaja ${label}`, description: `Rindes por encima de tu media ${label} (${a.wr.toFixed(0)}% WR). Prioriza estas condiciones en tu plan.` });
    if (a.expR < 0 && a.n >= 3) recommendations.push({ title: 'Expectancy negativa', description: `Cada operación ${label} pierde ${Math.abs(a.expR).toFixed(2)}R de media. Revisa entradas y gestión de salidas antes de repetir.` });
  };

  switch (ctx.type) {
    case 'weekday': {
      const idx = Number(ctx.value);
      subset = trades.filter(t => wdOf(t) === idx);
      const a = agg(subset); tag = 'INSIGHT DE RENDIMIENTO'; title = `${WD[idx]} · Rendimiento`;
      compareVs(a, `los ${WD[idx].toLowerCase()}`); perfRec(a, `los ${WD[idx].toLowerCase()}`);
      const hours = subset.map(hourOf).filter(h => !isNaN(h));
      if (hours.length) { const mid = hours.filter(h => h >= 14 && h <= 16).length; if (mid / hours.length >= 0.5) patterns.push({ emoji: '⏰', text: `El ${Math.round((mid / hours.length) * 100)}% de tus trades de este día son entre las 14–16h.` }); }
      noteSeed = `Análisis de mis ${WD[idx].toLowerCase()}`;
      break;
    }
    case 'session': {
      const s = String(ctx.value) as Session; subset = trades.filter(t => t.session === s);
      const a = agg(subset); tag = 'INSIGHT DE SESIÓN'; title = `${SESS[s] ?? s} · Sesión`;
      compareVs(a, `en ${SESS[s] ?? s}`); perfRec(a, `en ${SESS[s] ?? s}`); filter = { sessions: [s] };
      noteSeed = `Análisis de la sesión ${SESS[s] ?? s}`;
      break;
    }
    case 'setup': {
      const s = String(ctx.value); subset = trades.filter(t => t.setup === s);
      const a = agg(subset); tag = 'INSIGHT DE SETUP'; title = `Setup · ${s}`;
      compareVs(a, `con ${s}`); perfRec(a, `con ${s}`); filter = { setups: [s] };
      if (a.wr >= 60) patterns.push({ emoji: '🎯', text: `${s} es uno de tus setups más fiables (${a.wr.toFixed(0)}% WR).` });
      noteSeed = `Plan del setup ${s}`;
      break;
    }
    case 'month': {
      const mk = String(ctx.value); subset = trades.filter(t => t.date.startsWith(mk));
      const a = agg(subset); tag = 'INSIGHT MENSUAL'; title = `${mk} · Mes`;
      const byDay: Record<string, number> = {}; subset.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
      const days = Object.entries(byDay).sort((x, y) => y[1] - x[1]);
      if (days.length) { patterns.push({ emoji: '🟢', text: `Mejor día: ${days[0][0].slice(8)} (${money(days[0][1], sym)}).` }); const w = days[days.length - 1]; if (w[1] < 0) patterns.push({ emoji: '🔴', text: `Peor día: ${w[0].slice(8)} (${money(w[1], sym)}).` }); }
      perfRec(a, 'este mes');
      break;
    }
    case 'rbucket': {
      const b = Number(ctx.value); subset = trades.filter(t => { const r = rOfT(t); const rb = r >= 3 ? 3 : r <= -3 ? -3 : Math.round(r); return rb === b; });
      tag = 'INSIGHT DE DISTRIBUCIÓN R'; title = `Trades de ${b >= 3 ? '3R+' : `${b}R`}`;
      patterns.push({ emoji: '📊', text: `${subset.length} operaciones caen en este rango de R (${((subset.length / (all.n || 1)) * 100).toFixed(0)}% del total).` });
      if (b <= -1) recommendations.push({ title: 'Recorta las colas negativas', description: 'Estas operaciones drenan tu expectancy. Revisa si mueves el stop o entras sin confirmación.' });
      if (b >= 2) recommendations.push({ title: 'Replica tus mejores trades', description: 'Estudia qué setups y sesiones producen estos +R y concéntrate ahí.' });
      break;
    }
    case 'errortag': {
      const tagName = String(ctx.value); subset = trades.filter(t => (t.errorTags || []).includes(tagName));
      const a = agg(subset); tag = 'INSIGHT DE ERROR'; title = `Error · ${tagName}`;
      patterns.push({ emoji: '⚠️', text: `Aparece en ${subset.length} operaciones (${((subset.length / (all.n || 1)) * 100).toFixed(0)}% del total).` });
      if (a.pnl < 0) patterns.push({ emoji: '💸', text: `Coste estimado: ${money(a.pnl, sym)}.` });
      recommendations.push({ title: `Elimina "${tagName}"`, description: 'Añade una regla concreta a tu checklist pre-trade para no repetir este error.' });
      noteSeed = `Cómo dejo de cometer: ${tagName}`;
      break;
    }
    case 'emotional': {
      const e = Number(ctx.value); subset = trades.filter(t => t.emotionalState === e);
      const a = agg(subset); tag = 'INSIGHT EMOCIONAL'; title = `Estado · ${EMO[e] ?? e}`;
      compareVs(a, `cuando estás ${(EMO[e] ?? '').toLowerCase()}`);
      if (e >= 4 && a.wr < all.wr) recommendations.push({ title: 'No operes bajo estrés', description: `Tu rendimiento cae cuando estás ${(EMO[e] ?? '').toLowerCase()}. Considera saltarte la sesión o reducir size en estos estados.` });
      break;
    }
    case 'firm': {
      const firm = String(ctx.value); subset = trades.filter(t => { const acc = accounts.find(a => a.id === t.accountId); return acc?.firm === firm; });
      const a = agg(subset); tag = 'INSIGHT DE PROP FIRM'; title = `${firm}`;
      const firmAccounts = accounts.filter(x => x.firm === firm);
      patterns.push({ emoji: '🏦', text: `${firmAccounts.length} cuenta${firmAccounts.length === 1 ? '' : 's'} con esta firma.` });
      perfRec(a, `con ${firm}`);
      recommendations.push({ title: a.pnl >= 0 ? 'Considera escalar aquí' : 'Revisa tu asignación', description: a.pnl >= 0 ? `Tu operativa con ${firm} es rentable (${money(a.pnl, sym)}). Podría justificar más capital.` : `Tu operativa con ${firm} está en negativo. Evalúa si el modelo de esta firma encaja con tu estilo.` });
      break;
    }
    case 'hourslot': {
      const [dowS, hourS] = String(ctx.value).split('-'); const dow = Number(dowS), hour = Number(hourS);
      subset = trades.filter(t => wdOf(t) === dow && hourOf(t) === hour);
      const a = agg(subset); tag = 'INSIGHT HORARIO'; title = `${WD[dow]} · ${String(hour).padStart(2, '0')}:00`;
      patterns.push({ emoji: '⏱️', text: `${subset.length} operaciones en esta franja, expectancy ${a.expR >= 0 ? '+' : ''}${a.expR.toFixed(2)}R.` });
      recommendations.push({ title: a.expR >= 0 ? 'Franja favorable' : 'Evita esta franja', description: a.expR >= 0 ? 'Tu expectancy es positiva en este horario. Prioriza tus mejores setups aquí.' : 'Tu expectancy es negativa aquí. Considera no operar en esta franja o solo con señales A+.' });
      break;
    }
    case 'date':
    case 'routine_day': {
      const d = String(ctx.value); subset = trades.filter(t => t.date === d);
      const a = agg(subset); tag = ctx.type === 'routine_day' ? 'INSIGHT DE RUTINA' : 'INSIGHT DEL DÍA'; title = `${d}`;
      if (subset.length) patterns.push({ emoji: a.pnl >= 0 ? '🟢' : '🔴', text: `Resultado del día: ${money(a.pnl, sym)} en ${subset.length} operaciones.` });
      else patterns.push({ emoji: '📭', text: 'Sin operaciones registradas este día.' });
      noteSeed = `Diario · ${d}`;
      break;
    }
    case 'score_dimension': {
      subset = recent(trades, 10); tag = 'INSIGHT DE PUNTUACIÓN'; title = `Dimensión · ${ctx.label ?? ctx.value}`;
      patterns.push({ emoji: '🧭', text: 'Pulsa "?" en el panel para ver la fórmula completa de esta dimensión.' });
      recommendations.push({ title: 'Sube esta dimensión', description: 'Cada dimensión suma al TRACE Score. Revisa el desglose para ver qué la está limitando.' });
      break;
    }
  }

  const a = agg(subset);
  const stats = subset.length ? baseStats(a, sym) : [{ label: 'Operaciones', value: '0' }];
  return { tag, title, stats, patterns, recommendations, relatedTrades: recent(subset, 8), filter, noteSeed };
}
