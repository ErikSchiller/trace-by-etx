const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: 'Ctrl / ⌘ + N', desc: 'Añadir operación' },
  { keys: 'Ctrl / ⌘ + 1', desc: 'Ir al Dashboard' },
  { keys: 'Ctrl / ⌘ + 2', desc: 'Ir al Diario' },
  { keys: 'Ctrl / ⌘ + 3', desc: 'Ir a Operaciones' },
  { keys: 'Ctrl / ⌘ + 4', desc: 'Ir al Notebook' },
  { keys: 'Ctrl / ⌘ + ,', desc: 'Abrir Ajustes' },
  { keys: 'Esc', desc: 'Cerrar cualquier ventana' },
  { keys: '?', desc: 'Abrir esta ventana' },
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Atajos de teclado"
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#111113', border: '1px solid #1e1e20', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
      >
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: 16 }}>
          Atajos de teclado
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SHORTCUTS.map(s => (
            <div key={s.keys} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#c8d4e8' }}>{s.desc}</span>
              <kbd style={{ fontSize: '0.72rem', color: '#888898', background: '#0a0a0c', border: '1px solid #1e1e20', borderRadius: 6, padding: '3px 8px', fontFamily: "'Space Grotesk', sans-serif" }}>{s.keys}</kbd>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#33334a', marginTop: 18, textAlign: 'center' }}>
          Pulsa <b style={{ color: '#4a4a60' }}>?</b> para abrir esta ventana
        </div>
      </div>
    </div>
  );
}

export default ShortcutsHelp;
