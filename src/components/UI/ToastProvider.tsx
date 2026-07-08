import { createContext, useCallback, useContext, useState } from 'react';
import { nanoid } from 'nanoid';

type Kind = 'success' | 'error';
interface Toast { id: string; kind: Kind; text: string }

interface ToastCtx { push: (t: { kind: Kind; text: string }) => void }
const Ctx = createContext<ToastCtx>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: { kind: Kind; text: string }) => {
    const id = nanoid();
    setToasts(arr => [...arr, { id, ...t }]);
    setTimeout(() => setToasts(arr => arr.filter(x => x.id !== id)), 3000);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => {
          const accent = t.kind === 'success' ? '#4f8fff' : '#ef4444';
          const icon = t.kind === 'success' ? '✓' : '✕';
          return (
            <div
              key={t.id}
              style={{
                background: '#0a0a0f',
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: `3px solid ${accent}`,
                color: '#c8d4e8',
                padding: '10px 14px 10px 12px',
                borderRadius: 6,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                minWidth: 220,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                animation: 'traceToastIn 0.25s ease-out',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                pointerEvents: 'auto',
              }}
            >
              <span style={{ color: accent, fontWeight: 700 }}>{icon}</span>
              <span>{t.text}</span>
            </div>
          );
        })}
        <style>{`
          @keyframes traceToastIn {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
