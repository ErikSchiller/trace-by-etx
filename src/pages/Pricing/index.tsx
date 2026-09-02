import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { PageHero, CTABanner, Accordion } from '../../components/Marketing/primitives';
import { C, fontHead, fontBody } from '../../components/Marketing/theme';
import { PLANS, getFounderSpotsRemaining } from '../../config/plans';

const INDIGO = '#7861ff';

type Row = { label: string; kind?: 'yes' | 'no' | 'soon' | 'ai' | 'plus' };
const FREE_FEATURES: Row[] = [
  { label: '60 operaciones / mes', kind: 'yes' },
  { label: 'Dashboard básico', kind: 'yes' },
  { label: 'Diario diario', kind: 'yes' },
  { label: 'Notebook (3 carpetas)', kind: 'yes' },
  { label: 'Trade entry básico', kind: 'yes' },
  { label: 'Analíticas avanzadas', kind: 'no' },
  { label: 'Trade Replay', kind: 'no' },
  { label: 'Brokers', kind: 'no' },
  { label: 'Color personalizable', kind: 'no' },
  { label: 'TRACE IA', kind: 'no' },
  { label: 'Simulador', kind: 'no' },
];
const PRO_FEATURES: Row[] = [
  { label: 'Operaciones ilimitadas', kind: 'yes' },
  { label: 'Notebook ilimitado', kind: 'yes' },
  { label: 'Analíticas avanzadas completas', kind: 'yes' },
  { label: 'Progress Tracker completo', kind: 'yes' },
  { label: 'Trade Replay', kind: 'yes' },
  { label: 'Conexión con brokers', kind: 'yes' },
  { label: 'Color personalizable', kind: 'yes' },
  { label: 'Exportación CSV / JSON', kind: 'yes' },
  { label: 'Multi-cuenta en operaciones', kind: 'yes' },
  { label: 'Todos los PnL Cards', kind: 'yes' },
  { label: 'Soporte prioritario', kind: 'yes' },
  { label: 'TRACE IA (próximamente)', kind: 'no' },
  { label: 'Simulador Monte Carlo', kind: 'no' },
  { label: 'Heatmap avanzado', kind: 'no' },
  { label: 'Perfil público', kind: 'no' },
];
const PROAI_FEATURES: Row[] = [
  { label: 'Todo lo de Pro', kind: 'yes' },
  { label: 'PLUS', kind: 'plus' },
  { label: 'TRACE IA (Q1 — sin coste extra)', kind: 'ai' },
  { label: 'Simulador Monte Carlo', kind: 'ai' },
  { label: 'Heatmap de mejores horarios', kind: 'ai' },
  { label: 'Perfil público (trace.gg/tú)', kind: 'ai' },
  { label: 'Acceso anticipado a nuevas funciones', kind: 'ai' },
  { label: 'Análisis multi-firma avanzado', kind: 'ai' },
];

const COMPARISON: [string, string, string, string][] = [
  ['Operaciones', '60 / mes', 'Ilimitadas', 'Ilimitadas'],
  ['Notebook', '3 carpetas', 'Ilimitado', 'Ilimitado'],
  ['Analíticas', 'Básicas', 'Completas', 'Completas'],
  ['Progress Tracker', 'Básico', 'Completo', 'Completo'],
  ['Trade Replay', '✗', '✓', '✓'],
  ['Brokers', '✗', '✓', '✓'],
  ['Color personalizable', '✗', '✓', '✓'],
  ['Exportación', '✗', 'CSV / JSON', 'CSV / JSON'],
  ['Multi-cuenta', '✗', '✓', '✓'],
  ['Todos los PnL Cards', '✗', '✓', '✓'],
  ['Soporte', 'Estándar', 'Prioritario', 'Prioritario'],
  ['TRACE IA', '✗', '✗', '✓ Q1'],
  ['Simulador Monte Carlo', '✗', '✗', '✓'],
  ['Heatmap de horarios', '✗', '✗', '✓'],
  ['Análisis multi-firma', '✗', '✗', '✓'],
  ['Perfil público', '✗', '✗', '✓'],
];

const FAQ = [
  { q: '¿Por qué dos planes Pro?', a: 'Pro te da todas las herramientas de journal y análisis que necesitas día a día. Pro AI añade las funciones inteligentes (IA, simulador Monte Carlo, análisis multi-firma) que están pensadas para traders profesionales que buscan cada ventaja.' },
  { q: '¿Cuándo estará disponible TRACE IA?', a: 'Está prevista para el primer trimestre. Si te suscribes ahora al plan Pro AI, la tendrás incluida sin coste extra cuando lance.' },
  { q: '¿La oferta Fundador es real?', a: 'Sí, y muy limitada. Solo los primeros 100 usuarios pueden acceder. Cuando se agoten las plazas, ya no se puede acceder más — nunca. Es nuestra forma de recompensar a quien confía en TRACE desde el principio.' },
  { q: '¿Puedo cambiar de Pro a Pro AI más tarde?', a: 'Sí, cualquier upgrade se puede hacer en Ajustes → Plan y facturación. Solo pagas la diferencia proporcional al tiempo restante.' },
  { q: '¿Qué pasa si cancelo?', a: 'Mantienes acceso hasta el final del periodo pagado. Tus datos no se pierden — puedes volver al plan gratis en cualquier momento.' },
  { q: '¿Hay reembolso?', a: '14 días naturales de reembolso completo tras la primera compra (derecho de desistimiento UE). El Founder también incluye 14 días.' },
];

function FeatureList({ rows }: { rows: Row[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => {
        if (r.kind === 'plus') return <li key={i} style={{ fontSize: '0.62rem', color: INDIGO, letterSpacing: '0.12em', fontWeight: 700, borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 2 }}>{r.label}</li>;
        const icon = r.kind === 'no' ? '✗' : r.kind === 'soon' ? '⏱' : r.kind === 'ai' ? '✦' : '✓';
        const color = r.kind === 'no' ? C.text4 : r.kind === 'ai' ? INDIGO : C.blue;
        return (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.84rem', color: r.kind === 'no' ? C.text3 : r.kind === 'ai' ? 'rgba(120,97,255,0.95)' : C.text }}>
            <span style={{ color, flexShrink: 0 }}>{icon}</span>{r.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function Pricing() {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');
  const spots = getFounderSpotsRemaining();
  const spotsPct = Math.max(0, Math.min(100, (spots / (PLANS.founder.limit ?? 100)) * 100));
  const proAiAnnual = PLANS.pro_ai.yearlyTotal ?? 199;
  const founderSavings3y = proAiAnnual * 3 - (PLANS.founder.lifetimePrice ?? 249);
  const pro = PLANS.pro, proAi = PLANS.pro_ai;
  const priceOf = (p: typeof pro) => cycle === 'annual' ? p.yearlyPrice : p.monthlyPrice;
  const billLine = (p: typeof pro) => cycle === 'annual' ? `Facturado €${p.yearlyTotal}/año` : 'Sin permanencia';

  return (
    <MarketingLayout title="Precios">
      <PageHero title="Precios " blue="honestos." sub="Empieza gratis. Actualiza cuando estés listo. Sin sorpresas." />

      {/* FOUNDER BANNER */}
      {spots > 0 ? (
        <div style={{ maxWidth: 1080, margin: '0 auto 32px', padding: '0 24px' }}>
          <div style={{ background: `linear-gradient(135deg, rgba(120,97,255,0.15), rgba(79,143,255,0.1))`, border: `1px solid rgba(120,97,255,0.3)`, borderRadius: 14, padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }} className="lp-founder-banner">
            <div style={{ flex: 1, minWidth: 280 }}>
              <span style={{ background: 'rgba(120,97,255,0.18)', color: INDIGO, fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 700, letterSpacing: '0.04em' }}>🏆 OFERTA FUNDADOR</span>
              <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.4rem', color: '#fff', margin: '12px 0 6px' }}>€249 pago único. TRACE Pro AI para siempre.</div>
              <div style={{ fontSize: '0.85rem', color: C.text2, lineHeight: 1.55, maxWidth: 520 }}>Solo para los primeros 100 usuarios. Nunca vuelves a pagar. Acceso directo a Erik en Discord.</div>
              <div style={{ marginTop: 14, maxWidth: 360 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: C.text2, marginBottom: 5 }}>
                  <span>Quedan <b style={{ color: '#fff' }}>{spots}</b> plazas de 100</span>
                  <span>{100 - spots} reclamadas</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${100 - spotsPct}%`, height: '100%', background: spots < 20 ? C.red : spots < 50 ? C.amber : INDIGO, borderRadius: 3 }} />
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Link to="/register?plan=founder" style={{ display: 'inline-block', background: INDIGO, color: '#fff', borderRadius: 10, padding: '13px 28px', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none' }}>Ser fundador →</Link>
              <div style={{ fontSize: '0.7rem', color: C.text2, marginTop: 8 }}>Ahorra €{founderSavings3y} vs Pro AI anual (3 años)</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 1080, margin: '0 auto 32px', padding: '0 24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 24px', textAlign: 'center', color: C.text3 }}>
            🏆 La oferta Fundador está <b style={{ color: C.text2 }}>agotada</b>. Gracias a los primeros 100 traders que confiaron en TRACE.
          </div>
        </div>
      )}

      {/* BILLING TOGGLE */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', background: C.card2, border: `1px solid ${C.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
          {(['monthly', 'annual'] as const).map(c => {
            const active = cycle === c;
            return (
              <button key={c} onClick={() => setCycle(c)} style={{ background: active ? '#1e1e28' : 'transparent', border: active ? '1px solid #2a2a35' : '1px solid transparent', color: active ? '#fff' : C.text3, borderRadius: 16, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>
                {c === 'monthly' ? 'Mensual' : 'Anual'}
              </button>
            );
          })}
        </div>
        {cycle === 'annual' && <span style={{ background: 'rgba(79,143,255,0.1)', color: C.blue, fontSize: 11, padding: '3px 9px', borderRadius: 8, fontWeight: 600 }}>Ahorra 34%</span>}
      </div>

      {/* THREE PLAN CARDS */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }} className="lp-pricing-grid">
        {/* FREE */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 26 }}>
          <span style={{ background: 'rgba(255,255,255,0.06)', color: C.text2, fontSize: 12, padding: '4px 12px', borderRadius: 12, fontWeight: 600 }}>Gratis</span>
          <div style={{ margin: '18px 0 4px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.4rem', color: '#fff' }}>€0</span>
            <span style={{ color: C.text3, fontSize: 14 }}>/siempre</span>
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 14 }}>Para empezar sin compromiso</div>
          <p style={{ fontSize: '0.82rem', color: C.text2, lineHeight: 1.55, marginBottom: 18, minHeight: 54 }}>Perfecto para traders que quieren registrar sus primeras operaciones.</p>
          <Link to="/register" style={{ display: 'block', textAlign: 'center', border: `1px solid ${C.border}`, color: '#fff', borderRadius: 9, padding: '11px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}>Empezar gratis</Link>
          <FeatureList rows={FREE_FEATURES} />
        </div>

        {/* PRO */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 26 }}>
          <span style={{ background: 'rgba(79,143,255,0.15)', color: C.blue, fontSize: 12, padding: '4px 12px', borderRadius: 12, fontWeight: 600 }}>Pro</span>
          <div style={{ margin: '18px 0 4px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.4rem', color: '#fff' }}>€{priceOf(pro)}</span>
            <span style={{ color: C.text3, fontSize: 14 }}>/mes</span>
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 14 }}>{billLine(pro)}</div>
          <p style={{ fontSize: '0.82rem', color: C.text2, lineHeight: 1.55, marginBottom: 18, minHeight: 54 }}>Todo lo que necesitas para llevar un journal profesional día a día.</p>
          <Link to="/register?plan=pro" style={{ display: 'block', textAlign: 'center', background: C.blue, color: '#fff', borderRadius: 9, padding: '11px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}>Empezar con Pro</Link>
          <FeatureList rows={PRO_FEATURES} />
        </div>

        {/* PRO AI */}
        <div style={{ position: 'relative', background: C.card, border: `2px solid ${INDIGO}`, borderRadius: 16, padding: 26, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, rgba(120,97,255,0.1), transparent 60%)`, pointerEvents: 'none' }} />
          <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: INDIGO, color: '#fff', fontSize: 10, padding: '3px 14px', borderRadius: '0 0 8px 8px', fontWeight: 700, letterSpacing: '0.06em' }}>MÁS POPULAR</span>
          <div style={{ position: 'relative', paddingTop: 8 }}>
            <span style={{ background: 'rgba(120,97,255,0.18)', color: INDIGO, fontSize: 12, padding: '4px 12px', borderRadius: 12, fontWeight: 600 }}>Pro AI</span>
            <div style={{ margin: '18px 0 4px', display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2.4rem', color: '#fff' }}>€{priceOf(proAi)}</span>
              <span style={{ color: C.text3, fontSize: 14 }}>/mes</span>
            </div>
            <div style={{ fontSize: 12, color: C.text3, marginBottom: 14 }}>{billLine(proAi)}</div>
            <p style={{ fontSize: '0.82rem', color: C.text2, lineHeight: 1.55, marginBottom: 18, minHeight: 54 }}>Para traders profesionales que quieren cada ventaja: IA, análisis avanzado y perfil público.</p>
            <Link to="/register?plan=pro_ai" style={{ display: 'block', textAlign: 'center', background: INDIGO, color: '#fff', borderRadius: 9, padding: '11px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}>Empezar con Pro AI</Link>
            <FeatureList rows={PROAI_FEATURES} />
          </div>
        </div>
      </div>

      {/* COMPARISON TABLE */}
      <div style={{ maxWidth: 1080, margin: '50px auto 0', padding: '0 24px' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'auto' }}>
          <table style={{ width: '100%', minWidth: 620, fontSize: '0.84rem', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr style={{ color: C.text3 }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}></th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Gratis</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: C.blue }}>Pro</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: INDIGO }}>Pro AI</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([feat, f, p, pa]) => (
                <tr key={feat} style={{ borderTop: `1px solid ${C.borderSub}` }}>
                  <td style={{ padding: '11px 16px', color: C.text2 }}>{feat}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center', color: C.text3 }}>{f}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center', color: C.blue }}>{p}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center', color: INDIGO }}>{pa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOUNDER SECTION (detailed) */}
      <div id="founder" style={{ maxWidth: 1080, margin: '60px auto 0', padding: '0 24px', scrollMarginTop: 90 }}>
        <div style={{ background: `linear-gradient(135deg, rgba(120,97,255,0.15), rgba(79,143,255,0.08))`, border: `1px solid rgba(120,97,255,0.3)`, borderRadius: 16, padding: '36px 40px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 32, alignItems: 'center' }} className="lp-founder-detail">
          <div>
            <span style={{ background: 'rgba(120,97,255,0.18)', color: INDIGO, fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 700, letterSpacing: '0.04em' }}>🏆 OFERTA FUNDADOR</span>
            <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '2rem', color: '#fff', margin: '14px 0 12px', lineHeight: 1.15 }}>Sé de los primeros. Paga una vez. Úsalo para siempre.</h2>
            <p style={{ fontSize: '0.9rem', color: C.text2, lineHeight: 1.6, marginBottom: 16 }}>TRACE es un producto joven, hecho por un trader como tú. Los primeros 100 usuarios que confíen recibirán:</p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Acceso Pro AI de por vida (nunca vuelves a pagar)', "Badge 'Fundador' en tu perfil público", 'Canal privado en Discord con Erik', 'Voto en el roadmap de nuevas funciones', 'Precio congelado — sin subidas nunca'].map((b, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.88rem', color: C.text }}>
                  <span style={{ color: INDIGO, flexShrink: 0 }}>✦</span>{b}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: C.card, border: `1px solid rgba(120,97,255,0.3)`, borderRadius: 14, padding: 28, textAlign: 'center' }}>
            <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '4rem', color: INDIGO, lineHeight: 1 }}>€249</div>
            <div style={{ fontSize: '0.85rem', color: C.text2, marginTop: 4 }}>una sola vez</div>
            <div style={{ fontSize: '0.78rem', color: C.text3, margin: '10px 0 18px' }}>Ahorras €{founderSavings3y} vs anual Pro AI en 3 años</div>
            {spots > 0 ? (
              <Link to="/register?plan=founder" style={{ display: 'block', background: INDIGO, color: '#fff', borderRadius: 10, padding: '13px', fontSize: '0.95rem', fontWeight: 700, textDecoration: 'none' }}>Ser fundador →</Link>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.04)', color: C.text3, borderRadius: 10, padding: '13px', fontSize: '0.9rem', fontWeight: 600 }}>Plazas agotadas</div>
            )}
            <div style={{ display: 'inline-block', marginTop: 12, background: 'rgba(120,97,255,0.12)', color: INDIGO, fontSize: '0.72rem', padding: '4px 12px', borderRadius: 12, fontWeight: 600 }}>Quedan {spots}/100 plazas</div>
          </div>
        </div>
      </div>

      {/* PRICING FAQ */}
      <div style={{ maxWidth: 720, margin: '60px auto 0', padding: '0 24px' }}>
        <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.6rem', color: '#fff', textAlign: 'center', marginBottom: 24 }}>Preguntas frecuentes sobre precios</h2>
        <Accordion items={FAQ} />
      </div>

      <CTABanner />
      <style>{`@media (max-width: 900px) { .lp-pricing-grid { grid-template-columns: 1fr !important; } .lp-founder-detail { grid-template-columns: 1fr !important; } }`}</style>
    </MarketingLayout>
  );
}
