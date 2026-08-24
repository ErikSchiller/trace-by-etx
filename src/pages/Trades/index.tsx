import { useMemo, useState } from 'react';
import {
  useFilteredTrades, useTradeStore,
  getCumulativePnL, getProfitFactor, getWinRate, getAvgWin, getAvgLoss, getEquityCurve,
  type Direction, type Session,
} from '../../store/tradeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../../components/UI/ToastProvider';
import { TradeDetailModal } from '../../components/Modals/TradeDetailModal';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';

const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', minHeight: 120, transition: 'border-color 0.15s ease' };
const mono: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const kpiLabel: React.CSSProperties = { fontSize: '0.62rem', color: '#3a3a55', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 };
const kpiValue: React.CSSProperties = { ...mono, fontSize: '1.5rem', fontWeight: 500, color: '#fff', margin: '4px 0 2px', lineHeight: 1 };

type SortKey = 'date' | 'asset' | 'direction' | 'pnl' | 'realRR';
type SortDir = 'asc' | 'desc';

function fmtMoney(n: number) {
  if (!isFinite(n)) return '$0';
  return `${n >= 0 ? '+' : '-'}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}

function Sparkline({ curve }: { curve: { cumPnl: number }[] }) {
  if (curve.length < 2) return <div style={{ height: 28, marginTop: 6 }} />;
  const ys = curve.map(p => p.cumPnl);
  const min = Math.min(...ys, 0), max = Math.max(...ys, 0);
  const range = max - min || 1;
  const path = curve.map((p, i) => {
    const x = (i / (curve.length - 1)) * 100;
    const y = 28 - ((p.cumPnl - min) / range) * 26 - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width="100%" height="28" viewBox="0 0 100 28" preserveAspectRatio="none" style={{ marginTop: 6 }}>
      <defs>
        <linearGradient id="tspark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f8fff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4f8fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,28 ${path} 100,28`} fill="url(#tspark)" />
      <polyline points={path} fill="none" stroke="var(--blue)" strokeWidth="1.5" />
    </svg>
  );
}

function Badge({ status }: { status: 'WIN' | 'LOSS' | 'BE' }) {
  const sty = status === 'WIN' ? { bg: 'var(--blue-dim)', color: 'var(--blue)' }
    : status === 'LOSS' ? { bg: 'var(--red-dim)', color: 'var(--red)' }
    : { bg: 'var(--dim2)', color: 'var(--muted)' };
  return <span style={{ background: sty.bg, color: sty.color, fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em' }}>{status}</span>;
}

function RRBar({ rr, win }: { rr: number; win: boolean }) {
  const pct = Math.max(2, Math.min(100, (Math.abs(rr) / 4) * 100));
  return (
    <div style={{ width: 60, height: 6, background: 'var(--dim2)', borderRadius: 3, overflow: 'hidden', display: 'inline-block' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: win ? 'var(--blue)' : 'var(--red)' }} />
    </div>
  );
}

export function Trades() {
  const trades = useFilteredTrades();
  const deleteMany = useTradeStore(s => s.deleteMany);
  const { push } = useToast();

  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [filterDir, setFilterDir] = useState<Direction | 'all'>('all');
  const [filterSession, setFilterSession] = useState<Session | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = trades;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(t => t.asset.includes(q));
    }
    if (filterDir !== 'all') list = list.filter(t => t.direction === filterDir);
    if (filterSession !== 'all') list = list.filter(t => t.session === filterSession);
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'date':      return ((a.date + a.time).localeCompare(b.date + b.time)) * dir;
        case 'asset':     return a.asset.localeCompare(b.asset) * dir;
        case 'direction': return a.direction.localeCompare(b.direction) * dir;
        case 'pnl':       return (a.pnl - b.pnl) * dir;
        case 'realRR':    return (a.realRR - b.realRR) * dir;
      }
    });
    return list;
  }, [trades, search, filterDir, filterSession, sortKey, sortDir]);

  const beCountsAsWin = useSettingsStore(s => s.beCountsAsWin);
  const stats = useMemo(() => ({
    cum: getCumulativePnL(trades),
    pf: getProfitFactor(trades),
    wr: getWinRate(trades, beCountsAsWin),
    aw: getAvgWin(trades),
    al: Math.abs(getAvgLoss(trades)),
    equity: getEquityCurve(trades),
  }), [trades, beCountsAsWin]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const toggleSel = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const allSelected = filtered.length > 0 && filtered.every(t => selected.has(t.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };

  const [confirmBulk, setConfirmBulk] = useState(false);
  const deleteSelected = () => {
    if (selected.size === 0) return;
    setConfirmBulk(true);
  };
  const doDeleteSelected = () => {
    deleteMany(Array.from(selected));
    push({ kind: 'success', text: `${selected.size} operaciones eliminadas` });
    setSelected(new Set());
    setConfirmBulk(false);
  };

  const ratio = stats.al > 0 ? stats.aw / stats.al : 0;

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`.trade-row .share-btn{opacity:0;transition:opacity .12s} .trade-row:hover .share-btn{opacity:0.7} .trade-row .share-btn:hover{opacity:1 !important;color:#7861ff}`}</style>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={card}>
          <div style={kpiLabel}>Net PnL Acumulado</div>
          <div style={{ ...kpiValue, color: stats.cum >= 0 ? 'var(--blue)' : 'var(--red)' }}>{fmtMoney(stats.cum)}</div>
          <div style={{ ...mono, fontSize: 11, color: 'var(--muted)' }}>{trades.length} operaciones</div>
          <Sparkline curve={stats.equity} />
        </div>
        <div style={card}>
          <div style={kpiLabel}>Profit Factor</div>
          <div style={kpiValue}>{isFinite(stats.pf) ? stats.pf.toFixed(2) : '∞'}</div>
          <div style={{ ...mono, fontSize: 11, color: 'var(--muted)' }}>Bruto / Pérdidas</div>
        </div>
        <div style={card}>
          <div style={kpiLabel}>Trade Win %</div>
          <div style={kpiValue}>{stats.wr.toFixed(0)}%</div>
          <div style={{ ...mono, fontSize: 11, color: 'var(--muted)' }}>—</div>
        </div>
        <div style={card}>
          <div style={kpiLabel}>Avg Win / Loss</div>
          <div style={kpiValue}>{ratio.toFixed(2)}</div>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', margin: '6px 0' }}>
            <div style={{ flex: Math.max(0.1, ratio / (ratio + 1)), background: 'var(--blue)' }} />
            <div style={{ flex: Math.max(0.1, 1 / (ratio + 1)), background: 'var(--red)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 10 }}>
            <span style={{ color: 'var(--blue)' }}>{fmtMoney(stats.aw)}</span>
            <span style={{ color: 'var(--red)' }}>{fmtMoney(-stats.al)}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por activo…"
          style={{ background: 'var(--dim2)', border: '1px solid var(--border)', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, width: 200, fontFamily: "'Inter', sans-serif", outline: 'none' }}
        />
        <select value={filterDir} onChange={e => setFilterDir(e.target.value as Direction | 'all')} style={{ background: 'var(--dim2)', border: '1px solid var(--border)', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
          <option value="all">Todas las direcciones</option>
          <option value="long">LONG</option>
          <option value="short">SHORT</option>
        </select>
        <select value={filterSession} onChange={e => setFilterSession(e.target.value as Session | 'all')} style={{ background: 'var(--dim2)', border: '1px solid var(--border)', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
          <option value="all">Todas las sesiones</option>
          <option value="london">Londres</option>
          <option value="new_york">Nueva York</option>
          <option value="asia">Asia</option>
          <option value="premarket">Pre-market</option>
        </select>
        {selected.size > 0 && (
          <button onClick={deleteSelected} style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            Eliminar {selected.size}
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Mostrando {filtered.length} / {trades.length}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            {trades.length === 0 ? 'Aún no tienes operaciones registradas' : 'No hay operaciones con esos filtros'}
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--card-2)', position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 14px', width: 24 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <Th onClick={() => toggleSort('date')} active={sortKey === 'date'} dir={sortDir}>Fecha</Th>
                <Th onClick={() => toggleSort('asset')} active={sortKey === 'asset'} dir={sortDir}>Símbolo</Th>
                <Th onClick={() => toggleSort('direction')} active={sortKey === 'direction'} dir={sortDir}>Dirección</Th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Estado</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Entrada</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Salida</th>
                <Th onClick={() => toggleSort('pnl')} active={sortKey === 'pnl'} dir={sortDir} align="right">Net PnL</Th>
                <Th onClick={() => toggleSort('realRR')} active={sortKey === 'realRR'} dir={sortDir} align="left">R:R</Th>
                <th style={{ padding: '10px 14px', width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const status = t.pnl > 0 ? 'WIN' : t.pnl < 0 ? 'LOSS' : 'BE';
                const isSel = selected.has(t.id);
                const bg = isSel ? 'rgba(79,143,255,0.06)' : 'transparent';
                return (
                  <tr
                    key={t.id}
                    className="trade-row"
                    style={{ background: bg, borderTop: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = bg; }}
                    onClick={() => setOpenId(t.id)}
                  >
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleSel(t.id)} />
                    </td>
                    <td style={{ padding: '10px 14px', ...mono, color: 'var(--text)' }}>{t.date} {t.time}</td>
                    <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {t.asset}
                        {t.groupId && <span title="Operación copiada en varias cuentas" style={{ fontSize: 9, color: 'var(--blue)', background: 'rgba(79,143,255,0.12)', borderRadius: 4, padding: '1px 5px', fontWeight: 700, cursor: 'help' }}>🔗</span>}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: t.direction === 'long' ? 'var(--blue)' : 'var(--red)', fontWeight: 600 }}>
                      {t.direction.toUpperCase()}
                    </td>
                    <td style={{ padding: '10px 14px' }}><Badge status={status} /></td>
                    <td style={{ padding: '10px 14px', ...mono, textAlign: 'right', color: 'var(--text)' }}>{t.inputMode === 'direct' ? '—' : t.entryPrice.toLocaleString('en-US')}</td>
                    <td style={{ padding: '10px 14px', ...mono, textAlign: 'right', color: 'var(--text)' }}>{t.inputMode === 'direct' ? '—' : t.exitPrice.toLocaleString('en-US')}</td>
                    <td style={{ padding: '10px 14px', ...mono, textAlign: 'right', color: t.pnl >= 0 ? 'var(--blue)' : 'var(--red)' }}>{fmtMoney(t.pnl)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <RRBar rr={t.realRR} win={t.pnl > 0} />
                      <span style={{ ...mono, fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>{t.realRR.toFixed(2)}</span>
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        className="share-btn"
                        title="Generar PnL Card"
                        onClick={() => window.dispatchEvent(new CustomEvent('trace:open-pnl-card', { detail: { tradeId: t.id } }))}
                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 4 }}
                      >✨</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <TradeDetailModal trade={trades.find(t => t.id === openId) ?? null} onClose={() => setOpenId(null)} />
      <ConfirmDialog
        open={confirmBulk}
        title={`¿Eliminar ${selected.size} operaciones?`}
        description="Esta acción no se puede deshacer."
        confirmText="Eliminar"
        destructive
        onConfirm={doDeleteSelected}
        onCancel={() => setConfirmBulk(false)}
      />
    </div>
  );
}

function Th({ children, onClick, active, dir, align = 'left' }: { children: React.ReactNode; onClick: () => void; active: boolean; dir: SortDir; align?: 'left' | 'right' }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: '10px 14px', textAlign: align, cursor: 'pointer',
        color: active ? 'var(--blue)' : 'inherit',
      }}
    >
      {children} {active && <span style={{ fontSize: 9 }}>{dir === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
}

export default Trades;
