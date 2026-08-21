import { useState } from 'react';
import { useFilteredTrades, usePreviousPeriodTrades } from '../../store/tradeStore';
import { useUserAccounts } from '../../store/propFirmStore';
import { useDateRangeStore, COMPARE_LABEL } from '../../store/dateRangeStore';
import { ProLock } from '../../components/UI/ProLock';
import { RecapPrompt } from '../../components/WeeklyRecap/RecapPrompt';
import { exportToCSV } from '../../utils/export';
import type { InsightTab } from '../../utils/reportInsights';
import { fontBody, SectionEmpty } from './shared';
import { Overview } from './Overview';
import { Tecnico } from './Tecnico';
import { Psicologico } from './Psicologico';
import { PropFirmsReport } from './PropFirmsReport';
import { Personalizado } from './Personalizado';

type SectionId = 'overview' | 'tecnico' | 'psicologico' | 'propfirms' | 'custom';

const TABS: { id: SectionId; label: string }[] = [
  { id: 'overview', label: 'Visión general' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'psicologico', label: 'Psicológico' },
  { id: 'propfirms', label: 'Prop Firms' },
  { id: 'custom', label: 'Personalizado' },
];

export default function Reportes() {
  const trades = useFilteredTrades();
  const prevTrades = usePreviousPeriodTrades();
  const accounts = useUserAccounts();
  const preset = useDateRangeStore(s => s.preset);
  const canCompare = !!COMPARE_LABEL[preset] && prevTrades !== null;

  const [tab, setTab] = useState<SectionId>('overview');
  const [compareOn, setCompareOn] = useState(() => localStorage.getItem('reportes_compare') === '1');
  const toggleCompare = () => setCompareOn(v => { const n = !v; localStorage.setItem('reportes_compare', n ? '1' : '0'); return n; });
  const [exportOpen, setExportOpen] = useState(false);

  const goTab = (t: InsightTab) => { if (t === 'overview') setTab('overview'); else setTab(t as SectionId); };
  const effectiveCompare = compareOn && canCompare;

  const base = { trades, prevTrades, compareOn: effectiveCompare };

  return (
    <ProLock feature="Reportes avanzados" description="Acceso a 50+ reportes para mejorar tu trading">
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {/* Tabs bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  background: active ? 'rgba(79,143,255,0.1)' : 'transparent',
                  color: active ? 'var(--blue)' : 'var(--text-secondary)',
                  border: 'none', borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
                  padding: '8px 14px', fontSize: '0.82rem', fontWeight: active ? 600 : 500,
                  cursor: 'pointer', fontFamily: fontBody, whiteSpace: 'nowrap',
                }}>{t.label}</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canCompare && (
              <button onClick={toggleCompare} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                background: compareOn ? 'rgba(79,143,255,0.08)' : 'transparent',
                border: `1px solid ${compareOn ? 'rgba(79,143,255,0.25)' : 'var(--border)'}`,
                color: compareOn ? 'var(--blue)' : 'var(--text-secondary)',
                borderRadius: 20, padding: '5px 12px', fontSize: '0.7rem', fontFamily: fontBody,
              }}>
                <span style={{ width: 13, height: 13, borderRadius: 4, background: compareOn ? 'var(--blue)' : 'transparent', border: compareOn ? 'none' : '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff' }}>{compareOn ? '✓' : ''}</span>
                Ver periodo comparado
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setExportOpen(o => !o)} style={{
                background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                borderRadius: 8, padding: '6px 12px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: fontBody,
              }}>Exportar reporte ▾</button>
              {exportOpen && (
                <>
                  <div onClick={() => setExportOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 41, background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 6, minWidth: 200, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
                    <ExportItem label="Exportar como CSV" onClick={() => { exportToCSV(trades); setExportOpen(false); }} />
                    <ExportItem label="Exportar como PDF" onClick={() => { window.print(); setExportOpen(false); }} />
                    <ExportItem label="Copiar como imagen" onClick={() => { window.print(); setExportOpen(false); }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section content */}
        <div style={{ flex: 1, padding: '18px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'overview' && <RecapPrompt compact />}
          {trades.length === 0 && tab !== 'custom' && tab !== 'propfirms' ? (
            <SectionEmpty icon="📊" title="Aún no tienes operaciones" desc="Registra operaciones para desbloquear tus reportes y análisis." ctaLabel="Ir a operaciones" href="/trades" />
          ) : (
            <>
              {tab === 'overview' && <Overview {...base} accounts={accounts} onTab={goTab} />}
              {tab === 'tecnico' && <Tecnico {...base} />}
              {tab === 'psicologico' && <Psicologico {...base} />}
              {tab === 'propfirms' && <PropFirmsReport {...base} accounts={accounts} />}
              {tab === 'custom' && <Personalizado trades={trades} accounts={accounts} />}
            </>
          )}
        </div>
      </div>
    </ProLock>
  );
}

function ExportItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '8px 12px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: 6, fontFamily: fontBody }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{label}</button>
  );
}
