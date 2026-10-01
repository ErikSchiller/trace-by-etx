import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  usePropFirmStore, useUserAccounts,
  accountTotalCost, accountTotalPayouts, accountNetResult, accountPendingCost,
  getPhaseTrades, currentPhase, PHASE_TYPE_LABEL,
  type Phase, type AccountPhase,
} from '../../store/propFirmStore';
import { useUserTrades } from '../../store/tradeStore';
import { ProLock } from '../../components/UI/ProLock';
import { Watermark } from '../../components/UI/Watermark';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';
import { DeleteAccountDialog } from './AccountModals';
import { useToast } from '../../components/UI/ToastProvider';
import { usePageTitle } from '../../hooks/usePageTitle';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const card: React.CSSProperties = { background: '#161618', border: '1px solid #1e1e20', borderRadius: 12, padding: '18px 20px', position: 'relative' };
const lab: React.CSSProperties = { fontSize: '0.6rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 };

const PHASE_LABEL: Record<Phase, string> = {
  eval_p1: 'EVAL FASE 1', eval_p2: 'EVAL FASE 2', funded: 'FUNDED',
  passed_pending: 'PASSED — esperando funding', blown: 'BLOWN', expired: 'EXPIRED',
};
function fmt(n: number) { return `${n >= 0 ? '+' : '-'}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`; }
function fmtPlain(n: number) { return `$${Math.round(n).toLocaleString('en-US')}`; }

type Tab = 'trades' | 'payouts' | 'costs' | 'timeline' | 'fases';

export default function PropFirmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const accounts = useUserAccounts();
  const account = accounts.find(a => a.id === id);
  const allTrades = useUserTrades();
  const setPhase = usePropFirmStore(s => s.setPhase);
  const closeAccount = usePropFirmStore(s => s.closeAccount);
  const { push } = useToast();
  usePageTitle(account ? account.firm : 'Prop Firms');

  const [tab, setTab] = useState<Tab>('trades');
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmBlown, setConfirmBlown] = useState(false);
  const [confirmPassed, setConfirmPassed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const allAccountTrades = useMemo(
    () => allTrades.filter(t => (t as { accountId?: string }).accountId === id),
    [allTrades, id]
  );
  // Scope-aware trade set: current phase (default) or lifetime.
  const trades = useMemo(
    () => (scope === 'current' && account) ? getPhaseTrades(account.id, account.currentPhaseId) : allAccountTrades,
    [scope, account, allAccountTrades],
  );

  if (!account) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <button onClick={() => navigate('/prop-firms')} style={{ background: 'transparent', border: 'none', color: '#4f8fff', cursor: 'pointer', fontSize: 14 }}>← Volver</button>
        <div style={{ ...card, padding: 40, textAlign: 'center', marginTop: 16, color: '#4a4a60' }}>Cuenta no encontrada.</div>
      </div>
    );
  }

  const cost = accountTotalCost(account);
  const payouts = accountTotalPayouts(account);
  const net = accountNetResult(account);
  const tradePnl = trades.reduce((s, t) => s + t.pnl, 0);
  const currentEquity = tradePnl;
  const ddDistance = account.maxDrawdown - Math.max(0, -currentEquity);

  return (
    <ProLock feature="Prop Firm Hub" description="Detalle de cuenta, equity, payouts y costes">
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/prop-firms')} aria-label="Volver" style={{ background: 'transparent', border: '1px solid #1e1e20', borderRadius: 7, color: '#888898', cursor: 'pointer', width: 30, height: 30 }}>←</button>
            <div>
              <h1 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>{account.firm} ${Math.round(account.accountSize / 1000)}K</h1>
              <span style={{ fontSize: '0.7rem', color: '#888898' }}>{PHASE_LABEL[account.phase]}{currentPhase(account) ? ` · Fase actual: ${PHASE_TYPE_LABEL[currentPhase(account)!.type]}` : ''}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setPayoutOpen(true)} style={btnPrimary}>Registrar payout</button>
            <button onClick={() => setResetOpen(true)} style={btnGhost}>Registrar reset</button>
            <button onClick={() => setConfirmPassed(true)} style={btnGhost}>Marcar passed</button>
            <button onClick={() => setConfirmBlown(true)} style={{ ...btnGhost, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Marcar blown</button>
            <button onClick={() => setDeleteOpen(true)} style={{ ...btnGhost, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>Eliminar cuenta</button>
          </div>
        </div>

        {/* scope toggle */}
        {account.phases.length > 1 && (
          <div style={{ display: 'flex', gap: 3, background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 9, padding: 3, alignSelf: 'flex-start' }}>
            {([['current', 'Ver fase actual'], ['all', 'Ver todas las fases']] as ['current' | 'all', string][]).map(([v, l]) => (
              <button key={v} onClick={() => setScope(v)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: fontBody, background: scope === v ? 'rgba(79,143,255,0.14)' : 'transparent', color: scope === v ? '#4f8fff' : '#888898' }}>{l}</button>
            ))}
          </div>
        )}

        {/* KPI strip */}
        <div style={{ background: '#161618', border: '1px solid #1e1e20', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', position: 'relative' }}>
          <KCell label="EQUITY ACTUAL" value={fmt(currentEquity)} color={currentEquity >= 0 ? '#4f8fff' : '#ef4444'} />
          <KCell label="PROFIT TARGET" value={fmtPlain(account.profitTarget)} color="#fff" />
          <KCell label="DISTANCIA A DD" value={fmtPlain(ddDistance)} color={ddDistance > account.maxDrawdown * 0.25 ? '#4f8fff' : '#ef4444'} />
          <KCell label="P&L NETO REAL" value={fmt(net)} color={net >= 0 ? '#4f8fff' : '#ef4444'} sub={`Coste ${fmtPlain(cost)} · Payouts ${fmtPlain(payouts)}`} last />
          <Watermark />
        </div>

        {/* Equity curve */}
        <div style={card}>
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.85rem', color: '#fff', marginBottom: 12 }}>Equity de la cuenta</div>
          <EquityCurve trades={trades} target={account.profitTarget} maxDD={account.maxDrawdown} />
          <Watermark />
        </div>

        {/* Tabs */}
        <div style={card}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid #1e1e20', paddingBottom: 10 }}>
            {([['trades', 'Trades'], ['fases', 'Fases'], ['payouts', 'Payouts'], ['costs', 'Costes'], ['timeline', 'Timeline']] as [Tab, string][]).map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? 'rgba(79,143,255,0.1)' : 'transparent', color: tab === t ? '#4f8fff' : '#4a4a60', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>{l}</button>
            ))}
          </div>

          {tab === 'trades' && (
            trades.length === 0
              ? <Empty text="Sin operaciones vinculadas a esta cuenta." />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {trades.map(t => (
                    <div key={t.id} style={row}>
                      <span style={{ color: '#888898', fontSize: 12 }}>{t.date} {t.time}</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{t.asset}</span>
                      <span style={{ color: t.direction === 'long' ? '#4f8fff' : '#ef4444', fontSize: 11, fontWeight: 700 }}>{t.direction.toUpperCase()}</span>
                      <span style={{ marginLeft: 'auto', color: t.pnl >= 0 ? '#4f8fff' : '#ef4444', fontWeight: 600 }}>{fmt(t.pnl)}</span>
                    </div>
                  ))}
                </div>
          )}

          {tab === 'fases' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {account.phases.map((p, i) => <PhaseRow key={p.id} phase={p} index={i} isCurrent={p.id === account.currentPhaseId} accountId={account.id} />)}
            </div>
          )}

          {tab === 'payouts' && (
            account.payouts.length === 0
              ? <Empty text="Aún no has registrado payouts." />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {account.payouts.map(p => (
                    <div key={p.id} style={row}>
                      <span style={{ color: '#888898', fontSize: 12 }}>{p.date}</span>
                      <span style={{ color: '#888898', fontSize: 12 }}>{p.method}</span>
                      <span style={{ color: '#4a4a60', fontSize: 11 }}>bruto {fmtPlain(p.grossAmount)} · split {p.profitSplit}%</span>
                      <span style={{ marginLeft: 'auto', color: '#4f8fff', fontWeight: 600 }}>{fmt(p.netAmount)}</span>
                    </div>
                  ))}
                </div>
          )}

          {tab === 'costs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={row}><span style={{ color: '#c8d4e8' }}>Evaluación</span><span style={{ marginLeft: 'auto', color: '#ef4444' }}>{fmtPlain(account.evalFee)}</span></div>
              {account.resets.map((r, i) => <div key={i} style={row}><span style={{ color: '#c8d4e8' }}>Reset · {r.date}</span><span style={{ marginLeft: 'auto', color: '#ef4444' }}>{fmtPlain(r.cost)}</span></div>)}
              {account.activationFee > 0 && (
                account.activationFeePaid
                  ? <div style={row}><span style={{ color: '#c8d4e8' }}>Activation fee{account.activationPaidDate ? ` · ${account.activationPaidDate}` : ''}</span><span style={{ marginLeft: 'auto', color: '#ef4444' }}>{fmtPlain(account.activationFee)}</span></div>
                  : <div style={row}><span style={{ color: '#888898' }}>Activation fee <span style={{ color: '#7861ff', fontSize: 11 }}>(pendiente — al pasar la eval)</span></span><span style={{ marginLeft: 'auto', color: '#7861ff' }}>+{fmtPlain(accountPendingCost(account))}</span></div>
              )}
              <div style={{ ...row, borderTop: '1px solid #1e1e20', marginTop: 4, paddingTop: 10 }}><span style={{ color: '#fff', fontWeight: 600 }}>Total pagado</span><span style={{ marginLeft: 'auto', color: '#ef4444', fontWeight: 700 }}>{fmtPlain(cost)}</span></div>
            </div>
          )}

          {tab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={row}><span style={{ color: '#4f8fff', fontSize: 11 }}>●</span><span style={{ color: '#c8d4e8' }}>Cuenta comprada</span><span style={{ marginLeft: 'auto', color: '#888898', fontSize: 12 }}>{account.purchaseDate}</span></div>
              {account.fundedDate && <div style={row}><span style={{ color: '#4f8fff', fontSize: 11 }}>●</span><span style={{ color: '#c8d4e8' }}>Funded</span><span style={{ marginLeft: 'auto', color: '#888898', fontSize: 12 }}>{account.fundedDate}</span></div>}
              {account.payouts.map(p => <div key={p.id} style={row}><span style={{ color: '#4f8fff', fontSize: 11 }}>●</span><span style={{ color: '#c8d4e8' }}>Payout {fmt(p.netAmount)}</span><span style={{ marginLeft: 'auto', color: '#888898', fontSize: 12 }}>{p.date}</span></div>)}
              {account.closedDate && <div style={row}><span style={{ color: '#ef4444', fontSize: 11 }}>●</span><span style={{ color: '#c8d4e8' }}>Cuenta cerrada</span><span style={{ marginLeft: 'auto', color: '#888898', fontSize: 12 }}>{account.closedDate}</span></div>}
            </div>
          )}
        </div>
      </div>

      <PayoutModal open={payoutOpen} accountId={account.id} defaultSplit={90} onClose={() => setPayoutOpen(false)} />
      <ResetModal open={resetOpen} accountId={account.id} onClose={() => setResetOpen(false)} />
      <ConfirmDialog open={confirmPassed} title="¿Marcar como passed?" description="La cuenta pasará a estado 'passed — esperando funding'." confirmText="Marcar passed" onConfirm={() => { setPhase(account.id, 'passed_pending'); push({ kind: 'success', text: 'Cuenta marcada' }); setConfirmPassed(false); }} onCancel={() => setConfirmPassed(false)} />
      <ConfirmDialog open={confirmBlown} title="¿Marcar como blown?" description="Se cerrará la fase actual con sus operaciones archivadas. La cuenta se moverá a cuentas pasadas." confirmText="Marcar blown" destructive onConfirm={() => { closeAccount(account.id, 'blown', new Date().toISOString().slice(0, 10)); push({ kind: 'success', text: 'Cuenta marcada como blown' }); setConfirmBlown(false); }} onCancel={() => setConfirmBlown(false)} />
      <DeleteAccountDialog account={account} tradeCount={trades.length} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={() => navigate('/prop-firms')} />
    </ProLock>
  );
}

const btnPrimary: React.CSSProperties = { background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: fontBody };
const btnGhost: React.CSSProperties = { background: 'transparent', color: '#c8d4e8', border: '1px solid #1e1e20', borderRadius: 7, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: fontBody };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 7, fontSize: 13 };

function KCell({ label, value, color, sub, last }: { label: string; value: string; color: string; sub?: string; last?: boolean }) {
  return (
    <div style={{ padding: '16px 18px', borderRight: last ? 'none' : '1px solid #1e1e20' }}>
      <div style={lab}>{label}</div>
      <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.4rem', color, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.62rem', color: '#4a4a60', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div style={{ color: '#33334a', fontSize: 13, textAlign: 'center', padding: 24 }}>{text}</div>;
}

const PHASE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: 'Activa', color: '#4f8fff' }, passed: { label: 'Pasada', color: '#10b981' },
  blown: { label: 'Blown', color: '#ef4444' }, expired: { label: 'Expirada', color: '#888898' },
};
function daysBetween(a: string, b: string) {
  const d = Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
  return Math.max(0, d);
}
function PhaseRow({ phase, index, isCurrent, accountId }: { phase: AccountPhase; index: number; isCurrent: boolean; accountId: string }) {
  const [open, setOpen] = useState(isCurrent);
  const phaseTrades = getPhaseTrades(accountId, phase.id);
  const pnl = phaseTrades.reduce((s, t) => s + t.pnl, 0);
  const end = phase.endDate ?? new Date().toISOString().slice(0, 10);
  const st = PHASE_STATUS_LABEL[phase.status] ?? PHASE_STATUS_LABEL.active;
  return (
    <div style={{ border: `1px solid ${isCurrent ? 'rgba(79,143,255,0.3)' : '#1e1e20'}`, borderRadius: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>Fase {index + 1} — {PHASE_TYPE_LABEL[phase.type]}</span>
        <span style={{ background: `${st.color}1f`, color: st.color, fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>{st.label}</span>
        <span style={{ marginLeft: 'auto', color: pnl >= 0 ? '#4f8fff' : '#ef4444', fontWeight: 600, fontSize: '0.82rem' }}>{fmt(pnl)}</span>
        <span style={{ color: '#4a4a60', fontSize: 14, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>
      </div>
      <div style={{ padding: '8px 14px', fontSize: '0.72rem', color: '#888898', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>Inicio: {phase.startDate}</span>
        {phase.endDate ? <span>Fin: {phase.endDate}</span> : <span>En curso</span>}
        <span>Duración: {daysBetween(phase.startDate, end)} días</span>
        <span>Operaciones: {phaseTrades.length}</span>
        <span>Balance inicial: {fmtPlain(phase.startBalance)}</span>
      </div>
      {open && phaseTrades.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 14px 12px' }}>
          {phaseTrades.map(t => (
            <div key={t.id} style={row}>
              <span style={{ color: '#888898', fontSize: 12 }}>{t.date} {t.time}</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{t.asset}</span>
              <span style={{ marginLeft: 'auto', color: t.pnl >= 0 ? '#4f8fff' : '#ef4444', fontWeight: 600 }}>{fmt(t.pnl)}</span>
            </div>
          ))}
        </div>
      )}
      {open && phaseTrades.length === 0 && <div style={{ padding: '4px 14px 12px', fontSize: 12, color: '#33334a' }}>Sin operaciones en esta fase.</div>}
    </div>
  );
}

function EquityCurve({ trades, target, maxDD }: { trades: { date: string; time: string; pnl: number }[]; target: number; maxDD: number }) {
  const W = 640, H = 200;
  const sorted = [...trades].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const pts: number[] = [0];
  let cum = 0;
  for (const t of sorted) { cum += t.pnl; pts.push(cum); }
  const lo = Math.min(-maxDD, ...pts, 0), hi = Math.max(target, ...pts, 0);
  const range = hi - lo || 1;
  const x = (i: number) => (i / Math.max(1, pts.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / range) * H;
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="#4f8fff" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <line x1={0} x2={W} y1={y(-maxDD)} y2={y(-maxDD)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#1e1e20" strokeWidth="1" />
      {pts.length > 1 && <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="rgba(79,143,255,0.06)" />}
      <path d={path} fill="none" stroke={cum >= 0 ? '#4f8fff' : '#ef4444'} strokeWidth="1.6" />
    </svg>
  );
}

/* ── Payout modal ── */
function PayoutModal({ open, accountId, defaultSplit, onClose }: { open: boolean; accountId: string; defaultSplit: number; onClose: () => void }) {
  const addPayout = usePropFirmStore(s => s.addPayout);
  const { push } = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gross, setGross] = useState('');
  const [split, setSplit] = useState(String(defaultSplit));
  const [method, setMethod] = useState('Wise');
  const [notes, setNotes] = useState('');

  if (!open) return null;
  const g = parseFloat(gross) || 0;
  const net = g * (parseFloat(split) || 0) / 100;

  const save = () => {
    if (g <= 0) { push({ kind: 'error', text: 'Introduce la cantidad bruta' }); return; }
    addPayout(accountId, { date, grossAmount: g, profitSplit: parseFloat(split) || 0, netAmount: net, method, notes });
    push({ kind: 'success', text: 'Payout registrado' });
    setGross(''); setNotes('');
    onClose();
  };
  return <ModalShell title="Registrar payout" onClose={onClose}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Field label="Fecha"><input type="date" value={date} onChange={e => setDate(e.target.value)} style={modalInp} /></Field>
      <Field label="Cantidad bruta ($)"><input type="number" value={gross} onChange={e => setGross(e.target.value)} style={modalInp} /></Field>
      <Field label="Profit split (%)"><input type="number" value={split} onChange={e => setSplit(e.target.value)} style={modalInp} /></Field>
      <Field label="Cantidad neta"><input value={`$${net.toFixed(2)}`} readOnly style={{ ...modalInp, color: '#4f8fff' }} /></Field>
      <Field label="Método"><select value={method} onChange={e => setMethod(e.target.value)} style={modalInp}>{['Wise', 'Stripe', 'Banco', 'Crypto', 'Otro'].map(m => <option key={m}>{m}</option>)}</select></Field>
    </div>
    <Field label="Notas"><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...modalInp, resize: 'vertical' }} /></Field>
    <button onClick={save} style={{ ...btnPrimary, width: '100%', padding: 11, marginTop: 4 }}>Guardar payout</button>
  </ModalShell>;
}

/* ── Reset modal ── */
function ResetModal({ open, accountId, onClose }: { open: boolean; accountId: string; onClose: () => void }) {
  const resetCurrentPhase = usePropFirmStore(s => s.resetCurrentPhase);
  const { push } = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState('');
  if (!open) return null;
  const save = () => {
    resetCurrentPhase(accountId, date, parseFloat(cost) || 0);
    push({ kind: 'success', text: 'Reset registrado — fase reiniciada desde balance fresco' });
    setCost('');
    onClose();
  };
  return <ModalShell title="Registrar reset" onClose={onClose}>
    <div style={{ fontSize: '0.78rem', color: '#888898', lineHeight: 1.5, marginBottom: 12 }}>Se cerrará la fase actual (sus operaciones quedan archivadas) y empezará una fase nueva del mismo tipo desde el balance inicial.</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Field label="Fecha"><input type="date" value={date} onChange={e => setDate(e.target.value)} style={modalInp} /></Field>
      <Field label="Coste ($)"><input type="number" value={cost} onChange={e => setCost(e.target.value)} style={modalInp} /></Field>
    </div>
    <button onClick={save} style={{ ...btnPrimary, width: '100%', padding: 11, marginTop: 4 }}>Guardar reset</button>
  </ModalShell>;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111113', border: '1px solid #1e1e20', borderRadius: 14, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', fontFamily: fontBody, color: '#e0e0e8' }}>
        <div style={{ background: '#161618', borderBottom: '1px solid #1e1e20', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1rem', color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid #1e1e20', color: '#4a4a60', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ ...lab, display: 'block', marginBottom: 6 }}>{label}</label>{children}</div>;
}
const modalInp: React.CSSProperties = { background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 8, padding: '9px 12px', color: '#e0e0e8', fontSize: '0.85rem', width: '100%', outline: 'none', fontFamily: fontBody, boxSizing: 'border-box' };
