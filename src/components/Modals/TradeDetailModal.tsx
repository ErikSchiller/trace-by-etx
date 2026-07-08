import { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTradeStore, type Trade } from '../../store/tradeStore';
import { useToast } from '../UI/ToastProvider';
import { AddTradeModal } from './AddTradeModal';
import { ConfirmDialog } from '../UI/ConfirmDialog';

const mono: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };

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
  const { push } = useToast();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!trade) return null;

  const status = trade.pnl > 0 ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BE';

  const doDelete = () => {
    deleteTrade(trade.id);
    push({ kind: 'success', text: 'Operación eliminada' });
    setConfirmDelete(false);
    onClose();
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
            onClick={() => setConfirmDelete(true)}
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
        <ConfirmDialog
          open={confirmDelete}
          title="¿Eliminar esta operación?"
          description="Esta acción no se puede deshacer."
          confirmText="Eliminar"
          destructive
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    </div>
  );
}

export default TradeDetailModal;
