import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { PageHero, CTABanner } from '../../components/Marketing/primitives';
import { C, fontHead } from '../../components/Marketing/theme';

const BROKERS = [
  { name: 'Tradovate', init: 'TV', color: '#3b82f6' },
  { name: 'TopStep', init: 'TS', color: '#2563eb' },
  { name: 'Apex', init: 'AP', color: '#f59e0b' },
  { name: 'Rithmic', init: 'RT', color: '#eab308' },
  { name: 'NinjaTrader', init: 'NT', color: '#8b5cf6' },
  { name: 'Lucid', init: 'LU', color: '#06b6d4' },
  { name: 'MetaTrader 5', init: 'M5', color: '#ef4444' },
  { name: 'MetaTrader 4', init: 'M4', color: '#dc2626' },
  { name: 'Interactive Brokers', init: 'IB', color: '#3b82f6' },
  { name: 'TradeStation', init: 'TR', color: '#10b981' },
  { name: 'TD Ameritrade', init: 'TD', color: '#22c55e' },
  { name: 'FTMO', init: 'FT', color: '#0ea5e9' },
];

const CSV_TEMPLATE = 'Fecha,Hora,Activo,Dirección,Entrada,Salida,Tamaño,PnL Neto,PnL Bruto,Comisión,R:R Real,Setup,Sesión,Estado emocional,Según plan,Tipo salida,Errores,Razón entrada,Notas post-trade\n2026-06-01,09:30,NQ,LONG,18000,18040,2,76,80,4,1.9,Breakout,new_york,3,Sí,manual,,,';

export default function BrokersLanding() {
  const [waitlist, setWaitlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('trace_broker_waitlist') || '[]'); } catch { return []; }
  });

  const notify = (name: string) => {
    const next = [...new Set([...waitlist, name])];
    setWaitlist(next);
    localStorage.setItem('trace_broker_waitlist', JSON.stringify(next));
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trace_plantilla.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MarketingLayout title="Brokers">
      <PageHero title="Brokers " blue="compatibles." sub="Conecta tu broker favorito y sincroniza tus operaciones automáticamente. (Próximamente — durante el lanzamiento puedes importar tus trades manualmente vía CSV.)" />

      {/* Status banner */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '18px 22px' }}>
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: C.amber, marginBottom: 6 }}>🚧 Integración automática en desarrollo</div>
          <div style={{ fontSize: '0.84rem', color: C.text2, lineHeight: 1.5, marginBottom: 12 }}>
            Las sincronizaciones nativas con brokers estarán disponibles en próximas actualizaciones. Por ahora, importa tus operaciones con un CSV.
          </div>
          <Link to="/register" style={{ fontSize: '0.82rem', color: C.amber, textDecoration: 'none', fontWeight: 600 }}>Notifícame cuando esté listo →</Link>
        </div>
      </div>

      {/* Broker grid */}
      <div style={{ maxWidth: 1000, margin: '40px auto 0', padding: '0 24px' }}>
        <div className="lp-broker-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {BROKERS.map(b => {
            const joined = waitlist.includes(b.name);
            return (
              <div key={b.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: b.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{b.init}</div>
                <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>{b.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  <span style={{ fontSize: 9, color: C.amber }}>Próximamente</span>
                  <span style={{ fontSize: 9, color: C.blue }}>Soportado vía CSV</span>
                </div>
                <button onClick={() => notify(b.name)} disabled={joined} style={{ marginTop: 10, background: 'transparent', border: 'none', color: joined ? C.text3 : C.blue, fontSize: 11, fontWeight: 600, cursor: joined ? 'default' : 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {joined ? '✓ En lista' : 'Notificarme'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSV import section */}
      <div style={{ maxWidth: 760, margin: '60px auto 0', padding: '0 24px' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '32px 28px' }}>
          <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.4rem', color: '#fff', marginBottom: 8 }}>Importa tus trades con CSV</h2>
          <p style={{ fontSize: '0.88rem', color: C.text2, lineHeight: 1.55, marginBottom: 20 }}>
            Mientras conectamos los brokers, puedes traer tu historial de operaciones desde cualquier broker en formato CSV.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
            {[
              'Exporta tu historial desde tu broker',
              'Descarga nuestra plantilla CSV (si lo necesitas)',
              'Sube el archivo en Ajustes → Datos y exportación',
              'TRACE importa todas tus operaciones',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(79,143,255,0.1)', color: C.blue, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: '0.85rem', color: C.text }}>{step}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={downloadTemplate} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: '#fff', borderRadius: 9, padding: '11px 20px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>Descargar plantilla CSV →</button>
            <Link to="/register" style={{ background: C.blue, color: '#fff', borderRadius: 9, padding: '11px 20px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>Empezar gratis →</Link>
          </div>
        </div>
      </div>

      <CTABanner />
      <style>{`@media (max-width: 900px) { .lp-broker-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </MarketingLayout>
  );
}
