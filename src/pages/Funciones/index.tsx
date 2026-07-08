import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { PageHero, CTABanner } from '../../components/Marketing/primitives';
import { C, fontHead } from '../../components/Marketing/theme';

const CARDS = [
  {
    icon: '📓', title: 'Diario que se escribe solo',
    desc: 'Añade tu trade nada más cerrarlo. TRACE calcula PnL, R:R, comisiones y todo lo demás. Tú solo dile qué operaste.',
    bullets: ['Registro en menos de 30 segundos', 'Cálculos automáticos', 'Capturas, notas y emociones por trade'],
  },
  {
    icon: '📊', title: 'Tus números, claros',
    desc: 'Win rate, profit factor, drawdown, racha actual — todo calculado al instante con cada operación.',
    bullets: ['15+ métricas en el dashboard', 'Filtros por fecha, sesión, setup', 'Comparativa mensual y anual'],
  },
  {
    icon: '🎯', title: 'Un número que lo resume todo',
    desc: 'El TRACE Score combina win rate, profit factor, recovery y consistencia en una puntuación 0-100 para que sepas exactamente dónde estás.',
    bullets: ['6 dimensiones medidas', 'Comparable mes a mes', 'Identifica tus debilidades'],
  },
  {
    icon: '📈', title: 'Consistencia día a día',
    desc: 'Checklist diario, racha de hábitos, objetivos personales y un heatmap anual que te muestra tu progreso real.',
    bullets: ['Checklist diario personalizable', 'Racha y mejor racha', 'Objetivos con seguimiento'],
  },
  {
    icon: '📔', title: 'Notas que se conectan con tus trades',
    desc: 'Un notebook completo dentro de la app. Organiza tus estrategias, sesiones de revisión y reflexiones por carpetas.',
    bullets: ['Carpetas personalizables (3 en gratis, ilimitadas en Pro)', 'Tags y búsqueda', 'Imágenes y formato'],
  },
  {
    icon: '▶', title: 'Revive cada operación',
    desc: 'Visualiza tu entrada, salida, SL y TP en un gráfico. Identifica patrones, errores y oportunidades perdidas.',
    bullets: ['Visualización clara del trade', 'Datos completos al lado', 'Navegación entre operaciones'],
  },
];

const PROP_CARDS = [
  {
    icon: '🗂️', title: 'Prop Firm Hub',
    desc: 'Gestiona todas tus cuentas de prop firms en un solo lugar: fees, payouts, fase, pass rate y ROI real por firma. Vincula tus operaciones a cada cuenta.',
    bullets: ['Presets de TopStep, Apex, TPT, FTMO y más', 'Tracking de fees, resets y payouts', 'Pass rate, ROI y P&L neto por firma'],
  },
  {
    icon: '🎲', title: 'Simulador Monte Carlo',
    desc: 'Proyecta miles de escenarios a partir de tus estadísticas reales para estimar tu probabilidad de pasar una evaluación o reventar la cuenta.',
    bullets: ['Miles de simulaciones sobre tus métricas', 'Probabilidad de pasar / blow-up', 'Curvas de equity proyectadas'],
  },
  {
    icon: '🔥', title: 'Heatmap de horarios',
    desc: 'Descubre a qué horas y días eres realmente rentable. Un mapa de calor que cruza tu PnL por franja horaria y día de la semana.',
    bullets: ['PnL por hora y día de la semana', 'Identifica tus mejores ventanas', 'Evita las franjas que te cuestan dinero'],
  },
];

export default function Funciones() {
  return (
    <MarketingLayout title="Funciones">
      <PageHero title="Todas las funciones, " blue="en un hub." sub="Cada herramienta diseñada para que mejores como trader, no para llenar la pantalla de gráficos sin sentido." />

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 24px 0' }}>
        <div className="lp-func-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {CARDS.map(card => (
            <div key={card.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 24px', minHeight: 280, transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
            >
              <div style={{ fontSize: 26, marginBottom: 12 }}>{card.icon}</div>
              <h3 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.2rem', color: '#fff', marginBottom: 10 }}>{card.title}</h3>
              <p style={{ fontSize: '0.85rem', color: C.text2, lineHeight: 1.55, marginBottom: 16 }}>{card.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {card.bullets.map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: C.text }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue, marginTop: 6, flexShrink: 0 }} />{b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Prop firm features */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '64px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.6rem', color: '#fff', margin: 0 }}>Para traders de prop firms</h2>
          <span style={{ background: 'rgba(79,143,255,0.15)', color: C.blue, fontSize: 10, padding: '3px 9px', borderRadius: 5, fontWeight: 700, letterSpacing: '0.06em' }}>NUEVO</span>
        </div>
        <p style={{ fontSize: '0.9rem', color: C.text2, marginBottom: 22, maxWidth: 560 }}>
          Herramientas Pro pensadas para quien opera evaluaciones y cuentas fondeadas.
        </p>
        <div className="lp-func-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {PROP_CARDS.map(card => (
            <div key={card.title} style={{ position: 'relative', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 24px', minHeight: 280, transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,143,255,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
            >
              <span style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(79,143,255,0.12)', color: C.blue, fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em' }}>PRO</span>
              <div style={{ fontSize: 26, marginBottom: 12 }}>{card.icon}</div>
              <h3 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.2rem', color: '#fff', marginBottom: 10 }}>{card.title}</h3>
              <p style={{ fontSize: '0.85rem', color: C.text2, lineHeight: 1.55, marginBottom: 16 }}>{card.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {card.bullets.map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: C.text }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue, marginTop: 6, flexShrink: 0 }} />{b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '60px 24px 0' }}>
        <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.8rem', color: '#fff', marginBottom: 12 }}>¿Listo para empezar?</h2>
        <p style={{ fontSize: '0.95rem', color: C.text2, marginBottom: 24 }}>Crea tu cuenta gratis y empieza a registrar operaciones hoy.</p>
        <Link to="/register" style={{ background: C.blue, color: '#fff', padding: '14px 32px', borderRadius: 10, fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', boxShadow: '0 8px 24px rgba(79,143,255,0.25)' }}>Comenzar gratis →</Link>
      </div>

      <CTABanner />
      <style>{`@media (max-width: 900px) { .lp-func-grid { grid-template-columns: 1fr !important; } }`}</style>
    </MarketingLayout>
  );
}
