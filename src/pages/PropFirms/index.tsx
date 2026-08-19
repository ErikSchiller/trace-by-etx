import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useUserAccounts, usePropFirmStore,
  getActiveAccounts, getPastAccounts, getTotalInvested, getTotalPayouts, getNetPnL,
  getPassRate, getAvgDaysToFund, getAccountsByFirm, getPendingActivation,
  accountTotalCost, accountTotalPayouts, accountNetResult, accountPendingCost,
  type PropFirmAccount, type Phase, type DrawdownType,
} from '../../store/propFirmStore';
import { PROP_FIRM_PRESETS, FIRMS, presetsForFirm } from '../../config/propFirmPresets';
import { useUserTrades } from '../../store/tradeStore';
import { ProLock } from '../../components/UI/ProLock';
import { Watermark } from '../../components/UI/Watermark';
import { AnimatedNumber } from '../../components/UI/AnimatedNumber';
import { useToast } from '../../components/UI/ToastProvider';
import { MarkFundedModal, DeleteAccountDialog } from './AccountModals';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const card: React.CSSProperties = { background: '#161618', border: '1px solid #1e1e20', borderRadius: 12, padding: '20px 22px', position: 'relative' };
const kLabel: React.CSSProperties = { fontSize: '0.6rem', color: '#4a4a60', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 };
const kVal: React.CSSProperties = { fontFamily: fontHead, fontWeight: 800, fontSize: '1.6rem', lineHeight: 1, marginTop: 6 };

const PHASE_LABEL: Record<Phase, string> = {
  eval_p1: 'EVAL FASE 1', eval_p2: 'EVAL FASE 2', funded: 'FUNDED',
  passed_pending: 'PASSED — esperando funding', blown: 'BLOWN', expired: 'EXPIRED',
};
const PHASE_COLOR: Record<Phase, { bg: string; c: string }> = {
  eval_p1: { bg: 'rgba(245,158,11,0.12)', c: '#f59e0b' },
  eval_p2: { bg: 'rgba(245,158,11,0.12)', c: '#f59e0b' },
  funded: { bg: 'rgba(79,143,255,0.12)', c: '#4f8fff' },
  passed_pending: { bg: 'rgba(168,85,247,0.12)', c: '#a855f7' },
  blown: { bg: 'rgba(239,68,68,0.12)', c: '#ef4444' },
  expired: { bg: 'rgba(255,255,255,0.06)', c: '#888898' },
};

function fmt(n: number) { return `${n >= 0 ? '+' : '-'}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`; }
function fmtPlain(n: number) { return `$${Math.round(n).toLocaleString('en-US')}`; }
function sizeBadge(n: number) { return `$${Math.round(n / 1000)}K`; }
function firmInitials(firm: string) { return firm.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function firmColor(firm: string) {
  const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#10b981', '#eab308'];
  let h = 0; for (const ch of firm) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}

export default function PropFirms() {
  const accounts = useUserAccounts();
  const trades = useUserTrades();
  const [addOpen, setAddOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<PropFirmAccount | null>(null);

  const active = useMemo(() => getActiveAccounts(accounts), [accounts]);
  const past = useMemo(() => getPastAccounts(accounts), [accounts]);
  const pending = useMemo(() => getPendingActivation(accounts), [accounts]);
  const invested = getTotalInvested(accounts);
  const payouts = getTotalPayouts(accounts);
  const net = getNetPnL(accounts);
  const pass = getPassRate(accounts);
  const days = getAvgDaysToFund(accounts);
  const byFirm = useMemo(() => getAccountsByFirm(accounts), [accounts]);
  const firmsCount = new Set(accounts.map(a => a.firm)).size;
  const tradeCountFor = (id: string) => trades.filter(t => (t as { accountId?: string }).accountId === id).length;

  return (
    <ProLock feature="Prop Firm Hub" description="Cuentas, fees, payouts, pass rate y ROI por firma">
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.3rem', color: '#fff' }}>Prop Firms</h1>
          <button onClick={() => setAddOpen(true)} style={{ background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>+ Añadir cuenta</button>
        </div>

        {accounts.length === 0 ? (
          <div style={{ ...card, padding: 50, textAlign: 'center' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🗂️</div>
            <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginBottom: 6 }}>Aún no tienes cuentas</div>
            <div style={{ fontSize: 13, color: '#4a4a60', marginBottom: 18 }}>Añade tu primera cuenta de prop firm para trackear fees, payouts y ROI.</div>
            <button onClick={() => setAddOpen(true)} style={{ background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Añadir cuenta</button>
          </div>
        ) : (
          <>
            {/* KPI strip */}
            <div style={{ background: '#161618', border: '1px solid #1e1e20', borderRadius: 12, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', position: 'relative' }}>
              <Cell label="TOTAL INVERTIDO" animatedValue={invested} format={fmtPlain} valColor="#fff" sub={`${accounts.length} cuentas · ${firmsCount} firmas`} sub2={pending.count > 0 ? `Pendientes por pasar eval: ${fmtPlain(pending.total)} en ${pending.count} cuenta${pending.count === 1 ? '' : 's'}` : undefined} />
              <Cell label="TOTAL PAYOUTS" animatedValue={payouts} format={fmtPlain} valColor="#4f8fff" />
              <Cell label="P&L NETO REAL" animatedValue={net} format={fmt} valColor={net >= 0 ? '#4f8fff' : '#ef4444'} sub={`ROI: ${invested ? Math.round((net / invested) * 100) : 0}%`} />
              <Cell label="PASS RATE" animatedValue={pass.rate} format={n => `${Math.round(n)}%`} valColor="#fff" sub={`${pass.passed} de ${pass.total} evaluaciones`} />
              <Cell label="TIEMPO A FUNDED" value={`${days.mean} días`} valColor="#fff" sub={`Mediana: ${days.median} días`} last />
              <Watermark />
            </div>

            {/* Active accounts */}
            {active.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Cuentas activas</span>
                  <span style={{ background: 'rgba(79,143,255,0.1)', color: '#4f8fff', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{active.length}</span>
                </div>
                <div className="pf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {active.map(a => <AccountCard key={a.id} account={a} trades={tradeCountFor(a.id)} onEdit={() => setEditAccount(a)} />)}
                </div>
              </div>
            )}

            {/* Past accounts */}
            {past.length > 0 && (
              <div>
                <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 10 }}>Cuentas pasadas</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {past.map(a => <PastAccountRow key={a.id} account={a} trades={tradeCountFor(a.id)} onEdit={() => setEditAccount(a)} />)}
                </div>
              </div>
            )}

            {/* Per-firm breakdown */}
            {byFirm.length > 0 && (
              <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.88rem', color: '#fff', padding: '16px 18px 10px' }}>Rendimiento por firma</div>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <tr style={{ fontSize: '0.62rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {['Firma', 'Cuentas', 'Invertido', 'Payouts', 'Net', 'ROI'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Firma' ? 'left' : 'right', fontWeight: 600 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {byFirm.map(f => (
                      <tr key={f.firm} style={{ borderTop: '1px solid #1a1a1c' }}>
                        <td style={{ padding: '10px 16px', color: '#fff', fontWeight: 600 }}>{f.firm}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#888898' }}>{f.count}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#888898' }}>{fmtPlain(f.invested)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#4f8fff' }}>{fmtPlain(f.payouts)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: f.net >= 0 ? '#4f8fff' : '#ef4444', fontWeight: 600 }}>{fmt(f.net)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: f.roi >= 0 ? '#4f8fff' : '#ef4444' }}>{Math.round(f.roi)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Watermark />
              </div>
            )}
          </>
        )}
      </div>

      <AddAccountModal open={addOpen || !!editAccount} editAccount={editAccount} onClose={() => { setAddOpen(false); setEditAccount(null); }} />
      <style>{`@media (max-width: 760px){ .pf-grid{ grid-template-columns:1fr !important; } }`}</style>
    </ProLock>
  );
}

function Cell({ label, value, animatedValue, format, valColor, sub, sub2, last }: { label: string; value?: string; animatedValue?: number; format?: (n: number) => string; valColor: string; sub?: string; sub2?: string; last?: boolean }) {
  return (
    <div style={{ padding: '18px 20px', borderRight: last ? 'none' : '1px solid #1e1e20' }}>
      <div style={kLabel}>{label}</div>
      <div style={{ ...kVal, color: valColor }}>{animatedValue !== undefined ? <AnimatedNumber value={animatedValue} format={format} /> : value}</div>
      {sub && <div style={{ fontSize: '0.62rem', color: '#4a4a60', marginTop: 5 }}>{sub}</div>}
      {sub2 && <div style={{ fontSize: '0.62rem', color: '#7861ff', marginTop: 3 }}>{sub2}</div>}
    </div>
  );
}

function AccountMenu({ account: a, onEdit, onMarkFunded, onDelete, onClose }: { account: PropFirmAccount; onEdit: () => void; onMarkFunded: () => void; onDelete: () => void; onClose: () => void }) {
  const setPhase = usePropFirmStore(s => s.setPhase);
  const { push } = useToast();
  const navigate = useNavigate();
  const isEval = a.phase === 'eval_p1' || a.phase === 'eval_p2';
  const Item = ({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) => (
    <button onClick={() => { onClick(); onClose(); }} style={{ ...menuItem, color: danger ? '#ef4444' : '#c8d4e8' }}>{children}</button>
  );
  return (
    <div style={{ position: 'absolute', top: 24, right: 0, background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 8, padding: 4, zIndex: 20, minWidth: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
      <Item onClick={onEdit}>Editar detalles</Item>
      <Item onClick={() => navigate(`/prop-firms/${a.id}`)}>Registrar payout</Item>
      <Item onClick={() => navigate(`/prop-firms/${a.id}`)}>Registrar reset</Item>
      {isEval && <Item onClick={onMarkFunded}>Marcar como funded</Item>}
      <Item onClick={() => { setPhase(a.id, 'blown'); push({ kind: 'success', text: 'Cuenta actualizada' }); }} danger>Marcar como blown</Item>
      <Item onClick={() => { setPhase(a.id, 'expired'); push({ kind: 'success', text: 'Cuenta actualizada' }); }}>Marcar como expired</Item>
      <div style={{ height: 1, background: '#1e1e20', margin: '4px 0' }} />
      <Item onClick={onDelete} danger>Eliminar cuenta</Item>
    </div>
  );
}

function AccountCard({ account: a, trades, onEdit }: { account: PropFirmAccount; trades: number; onEdit: () => void }) {
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [markFundedOpen, setMarkFundedOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const paidNow = accountTotalCost(a);
  const pending = accountPendingCost(a);

  // Approximate equity from linked payouts isn't enough; use placeholder progress from phase.
  // Real equity tracking would come from linked trades; here we show target rules.
  const currentProgress = a.phase === 'funded' || a.phase === 'passed_pending' ? 1 : 0.45;
  const towardTarget = a.profitTarget * currentProgress;
  const ddSafePct = 0.7; // placeholder distance to DD (safe)
  const ddColor = ddSafePct > 0.5 ? '#4f8fff' : ddSafePct > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ ...card, transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.25)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e20')}>
      {/* top */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: firmColor(a.firm), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{firmInitials(a.firm)}</div>
          <div>
            <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{a.firm}</div>
            <div style={{ fontSize: '0.7rem', color: '#888898' }}>{sizeBadge(a.accountSize)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <span style={{ background: PHASE_COLOR[a.phase].bg, color: PHASE_COLOR[a.phase].c, fontSize: 9, padding: '3px 8px', borderRadius: 5, fontWeight: 700 }}>{PHASE_LABEL[a.phase]}</span>
          <button onClick={() => setMenu(m => !m)} style={{ background: 'transparent', border: 'none', color: '#4a4a60', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>⋯</button>
          {menu && <AccountMenu account={a} onEdit={onEdit} onMarkFunded={() => setMarkFundedOpen(true)} onDelete={() => setDeleteOpen(true)} onClose={() => setMenu(false)} />}
        </div>
      </div>

      {/* progress */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: '0.7rem', color: '#888898', marginBottom: 5 }}>Hacia target: {fmtPlain(towardTarget)} / {fmtPlain(a.profitTarget)}</div>
        <div style={{ height: 6, background: '#1e1e20', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, currentProgress * 100)}%`, height: '100%', background: '#4f8fff' }} />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: '0.7rem', color: '#888898', marginBottom: 5 }}>Distancia a max DD: {fmtPlain(a.maxDrawdown * ddSafePct)}</div>
        <div style={{ height: 6, background: '#1e1e20', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${ddSafePct * 100}%`, height: '100%', background: ddColor }} />
        </div>
      </div>

      {/* stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 14, marginTop: 14, borderTop: '1px solid #1e1e20' }}>
        <Stat label="Días operados" value={`— / ${a.minDays ?? 0} mín`} />
        <Stat label="Consistencia" value={a.consistencyRule ? `${a.consistencyRule}% máx` : '—'} />
        <Stat label="Operaciones" value={String(trades)} />
      </div>

      {/* footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: '0.72rem' }}>
        <span style={{ color: '#4a4a60' }}>
          {pending > 0
            ? <>Coste: {fmtPlain(paidNow)} pagado · <span style={{ color: '#7861ff' }}>+{fmtPlain(pending)} al pasar la eval</span></>
            : <>Coste: {fmtPlain(paidNow)} pagado</>}
        </span>
        <span onClick={() => navigate(`/prop-firms/${a.id}`)} style={{ color: '#4f8fff', cursor: 'pointer', fontWeight: 600 }}>Ver detalles →</span>
      </div>

      <MarkFundedModal account={a} open={markFundedOpen} onClose={() => setMarkFundedOpen(false)} />
      <DeleteAccountDialog account={a} tradeCount={trades} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}

function PastAccountRow({ account: a, trades, onEdit }: { account: PropFirmAccount; trades: number; onEdit: () => void }) {
  const [menu, setMenu] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <div style={{ ...card, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: firmColor(a.firm), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{firmInitials(a.firm)}</div>
        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{a.firm}</span>
        <span style={{ fontSize: '0.7rem', color: '#4a4a60' }}>{sizeBadge(a.accountSize)}</span>
        <span style={{ background: PHASE_COLOR[a.phase].bg, color: PHASE_COLOR[a.phase].c, fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>{PHASE_LABEL[a.phase]}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: '0.78rem', color: '#888898', fontFamily: fontBody }}>
          Coste {fmtPlain(accountTotalCost(a))} · Payouts {fmtPlain(accountTotalPayouts(a))} · <span style={{ color: accountNetResult(a) >= 0 ? '#4f8fff' : '#ef4444', fontWeight: 600 }}>{fmt(accountNetResult(a))}</span>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenu(m => !m)} style={{ background: 'transparent', border: 'none', color: '#4a4a60', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>⋯</button>
          {menu && (
            <div style={{ position: 'absolute', top: 24, right: 0, background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 8, padding: 4, zIndex: 20, minWidth: 160, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
              <button onClick={() => { onEdit(); setMenu(false); }} style={menuItem}>Editar detalles</button>
              <div style={{ height: 1, background: '#1e1e20', margin: '4px 0' }} />
              <button onClick={() => { setDeleteOpen(true); setMenu(false); }} style={{ ...menuItem, color: '#ef4444' }}>Eliminar cuenta</button>
            </div>
          )}
        </div>
      </div>
      <DeleteAccountDialog account={a} tradeCount={trades} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}

const menuItem: React.CSSProperties = { width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: '#c8d4e8', padding: '7px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 5, fontFamily: fontBody };
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.58rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '0.78rem', color: '#fff', marginTop: 3 }}>{value}</div>
    </div>
  );
}

/* ============ ADD / EDIT ACCOUNT MODAL ============ */
function AddAccountModal({ open, onClose, editAccount }: { open: boolean; onClose: () => void; editAccount?: PropFirmAccount | null }) {
  const addAccount = usePropFirmStore(s => s.addAccount);
  const updateAccount = usePropFirmStore(s => s.updateAccount);
  const { push } = useToast();
  const [firm, setFirm] = useState('TopStep');
  const [customFirm, setCustomFirm] = useState('');
  const [presetKey, setPresetKey] = useState('');
  const [accountSize, setAccountSize] = useState(50000);
  const [phase, setPhase] = useState<Phase>('eval_p1');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [evalFee, setEvalFee] = useState(0);
  const [activationFee, setActivationFee] = useState(0);
  const [profitTarget, setProfitTarget] = useState(3000);
  const [maxDrawdown, setMaxDrawdown] = useState(2000);
  const [drawdownType, setDrawdownType] = useState<DrawdownType>('trailing');

  const presets = firm === 'Otro' ? [] : presetsForFirm(firm);

  const applyPreset = (key: string) => {
    setPresetKey(key);
    const p = PROP_FIRM_PRESETS[key];
    if (!p) return;
    setAccountSize(p.accountSize); setEvalFee(p.evalFee); setActivationFee(p.activationFee);
    setProfitTarget(p.profitTarget); setMaxDrawdown(p.maxDrawdown); setDrawdownType(p.drawdownType);
  };

  // Pre-fill when editing
  useEffect(() => {
    if (!open || !editAccount) return;
    const known = FIRMS.includes(editAccount.firm);
    setFirm(known ? editAccount.firm : 'Otro');
    setCustomFirm(known ? '' : editAccount.firm);
    setPresetKey('');
    setAccountSize(editAccount.accountSize);
    setPhase(editAccount.phase === 'eval_p2' ? 'eval_p1' : editAccount.phase);
    setPurchaseDate(editAccount.purchaseDate);
    setEvalFee(editAccount.evalFee);
    setActivationFee(editAccount.activationFee);
    setProfitTarget(editAccount.profitTarget);
    setMaxDrawdown(editAccount.maxDrawdown);
    setDrawdownType(editAccount.drawdownType);
  }, [open, editAccount]);

  if (!open) return null;

  const onSave = () => {
    const finalFirm = firm === 'Otro' ? (customFirm.trim() || 'Personalizado') : firm;
    if (editAccount) {
      updateAccount(editAccount.id, {
        firm: finalFirm, accountSize, phase, purchaseDate,
        profitTarget, maxDrawdown, drawdownType, evalFee, activationFee,
      });
      push({ kind: 'success', text: 'Cambios guardados' });
    } else {
      addAccount({
        firm: finalFirm, accountSize, phase, purchaseDate,
        profitTarget, maxDrawdown, drawdownType,
        evalFee, activationFee, minDays: 0,
      });
      push({ kind: 'success', text: 'Cuenta creada' });
    }
    onClose();
  };

  const inp: React.CSSProperties = { background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 8, padding: '9px 12px', color: '#e0e0e8', fontSize: '0.85rem', width: '100%', outline: 'none', fontFamily: fontBody, boxSizing: 'border-box' };
  const lab: React.CSSProperties = { fontSize: '0.6rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 6 };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111113', border: '1px solid #1e1e20', borderRadius: 14, width: '100%', maxWidth: 560, fontFamily: fontBody, color: '#e0e0e8', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ background: '#161618', borderBottom: '1px solid #1e1e20', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1rem', color: '#fff', margin: 0 }}>{editAccount ? 'Editar cuenta' : 'Añadir cuenta'}</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid #1e1e20', color: '#4a4a60', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Firm select */}
          <div>
            <label style={lab}>Firma</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FIRMS.map(f => (
                <button key={f} onClick={() => { setFirm(f); setPresetKey(''); }} style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer', fontFamily: fontBody, border: `1px solid ${firm === f ? '#4f8fff' : '#1e1e20'}`, background: firm === f ? 'rgba(79,143,255,0.1)' : '#161618', color: firm === f ? '#4f8fff' : '#888898' }}>{f}</button>
              ))}
            </div>
            {firm === 'Otro' && <input value={customFirm} onChange={e => setCustomFirm(e.target.value)} placeholder="Nombre de la firma" style={{ ...inp, marginTop: 8 }} />}
          </div>

          {/* Preset / size */}
          {presets.length > 0 && (
            <div>
              <label style={lab}>Tamaño de cuenta</label>
              <select value={presetKey} onChange={e => applyPreset(e.target.value)} style={inp}>
                <option value="">Selecciona…</option>
                {presets.map(p => { const key = Object.keys(PROP_FIRM_PRESETS).find(k => PROP_FIRM_PRESETS[k] === p)!; return <option key={key} value={key}>{p.name}</option>; })}
              </select>
            </div>
          )}

          {/* Phase */}
          <div>
            <label style={lab}>Fase actual</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([['eval_p1', 'Evaluación'], ['funded', 'Funded']] as [Phase, string][]).map(([p, l]) => (
                <button key={p} onClick={() => setPhase(p)} style={{ padding: '9px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, border: `1px solid ${phase === p ? '#4f8fff' : '#1e1e20'}`, background: phase === p ? 'rgba(79,143,255,0.1)' : '#161618', color: phase === p ? '#4f8fff' : '#888898' }}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lab}>Fecha de compra</label><input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={inp} /></div>
            <div><label style={lab}>Tamaño ($)</label><input type="number" value={accountSize} onChange={e => setAccountSize(parseFloat(e.target.value) || 0)} style={inp} /></div>
            <div><label style={lab}>Coste evaluación ($)</label><input type="number" value={evalFee} onChange={e => setEvalFee(parseFloat(e.target.value) || 0)} style={inp} /></div>
            <div>
              <label style={lab}>Activation fee ($)</label>
              <input type="number" value={activationFee} onChange={e => setActivationFee(parseFloat(e.target.value) || 0)} style={inp} />
              <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: 5, lineHeight: 1.4 }}>Este importe se registrará como coste solo cuando marques la evaluación como pasada.</div>
            </div>
            <div><label style={lab}>Profit target ($)</label><input type="number" value={profitTarget} onChange={e => setProfitTarget(parseFloat(e.target.value) || 0)} style={inp} /></div>
            <div><label style={lab}>Max drawdown ($)</label><input type="number" value={maxDrawdown} onChange={e => setMaxDrawdown(parseFloat(e.target.value) || 0)} style={inp} /></div>
          </div>

          <div>
            <label style={lab}>Tipo de drawdown</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([['trailing', 'Trailing'], ['static', 'Static']] as [DrawdownType, string][]).map(([d, l]) => (
                <button key={d} onClick={() => setDrawdownType(d)} style={{ padding: '8px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, border: `1px solid ${drawdownType === d ? '#4f8fff' : '#1e1e20'}`, background: drawdownType === d ? 'rgba(79,143,255,0.1)' : '#161618', color: drawdownType === d ? '#4f8fff' : '#888898' }}>{l}</button>
              ))}
            </div>
          </div>

          <button onClick={onSave} style={{ background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 8, padding: 11, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, marginTop: 4 }}>{editAccount ? 'Guardar cambios' : 'Crear cuenta'}</button>
        </div>
      </div>
    </div>
  );
}
