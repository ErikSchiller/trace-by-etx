import { useEffect } from 'react';
import { useUndoStore } from '../store/undoStore';
import { useToast } from './UI/ToastProvider';

const fontBody = "'Space Grotesk', sans-serif";

function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

/**
 * Global undo affordance for destructive actions. Shows the most recent
 * registered undo action, bottom-center, for 6s. Cmd/Ctrl+Z triggers it when
 * focus is not in an input.
 */
export function UndoToast() {
  const actions = useUndoStore(s => s.actions);
  const undoLast = useUndoStore(s => s.undoLast);
  const { push } = useToast();
  const current = actions[actions.length - 1];

  const doUndo = () => {
    const action = useUndoStore.getState().undoLast();
    if (action) push({ kind: 'success', text: 'Restaurado' });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== 'z' || e.shiftKey) return;
      if (isTyping(e.target)) return;
      if (useUndoStore.getState().actions.length === 0) return;
      e.preventDefault();
      const action = useUndoStore.getState().undoLast();
      if (action) push({ kind: 'success', text: 'Restaurado' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [push]);
  // undoLast referenced for lint completeness; store getState is used inside handler.
  void undoLast;

  if (!current) return null;

  return (
    <div
      key={current.id}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: '#15171d', border: '1px solid #1e2029', borderRadius: 10,
        padding: '10px 16px', boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', gap: 14, zIndex: 200,
        fontFamily: fontBody, animation: 'traceUndoIn 0.22s ease-out',
      }}
    >
      <span style={{ color: '#5a6080', fontSize: 15 }}>↩</span>
      <span style={{ fontSize: '0.82rem', color: '#e0e0e8' }}>{current.message}</span>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
        <button
          onClick={doUndo}
          style={{ background: 'transparent', border: 'none', color: '#4f8fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody, padding: 0 }}
        >Deshacer</button>
        <span style={{ fontSize: '0.62rem', color: '#4a4a60' }}>⌘Z</span>
      </div>
      <style>{`
        @keyframes traceUndoIn {
          from { transform: translate(-50%, 12px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default UndoToast;
