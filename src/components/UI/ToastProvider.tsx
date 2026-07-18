import { createContext, useCallback, useContext, useState } from 'react';
import { nanoid } from 'nanoid';

type Kind = 'success' | 'error' | 'warning' | 'info';
interface Toast { id: string; kind: Kind; title: string; description?: string }

interface PushArg { kind: Kind; text?: string; title?: string; description?: string }
interface ToastCtx { push: (t: PushArg) => void }
const Ctx = createContext<ToastCtx>({ push: () => {} });

const ACCENT: Record<Kind, string> = {
  success: 'var(--blue)',
  error: 'var(--red)',
  warning: 'var(--warning)',
  info: 'var(--blue)',
};

function KindIcon({ kind }: { kind: Kind }) {
  const c = ACCENT[kind];
  if (kind === 'success') return <Dot c={c} glyph="✓" />;
  if (kind === 'error') return <Dot c={c} glyph="✕" />;
  if (kind === 'warning') return <Dot c={c} glyph="!" />;
  return <Dot c={c} glyph="i" />;
}
function Dot({ c, glyph }: { c: string; glyph: string }) {
  return (
    <span style={{
      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
      background: `color-mix(in srgb, ${c} 18%, transparent)`, color: c,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 800, marginTop: 1,
    }}>{glyph}</span>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: PushArg) => {
    const id = nanoid();
    const title = t.title ?? t.text ?? '';
    setToasts(arr => [...arr, { id, kind: t.kind, title, description: t.description }]);
    setTimeout(() => setToasts(arr => arr.filter(x => x.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
        display: 'flex', flexDirection: 'column-reverse', gap: 10, pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              background: 'var(--card)', border: '1px solid var(--border-subtle)',
              borderRadius: 10, padding: '12px 16px', minWidth: 280, maxWidth: 380,
              display: 'flex', alignItems: 'flex-start', gap: 10,
              boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
              animation: 'traceToastIn 0.25s ease-out', pointerEvents: 'auto',
            }}
          >
            <KindIcon kind={t.kind} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{t.title}</div>
              {t.description && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>{t.description}</div>}
            </div>
          </div>
        ))}
        <style>{`
          @keyframes traceToastIn {
            from { transform: translateY(8px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
