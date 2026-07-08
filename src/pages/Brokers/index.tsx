import { useRef, useState } from 'react';
import { ProLock } from '../../components/UI/ProLock';
import { useToast } from '../../components/UI/ToastProvider';
import { useTradeStore, type NewTradeInput } from '../../store/tradeStore';
import { parseCSV } from '../../utils/export';

const fontHead = "'Syne', sans-serif";
const card: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '18px 20px', position: 'relative',
};
const label: React.CSSProperties = {
  fontSize: '0.62rem', color: '#4a4a60', letterSpacing: '0.08em',
  textTransform: 'uppercase', fontWeight: 600, marginBottom: 10,
};

const BROKERS = [
  { name: 'Tradovate',           init: 'TV', color: '#3b82f6', desc: 'Sincronización en tiempo real' },
  { name: 'TopStep',             init: 'TS', color: '#2563eb', desc: 'Cuentas de evaluación y funded' },
  { name: 'Apex',                init: 'AP', color: '#f59e0b', desc: 'Prop firm de futuros' },
  { name: 'Rithmic',             init: 'RT', color: '#eab308', desc: 'Data feed profesional' },
  { name: 'NinjaTrader',         init: 'NT', color: '#8b5cf6', desc: 'Plataforma de futuros' },
  { name: 'Lucid',               init: 'LU', color: '#06b6d4', desc: 'Prop firm de futuros' },
  { name: 'MetaTrader 5',        init: 'M5', color: '#ef4444', desc: 'Forex y CFDs' },
  { name: 'Interactive Brokers', init: 'IB', color: '#3b82f6', desc: 'Stocks, opciones, futuros' },
];

const CSV_TEMPLATE = 'Fecha,Hora,Activo,Dirección,Entrada,Salida,Tamaño,PnL Neto,PnL Bruto,Comisión,R:R Real,Setup,Sesión,Estado emocional,Según plan,Tipo salida,Errores,Razón entrada,Notas post-trade\n2026-06-01,09:30,NQ,LONG,18000,18040,2,76,80,4,1.9,Breakout,new_york,3,Sí,manual,,,';

export default function Brokers() {
  const { push } = useToast();
  const addTrade = useTradeStore(s => s.addTrade);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<Partial<NewTradeInput>[] | null>(null);
  const [importing, setImporting] = useState(false);

  const notified: string[] = (() => {
    try { return JSON.parse(localStorage.getItem('trace_broker_waitlist') || '[]'); }
    catch { return []; }
  })();
  const [waitlist, setWaitlist] = useState<string[]>(notified);

  const onNotify = (name: string) => {
    const next = [...new Set([...waitlist, name])];
    setWaitlist(next);
    localStorage.setItem('trace_broker_waitlist', JSON.stringify(next));
    push({ kind: 'success', text: 'Te avisaremos cuando esté listo' });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.[0]) return;
    try {
      const rows = await parseCSV(files[0]);
      const valid = rows.filter(r => r.asset && r.entryPrice && r.exitPrice);
      if (valid.length === 0) {
        push({ kind: 'error', text: 'No se encontraron operaciones válidas en el CSV' });
        return;
      }
      setPreview(valid as Partial<NewTradeInput>[]);
    } catch {
      push({ kind: 'error', text: 'Error al leer el archivo CSV' });
    }
  };

  const doImport = () => {
    if (!preview) return;
    setImporting(true);
    let count = 0;
    for (const r of preview) {
      try {
        addTrade({
          date: r.date || new Date().toISOString().slice(0, 10),
          time: r.time || '00:00',
          asset: (r.asset || '').toUpperCase(),
          direction: r.direction === 'short' ? 'short' : 'long',
          entryPrice: r.entryPrice || 0,
          exitPrice: r.exitPrice || 0,
          stopLoss: 0, takeProfit: 0,
          positionSize: r.positionSize || 1,
          commission: r.commission || 0,
          multiplier: 1,
          session: 'new_york',
          setup: r.setup || '',
          emotionalState: 3,
          isPlanBased: false,
          exitType: 'manual',
          errorTags: [],
          entryReason: r.entryReason || '',
          postTradeNotes: r.postTradeNotes || '',
          screenshots: [],
          inputMode: 'calculated',
        });
        count += 1;
      } catch { /* skip bad row */ }
    }
    setImporting(false);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
    push({ kind: 'success', text: `${count} trades importados` });
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trace_plantilla.csv'; a.click();
    URL.revokeObjectURL(url);
    push({ kind: 'success', text: 'Plantilla descargada' });
  };

  return (
    <ProLock feature="Conexión con brokers" description="Sincroniza automáticamente con tu broker favorito">
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Connected */}
        <div style={card}>
          <div style={label}>Tus brokers conectados</div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔌</div>
            <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.92rem', color: '#fff', marginBottom: 4 }}>
              No tienes ningún broker conectado todavía
            </div>
            <div style={{ fontSize: 12, color: '#4a4a60' }}>
              Conecta tu primera cuenta para sincronizar automáticamente tus operaciones.
            </div>
          </div>
        </div>

        {/* Available */}
        <div>
          <div style={label}>Brokers disponibles</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {BROKERS.map(b => {
              const joined = waitlist.includes(b.name);
              return (
                <div key={b.name} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 7,
                      background: b.color, color: '#fff',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>{b.init}</div>
                    <div>
                      <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: '#4a4a60' }}>{b.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                      Próximamente
                    </span>
                    <button
                      onClick={() => onNotify(b.name)}
                      disabled={joined}
                      style={{
                        background: joined ? 'transparent' : 'rgba(79,143,255,0.08)',
                        color: joined ? '#33334a' : 'var(--blue)',
                        border: '1px solid', borderColor: joined ? 'var(--border)' : 'rgba(79,143,255,0.25)',
                        borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                        cursor: joined ? 'default' : 'pointer',
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >{joined ? '✓ En lista' : 'Notificarme'}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual import */}
        <div style={card}>
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.92rem', color: '#fff', marginBottom: 4 }}>
            Importación manual
          </div>
          <div style={{ fontSize: 12, color: '#888898', marginBottom: 14 }}>
            Mientras conectamos los brokers, puedes importar tus operaciones desde un archivo CSV.
          </div>

          {preview ? (
            <div style={{ border: '1px solid rgba(79,143,255,0.25)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#fff', marginBottom: 12 }}>
                Se importarán <b style={{ color: 'var(--blue)' }}>{preview.length}</b> operaciones
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={doImport} disabled={importing} style={{
                  background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 7,
                  padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: importing ? 0.6 : 1,
                }}>{importing ? 'Importando…' : 'Importar'}</button>
                <button onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }} style={{
                  background: 'transparent', border: '1px solid var(--border)', color: '#888898',
                  borderRadius: 7, padding: '8px 16px', fontSize: 13, cursor: 'pointer',
                }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={e => { e.preventDefault(); setIsDragOver(false); onFiles(e.dataTransfer.files); }}
              style={{
                border: `1.5px dashed ${isDragOver ? 'var(--blue)' : 'var(--border)'}`,
                background: isDragOver ? 'rgba(79,143,255,0.04)' : 'transparent',
                borderRadius: 9, padding: 30, textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 22, color: '#33334a', marginBottom: 6 }}>⬆</div>
              <div style={{ fontSize: 13, color: '#888898' }}>Arrastra un archivo CSV aquí</div>
              <div style={{ fontSize: 12, color: '#4a4a60' }}>o <span style={{ color: 'var(--blue)' }}>haz click para buscar</span></div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => onFiles(e.target.files)} />
            </div>
          )}

          <button onClick={downloadTemplate} style={{
            background: 'transparent', border: 'none', color: 'var(--blue)',
            fontSize: 12, cursor: 'pointer', marginTop: 12, padding: 0,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>⬇ Descargar plantilla CSV</button>
        </div>
      </div>
    </ProLock>
  );
}
