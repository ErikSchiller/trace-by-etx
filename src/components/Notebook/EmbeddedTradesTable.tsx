import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { Settings2, X, BarChart3 } from 'lucide-react';
import type { TradesTableConfig } from '../../store/notebookStore';
import type { Trade } from '../../store/tradeStore';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const C = {
  bg: '#0a0a0c', card: '#15171d', card2: '#131418', border: '#1e2029', borderEl: '#2a2c33',
  blue: '#4f8fff', red: '#ef4444', green: '#22c55e',
  text: '#f7f8fa', text2: '#d0d0dc', muted: '#6b7280', faint: '#4a4a60',
};

export const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: 'date', label: 'Fecha' }, { key: 'asset', label: 'Activo' }, { key: 'direction', label: 'Dirección' },
  { key: 'pnl', label: 'PnL' }, { key: 'rr', label: 'R:R' }, { key: 'setup', label: 'Setup' },
  { key: 'session', label: 'Sesión' }, { key: 'note', label: 'Nota' },
];

export const TABLE_TEMPLATES: { key: TradesTableConfig['template']; label: string; desc: string; make: () => TradesTableConfig }[] = [
  { key: 'weekly_review', label: 'Weekly Review', desc: 'Operaciones de esta semana + equity', make: () => base('Weekly Review', 'this_week', 'day', 'equity') },
  { key: 'monthly_review', label: 'Monthly Review', desc: 'Operaciones del mes + PnL por día', make: () => base('Monthly Review', 'this_month', 'day', 'bars') },
  { key: 'by_setup', label: 'Por setup', desc: 'Agrupadas por setup con stats', make: () => base('Por setup', 'all', 'setup', 'pie') },
  { key: 'by_account', label: 'Por cuenta', desc: 'Agrupadas por cuenta', make: () => base('Por cuenta', 'all', 'account', 'bars') },
  { key: 'best', label: 'Mejores trades', desc: 'Top 10 por PnL', make: () => base('Mejores trades', 'all', 'none', 'bars') },
  { key: 'worst', label: 'Peores trades', desc: 'Bottom 10 por PnL', make: () => base('Peores trades', 'all', 'none', 'bars') },
  { key: 'custom', label: 'Personalizada', desc: 'Configúrala a tu gusto', make: () => base('Tabla de operaciones', 'this_month', 'none', 'equity') },
];

function base(title: string, range: TradesTableConfig['dateRange']['type'], groupBy: TradesTableConfig['groupBy'], chart: TradesTableConfig['chart']['type']): TradesTableConfig {
  return { template: 'custom', title, dateRange: { type: range }, filters: {}, columns: ['date', 'asset', 'direction', 'pnl', 'rr', 'setup'], groupBy, chart: { enabled: true, type: chart, position: 'top' } };
}
export function defaultTradesTableConfig(): TradesTableConfig { const c = TABLE_TEMPLATES[0].make(); return c; }

const iso = (d: Date) => d.toISOString().slice(0, 10);
function rangeBounds(dr: TradesTableConfig['dateRange']): { from?: string; to?: string } {
  const today = new Date();
  if (dr.type === 'custom') return { from: dr.from, to: dr.to };
  if (dr.type === 'all') return {};
  if (dr.type === 'last_30') { const f = new Date(today); f.setDate(f.getDate() - 30); return { from: iso(f), to: iso(today) }; }
  if (dr.type === 'this_month') return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
  const day = (today.getDay() + 6) % 7; const f = new Date(today); f.setDate(today.getDate() - day); return { from: iso(f), to: iso(today) };
}

/** Pure selector — live data from the current trades list, filtered by config. */
export function selectTrades(trades: Trade[], config: TradesTableConfig, title: string): Trade[] {
  const { from, to } = rangeBounds(config.dateRange);
  let list = trades.filter(t => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    const f = config.filters;
    if (f.accountIds?.length && !(t.accountId && f.accountIds.includes(t.accountId))) return false;
    if (f.setups?.length && !f.setups.includes(t.setup)) return false;
    if (f.sessions?.length && !f.sessions.includes(t.session)) return false;
    if (f.directions?.length && !f.directions.includes(t.direction)) return false;
    return true;
  });
  const best = /mejores/i.test(title), worst = /peores/i.test(title);
  if (best) return [...list].sort((a, b) => b.pnl - a.pnl).slice(0, 10);
  if (worst) return [...list].sort((a, b) => a.pnl - b.pnl).slice(0, 10);
  return list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

const fmtPnl = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/* ── Renderer ─────────────────────────────────────────────────────────── */
export function EmbeddedTradesTable({ config, trades, onConfigChange, onRemove, onOpenTrade, editable = true }: {
  config?: TradesTableConfig;
  trades: Trade[];
  onConfigChange?: (c: TradesTableConfig) => void;
  onRemove?: () => void;
  onOpenTrade?: (id: string) => void;
  editable?: boolean;
}) {
  const [configOpen, setConfigOpen] = useState(false);
  const cfg = config ?? defaultTradesTableConfig();
  const rows = useMemo(() => selectTrades(trades, cfg, cfg.title), [trades, cfg]);

  const net = rows.reduce((s, t) => s + t.pnl, 0);
  const wins = rows.filter(t => t.pnl > 0).length;
  const winRate = rows.length ? Math.round((wins / rows.length) * 100) : 0;
  const cols = cfg.columns.length ? cfg.columns : ['date', 'asset', 'direction', 'pnl'];

  const chart = cfg.chart.enabled ? <TableChart type={cfg.chart.type} rows={rows} /> : null;
  const chartPos = cfg.chart.position;

  const groups = useMemo(() => groupRows(rows, cfg.groupBy), [rows, cfg.groupBy]);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, margin: '24px 0', fontFamily: fontBody }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <BarChart3 size={15} color={C.blue} />
          <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.title}</span>
          <span style={{ fontSize: '0.7rem', color: C.muted }}>· {rows.length} op.</span>
        </div>
        {editable && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <IconBtn title="Configurar" onClick={() => setConfigOpen(true)}><Settings2 size={14} /></IconBtn>
            {onRemove && <IconBtn title="Quitar" onClick={onRemove}><X size={14} /></IconBtn>}
          </div>
        )}
      </div>

      <div style={{ display: chartPos === 'side' && chart ? 'grid' : 'block', gridTemplateColumns: chartPos === 'side' && chart ? '1fr 260px' : undefined, gap: 20 }}>
        <div style={{ order: chartPos === 'side' ? 1 : undefined }}>
          {chart && chartPos === 'top' && <div style={{ marginBottom: 16 }}>{chart}</div>}
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.muted, padding: '24px 0', fontSize: '0.82rem' }}>Sin operaciones en este rango</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {cols.map(c => <th key={c} style={{ textAlign: c === 'pnl' || c === 'rr' ? 'right' : 'left', padding: '8px 10px', color: C.muted, fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{ALL_COLUMNS.find(x => x.key === c)?.label ?? c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <GroupSection key={g.key} group={g} cols={cols} onOpenTrade={onOpenTrade} showHeader={cfg.groupBy !== 'none'} />
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `1px solid ${C.borderEl}` }}>
                    <td colSpan={cols.length} style={{ padding: '10px', color: C.text2, fontSize: '0.78rem' }}>
                      <span style={{ color: C.muted }}>{rows.length} operaciones · Win rate {winRate}% · </span>
                      <b style={{ color: net >= 0 ? C.blue : C.red }}>Net {fmtPnl(net)}</b>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
        {chart && chartPos === 'side' && <div style={{ order: 2 }}>{chart}</div>}
      </div>
      {chart && chartPos === 'bottom' && <div style={{ marginTop: 16 }}>{chart}</div>}

      {configOpen && (
        <TradesTableConfigModal initial={cfg} trades={trades} onInsert={c => { onConfigChange?.(c); setConfigOpen(false); }} onClose={() => setConfigOpen(false)} insertLabel="Guardar" />
      )}
    </div>
  );
}

function GroupSection({ group, cols, onOpenTrade, showHeader }: { group: { key: string; label: string; rows: Trade[]; net: number }; cols: string[]; onOpenTrade?: (id: string) => void; showHeader: boolean }) {
  return (
    <>
      {showHeader && (
        <tr>
          <td colSpan={cols.length} style={{ padding: '10px 10px 4px', fontSize: '0.72rem', fontWeight: 700, color: C.text2 }}>
            {group.label} <span style={{ color: group.net >= 0 ? C.blue : C.red, fontWeight: 600 }}>({fmtPnl(group.net)})</span>
          </td>
        </tr>
      )}
      {group.rows.map(t => (
        <tr key={t.id} onClick={() => onOpenTrade?.(t.id)} style={{ borderBottom: `1px solid ${C.border}`, cursor: onOpenTrade ? 'pointer' : 'default' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          {cols.map(c => <td key={c} style={{ padding: '8px 10px', textAlign: c === 'pnl' || c === 'rr' ? 'right' : 'left', whiteSpace: 'nowrap', color: C.text2 }}>{cell(t, c)}</td>)}
        </tr>
      ))}
    </>
  );
}

function cell(t: Trade, c: string) {
  switch (c) {
    case 'date': return <span style={{ color: C.muted }}>{t.date}</span>;
    case 'asset': return <span style={{ color: C.text, fontWeight: 600 }}>{t.asset}</span>;
    case 'direction': return <span style={{ color: t.direction === 'long' ? C.blue : C.red, fontSize: '0.72rem', fontWeight: 600 }}>{t.direction.toUpperCase()}</span>;
    case 'pnl': return <span style={{ color: t.pnl >= 0 ? C.blue : C.red, fontWeight: 700 }}>{fmtPnl(t.pnl)}</span>;
    case 'rr': return <span>{(t.realRR ?? 0).toFixed(2)}</span>;
    case 'setup': return <span style={{ color: C.muted }}>{t.setup || '—'}</span>;
    case 'session': return <span style={{ color: C.muted }}>{t.session}</span>;
    case 'note': return <span style={{ color: C.muted, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{t.quickNote || '—'}</span>;
    default: return '—';
  }
}

function groupRows(rows: Trade[], groupBy: TradesTableConfig['groupBy']): { key: string; label: string; rows: Trade[]; net: number }[] {
  if (groupBy === 'none') return [{ key: 'all', label: 'Todas', rows, net: rows.reduce((s, t) => s + t.pnl, 0) }];
  const map = new Map<string, Trade[]>();
  for (const t of rows) {
    const k = groupBy === 'day' ? t.date : groupBy === 'setup' ? (t.setup || 'Sin setup') : (t.accountId || 'Sin cuenta');
    (map.get(k) ?? map.set(k, []).get(k)!).push(t);
  }
  return [...map.entries()].map(([key, rs]) => ({ key, label: key, rows: rs, net: rs.reduce((s, t) => s + t.pnl, 0) }));
}

/* ── Chart ─────────────────────────────────────────────────────────────── */
function TableChart({ type, rows }: { type: TradesTableConfig['chart']['type']; rows: Trade[] }) {
  const h = 200;
  if (rows.length === 0) return null;
  if (type === 'equity') {
    let cum = 0; const data = rows.map((t, i) => { cum += t.pnl; return { i: i + 1, cum }; });
    return (
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="i" stroke={C.faint} fontSize={10} tickLine={false} />
          <YAxis stroke={C.faint} fontSize={10} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtPnl(Number(value))} />
          <ReferenceLine y={0} stroke={C.borderEl} />
          <Line type="monotone" dataKey="cum" stroke={cum >= 0 ? C.blue : C.red} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (type === 'bars') {
    const byDay = new Map<string, number>();
    rows.forEach(t => byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl));
    const data = [...byDay.entries()].map(([d, pnl]) => ({ d: d.slice(5), pnl }));
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="d" stroke={C.faint} fontSize={10} tickLine={false} />
          <YAxis stroke={C.faint} fontSize={10} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => fmtPnl(Number(value))} />
          <ReferenceLine y={0} stroke={C.borderEl} />
          <Bar dataKey="pnl">{data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? C.blue : C.red} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }
  if (type === 'pie') {
    const bySetup = new Map<string, number>();
    rows.forEach(t => { const k = t.setup || 'Sin setup'; bySetup.set(k, (bySetup.get(k) ?? 0) + 1); });
    const palette = ['#4f8fff', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    const data = [...bySetup.entries()].map(([name, value]) => ({ name, value }));
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={38} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }
  // scatter R:R vs PnL
  const data = rows.map(t => ({ rr: t.realRR ?? 0, pnl: t.pnl }));
  return (
    <ResponsiveContainer width="100%" height={h}>
      <ScatterChart margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
        <XAxis type="number" dataKey="rr" name="R:R" stroke={C.faint} fontSize={10} tickLine={false} />
        <YAxis type="number" dataKey="pnl" name="PnL" stroke={C.faint} fontSize={10} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data}>{data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? C.blue : C.red} />)}</Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
const tooltipStyle = { background: C.card2, border: `1px solid ${C.borderEl}`, borderRadius: 8, fontSize: '0.75rem', color: C.text };

/* ── Config modal ─────────────────────────────────────────────────────── */
export function TradesTableConfigModal({ initial, trades, onInsert, onClose, insertLabel = 'Insertar' }: {
  initial?: TradesTableConfig;
  trades: Trade[];
  onInsert: (c: TradesTableConfig) => void;
  onClose: () => void;
  insertLabel?: string;
}) {
  const [step, setStep] = useState<1 | 2>(initial ? 2 : 1);
  const [cfg, setCfg] = useState<TradesTableConfig>(initial ?? TABLE_TEMPLATES[0].make());
  const setups = useMemo(() => [...new Set(trades.map(t => t.setup).filter(Boolean))], [trades]);


  const update = (patch: Partial<TradesTableConfig>) => setCfg(c => ({ ...c, ...patch }));
  const toggleCol = (k: string) => update({ columns: cfg.columns.includes(k) ? cfg.columns.filter(c => c !== k) : [...cfg.columns, k] });
  const toggleArr = <T,>(arr: T[] | undefined, v: T): T[] => (arr ?? []).includes(v) ? (arr ?? []).filter(x => x !== v) : [...(arr ?? []), v];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 230, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, border: `1px solid ${C.borderEl}`, borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: fontBody, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.1rem', color: C.text }}>Tabla de operaciones</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {step === 1 ? (
            <>
              <SecLabel>Plantilla</SecLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10 }}>
                {TABLE_TEMPLATES.map(t => (
                  <button key={t.key} onClick={() => { setCfg(t.make()); setStep(2); }} style={{ textAlign: 'left', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, cursor: 'pointer', fontFamily: fontBody }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.5)')} onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text, marginBottom: 4 }}>{t.label}</div>
                    <div style={{ fontSize: '0.72rem', color: C.muted, lineHeight: 1.4 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <SecLabel>Título</SecLabel>
              <input value={cfg.title} onChange={e => update({ title: e.target.value })} style={fieldInput} />

              <SecLabel>Rango de fechas</SecLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {([['this_week', 'Esta semana'], ['this_month', 'Este mes'], ['last_30', 'Últimos 30'], ['all', 'Todo']] as const).map(([v, l]) => (
                  <Pill key={v} active={cfg.dateRange.type === v} onClick={() => update({ dateRange: { type: v } })}>{l}</Pill>
                ))}
              </div>

              {setups.length > 0 && <>
                <SecLabel>Filtrar por setup</SecLabel>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {setups.map(s => <Pill key={s} active={!!cfg.filters.setups?.includes(s)} onClick={() => update({ filters: { ...cfg.filters, setups: toggleArr(cfg.filters.setups, s) } })}>{s}</Pill>)}
                </div>
              </>}

              <SecLabel>Dirección</SecLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['long', 'short'] as const).map(d => <Pill key={d} active={!!cfg.filters.directions?.includes(d)} onClick={() => update({ filters: { ...cfg.filters, directions: toggleArr(cfg.filters.directions, d) } })}>{d.toUpperCase()}</Pill>)}
              </div>

              <SecLabel>Columnas</SecLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ALL_COLUMNS.map(c => <Pill key={c.key} active={cfg.columns.includes(c.key)} onClick={() => toggleCol(c.key)}>{c.label}</Pill>)}
              </div>

              <SecLabel>Agrupación</SecLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {([['none', 'Ninguna'], ['day', 'Por día'], ['setup', 'Por setup'], ['account', 'Por cuenta']] as const).map(([v, l]) => (
                  <Pill key={v} active={cfg.groupBy === v} onClick={() => update({ groupBy: v })}>{l}</Pill>
                ))}
              </div>

              <SecLabel>Gráfico</SecLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {([['none', 'Ninguno'], ['equity', 'Equity'], ['bars', 'Barras'], ['pie', 'Pie'], ['scatter', 'Scatter']] as const).map(([v, l]) => (
                  <Pill key={v} active={v === 'none' ? !cfg.chart.enabled : (cfg.chart.enabled && cfg.chart.type === v)} onClick={() => update({ chart: v === 'none' ? { ...cfg.chart, enabled: false } : { ...cfg.chart, enabled: true, type: v } })}>{l}</Pill>
                ))}
              </div>
              {cfg.chart.enabled && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['top', 'Arriba'], ['bottom', 'Abajo'], ['side', 'Lado']] as const).map(([v, l]) => (
                    <Pill key={v} active={cfg.chart.position === v} onClick={() => update({ chart: { ...cfg.chart, position: v } })}>{l}</Pill>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 22px', borderTop: `1px solid ${C.border}` }}>
          {step === 2 && !initial ? <button onClick={() => setStep(1)} style={ghostBtn}>← Plantillas</button> : <span />}
          {step === 2 && <button onClick={() => onInsert(cfg)} style={primaryBtn}>{insertLabel}</button>}
        </div>
      </div>
    </div>
  );
}

function SecLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, margin: '18px 0 8px', fontFamily: fontBody }}>{children}</div>;
}
function Pill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{ background: active ? 'rgba(79,143,255,0.1)' : C.card, border: `1px solid ${active ? 'rgba(79,143,255,0.4)' : C.border}`, color: active ? C.blue : C.muted, borderRadius: 8, padding: '6px 12px', fontSize: '0.76rem', fontWeight: 500, cursor: 'pointer', fontFamily: fontBody }}>{children}</button>;
}
function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return <button title={title} onClick={onClick} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{children}</button>;
}
const fieldInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontSize: '0.84rem', color: C.text, outline: 'none', fontFamily: fontBody };
const primaryBtn: React.CSSProperties = { background: C.blue, color: '#fff', border: 'none', borderRadius: 9, padding: '10px 22px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody };
const ghostBtn: React.CSSProperties = { background: 'transparent', color: C.text2, border: `1px solid ${C.border}`, borderRadius: 9, padding: '10px 16px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: fontBody };
