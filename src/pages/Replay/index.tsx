import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserTrades, type Trade } from '../../store/tradeStore';
import { ProLock } from '../../components/UI/ProLock';
import { Watermark } from '../../components/UI/Watermark';

const fontHead = "'Syne', sans-serif";
const card: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '16px 18px', position: 'relative',
};

const SESSION_LABEL: Record<string, string> = {
  london: 'Londres', new_york: 'Nueva York', asia: 'Asia', premarket: 'Pre-market',
};
const EXIT_LABEL: Record<string, string> = { sl_hit: 'SL tocado', tp_hit: 'TP tocado', manual: 'Manual' };
const EMOJIS: Record<number, string> = { 1: '😌', 2: '🙂', 3: '😐', 4: '😟', 5: '😰' };

function fmt(n: number) {
  return `${n >= 0 ? '+' : '-'}€${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/* Deterministic pseudo-random from a string seed */
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(48271, h) + 1) % 2147483647;
    return (h & 0x7fffffff) / 2147483647;
  };
}

/* Mock candle chart representing the trade visually */
function CandleChart({ trade }: { trade: Trade }) {
  const W = 640, H = 280, N = 24;
  const rand = seededRandom(trade.id);
  const isLong = trade.direction === 'long';
  const entry = trade.entryPrice, exit = trade.exitPrice;
  const lo = Math.min(entry, exit), hi = Math.max(entry, exit);
  const pad = Math.max((hi - lo) * 0.6, Math.abs(entry) * 0.002 || 1);
  const min = lo - pad, max = hi + pad;
  const y = (p: number) => H - 30 - ((p - min) / (max - min)) * (H - 60);

  // Generate candles: drift from entry-ish to exit-ish
  const entryIdx = 6, exitIdx = 18;
  const candles: { o: number; c: number; h: number; l: number }[] = [];
  let price = entry + (rand() - 0.5) * pad * 0.8;
  for (let i = 0; i < N; i++) {
    let target = price;
    if (i < entryIdx) target = entry + (rand() - 0.5) * pad * 0.5;
    else if (i <= exitIdx) {
      const prog = (i - entryIdx) / (exitIdx - entryIdx);
      target = entry + (exit - entry) * prog + (rand() - 0.5) * pad * 0.35;
    } else target = exit + (rand() - 0.5) * pad * 0.4;
    const o = price;
    const c = target;
    const wick = pad * 0.18;
    candles.push({ o, c, h: Math.max(o, c) + rand() * wick, l: Math.min(o, c) - rand() * wick });
    price = c;
  }

  const cw = (W - 60) / N;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* grid */}
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1={0} x2={W} y1={30 + p * (H - 60)} y2={30 + p * (H - 60)} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 5" />
      ))}
      {/* candles */}
      {candles.map((c, i) => {
        const x = 30 + i * cw + cw / 2;
        const up = c.c >= c.o;
        const color = up ? '#4f8fff' : '#ef4444';
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} />
            <rect
              x={x - cw * 0.3} width={cw * 0.6}
              y={y(Math.max(c.o, c.c))} height={Math.max(2, Math.abs(y(c.o) - y(c.c)))}
              fill={color} rx={1}
            />
          </g>
        );
      })}
      {/* entry line */}
      <line x1={0} x2={W} y1={y(entry)} y2={y(entry)} stroke="#4f8fff" strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
      <circle cx={30 + entryIdx * cw + cw / 2} cy={y(entry)} r={4} fill="#4f8fff" />
      <text x={W - 6} y={y(entry) - 5} textAnchor="end" fontSize={10} fill="#4f8fff" fontFamily="Space Grotesk">
        Entrada €{entry.toLocaleString('en-US')}
      </text>
      {/* exit line */}
      <line x1={0} x2={W} y1={y(exit)} y2={y(exit)} stroke={trade.pnl >= 0 ? '#4f8fff' : '#ef4444'} strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
      <circle cx={30 + exitIdx * cw + cw / 2} cy={y(exit)} r={4} fill={trade.pnl >= 0 ? '#4f8fff' : '#ef4444'} />
      <text x={W - 6} y={y(exit) - 5} textAnchor="end" fontSize={10} fill={trade.pnl >= 0 ? '#4f8fff' : '#ef4444'} fontFamily="Space Grotesk">
        Salida €{exit.toLocaleString('en-US')}
      </text>
      {/* SL if set */}
      {trade.stopLoss > 0 && trade.stopLoss > min && trade.stopLoss < max && (
        <>
          <line x1={0} x2={W} y1={y(trade.stopLoss)} y2={y(trade.stopLoss)} stroke="#ef4444" strokeWidth={1} strokeDasharray="2 4" opacity={0.5} />
          <text x={6} y={y(trade.stopLoss) - 4} fontSize={9} fill="#ef4444" fontFamily="Space Grotesk">SL €{trade.stopLoss}</text>
        </>
      )}
      {/* direction marker */}
      <text x={6} y={20} fontSize={10} fill={isLong ? '#4f8fff' : '#ef4444'} fontFamily="Syne" fontWeight={700}>
        {isLong ? '▲ LONG' : '▼ SHORT'}
      </text>
    </svg>
  );
}

export default function Replay() {
  const trades = useUserTrades();
  const [searchParams] = useSearchParams();
  const preselect = searchParams.get('trade');

  const [selectedId, setSelectedId] = useState<string | null>(preselect);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'datos' | 'notas' | 'capturas'>('datos');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = trades;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(t => t.asset.includes(q));
    }
    return list;
  }, [trades, search]);

  const selected = trades.find(t => t.id === selectedId) ?? null;
  const idx = selected ? filtered.findIndex(t => t.id === selected.id) : -1;

  const go = (delta: number) => {
    const next = filtered[idx + delta];
    if (next) { setSelectedId(next.id); setTab('datos'); }
  };

  return (
    <ProLock feature="Trade Replay" description="Revive y analiza cada operación visualmente">
      <div style={{ display: 'flex', minHeight: '100%' }}>
        {/* LEFT — trade list */}
        <div style={{
          width: 260, flexShrink: 0, background: 'var(--bg2)',
          borderRight: '1px solid var(--border)', padding: 12,
          display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto',
        }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar activo…"
            style={{ width: '100%' }}
          />
          {filtered.length === 0 ? (
            <div style={{ fontSize: 12, color: '#33334a', textAlign: 'center', padding: 20 }}>
              Sin operaciones
            </div>
          ) : filtered.map(t => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id} onClick={() => { setSelectedId(t.id); setTab('datos'); }}
                style={{
                  textAlign: 'left', background: active ? 'rgba(79,143,255,0.06)' : 'var(--card)',
                  border: '1px solid', borderColor: active ? 'var(--blue)' : 'var(--border)',
                  borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <div style={{ fontSize: 10, color: '#4a4a60' }}>{t.date} · {t.time}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                  <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{t.asset}</span>
                  <span style={{
                    fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 700,
                    background: t.direction === 'long' ? 'rgba(79,143,255,0.1)' : 'rgba(239,68,68,0.1)',
                    color: t.direction === 'long' ? 'var(--blue)' : 'var(--red)',
                  }}>{t.direction.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.pnl >= 0 ? 'var(--blue)' : 'var(--red)' }}>{fmt(t.pnl)}</span>
                  {t.setup && <span style={{ fontSize: 9, color: 'var(--blue)', background: 'rgba(79,143,255,0.06)', border: '1px solid rgba(79,143,255,0.15)', padding: '1px 7px', borderRadius: 10 }}>{t.setup}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT — viewer */}
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!selected ? (
            <div style={{ ...card, padding: 60, textAlign: 'center', marginTop: 40 }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>▶</div>
              <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 6 }}>
                Selecciona una operación para reproducirla
              </div>
              <div style={{ fontSize: 13, color: '#4a4a60' }}>
                Elige un trade de la lista para ver su replay visual.
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.4rem', color: '#fff' }}>{selected.asset}</span>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 5, fontWeight: 700,
                  background: selected.direction === 'long' ? 'rgba(79,143,255,0.1)' : 'rgba(239,68,68,0.1)',
                  color: selected.direction === 'long' ? 'var(--blue)' : 'var(--red)',
                }}>{selected.direction.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: '#4a4a60' }}>{selected.date} · {selected.time}</span>
                <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.1rem', color: selected.pnl >= 0 ? 'var(--blue)' : 'var(--red)' }}>
                  {fmt(selected.pnl)}
                </span>
                <span style={{ fontSize: 12, color: '#888898' }}>R:R {selected.realRR.toFixed(2)}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button onClick={() => go(1)} disabled={idx >= filtered.length - 1} style={navBtn(idx >= filtered.length - 1)}>← Anterior</button>
                  <button onClick={() => go(-1)} disabled={idx <= 0} style={navBtn(idx <= 0)}>Siguiente →</button>
                </div>
              </div>

              {/* Chart */}
              <div style={card}>
                {selected.inputMode === 'direct' ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: 26, marginBottom: 10 }}>⚡</div>
                    <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 6 }}>
                      Operación en modo PnL directo
                    </div>
                    <div style={{ fontSize: 13, color: '#4a4a60', marginBottom: 14 }}>
                      No hay precios de entrada/salida para reconstruir el gráfico.
                    </div>
                    <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2rem', color: selected.pnl >= 0 ? 'var(--blue)' : 'var(--red)' }}>
                      {fmt(selected.pnl)}
                    </div>
                  </div>
                ) : (
                  <>
                    <CandleChart trade={selected} />
                    {/* Timeline */}
                    <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { t: selected.time, txt: `Entrada en €${selected.entryPrice.toLocaleString('en-US')}`, c: 'var(--blue)' },
                        { t: '—', txt: `PnL flotante: ${fmt(selected.grossPnl)}`, c: '#888898' },
                        { t: '—', txt: `Salida en €${selected.exitPrice.toLocaleString('en-US')} (${EXIT_LABEL[selected.exitType]})`, c: selected.pnl >= 0 ? 'var(--blue)' : 'var(--red)' },
                      ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                          <span style={{ color: '#33334a', width: 44 }}>{r.t}</span>
                          <span style={{ color: r.c }}>{r.txt}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <Watermark />
              </div>

              {/* Detail tabs */}
              <div style={card}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  {([['datos', 'Datos'], ['notas', 'Notas'], ['capturas', 'Capturas']] as const).map(([id, l]) => (
                    <button key={id} onClick={() => setTab(id)} style={{
                      background: tab === id ? 'rgba(79,143,255,0.1)' : 'transparent',
                      color: tab === id ? 'var(--blue)' : '#4a4a60',
                      border: 'none', borderRadius: 6, padding: '5px 14px',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>{l}</button>
                  ))}
                </div>

                {tab === 'datos' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      ['Setup', selected.setup || '—'],
                      ['Sesión', SESSION_LABEL[selected.session]],
                      ['Estado emocional', EMOJIS[selected.emotionalState]],
                      ['Según plan', selected.isPlanBased ? 'Sí' : 'No'],
                      ['Tipo salida', EXIT_LABEL[selected.exitType]],
                      ['Comisión', `€${selected.commission.toFixed(2)}`],
                      ['R:R real', selected.realRR.toFixed(2)],
                      ['Tamaño', String(selected.positionSize)],
                    ].map(([l, v]) => (
                      <div key={l} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ fontSize: 9, color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
                        <div style={{ fontSize: 13, color: '#fff', marginTop: 3 }}>{v}</div>
                      </div>
                    ))}
                    {selected.errorTags.length > 0 && (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {selected.errorTags.map(tag => (
                          <span key={tag} style={{ background: 'rgba(239,68,68,0.07)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '3px 10px', fontSize: 11 }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'notas' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Razón de entrada</div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: 12, fontSize: 13, color: selected.entryReason ? '#e0e0e8' : '#33334a' }}>
                        {selected.entryReason || 'Sin razón registrada'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: '#4a4a60', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Notas post-trade</div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 6, padding: 12, fontSize: 13, color: selected.postTradeNotes ? '#e0e0e8' : '#33334a' }}>
                        {selected.postTradeNotes || 'Sin notas'}
                      </div>
                    </div>
                  </div>
                )}

                {tab === 'capturas' && (
                  selected.screenshots.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#33334a', padding: 16, textAlign: 'center' }}>Sin capturas para este trade</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {selected.screenshots.map((src, i) => (
                        <img key={i} src={src} alt="" onClick={() => setLightbox(src)}
                          style={{ width: 160, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
                      ))}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>

        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{
            position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
          }}>
            <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
          </div>
        )}
      </div>
    </ProLock>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    background: 'transparent', border: '1px solid var(--border)',
    color: disabled ? '#33334a' : '#888898',
    borderRadius: 6, padding: '5px 12px', fontSize: 12,
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: "'Space Grotesk', sans-serif",
  };
}
