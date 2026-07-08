import { useState } from 'react';
import type { Trade } from '../../types';
import { useStore } from '../../store';
import { t } from '../../i18n';
import { PnLValue } from '../UI/PnLValue';
import { Badge } from '../UI/Badge';
import { Modal } from '../UI/Modal';
import { TradeForm } from '../TradeForm/TradeForm';
import { Button } from '../UI/Button';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Edit2, Trash2, Image } from 'lucide-react';

interface TradeRowProps {
  trade: Trade;
  compact?: boolean;
}

export function TradeRow({ trade, compact = false }: TradeRowProps) {
  const { deleteTrade, settings, language } = useStore();
  const tr = t(language);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sym = settings.currencySymbol;
  const isLong = trade.direction === 'long';

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-md bg-[#14141e] border border-[#1e1e2e] hover:border-[#2a2a3d] transition-colors">
        <div className="flex items-center gap-2.5">
          <span className={clsx('text-xs font-mono font-bold w-16 truncate', isLong ? 'text-[#00d4aa]' : 'text-[#ff4757]')}>
            {trade.asset}
          </span>
          <Badge variant={isLong ? 'green' : 'red'}>
            {isLong ? '▲' : '▼'} {isLong ? tr.trade.long : tr.trade.short}
          </Badge>
          <span className="text-xs text-[#55557a] font-mono">{trade.setup}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#55557a] font-mono">{trade.date}</span>
          <PnLValue value={trade.pnl} symbol={sym} size="sm" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-[#1e1e2e] bg-[#16161f] overflow-hidden transition-colors hover:border-[#2a2a3d]">
        {/* Main row */}
        <div
          className="flex items-center gap-3 p-3 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <div className={clsx('w-1 h-10 rounded-full flex-shrink-0', isLong ? 'bg-[#00d4aa]' : 'bg-[#ff4757]')} />

          <div className="flex-1 grid grid-cols-[80px_80px_1fr_80px_80px_80px_80px] items-center gap-3 min-w-0">
            <span className="text-sm font-mono font-semibold text-[#e2e2f0] truncate">{trade.asset}</span>
            <Badge variant={isLong ? 'green' : 'red'}>
              {isLong ? '▲ ' : '▼ '}{isLong ? tr.trade.long : tr.trade.short}
            </Badge>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs text-[#55557a] font-mono truncate">{trade.setup}</span>
              {!trade.isPlanBased && <Badge variant="orange">Impulso</Badge>}
              {trade.errorTags.length > 0 && <Badge variant="red">{trade.errorTags[0]}</Badge>}
            </div>
            <span className="text-xs font-mono text-[#8888aa]">{trade.date}</span>
            <span className="text-xs font-mono text-[#8888aa]">{trade.time}</span>
            <span className={clsx('text-xs font-mono', trade.realRR >= 1 ? 'text-[#00d4aa]' : 'text-[#55557a]')}>
              {trade.realRR}R
            </span>
            <PnLValue value={trade.pnl} symbol={sym} />
          </div>

          <div className="flex items-center gap-1 ml-2">
            {trade.screenshots.length > 0 && (
              <span className="text-[#55557a]"><Image size={13} /></span>
            )}
            {expanded ? <ChevronUp size={14} className="text-[#55557a]" /> : <ChevronDown size={14} className="text-[#55557a]" />}
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-[#1e1e2e] p-4 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: tr.trade.entry, val: trade.entryPrice },
                { label: tr.trade.exit,  val: trade.exitPrice  },
                { label: tr.trade.sl,    val: trade.stopLoss   },
                { label: tr.trade.tp,    val: trade.takeProfit },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="text-[10px] text-[#55557a] uppercase mb-1">{label}</div>
                  <div className="font-mono text-sm text-[#e2e2f0]">{val}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-[10px] text-[#55557a] uppercase mb-1">{tr.trade.plannedRR}</div>
                <div className="font-mono text-sm text-[#e2e2f0]">{trade.plannedRR}R</div>
              </div>
              <div>
                <div className="text-[10px] text-[#55557a] uppercase mb-1">{tr.trade.realRR}</div>
                <div className={clsx('font-mono text-sm', trade.realRR >= 1 ? 'text-[#00d4aa]' : 'text-[#55557a]')}>{trade.realRR}R</div>
              </div>
              <div>
                <div className="text-[10px] text-[#55557a] uppercase mb-1">{tr.trade.size}</div>
                <div className="font-mono text-sm text-[#e2e2f0]">{trade.positionSize}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#55557a] uppercase mb-1">{tr.trade.commission}</div>
                <div className="font-mono text-sm text-[#8888aa]">{sym}{trade.commission}</div>
              </div>
            </div>

            {trade.errorTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {trade.errorTags.map(tag => <Badge key={tag} variant="red">{tag}</Badge>)}
              </div>
            )}

            {trade.entryReason && (
              <div className="mb-3">
                <div className="text-[10px] text-[#55557a] uppercase mb-1">{tr.trade.entryReason}</div>
                <p className="text-sm text-[#8888aa] leading-relaxed">{trade.entryReason}</p>
              </div>
            )}
            {trade.postTradeNotes && (
              <div className="mb-3">
                <div className="text-[10px] text-[#55557a] uppercase mb-1">{tr.trade.postNotes}</div>
                <p className="text-sm text-[#8888aa] leading-relaxed">{trade.postTradeNotes}</p>
              </div>
            )}

            {trade.screenshots.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {trade.screenshots.map((src, i) => (
                  <img key={i} src={src} alt="" onClick={() => setLightbox(src)}
                    className="w-28 h-20 object-cover rounded-md cursor-pointer border border-[#2a2a3d] hover:border-[#00d4aa] transition-colors"
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); setEditing(true); }}>
                <Edit2 size={12} />{tr.trade.edit}
              </Button>
              <Button size="sm" variant="danger" onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}>
                <Trash2 size={12} />{tr.trade.delete}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title={tr.trade.edit} size="xl">
        <TradeForm initialData={trade} onSave={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </Modal>

      {/* Confirm delete */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={tr.common.confirm} size="sm">
        <p className="text-sm text-[#8888aa] mb-4">¿Eliminar esta operación?</p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => { deleteTrade(trade.id); setConfirmDelete(false); }}>
            {tr.common.delete}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{tr.common.cancel}</Button>
        </div>
      </Modal>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </>
  );
}
