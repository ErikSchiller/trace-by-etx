import { useEffect, useState } from 'react';
import { usePropFirmStore, accountTotalCost, accountTotalPayouts, type PropFirmAccount } from '../../store/propFirmStore';
import { useToast } from '../../components/UI/ToastProvider';
import { celebrateEvalPassed } from '../../utils/milestones';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const inp: React.CSSProperties = { background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 8, padding: '9px 12px', color: '#e0e0e8', fontSize: '0.85rem', width: '100%', outline: 'none', fontFamily: fontBody, boxSizing: 'border-box' };
const lab: React.CSSProperties = { fontSize: '0.6rem', color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 6 };
function fmtPlain(n: number) { return `$${Math.round(n).toLocaleString('en-US')}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function sizeBadge(n: number) { return `${Math.round(n / 1000)}K`; }

function Shell({ title, onClose, maxWidth = 440, children }: { title: string; onClose: () => void; maxWidth?: number; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111113', border: '1px solid #1e1e20', borderRadius: 14, width: '100%', maxWidth, fontFamily: fontBody, color: '#e0e0e8', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ background: '#161618', borderBottom: '1px solid #1e1e20', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1rem', color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid #1e1e20', color: '#4a4a60', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px' }}>{children}</div>
      </div>
    </div>
  );
}

/* ============ MARK AS FUNDED ============ */
export function MarkFundedModal({ account, open, onClose }: { account: PropFirmAccount; open: boolean; onClose: () => void }) {
  const passToPhase = usePropFirmStore(s => s.passToPhase);
  const { push } = useToast();
  const [passDate, setPassDate] = useState(today());
  const [activationPaid, setActivationPaid] = useState(true);
  const [activationDate, setActivationDate] = useState(today());
  const [activationAmount, setActivationAmount] = useState(account.activationFee);

  useEffect(() => {
    if (open) { setPassDate(today()); setActivationPaid(account.activationFee > 0); setActivationDate(today()); setActivationAmount(account.activationFee); }
  }, [open, account.activationFee]);

  if (!open) return null;
  const hasActivation = account.activationFee > 0;

  const confirm = () => {
    passToPhase(account.id, 'funded', passDate, {
      activationFeePaid: hasActivation ? activationPaid : false,
      activationPaidDate: hasActivation && activationPaid ? activationDate : undefined,
      activationFee: hasActivation ? (activationPaid ? activationAmount : 0) : account.activationFee,
    });
    push({ kind: 'success', text: `¡Cuenta funded! Empezando fresh desde ${fmtPlain(account.accountSize)} 🎉` });
    celebrateEvalPassed();
    onClose();
  };

  return (
    <Shell title="¡Enhorabuena! Pasaste la evaluación." onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: '0.82rem', color: '#a1ab88', lineHeight: 1.6, background: 'rgba(79,143,255,0.05)', borderLeft: '3px solid #4f8fff', borderRadius: 6, padding: '12px 14px' }}>
          Al marcar como funded, se cerrará tu fase de evaluación actual con sus operaciones archivadas, y empezarás una fase funded nueva desde <b style={{ color: '#fff' }}>{fmtPlain(account.accountSize)}</b>.
          <br /><br />
          Las operaciones de evaluación siguen guardadas en el historial — no se borran. A partir de ahora el PnL mostrado es solo de la fase funded.
        </div>
        <div>
          <label style={lab}>Fecha de paso</label>
          <input type="date" value={passDate} onChange={e => setPassDate(e.target.value)} style={inp} />
        </div>

        {hasActivation && (
          <div>
            <label style={lab}>Coste de activación</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([[true, `Pagué ${fmtPlain(account.activationFee)} de activation fee para acceder a la cuenta funded`], [false, 'No hay activation fee (mi firma no lo cobra)']] as [boolean, string][]).map(([v, lbl]) => (
                <label key={String(v)} onClick={() => setActivationPaid(v)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: activationPaid === v ? '#e0e0e8' : '#888898' }}>
                  <span style={{ width: 15, height: 15, borderRadius: '50%', border: `1px solid ${activationPaid === v ? '#4f8fff' : '#33334a'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {activationPaid === v && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4f8fff' }} />}
                  </span>
                  {lbl}
                </label>
              ))}
            </div>
            {activationPaid && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div><label style={lab}>Fecha del pago</label><input type="date" value={activationDate} onChange={e => setActivationDate(e.target.value)} style={inp} /></div>
                <div><label style={lab}>Importe pagado ($)</label><input type="number" value={activationAmount} onChange={e => setActivationAmount(parseFloat(e.target.value) || 0)} style={inp} /></div>
              </div>
            )}
          </div>
        )}

        <button onClick={confirm} style={{ background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 8, padding: 11, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, marginTop: 4 }}>Confirmar paso a funded</button>
      </div>
    </Shell>
  );
}

/* ============ DELETE ACCOUNT ============ */
export function DeleteAccountDialog({ account, tradeCount, open, onClose, onDeleted }: { account: PropFirmAccount; tradeCount: number; open: boolean; onClose: () => void; onDeleted?: () => void }) {
  const deleteAccount = usePropFirmStore(s => s.deleteAccount);
  const { push } = useToast();
  const [typed, setTyped] = useState('');
  useEffect(() => { if (open) setTyped(''); }, [open]);
  if (!open) return null;

  const totalCost = accountTotalCost(account);
  const totalPayouts = accountTotalPayouts(account);
  const payoutCount = account.payouts.length;
  const accountName = `${account.firm} ${sizeBadge(account.accountSize)}`;
  const needsTyped = totalPayouts > 0 || totalCost > 0;
  const canDelete = !needsTyped || typed.trim() === accountName;

  const msgs: string[] = [];
  if (tradeCount > 0) msgs.push(`Esta cuenta tiene ${tradeCount} operación${tradeCount === 1 ? '' : 'es'} registrada${tradeCount === 1 ? '' : 's'}. Al eliminarla, las operaciones NO se borrarán — solo perderán el vínculo con esta cuenta. Podrás verlas en Operaciones pero sin cuenta asignada.`);
  if (payoutCount > 0) msgs.push(`Esta cuenta tiene ${payoutCount} payout${payoutCount === 1 ? '' : 's'} registrado${payoutCount === 1 ? '' : 's'} por un total de ${fmtPlain(totalPayouts)}. Al eliminarla, ese historial se perderá.`);
  if (msgs.length === 0) msgs.push('Se eliminará esta cuenta permanentemente.');

  const doDelete = () => {
    deleteAccount(account.id);
    push({ kind: 'success', text: 'Cuenta eliminada' });
    onClose();
    onDeleted?.();
  };

  return (
    <Shell title="¿Eliminar esta cuenta?" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => <p key={i} style={{ fontSize: '0.82rem', color: '#888898', lineHeight: 1.55, margin: 0 }}>{m}</p>)}
        {needsTyped && (
          <div>
            <label style={lab}>Escribe «{accountName}» para confirmar</label>
            <input autoFocus value={typed} onChange={e => setTyped(e.target.value)} placeholder={accountName} style={inp} />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #1e1e20', color: '#888898', borderRadius: 8, padding: '9px 16px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: fontBody }}>Cancelar</button>
          <button onClick={doDelete} disabled={!canDelete} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: '0.82rem', fontWeight: 600, cursor: canDelete ? 'pointer' : 'not-allowed', opacity: canDelete ? 1 : 0.5, fontFamily: fontBody }}>Eliminar cuenta</button>
        </div>
      </div>
    </Shell>
  );
}
