import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { PageHero, CTABanner, Accordion } from '../../components/Marketing/primitives';
import { C, GRADIENT, fontHead } from '../../components/Marketing/theme';

const FREE_FEATURES: [string, boolean][] = [
  ['Hasta 30 operaciones / mes', true],
  ['Dashboard básico', true],
  ['Diario diario', true],
  ['Notebook (3 carpetas)', true],
  ['Analíticas avanzadas', false],
  ['Conexión con brokers', false],
  ['Color personalizable', false],
  ['Exportación de datos', false],
  ['Prop Firm Hub', false],
  ['Simulador Monte Carlo', false],
];
const PRO_FEATURES: [string, 'yes' | 'soon' | 'ai'][] = [
  ['Operaciones ilimitadas', 'yes'],
  ['Analíticas avanzadas completas', 'yes'],
  ['Conexión con brokers', 'yes'],
  ['Color de acento personalizable', 'yes'],
  ['Múltiples cuentas', 'yes'],
  ['Notebook ilimitado', 'yes'],
  ['Exportación CSV y JSON', 'yes'],
  ['Prop Firm Hub completo', 'yes'],
  ['Simulador Monte Carlo', 'yes'],
  ['Heatmap de mejores horarios', 'yes'],
  ['TRACE IA — incluida cuando salga (Q1)', 'ai'],
  ['Soporte prioritario', 'yes'],
];
const COMPARISON: [string, string, string][] = [
  ['Operaciones', '30 / mes', 'Ilimitadas'],
  ['Analíticas', 'Básicas', 'Completas'],
  ['Brokers', '✗', '✓'],
  ['Color personalizable', '✗', '✓'],
  ['Múltiples cuentas', '✗', '✓'],
  ['Notebook', '3 carpetas', 'Ilimitado'],
  ['Exportación', '✗', 'CSV / JSON'],
  ['Prop Firm Hub', '✗', '✓'],
  ['Simulador Monte Carlo', '✗', '✓'],
  ['Heatmap de horarios', '✗', '✓'],
  ['IA integrada', '✗', 'Próximamente'],
  ['Soporte', 'Estándar', 'Prioritario'],
];
const FAQ = [
  { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí, puedes actualizar a Pro o cancelar tu suscripción en cualquier momento desde tus ajustes.' },
  { q: '¿Qué pasa si cancelo mi plan Pro?', a: 'Mantendrás acceso Pro hasta el final del periodo facturado. Después volverás automáticamente al plan Gratis. Tus datos no se pierden.' },
  { q: '¿Hay periodo de prueba gratis para Pro?', a: 'El plan Gratis es para siempre, sin tarjeta. Cuando estés listo para más, puedes actualizar a Pro.' },
  { q: '¿Cuándo llegará TRACE IA?', a: 'TRACE IA es nuestra prioridad más grande post-lanzamiento. Está planificada para el primer trimestre. Incluirá coach virtual, auto-review diaria y detección de patrones. Se incluirá sin coste extra en el Plan Pro — si te suscribes ahora, la tendrás en cuanto salga.' },
  { q: '¿Cómo se factura el plan anual?', a: 'Se cobra una sola vez al año (€228) al activar la suscripción. Es el equivalente a €19/mes pero con un 34% de descuento.' },
  { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos todas las tarjetas principales (Visa, Mastercard, Amex) y métodos locales europeos a través de Stripe.' },
  { q: '¿Mis datos están seguros?', a: 'Sí. Tus datos se almacenan cifrados, nunca compartimos información con terceros, y puedes exportarlos o eliminarlos cuando quieras.' },
];

export default function Pricing() {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <MarketingLayout title="Precios">
      <PageHero title="Precios " blue="transparentes." sub="Empieza gratis. Actualiza cuando estés listo. Sin sorpresas, sin permanencia." />

      {/* Billing toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', background: C.card2, border: `1px solid ${C.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
          {(['monthly', 'annual'] as const).map(c => {
            const active = cycle === c;
            return (
              <button key={c} onClick={() => setCycle(c)} style={{ background: active ? '#1e1e28' : 'transparent', border: active ? '1px solid #2a2a35' : '1px solid transparent', color: active ? '#fff' : C.text3, borderRadius: 16, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                {c === 'monthly' ? 'Mensual' : 'Anual'}
              </button>
            );
          })}
        </div>
        {cycle === 'annual' && <span style={{ background: 'rgba(79,143,255,0.1)', color: C.blue, fontSize: 11, padding: '3px 9px', borderRadius: 8, fontWeight: 600 }}>Ahorra 34%</span>}
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="lp-pricing-grid">
        {/* FREE */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
          <span style={{ background: 'rgba(255,255,255,0.06)', color: C.text2, fontSize: 12, padding: '4px 12px', borderRadius: 12, fontWeight: 600 }}>Plan Gratis</span>
          <div style={{ margin: '18px 0 4px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.6rem', color: '#fff' }}>€0</span>
            <span style={{ color: C.text3, fontSize: 14 }}>/siempre</span>
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>Para siempre · Sin tarjeta</div>
          <p style={{ fontSize: '0.85rem', color: C.text2, lineHeight: 1.55, marginBottom: 20 }}>
            Para traders que empiezan a registrar sus operaciones y quieren entender sus números básicos.
          </p>
          <Link to="/register" style={{ display: 'block', textAlign: 'center', border: `1px solid ${C.border}`, color: '#fff', borderRadius: 9, padding: '11px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}>Comenzar gratis</Link>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FREE_FEATURES.map(([f, on], i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.84rem', color: on ? C.text : C.text3 }}>
                <span style={{ color: on ? C.blue : C.text4 }}>{on ? '✓' : '✗'}</span>{f}
              </li>
            ))}
          </ul>
        </div>

        {/* PRO */}
        <div style={{ position: 'relative', background: C.card, border: `2px solid ${C.blue}`, borderRadius: 16, padding: 28, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: GRADIENT, opacity: 0.08, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ background: 'rgba(79,143,255,0.15)', color: C.blue, fontSize: 12, padding: '4px 12px', borderRadius: 12, fontWeight: 600 }}>Plan Pro</span>
              <span style={{ background: C.blue, color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 10, fontWeight: 700, letterSpacing: '0.04em' }}>MÁS POPULAR</span>
            </div>
            <div style={{ margin: '18px 0 4px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.6rem', color: '#fff' }}>€{cycle === 'annual' ? 19 : 29}</span>
              <span style={{ color: C.text3, fontSize: 14 }}>/mes</span>
            </div>
            <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>{cycle === 'annual' ? 'Facturado €228/año' : 'Sin compromiso anual'}</div>
            <p style={{ fontSize: '0.85rem', color: C.text2, lineHeight: 1.55, marginBottom: 20 }}>
              Para traders serios que quieren mejorar su consistencia con datos completos y herramientas avanzadas.
            </p>
            <Link to="/register?plan=pro" style={{ display: 'block', textAlign: 'center', background: C.blue, color: '#fff', borderRadius: 9, padding: '11px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}>Actualizar a Pro →</Link>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PRO_FEATURES.map(([f, kind], i) => (
                <li key={i}
                  title={kind === 'ai' ? 'Coach virtual, auto-review diaria, insights inteligentes y más. Se incluirá sin coste extra para todos los planes Pro.' : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.84rem', color: kind === 'ai' ? 'rgba(120,97,255,0.9)' : C.text, cursor: kind === 'ai' ? 'help' : 'default' }}>
                  <span style={{ color: kind === 'soon' ? C.amber : kind === 'ai' ? '#7861ff' : C.blue }}>{kind === 'soon' ? '⏱' : kind === 'ai' ? '🧠' : '✓'}</span>{f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ maxWidth: 900, margin: '50px auto 0', padding: '0 24px' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr style={{ color: C.text3 }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}></th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Gratis</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: C.blue }}>Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([feat, f, p]) => (
                <tr key={feat} style={{ borderTop: `1px solid ${C.borderSub}` }}>
                  <td style={{ padding: '11px 16px', color: C.text2 }}>{feat}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center', color: C.text3 }}>{f}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center', color: C.blue }}>{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 720, margin: '60px auto 0', padding: '0 24px' }}>
        <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.6rem', color: '#fff', textAlign: 'center', marginBottom: 24 }}>Preguntas frecuentes sobre precios</h2>
        <Accordion items={FAQ} />
      </div>

      <CTABanner />
      <style>{`@media (max-width: 760px) { .lp-pricing-grid { grid-template-columns: 1fr !important; } }`}</style>
    </MarketingLayout>
  );
}
