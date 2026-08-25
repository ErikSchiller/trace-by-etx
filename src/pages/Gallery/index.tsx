import { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUserTrades, type Trade } from '../../store/tradeStore';
import { useUserAccounts } from '../../store/propFirmStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ProLock } from '../../components/UI/ProLock';
import { TradeDetailModal } from '../../components/Modals/TradeDetailModal';
import { PnLCard, defaultOpts, type VariantId, type CardFormat } from '../../components/PnLCard';
import { buildCardData } from '../../components/PnLCard/buildCardData';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";

type FilterKey = 'all' | 'win' | 'loss';

export default function Gallery() {
  const user = useAuthStore(s => s.user);
  const trades = useUserTrades();
  const accounts = useUserAccounts();
  const sym = useSettingsStore(s => s.currencySymbol);
  const accountSize = useSettingsStore(s => s.accountSize);
  const cardHandle = useSettingsStore(s => s.cardHandle);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [detail, setDetail] = useState<Trade | null>(null);

  const cards = user?.generatedCards ?? [];
  const tradeById = useMemo(() => new Map(trades.map(t => [t.id, t])), [trades]);

  const items = useMemo(() => {
    return cards
      .map(c => ({ meta: c, trade: tradeById.get(c.tradeId) }))
      .filter((x): x is { meta: typeof cards[number]; trade: Trade } => !!x.trade)
      .filter(x => filter === 'all' || (filter === 'win' ? x.trade.pnl > 0 : x.trade.pnl < 0));
  }, [cards, tradeById, filter]);

  const reopen = (tradeId: string, variant: string, format: string) => {
    window.dispatchEvent(new CustomEvent('trace:open-pnl-card', { detail: { tradeId, variant, format } }));
  };

  return (
    <ProLock feature="Galería de PnL Cards" description="Todas tus cards generadas, listas para volver a compartir">
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.3rem', color: '#fff', margin: 0 }}>Galería</h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{cards.length} card{cards.length === 1 ? '' : 's'} generada{cards.length === 1 ? '' : 's'}</div>
          </div>
          <div style={{ display: 'inline-flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 3, gap: 2 }}>
            {([['all', 'Todos'], ['win', 'Winners'], ['loss', 'Losers']] as [FilterKey, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{ padding: '5px 14px', borderRadius: 14, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, border: 'none', background: filter === k ? 'rgba(79,143,255,0.12)' : 'transparent', color: filter === k ? 'var(--blue)' : 'var(--text-muted)' }}>{l}</button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🖼️</div>
            <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginBottom: 6 }}>
              {cards.length === 0 ? 'Aún no has generado ninguna PnL Card' : 'Sin cards para este filtro'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 16px' }}>Añade una operación y compártela — cada card que descargues aparecerá aquí para volver a compartirla.</div>
            <button onClick={() => window.dispatchEvent(new CustomEvent('trace:open-add-trade'))} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>＋ Añadir operación</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
            {items.map(({ meta, trade }) => {
              const format = (meta.format as CardFormat) || 'vertical';
              const variant = (meta.variant as VariantId) || 'clasico';
              const data = buildCardData(trade, { accounts, currencySymbol: sym, accountSize, handleRaw: cardHandle || user?.name || '' });
              const thumbW = 150;
              const scale = thumbW / 1080;
              const thumbH = (format === 'vertical' ? 1920 : 1080) * scale;
              return (
                <div key={meta.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    onClick={() => reopen(trade.id, variant, format)}
                    title="Volver a descargar / compartir"
                    style={{ width: thumbW, height: thumbH, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer', background: '#0a0a0c' }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                      <PnLCard data={data} opts={defaultOpts({ variant, format })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem' }}>
                    <span style={{ color: trade.pnl >= 0 ? 'var(--blue)' : 'var(--red)', fontWeight: 600 }}>{trade.asset} {trade.pnl >= 0 ? '+' : ''}{sym}{Math.abs(Math.round(trade.pnl)).toLocaleString('en-US')}</span>
                    <span onClick={() => setDetail(trade)} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>Ver trade →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TradeDetailModal trade={detail} onClose={() => setDetail(null)} />
    </ProLock>
  );
}
