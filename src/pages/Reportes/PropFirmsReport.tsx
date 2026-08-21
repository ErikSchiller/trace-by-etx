import { useMemo } from 'react';
import type { Trade } from '../../store/tradeStore';
import {
  type PropFirmAccount,
  getTotalInvested, getTotalPayouts, getNetPnL, getPassRate, getAvgDaysToFund,
  getAccountsByFirm, getPastAccounts,
} from '../../store/propFirmStore';
import { Watermark } from '../../components/UI/Watermark';
import { card, label, fontHead, fmt, fmtPlain, pnlColor, SectionEmpty, Mini } from './shared';

interface Props { trades: Trade[]; prevTrades: Trade[] | null; compareOn: boolean; accounts: PropFirmAccount[] }

export function PropFirmsReport({ accounts }: Props) {
  if (accounts.length === 0) {
    return <SectionEmpty icon="🏦" title="Sin cuentas prop firm" desc="Añade tu primera cuenta prop firm para ver análisis de ROI, payouts y evaluaciones aquí." ctaLabel="Ir a Prop Firms" href="/prop-firms" />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <KpiStrip accounts={accounts} />
      <RoiBlock accounts={accounts} />
      <EvalBlock accounts={accounts} />
      <PayoutsBlock accounts={accounts} />
      <CostsBlock accounts={accounts} />
      <style>{`@media (max-width:900px){ .pf-kpi{ grid-template-columns:repeat(2,1fr) !important; } .pf-3,.pf-2{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

function KpiStrip({ accounts }: { accounts: PropFirmAccount[] }) {
  const invested = getTotalInvested(accounts);
  const payouts = getTotalPayouts(accounts);
  const net = getNetPnL(accounts);
  const pass = getPassRate(accounts);
  const days = getAvgDaysToFund(accounts);
  const cells: { l: string; v: string; c?: string; sub: string }[] = [
    { l: 'Total invertido', v: fmtPlain(invested), sub: `${accounts.length} cuentas` },
    { l: 'Total payouts', v: fmtPlain(payouts), c: 'var(--blue)', sub: `${accounts.reduce((s, a) => s + a.payouts.length, 0)} cobros` },
    { l: 'Net P&L real', v: fmt(net), c: pnlColor(net), sub: `ROI ${invested ? Math.round((net / invested) * 100) : 0}%` },
    { l: 'Pass rate', v: `${Math.round(pass.rate)}%`, sub: `${pass.passed}/${pass.total} evals` },
    { l: 'Tiempo medio a funded', v: `${days.mean} días`, sub: `mediana ${days.median}` },
  ];
  return (
    <div className="pf-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, position: 'relative' }}>
      {cells.map((c, i) => (
        <div key={c.l} style={{ padding: '16px 18px', borderRight: i < cells.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
          <div style={label}>{c.l}</div>
          <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.35rem', color: c.c || '#fff', lineHeight: 1 }}>{c.v}</div>
          <div style={{ fontSize: '0.62rem', color: '#4a4a60', marginTop: 5 }}>{c.sub}</div>
        </div>
      ))}
      <Watermark />
    </div>
  );
}

function RoiBlock({ accounts }: { accounts: PropFirmAccount[] }) {
  const firms = useMemo(() => getAccountsByFirm(accounts).map(f => {
    const list = accounts.filter(a => a.firm === f.firm);
    const pass = getPassRate(list);
    const days = getAvgDaysToFund(list);
    return { ...f, passRate: pass.rate, days: days.mean };
  }), [accounts]);
  const maxAbs = Math.max(...firms.map(f => Math.abs(f.roi)), 1);
  const best = firms[0], worst = firms[firms.length - 1];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ ...label, padding: '14px 16px 4px', marginBottom: 0 }}>ROI por firma</div>
        <table style={{ width: '100%', fontSize: '0.76rem', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
            <tr style={{ fontSize: '0.6rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {['Firma', 'Cuentas', 'Invertido', 'Payouts', 'Net', 'ROI %', 'Pass rate', 'Días a funded'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Firma' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {firms.map((f, i) => {
              const color = i === 0 ? 'var(--blue)' : i === firms.length - 1 && firms.length > 1 ? 'var(--red)' : '#fff';
              return (
                <tr key={f.firm} style={{ borderTop: '1px solid #1a1a1c' }}>
                  <td style={{ padding: '9px 14px', color, fontWeight: 600 }}>{f.firm}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#888898' }}>{f.count}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#888898' }}>{fmtPlain(f.invested)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--blue)' }}>{fmtPlain(f.payouts)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: pnlColor(f.net), fontWeight: 600 }}>{fmt(f.net)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: pnlColor(f.roi) }}>{Math.round(f.roi)}%</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#fff' }}>{Math.round(f.passRate)}%</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#888898' }}>{f.days || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Watermark />
      </div>
      <div style={card}>
        <div style={label}>ROI % por firma</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {firms.map(f => (
            <div key={f.firm} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 100, fontSize: '0.72rem', color: '#c8d4e8', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.firm}</div>
              <div style={{ flex: 1, height: 16, position: 'relative', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: f.roi >= 0 ? '50%' : `${50 - (Math.abs(f.roi) / maxAbs) * 48}%`, width: `${(Math.abs(f.roi) / maxAbs) * 48}%`, background: pnlColor(f.roi), borderRadius: 3 }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border-subtle)' }} />
              </div>
              <div style={{ width: 46, fontSize: '0.72rem', textAlign: 'right', color: pnlColor(f.roi) }}>{Math.round(f.roi)}%</div>
            </div>
          ))}
        </div>
        <Watermark />
      </div>
      {best && worst && firms.length > 1 && (
        <div style={{ ...card, borderColor: 'rgba(79,143,255,0.2)' }}>
          <div style={{ fontSize: '0.85rem', color: '#c8d4e8', lineHeight: 1.6 }}>
            💰 Tu firma más rentable es <b style={{ color: 'var(--blue)' }}>{best.firm}</b> con ROI del {Math.round(best.roi)}%.
            {worst.roi < best.roi && <> Considera concentrar más capital en {best.firm} y menos en <b style={{ color: 'var(--red)' }}>{worst.firm}</b>.</>}
          </div>
        </div>
      )}
    </div>
  );
}

function EvalBlock({ accounts }: { accounts: PropFirmAccount[] }) {
  const pass = getPassRate(accounts);
  const funded = accounts.filter(a => a.fundedDate);
  const buckets = { fast: 0, mid: 0, slow: 0 };
  for (const a of funded) {
    const d = Math.round((new Date(`${a.fundedDate}T00:00:00`).getTime() - new Date(`${a.purchaseDate}T00:00:00`).getTime()) / 86400000);
    if (d < 15) buckets.fast++; else if (d <= 30) buckets.mid++; else buckets.slow++;
  }
  const days = getAvgDaysToFund(accounts);
  const past = getPastAccounts(accounts);
  const blown = past.filter(a => a.phase === 'blown').length;
  const expired = past.filter(a => a.phase === 'expired').length;
  const reasons = [{ l: 'Blown', n: blown, c: 'var(--red)' }, { l: 'Expiradas', n: expired, c: '#f59e0b' }];
  const maxReason = Math.max(...reasons.map(r => r.n), 1);
  const total = funded.length || 1;

  return (
    <div className="pf-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <div style={card}>
        <div style={label}>Pass rate global</div>
        <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.2rem', color: '#fff' }}>{Math.round(pass.rate)}%</div>
        <div style={{ fontSize: 12, color: '#888898' }}>{pass.passed} de {pass.total} evaluaciones pasadas</div>
        <Watermark />
      </div>
      <div style={card}>
        <div style={label}>Tiempo medio a funded</div>
        <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.2rem', color: '#fff' }}>{days.mean}<span style={{ fontSize: '0.9rem', color: '#888898' }}> días</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, fontSize: '0.72rem', color: '#888898' }}>
          <DistRow l="< 15 días" pct={buckets.fast / total} />
          <DistRow l="15-30 días" pct={buckets.mid / total} />
          <DistRow l="> 30 días" pct={buckets.slow / total} />
        </div>
        <Watermark />
      </div>
      <div style={card}>
        <div style={label}>Cuentas perdidas</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 90, paddingTop: 10 }}>
          {reasons.map(r => (
            <div key={r.l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ fontSize: 12, color: '#fff', marginBottom: 4 }}>{r.n}</div>
              <div style={{ width: '55%', maxWidth: 46, height: Math.max(3, (r.n / maxReason) * 60), background: r.c, borderRadius: '4px 4px 0 0' }} />
              <div style={{ fontSize: 10, color: '#888898', marginTop: 5 }}>{r.l}</div>
            </div>
          ))}
        </div>
        <Watermark />
      </div>
    </div>
  );
}
function DistRow({ l, pct }: { l: string; pct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 66 }}>{l}</span>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}><div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: 3 }} /></div>
      <span style={{ width: 32, textAlign: 'right' }}>{Math.round(pct * 100)}%</span>
    </div>
  );
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function monthKey(iso: string) { return iso.slice(0, 7); }
function monthLabel(k: string) { const [, m] = k.split('-'); return MONTHS_ES[parseInt(m, 10) - 1]; }

function PayoutsBlock({ accounts }: { accounts: PropFirmAccount[] }) {
  const all = useMemo(() => accounts.flatMap(a => a.payouts.map(p => ({ ...p, firm: a.firm }))).sort((a, b) => b.date.localeCompare(a.date)), [accounts]);
  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of all) m.set(monthKey(p.date), (m.get(monthKey(p.date)) || 0) + p.netAmount);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [all]);
  if (all.length === 0) return <div style={card}><div style={label}>Payouts</div><div style={{ fontSize: 12, color: '#4a4a60' }}>Aún no has registrado payouts.</div></div>;
  const maxM = Math.max(...byMonth.map(([, v]) => v), 1);
  const biggest = all.reduce((a, b) => (b.netAmount > a.netAmount ? b : a));
  const avg = all.reduce((s, p) => s + p.netAmount, 0) / all.length;
  const dates = all.map(p => new Date(`${p.date}T00:00:00`).getTime()).sort((a, b) => a - b);
  const freq = dates.length > 1 ? Math.round((dates[dates.length - 1] - dates[0]) / 86400000 / (dates.length - 1)) : 0;
  let cum = 0;

  return (
    <div className="pf-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{ ...card, maxHeight: 320, overflowY: 'auto' }}>
        <div style={label}>Timeline de payouts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          {all.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.74rem', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
              <span style={{ color: '#888898', width: 76 }}>{p.date.slice(5)}</span>
              <span style={{ color: '#fff', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.firm}</span>
              <span style={{ color: '#4a4a60', fontSize: 11 }}>{fmtPlain(p.grossAmount)}→</span>
              <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{fmtPlain(p.netAmount)}</span>
              <span style={{ color: '#4a4a60', fontSize: 10, width: 44, textAlign: 'right' }}>{p.method}</span>
            </div>
          ))}
        </div>
        <Watermark />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={card}>
          <div style={label}>Payouts por mes</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130, paddingTop: 10, position: 'relative' }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} preserveAspectRatio="none" viewBox={`0 0 ${Math.max(1, byMonth.length)} 100`}>
              <polyline points={byMonth.map(([, v], i) => { cum += v; return `${i + 0.5},${100 - (cum / (byMonth.reduce((s, [, x]) => s + x, 0) || 1)) * 90}`; }).join(' ')} fill="none" stroke="rgba(120,97,255,0.6)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            {byMonth.map(([k, v]) => (
              <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${k}: ${fmtPlain(v)}`}>
                <div style={{ width: '55%', maxWidth: 36, height: Math.max(3, (v / maxM) * 90), background: 'var(--blue)', borderRadius: '3px 3px 0 0' }} />
                <div style={{ fontSize: 8, color: '#4a4a60', marginTop: 3 }}>{monthLabel(k)}</div>
              </div>
            ))}
          </div>
          <Watermark />
        </div>
        <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Mini label="Mayor payout" value={fmtPlain(biggest.netAmount)} color="var(--blue)" />
          <Mini label="Promedio" value={fmtPlain(avg)} />
          <Mini label="Frecuencia" value={freq ? `${freq} días` : '—'} />
        </div>
      </div>
    </div>
  );
}

function CostsBlock({ accounts }: { accounts: PropFirmAccount[] }) {
  const evalFees = accounts.reduce((s, a) => s + a.evalFee, 0);
  const activationFees = accounts.reduce((s, a) => s + (a.activationFeePaid ? a.activationFee : 0), 0);
  const resetFees = accounts.reduce((s, a) => s + a.resets.reduce((x, r) => x + r.cost, 0), 0);
  const total = evalFees + activationFees + resetFees || 1;
  const slices = [
    { l: 'Evaluaciones', v: evalFees, c: '#4f8fff' },
    { l: 'Activación', v: activationFees, c: '#7861ff' },
    { l: 'Resets', v: resetFees, c: '#ef4444' },
  ];
  // monthly spending
  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of accounts) {
      m.set(monthKey(a.purchaseDate), (m.get(monthKey(a.purchaseDate)) || 0) + a.evalFee);
      if (a.activationFeePaid && a.activationPaidDate) m.set(monthKey(a.activationPaidDate), (m.get(monthKey(a.activationPaidDate)) || 0) + a.activationFee);
      for (const r of a.resets) m.set(monthKey(r.date), (m.get(monthKey(r.date)) || 0) + r.cost);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [accounts]);
  const maxM = Math.max(...byMonth.map(([, v]) => v), 1);

  // pie geometry
  let acc = 0;
  const R = 60, C = 2 * Math.PI * R;
  return (
    <div className="pf-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={card}>
        <div style={label}>Desglose de costes</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 8 }}>
          <svg width={150} height={150} viewBox="0 0 150 150" style={{ flexShrink: 0 }}>
            {slices.map((s, i) => {
              const frac = s.v / total;
              const dash = frac * C;
              const el = <circle key={i} cx={75} cy={75} r={R} fill="none" stroke={s.c} strokeWidth={22} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc * C} transform="rotate(-90 75 75)" />;
              acc += frac;
              return el;
            })}
            <text x={75} y={80} textAnchor="middle" fontFamily="'Syne',sans-serif" fontWeight="800" fontSize="16" fill="#fff">{fmtPlain(total === 1 && evalFees + activationFees + resetFees === 0 ? 0 : evalFees + activationFees + resetFees)}</text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slices.map(s => (
              <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.76rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: s.c }} />
                <span style={{ color: '#c8d4e8', width: 90 }}>{s.l}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{fmtPlain(s.v)}</span>
                <span style={{ color: '#4a4a60' }}>({Math.round((s.v / total) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
        {resetFees > 0 && <div style={{ marginTop: 12, fontSize: '0.76rem', color: '#c8d4e8' }}>💡 Has gastado <b style={{ color: 'var(--red)' }}>{fmtPlain(resetFees)}</b> en resets. Considera pausar cuentas que resetean con frecuencia.</div>}
        <Watermark />
      </div>
      <div style={card}>
        <div style={label}>Gasto mensual en prop firms</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150, paddingTop: 10 }}>
          {byMonth.map(([k, v]) => (
            <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${k}: ${fmtPlain(v)}`}>
              <div style={{ fontSize: 9, color: '#888898', marginBottom: 3 }}>{fmtPlain(v)}</div>
              <div style={{ width: '55%', maxWidth: 38, height: Math.max(3, (v / maxM) * 100), background: '#f59e0b', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
              <div style={{ fontSize: 8, color: '#4a4a60', marginTop: 3 }}>{monthLabel(k)}</div>
            </div>
          ))}
        </div>
        <Watermark />
      </div>
    </div>
  );
}
