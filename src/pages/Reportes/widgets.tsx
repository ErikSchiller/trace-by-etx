import {
  getCumulativePnL, getWinRate, getProfitFactor, type Trade,
} from '../../store/tradeStore';
import {
  type PropFirmAccount, getTotalInvested, getTotalPayouts,
} from '../../store/propFirmStore';
import { LineChart } from '../../components/Charts/LineChart';
import { generateInsights, pickTopInsights } from '../../utils/reportInsights';
import {
  label, fontHead, fmt, fmtPlain, pnlColor, SESSION_LABEL, SESSIONS, WEEKDAYS,
  statsFor, groupBy, equityPoints,
} from './shared';

export interface WidgetCtx { trades: Trade[]; accounts: PropFirmAccount[]; config?: Record<string, unknown> }
export type WidgetCategory = 'KPIs' | 'Charts' | 'Tables' | 'Insights' | 'Prop Firms' | 'Custom';

export interface WidgetDef {
  title: string;
  category: WidgetCategory;
  defaultW: number;
  configurable?: boolean;
  render: (ctx: WidgetCtx) => React.ReactNode;
}

/* ── small building blocks ── */
function Tile({ title, value, color, sub }: { title: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ height: '100%' }}>
      <div style={label}>{title}</div>
      <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.5rem', color: color || '#fff', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.65rem', color: '#4a4a60', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ height: '100%' }}><div style={label}>{title}</div>{children}</div>;
}

function profitableDayStreak(trades: Trade[]) {
  const byDay = new Map<string, number>();
  for (const t of trades) byDay.set(t.date, (byDay.get(t.date) || 0) + t.pnl);
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let cur = 0, best = 0, run = 0;
  for (const [, v] of days) { if (v > 0) { run++; best = Math.max(best, run); } else run = 0; }
  for (let i = days.length - 1; i >= 0; i--) { if (days[i][1] > 0) cur++; else break; }
  return { cur, best };
}

function Bars({ items, height = 130 }: { items: { label: string; value: number }[]; height?: number }) {
  const maxAbs = Math.max(...items.map(i => Math.abs(i.value)), 1);
  const hasNeg = items.some(i => i.value < 0);
  return (
    <div style={{ display: 'flex', alignItems: hasNeg ? 'center' : 'flex-end', gap: 6, height, paddingTop: 8, position: 'relative' }}>
      {hasNeg && <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'var(--border-subtle)' }} />}
      {items.map((it, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: hasNeg ? 'center' : 'flex-end', height: '100%' }} title={`${it.label}: ${fmt(it.value)}`}>
          <div style={{ width: '55%', maxWidth: 34, height: Math.max(3, (Math.abs(it.value) / maxAbs) * (height - 30)), background: pnlColor(it.value), borderRadius: it.value >= 0 ? '3px 3px 0 0' : '0 0 3px 3px' }} />
          <div style={{ fontSize: 8, color: '#4a4a60', marginTop: 3 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Custom KPI metric ── */
const METRICS: Record<string, { label: string; fn: (l: Trade[]) => number; fmt: (n: number) => string }> = {
  netpnl: { label: 'Net PnL', fn: l => getCumulativePnL(l), fmt: fmt },
  winrate: { label: 'Win rate', fn: l => getWinRate(l), fmt: n => `${n.toFixed(0)}%` },
  pf: { label: 'Profit factor', fn: l => getProfitFactor(l), fmt: n => isFinite(n) ? n.toFixed(2) : '∞' },
  count: { label: 'Nº operaciones', fn: l => l.length, fmt: n => String(n) },
  avgwin: { label: 'Avg win', fn: l => statsFor(l).aw, fmt: fmt },
  avgloss: { label: 'Avg loss', fn: l => statsFor(l).al, fmt: fmt },
};
export const METRIC_OPTIONS = Object.entries(METRICS).map(([k, v]) => ({ key: k, label: v.label }));

/* ── Registry ── */
export const WIDGET_DEFS: Record<string, WidgetDef> = {
  kpi_netpnl: { title: 'Net PnL', category: 'KPIs', defaultW: 1, render: ({ trades }) => <Tile title="Net PnL" value={fmt(getCumulativePnL(trades))} color={pnlColor(getCumulativePnL(trades))} sub={`${trades.length} ops`} /> },
  kpi_pf: { title: 'Profit factor', category: 'KPIs', defaultW: 1, render: ({ trades }) => { const pf = getProfitFactor(trades); return <Tile title="Profit factor" value={isFinite(pf) ? pf.toFixed(2) : '∞'} />; } },
  kpi_winrate: { title: 'Win rate', category: 'KPIs', defaultW: 1, render: ({ trades }) => <Tile title="Win rate" value={`${getWinRate(trades).toFixed(0)}%`} /> },
  kpi_count: { title: 'Nº operaciones', category: 'KPIs', defaultW: 1, render: ({ trades }) => <Tile title="Operaciones" value={String(trades.length)} /> },
  kpi_best: { title: 'Mejor trade', category: 'KPIs', defaultW: 1, render: ({ trades }) => <Tile title="Mejor trade" value={fmt(trades.length ? Math.max(...trades.map(t => t.pnl)) : 0)} color="var(--blue)" /> },
  kpi_worst: { title: 'Peor trade', category: 'KPIs', defaultW: 1, render: ({ trades }) => <Tile title="Peor trade" value={fmt(trades.length ? Math.min(...trades.map(t => t.pnl)) : 0)} color="var(--red)" /> },
  kpi_streak: { title: 'Racha actual', category: 'KPIs', defaultW: 1, render: ({ trades }) => <Tile title="Racha profitable" value={`${profitableDayStreak(trades).cur} días`} /> },
  kpi_beststreak: { title: 'Mejor racha', category: 'KPIs', defaultW: 1, render: ({ trades }) => <Tile title="Mejor racha" value={`${profitableDayStreak(trades).best} días`} /> },
  kpi_invested: { title: 'Total invertido', category: 'Prop Firms', defaultW: 1, render: ({ accounts }) => <Tile title="Total invertido" value={fmtPlain(getTotalInvested(accounts))} /> },
  kpi_payouts: { title: 'Total payouts', category: 'Prop Firms', defaultW: 1, render: ({ accounts }) => <Tile title="Total payouts" value={fmtPlain(getTotalPayouts(accounts))} color="var(--blue)" /> },

  chart_equity: { title: 'Equity curve', category: 'Charts', defaultW: 2, render: ({ trades }) => <Panel title="Equity acumulada"><LineChart data={equityPoints(trades)} height={140} showGrid showPeak /></Panel> },
  chart_cumulative: { title: 'PnL acumulado', category: 'Charts', defaultW: 2, render: ({ trades }) => <Panel title="PnL acumulado"><LineChart data={equityPoints(trades)} height={140} showGrid={false} showPeak={false} /></Panel> },
  chart_monthly: { title: 'PnL mensual', category: 'Charts', defaultW: 2, render: ({ trades }) => {
    const m = new Map<string, number>(); for (const t of trades) { const k = t.date.slice(0, 7); m.set(k, (m.get(k) || 0) + t.pnl); }
    return <Panel title="PnL mensual"><Bars items={[...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ label: k.slice(5), value: v }))} /></Panel>;
  } },
  chart_session: { title: 'Por sesión', category: 'Charts', defaultW: 2, render: ({ trades }) => <Panel title="Net PnL por sesión"><Bars items={SESSIONS.map(s => ({ label: SESSION_LABEL[s].slice(0, 3), value: statsFor(trades.filter(t => t.session === s)).pnl }))} /></Panel> },
  chart_weekday: { title: 'Por día', category: 'Charts', defaultW: 2, render: ({ trades }) => {
    const items = [1, 2, 3, 4, 5, 6, 0].map(idx => ({ label: WEEKDAYS[idx].slice(0, 3), value: statsFor(trades.filter(t => new Date(`${t.date}T00:00:00`).getDay() === idx)).pnl }));
    return <Panel title="Net PnL por día"><Bars items={items} /></Panel>;
  } },
  chart_setup: { title: 'Por setup', category: 'Charts', defaultW: 2, render: ({ trades }) => {
    const g = groupBy(trades, t => t.setup || 'Sin setup');
    const items = [...g.entries()].map(([k, l]) => ({ label: k.slice(0, 5), value: statsFor(l).pnl })).sort((a, b) => b.value - a.value).slice(0, 6);
    return <Panel title="Net PnL por setup"><Bars items={items} /></Panel>;
  } },
  chart_rdist: { title: 'Distribución de R', category: 'Charts', defaultW: 2, render: ({ trades }) => {
    const buckets = [-3, -2, -1, 0, 1, 2, 3]; const counts = new Array(7).fill(0);
    for (const t of trades) { const r = t.realRR || (t.pnl > 0 ? 1 : t.pnl < 0 ? -1 : 0); let i = Math.round(Math.max(-3, Math.min(3, r))) + 3; counts[i]++; }
    return <Panel title="Distribución de R"><Bars items={counts.map((c, i) => ({ label: buckets[i] === 3 ? '3+' : `${buckets[i]}`, value: c }))} /></Panel>;
  } },

  table_recent: { title: 'Operaciones recientes', category: 'Tables', defaultW: 2, render: ({ trades }) => (
    <Panel title="Operaciones recientes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
        {trades.slice(0, 6).map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: '#888898' }}>{t.date.slice(5)} {t.asset}</span>
            <span style={{ color: pnlColor(t.pnl), fontWeight: 600 }}>{fmt(t.pnl)}</span>
          </div>
        ))}
      </div>
    </Panel>
  ) },
  table_setups: { title: 'Top setups', category: 'Tables', defaultW: 2, render: ({ trades }) => {
    const rows = [...groupBy(trades, t => t.setup || 'Sin setup').entries()].map(([setup, l]) => ({ setup, ...statsFor(l) })).sort((a, b) => b.pnl - a.pnl).slice(0, 6);
    return (
      <Panel title="Top setups">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {rows.map(r => (
            <div key={r.setup} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#fff' }}>{r.setup} <span style={{ color: '#4a4a60' }}>({r.n})</span></span>
              <span style={{ color: pnlColor(r.pnl), fontWeight: 600 }}>{fmt(r.pnl)}</span>
            </div>
          ))}
        </div>
      </Panel>
    );
  } },
  table_accounts: { title: 'Cuentas prop firm', category: 'Prop Firms', defaultW: 2, render: ({ accounts }) => (
    <Panel title="Cuentas prop firm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
        {accounts.slice(0, 6).map(a => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: '#fff' }}>{a.firm} ${Math.round(a.accountSize / 1000)}K</span>
            <span style={{ color: '#888898' }}>{a.phase}</span>
          </div>
        ))}
        {accounts.length === 0 && <span style={{ fontSize: 12, color: '#4a4a60' }}>Sin cuentas</span>}
      </div>
    </Panel>
  ) },
  table_payouts: { title: 'Payouts recientes', category: 'Prop Firms', defaultW: 2, render: ({ accounts }) => {
    const payouts = accounts.flatMap(a => a.payouts.map(p => ({ ...p, firm: a.firm }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    return (
      <Panel title="Payouts recientes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {payouts.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: '#888898' }}>{p.date.slice(5)} {p.firm}</span>
              <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{fmtPlain(p.netAmount)}</span>
            </div>
          ))}
          {payouts.length === 0 && <span style={{ fontSize: 12, color: '#4a4a60' }}>Sin payouts</span>}
        </div>
      </Panel>
    );
  } },

  insight_carousel: { title: 'Insights automáticos', category: 'Insights', defaultW: 2, render: ({ trades, accounts }) => {
    const top = pickTopInsights(generateInsights(trades, accounts), 3);
    return (
      <Panel title="Insights automáticos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          {top.length === 0 ? <span style={{ fontSize: 12, color: '#4a4a60' }}>Sin insights aún</span> : top.map(ins => (
            <div key={ins.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span>{ins.emoji}</span>
              <div><div style={{ fontSize: '0.76rem', color: '#fff', fontWeight: 600 }}>{ins.title}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{ins.description}</div></div>
            </div>
          ))}
        </div>
      </Panel>
    );
  } },
  insight_bestday: { title: 'Mejor día', category: 'Insights', defaultW: 1, render: ({ trades }) => {
    const m = new Map<string, number>(); for (const t of trades) m.set(t.date, (m.get(t.date) || 0) + t.pnl);
    const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    return <Tile title="Mejor día" value={best ? fmt(best[1]) : '—'} color="var(--blue)" sub={best ? best[0] : ''} />;
  } },
  insight_worstday: { title: 'Peor día', category: 'Insights', defaultW: 1, render: ({ trades }) => {
    const m = new Map<string, number>(); for (const t of trades) m.set(t.date, (m.get(t.date) || 0) + t.pnl);
    const worst = [...m.entries()].sort((a, b) => a[1] - b[1])[0];
    return <Tile title="Peor día" value={worst ? fmt(worst[1]) : '—'} color="var(--red)" sub={worst ? worst[0] : ''} />;
  } },

  custom_kpi: {
    title: 'KPI personalizado', category: 'Custom', defaultW: 1, configurable: true,
    render: ({ trades, config }) => {
      const metricKey = (config?.metric as string) || 'netpnl';
      const metric = METRICS[metricKey] || METRICS.netpnl;
      const setup = config?.setup as string | undefined;
      const session = config?.session as string | undefined;
      let list = trades;
      if (setup) list = list.filter(t => t.setup === setup);
      if (session) list = list.filter(t => t.session === session);
      const val = metric.fn(list);
      const labelText = (config?.label as string) || metric.label;
      return <Tile title={labelText} value={metric.fmt(val)} color={metricKey === 'netpnl' ? pnlColor(val) : undefined} sub={`${list.length} ops${setup ? ` · ${setup}` : ''}${session ? ` · ${SESSION_LABEL[session] || session}` : ''}`} />;
    },
  },
};

export const CATALOG: { category: WidgetCategory; items: { type: string; title: string }[] }[] = (() => {
  const cats: WidgetCategory[] = ['KPIs', 'Charts', 'Tables', 'Insights', 'Prop Firms', 'Custom'];
  return cats.map(category => ({ category, items: Object.entries(WIDGET_DEFS).filter(([, d]) => d.category === category).map(([type, d]) => ({ type, title: d.title })) }));
})();

export interface DashTemplate { id: string; emoji: string; title: string; description: string; widgets: { type: string; w: number }[] }
export const TEMPLATES: DashTemplate[] = [
  { id: 'daily', emoji: '📆', title: 'Trader Diario', description: 'Tus métricas del día de un vistazo.', widgets: [
    { type: 'kpi_netpnl', w: 1 }, { type: 'kpi_count', w: 1 }, { type: 'kpi_winrate', w: 1 }, { type: 'kpi_streak', w: 1 },
    { type: 'table_recent', w: 2 }, { type: 'chart_session', w: 2 },
  ] },
  { id: 'propfirm', emoji: '🏦', title: 'Prop Firm Focus', description: 'Seguimiento de tus cuentas prop firm.', widgets: [
    { type: 'kpi_invested', w: 1 }, { type: 'kpi_payouts', w: 1 }, { type: 'table_accounts', w: 2 },
    { type: 'chart_monthly', w: 2 }, { type: 'table_payouts', w: 2 },
  ] },
  { id: 'deep', emoji: '🔬', title: 'Análisis Profundo', description: 'Todo lo que necesitas para revisar tu edge.', widgets: [
    { type: 'chart_equity', w: 2 }, { type: 'chart_setup', w: 2 }, { type: 'chart_weekday', w: 2 },
    { type: 'chart_rdist', w: 2 }, { type: 'insight_carousel', w: 2 },
  ] },
];
