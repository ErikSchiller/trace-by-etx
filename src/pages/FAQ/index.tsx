import { useMemo, useState } from 'react';
import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { PageHero, Accordion } from '../../components/Marketing/primitives';
import { C, fontHead } from '../../components/Marketing/theme';

const CATEGORIES: { id: string; label: string; qa: { q: string; a: string }[] }[] = [
  {
    id: 'general', label: 'General',
    qa: [
      { q: '¿Qué es TRACE?', a: 'TRACE es el journal de trading más completo en español. Te ayuda a registrar tus operaciones, analizar patrones y mejorar como trader.' },
      { q: '¿Para quién es TRACE?', a: 'Para traders intradía de futuros, acciones, forex y cripto que quieran llevar un registro serio de sus operaciones.' },
      { q: '¿En qué se diferencia de TradeZella o Edgewonk?', a: 'TRACE está hecho 100% en español, tiene un sistema único de TRACE Score, y está diseñado por un trader que opera prop firms a diario.' },
      { q: '¿Qué es TRACE IA?', a: 'TRACE IA es un conjunto de funcionalidades inteligentes que analizan tu journal para darte insights personalizados. Incluye un coach virtual con el que puedes chatear sobre tu propio historial, auto-review diaria de tu sesión, detección de patrones de comportamiento, y reportes semanales narrados.' },
      { q: '¿Cuándo llegará TRACE IA?', a: 'Está planificada para el primer trimestre. Cuando esté lista, todos los suscriptores Pro la tendrán incluida sin coste extra. No prometemos fechas exactas — cuando esté lista para dar valor real, sale.' },
      { q: '¿TRACE IA me va a dar señales o predicciones de mercado?', a: 'No. TRACE IA analiza TUS trades y patrones — no predice el mercado ni da señales de compra/venta. Somos un journal inteligente, no una casa de señales.' },
      { q: '¿Mis datos se comparten con proveedores de IA?', a: 'Cuando uses TRACE IA, las consultas se procesan a través de APIs de modelos de lenguaje (probablemente Anthropic o OpenAI). Solo se envían los datos necesarios para la consulta específica — nunca todo tu historial de golpe. Ninguna otra parte accede a tus operaciones, y los proveedores no entrenan con tus datos.' },
    ],
  },
  {
    id: 'funciones', label: 'Funciones',
    qa: [
      { q: '¿Cómo registro mi primera operación?', a: 'Pulsa "＋ Añadir operación" en la barra lateral, introduce el activo, dirección y precios, y TRACE calcula el resto automáticamente.' },
      { q: '¿Qué es el TRACE Score?', a: 'Es una puntuación 0-100 que combina win rate, profit factor, recovery factor y consistencia para resumir tu nivel como trader.' },
      { q: '¿Puedo importar trades antiguos?', a: 'Sí, desde Ajustes → Datos y exportación puedes importar un CSV con tu historial de operaciones.' },
      { q: '¿Cómo funciona el Progress Tracker?', a: 'Marca tu checklist diario, mantén tu racha de hábitos y define objetivos. Un heatmap anual te muestra tu consistencia real.' },
    ],
  },
  {
    id: 'pagos', label: 'Pagos y planes',
    qa: [
      { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí, puedes actualizar a Pro o cancelar tu suscripción en cualquier momento desde tus ajustes.' },
      { q: '¿Qué pasa si cancelo mi plan Pro?', a: 'Mantendrás acceso Pro hasta el final del periodo facturado. Después volverás automáticamente al plan Gratis. Tus datos no se pierden.' },
      { q: '¿Hay periodo de prueba gratis para Pro?', a: 'El plan Gratis es para siempre, sin tarjeta. Cuando estés listo para más, puedes actualizar a Pro.' },
      { q: '¿Cómo se factura el plan anual?', a: 'Se cobra una sola vez al año (€228) al activar la suscripción. Equivale a €19/mes con un 34% de descuento.' },
    ],
  },
  {
    id: 'datos', label: 'Datos y privacidad',
    qa: [
      { q: '¿Dónde se guardan mis datos?', a: 'Tus datos se almacenan cifrados en servidores en la Unión Europea (Frankfurt). Cumplimos con el RGPD.' },
      { q: '¿Pueden ver mis trades otros usuarios?', a: 'No. Tus datos son privados y solo accesibles para ti.' },
      { q: '¿Puedo eliminar mi cuenta?', a: 'Sí, en cualquier momento desde Ajustes → Datos y exportación.' },
    ],
  },
  {
    id: 'soporte', label: 'Soporte técnico',
    qa: [
      { q: '¿Cómo contacto con soporte?', a: 'Escríbenos a soporte@traceetx.com — respondemos en 24h laborables (prioritario para Pro).' },
      { q: '¿Tienen app móvil?', a: 'Por ahora TRACE funciona en navegador (móvil y desktop). La app nativa está en desarrollo.' },
    ],
  },
];

export default function FAQ() {
  const [active, setActive] = useState('general');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return CATEGORIES
        .map(c => ({ ...c, qa: c.qa.filter(x => x.q.toLowerCase().includes(q) || x.a.toLowerCase().includes(q)) }))
        .filter(c => c.qa.length > 0);
    }
    return CATEGORIES.filter(c => c.id === active);
  }, [search, active]);

  return (
    <MarketingLayout title="Preguntas frecuentes">
      <PageHero title="Preguntas " blue="frecuentes." sub="Todo lo que necesitas saber sobre TRACE." />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px 20px' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar preguntas…"
          style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', fontSize: '0.88rem', color: C.text, outline: 'none', fontFamily: "'Space Grotesk', sans-serif", marginBottom: 24 }}
        />
        <div className="lp-faq-grid" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 28 }}>
          {!search.trim() && (
            <nav style={{ alignSelf: 'start', position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setActive(c.id)} style={{
                  textAlign: 'left', background: active === c.id ? 'rgba(79,143,255,0.1)' : 'transparent',
                  color: active === c.id ? C.blue : C.text2, border: 'none',
                  borderLeft: active === c.id ? `2px solid ${C.blue}` : '2px solid transparent',
                  padding: '8px 12px', fontSize: '0.82rem', fontWeight: active === c.id ? 600 : 500,
                  cursor: 'pointer', borderRadius: 6, fontFamily: "'Space Grotesk', sans-serif",
                }}>{c.label}</button>
              ))}
            </nav>
          )}
          <div style={{ gridColumn: search.trim() ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {visible.length === 0 ? (
              <div style={{ color: C.text3, fontSize: '0.9rem', padding: 20 }}>Sin resultados para "{search}".</div>
            ) : visible.map(cat => (
              <div key={cat.id}>
                {(search.trim() || true) && <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginBottom: 14 }}>{cat.label}</div>}
                <Accordion items={cat.qa} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ height: 60 }} />
      <style>{`@media (max-width: 760px) { .lp-faq-grid { grid-template-columns: 1fr !important; } }`}</style>
    </MarketingLayout>
  );
}
