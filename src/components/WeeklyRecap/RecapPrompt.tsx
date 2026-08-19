const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";

export function openWeeklyRecap() {
  window.dispatchEvent(new CustomEvent('trace:open-weekly-recap'));
}

/**
 * Prompt card inviting the user to generate their weekly recap.
 * Used on the Dashboard (gated by trading activity) and in Reportes.
 */
export function RecapPrompt({ compact }: { compact?: boolean }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(79,143,255,0.08), rgba(79,143,255,0.02))',
      border: '1px solid rgba(79,143,255,0.18)', borderRadius: 12,
      padding: compact ? '14px 18px' : '18px 22px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <span style={{ fontSize: 26, flexShrink: 0 }}>📅</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Genera tu recap semanal</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>Revisa cómo te fue esta semana en un vistazo.</div>
      </div>
      <button
        onClick={openWeeklyRecap}
        style={{ flexShrink: 0, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}
      >Ver recap →</button>
    </div>
  );
}

export default RecapPrompt;
