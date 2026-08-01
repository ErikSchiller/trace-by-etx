import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTradeStore, useUserTrades, type Trade } from '../../store/tradeStore';
import { useUserAccounts, getActiveAccounts } from '../../store/propFirmStore';
import { useToast } from '../UI/ToastProvider';
import { AddTradeModal } from './AddTradeModal';
import { ConfirmDialog } from '../UI/ConfirmDialog';

const mono: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
function firmColor(firm: string) {
  const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#eab308'];
  let h = 0; for (const ch of firm) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}

const SESSION_LABEL: Record<string, string> = {
  london: 'Londres', new_york: 'Nueva York', asia: 'Asia', premarket: 'Pre-market',
};
const EXIT_LABEL: Record<string, string> = {
  sl_hit: 'SL tocado', tp_hit: 'TP tocado', manual: 'Manual',
};

function fmtMoney(n: number) {
  return `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Field({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: 'var(--dim2)', padding: 10, borderRadius: 6 }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ ...mono, fontSize: 13, color: color || '#fff', marginTop: 3 }}>{value}</div>
    </div>
  );
}

export function TradeDetailModal({ trade, onClose }: { trade: Trade | null; onClose: () => void }) {
  const deleteTrade = useTradeStore(s => s.deleteTrade);
  const deleteGroup = useTradeStore(s => s.deleteGroup);
  const updateTrade = useTradeStore(s => s.updateTrade);
  const addTrade = useTradeStore(s => s.addTrade);
  const allTrades = useUserTrades();
  const allAccounts = useUserAccounts();
  const activeAccounts = getActiveAccounts(allAccounts);
  const { push } = useToast();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'one' | 'group'>('one');
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySel, setCopySel] = useState<string[]>([]);

  const groupMembers = useMemo(() => (trade?.groupId ? allTrades.filter(t => t.groupId === trade.groupId) : []), [trade?.groupId, allTrades]);
  const firmById = useMemo(() => { const m = new Map<string, string>(); allAccounts.forEach(a => m.set(a.id, a.firm)); return m; }, [allAccounts]);
  if (!trade) return null;

  const isGrouped = !!trade.groupId && groupMembers.length > 1;
  const groupFirms = groupMembers.map(m => (m.accountId && firmById.get(m.accountId)) || 'Sin cuenta');
  const usedAccountIds = new Set(groupMembers.length ? groupMembers.map(m => m.accountId) : [trade.accountId]);
  const copyTargets = activeAccounts.filter(a => !usedAccountIds.has(a.id));
  const status = trade.pnl > 0 ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BE';

  const doDelete = () => {
    if (isGrouped && deleteScope === 'group') { deleteGroup(trade.groupId!); push({ kind: 'success', text: `Grupo eliminado (${groupMembers.length} operaciones)` }); }
    else { deleteTrade(trade.id); push({ kind: 'success', text: 'Operación eliminada' }); }
    setConfirmDelete(false);
    onClose();
  };

  const doCopy = () => {
    if (!copySel.length) return;
    let gid = trade.groupId;
    if (!gid) { gid = crypto.randomUUID(); updateTrade(trade.id, { groupId: gid, isMultiAccount: true }); }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, userId, createdAt, pnl, grossPnl, plannedRR, realRR, ...rest } = trade;
    copySel.forEach(acc => addTrade({ ...rest, accountId: acc, groupId: gid, isMultiAccount: true, directPnl: trade.inputMode === 'direct' ? trade.pnl : undefined }));
    push({ kind: 'success', text: `Copiada a ${copySel.length} cuenta${copySel.length === 1 ? '' : 's'} ✓` });
    setCopyOpen(false); setCopySel([]); onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0a0a0f', border: '1px solid rgba(79,143,255,0.15)',
          borderRadius: 12, padding: 22, width: '100%', maxWidth: 640,
          fontFamily: "'Inter', sans-serif", color: '#c8d4e8',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#fff' }}>
              {trade.asset}
            </h2>
            <span style={{ color: trade.direction === 'long' ? 'var(--blue)' : 'var(--red)', fontWeight: 700, fontSize: 12 }}>
              {trade.direction.toUpperCase()}
            </span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em',
              background: status === 'WIN' ? 'var(--blue-dim)' : status === 'LOSS' ? 'var(--red-dim)' : 'var(--dim2)',
              color: status === 'WIN' ? 'var(--blue)' : status === 'LOSS' ? 'var(--red)' : 'var(--muted)',
            }}>{status}</span>
            {isGrouped && (
              <span title={`Copiado en ${groupMembers.length} cuentas — ${groupFirms.join(', ')}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: 'rgba(79,143,255,0.12)', color: 'var(--blue)', cursor: 'help' }}>
                🔗 ×{groupMembers.length}
              </span>
            )}
            {trade.accountId && firmById.get(trade.accountId) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--muted)' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: firmColor(firmById.get(trade.accountId)!), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 700 }}>{firmById.get(trade.accountId)!.slice(0, 2).toUpperCase()}</span>
                {firmById.get(trade.accountId)}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#3a4560', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <Field label="Net PnL" value={fmtMoney(trade.pnl)} color={trade.pnl >= 0 ? 'var(--blue)' : 'var(--red)'} />
          <Field label="R:R real" value={trade.realRR.toFixed(2)} />
          <Field label="R:R planificado" value={trade.plannedRR.toFixed(2)} />
          <Field label="Fecha" value={`${trade.date} ${trade.time}`} />
          <Field label="Tamaño" value={trade.inputMode === 'direct' ? '—' : trade.positionSize.toString()} />
          <Field label="Comisiones" value={`$${trade.commission.toFixed(2)}`} />
          <Field label="Entrada" value={trade.inputMode === 'direct' ? '—' : trade.entryPrice.toLocaleString('en-US')} />
          <Field label="Salida" value={trade.inputMode === 'direct' ? '—' : trade.exitPrice.toLocaleString('en-US')} />
          <Field label="Stop / TP" value={trade.inputMode === 'direct' ? '—' : `${trade.stopLoss} / ${trade.takeProfit}`} />
          <Field label="Sesión" value={SESSION_LABEL[trade.session] || trade.session} />
          <Field label="Setup" value={trade.setup || '—'} />
          <Field label="Salida" value={EXIT_LABEL[trade.exitType]} />
        </div>

        {trade.errorTags.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Errores
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {trade.errorTags.map(tag => (
                <span key={tag} style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 999, padding: '3px 9px', fontSize: 11 }}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {trade.entryReason && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Razón de entrada
            </div>
            <div style={{ background: 'var(--dim2)', padding: 10, borderRadius: 6, fontSize: 13, lineHeight: 1.5 }}>{trade.entryReason}</div>
          </div>
        )}

        {trade.postTradeNotes && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Notas post-trade
            </div>
            <div style={{ background: 'var(--dim2)', padding: 10, borderRadius: 6, fontSize: 13, lineHeight: 1.5 }}>{trade.postTradeNotes}</div>
          </div>
        )}

        {trade.screenshots.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Capturas
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {trade.screenshots.map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)' }} />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--dim)', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setDeleteScope('one'); setConfirmDelete(true); }}
            style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Eliminar
          </button>
          <button
            onClick={() => setEditOpen(true)}
            style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Editar
          </button>
          {copyTargets.length > 0 && (
            <button
              onClick={() => { setCopySel([]); setCopyOpen(true); }}
              style={{ background: 'transparent', color: 'var(--blue)', border: '1px solid rgba(79,143,255,0.3)', padding: '8px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            >
              Copiar a otra cuenta →
            </button>
          )}
          <button
            onClick={() => { onClose(); navigate(`/replay?trade=${trade.id}`); }}
            style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Ver en replay →
          </button>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Cerrar
          </button>
        </div>
      </div>
      <div onClick={e => e.stopPropagation()}>
        <AddTradeModal open={editOpen} onClose={() => setEditOpen(false)} mode="edit" tradeId={trade.id} />

        {/* Delete: grouped → radio modal, else simple confirm */}
        {confirmDelete && isGrouped ? (
          <div onClick={() => setConfirmDelete(false)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 420, padding: 24, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 6 }}>Esta operación está agrupada</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>¿Qué quieres eliminar?</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                {([['one', 'Solo esta'], ['group', `Todas las del grupo (${groupMembers.length} operaciones)`]] as const).map(([sc, lbl]) => (
                  <label key={sc} onClick={() => setDeleteScope(sc)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: deleteScope === sc ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `1px solid ${deleteScope === sc ? 'var(--blue)' : 'var(--border)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {deleteScope === sc && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />}
                    </span>
                    {lbl}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={doDelete} style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
              </div>
            </div>
          </div>
        ) : (
          <ConfirmDialog
            open={confirmDelete}
            title="¿Eliminar esta operación?"
            description="Esta acción no se puede deshacer."
            confirmText="Eliminar"
            destructive
            onConfirm={doDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        )}

        {/* Copy to other accounts */}
        {copyOpen && (
          <div onClick={() => setCopyOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 420, padding: 24, fontFamily: "'Space Grotesk', sans-serif", boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 6 }}>Copiar a otras cuentas</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Se creará una copia de esta operación en las cuentas seleccionadas.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {copyTargets.map(a => {
                  const sel = copySel.includes(a.id);
                  return (
                    <label key={a.id} onClick={() => setCopySel(s => s.includes(a.id) ? s.filter(x => x !== a.id) : [...s, a.id])} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem', color: sel ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${sel ? 'var(--blue)' : 'var(--border)'}`, background: sel ? 'var(--blue)' : 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{sel ? '✓' : ''}</span>
                      <span style={{ width: 16, height: 16, borderRadius: 4, background: firmColor(a.firm), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{a.firm.slice(0, 2).toUpperCase()}</span>
                      {a.firm} ${Math.round(a.accountSize / 1000)}K
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setCopyOpen(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={doCopy} disabled={!copySel.length} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: copySel.length ? 'pointer' : 'not-allowed', opacity: copySel.length ? 1 : 0.5 }}>Copiar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TradeDetailModal;
