import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { PageHero } from '../../components/Marketing/primitives';
import { C, fontHead } from '../../components/Marketing/theme';

const SECTIONS = [
  {
    label: '🟢 Disponible ahora', color: C.blue,
    items: ['Diario automático con cálculos en vivo', 'Dashboard con KPIs y TRACE Score', 'Reportes avanzados (8 categorías)', 'Progress Tracker con checklist y rachas', 'Notebook con carpetas y tags', 'Importación de trades vía CSV'],
  },
  {
    label: '🔵 En desarrollo', color: '#3b82f6',
    items: ['Backend con Supabase (sincronización en la nube)', 'Pagos con Stripe', 'IA integrada para análisis automático'],
  },
  {
    label: '⚪ Próximamente', color: C.text3,
    items: ['Conexión nativa con brokers', 'App móvil nativa (iOS / Android)', 'Trade Replay con datos de mercado reales'],
  },
];

export default function Roadmap() {
  return (
    <MarketingLayout title="Roadmap">
      <PageHero title="Roadmap de " blue="TRACE." sub="Esto es lo que estamos construyendo y lo que viene." />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {SECTIONS.map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px 26px' }}>
            <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', color: s.color, marginBottom: 14 }}>{s.label}</div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {s.items.map(it => (
                <li key={it} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.88rem', color: C.text }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, marginTop: 7, flexShrink: 0 }} />{it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </MarketingLayout>
  );
}
