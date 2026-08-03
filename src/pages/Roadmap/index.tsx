import { useState } from 'react';
import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { PageHero } from '../../components/Marketing/primitives';
import { C, fontHead } from '../../components/Marketing/theme';
import { AiWaitlistModal } from '../../components/UI/AiWaitlistModal';

const INDIGO = '#7861ff';

const AVAILABLE = [
  'Diario de operaciones con dos modos de entrada',
  'Dashboard con KPIs y TRACE Score',
  'Reportes: 8 categorías de análisis',
  'Progress Tracker con plantillas y rutinas',
  'Trade Replay visual',
  'Notebook con carpetas ilimitadas (Pro)',
  'Prop Firm Hub — tracking multi-cuenta',
  'Simulador Monte Carlo',
  'Heatmap de mejores horarios',
  'Registro multi-cuenta (log una vez, N cuentas)',
  'Ajustes completos, exportación CSV/JSON',
];

const IN_PROGRESS = [
  'Sincronización en la nube (multi-dispositivo)',
  'Pagos y suscripción con Stripe',
  'Emails transaccionales',
  'Aplicación completamente responsive en móvil',
];

const IA_FEATURES: { title: string; desc: string }[] = [
  { title: 'Coach virtual "Pregúntale a TRACE"', desc: 'Chatea con TRACE sobre tu propio journal. "¿En qué sesión gano más?", "¿Qué setup me está fallando?", "Compara este mes con el anterior". Respuestas con datos reales.' },
  { title: 'Auto-review diaria', desc: 'Al cerrar mercado, TRACE genera automáticamente una reflexión de tu día. Qué hiciste bien, qué patrones detectó, comparación con días similares.' },
  { title: 'Insights inteligentes', desc: 'En lugar de reglas hardcodeadas, TRACE IA analiza todo tu contexto para sacar conclusiones no obvias sobre tu rendimiento.' },
  { title: 'Análisis post-trade', desc: 'Justo después de cerrar una operación, mini-review: cumplió tus reglas, cómo se comparó con trades similares, qué mejorar.' },
  { title: 'Reportes semanales narrados', desc: 'Un email cada domingo con un análisis narrado de tu semana, no solo números.' },
  { title: 'Detección de tilt', desc: 'Si TRACE detecta secuencias sospechosas (revenge trading, oversizing, entradas fuera de sesión), te avisa antes de que empeore.' },
];

const BEYOND = [
  'Sincronización nativa con brokers (Tradovate, Rithmic, NinjaTrader)',
  'Aplicación móvil nativa (iOS y Android)',
  'Trade Replay con datos de mercado reales',
  'Idiomas adicionales (inglés)',
  'Copy trading manual asistido entre tus cuentas',
  'Trader OS: gastos, impuestos, negocio completo',
];

function SimpleSection({ label, color, items }: { label: string; color: string; items: string[] }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px 26px' }}>
      <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color, marginBottom: 14 }}>{label}</div>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(it => (
          <li key={it} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.88rem', color: C.text }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 7, flexShrink: 0 }} />{it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Roadmap() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  return (
    <MarketingLayout title="Roadmap">
      <PageHero title="Roadmap de " blue="TRACE." sub="Esto es lo que hemos construido, lo que estamos preparando y lo que viene. Sin fechas prometidas — cuando esté listo, sale." />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SimpleSection label="🟢 Disponible ahora" color={C.blue} items={AVAILABLE} />
        <SimpleSection label="🔵 En desarrollo" color="#3b82f6" items={IN_PROGRESS} />

        {/* TRACE IA */}
        <div id="ia" style={{ scrollMarginTop: 90, background: 'rgba(120,97,255,0.03)', border: '1px solid rgba(120,97,255,0.15)', borderRadius: 14, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.4rem', color: '#fff', margin: 0 }}>🧠 TRACE IA</h2>
            <span style={{ background: 'rgba(120,97,255,0.12)', color: INDIGO, fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 700 }}>Q1</span>
          </div>
          <p style={{ fontSize: '0.92rem', color: C.text2, lineHeight: 1.6, marginBottom: 22, maxWidth: 560 }}>
            Nuestra apuesta más grande post-lanzamiento. Un coach que ha leído cada trade que has hecho.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {IA_FEATURES.map(f => (
              <div key={f.title} style={{ borderLeft: '2px solid rgba(120,97,255,0.3)', paddingLeft: 14 }}>
                <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: '0.85rem', color: C.text2, lineHeight: 1.55 }}>{f.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(120,97,255,0.15)' }}>
            <div style={{ fontSize: '0.85rem', color: C.text2, marginBottom: 14 }}>
              Se incluirá en Plan Pro sin coste extra. Suscriptores actuales la tendrán en cuanto salga.
            </div>
            <button onClick={() => setWaitlistOpen(true)} style={{ background: INDIGO, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
              Únete a la waitlist →
            </button>
          </div>
        </div>

        <SimpleSection label="⚪ Más allá" color={C.text3} items={BEYOND} />
      </div>
      <AiWaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </MarketingLayout>
  );
}
