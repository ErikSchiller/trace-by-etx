import { useEffect, useState } from 'react';
import { useToast } from './ToastProvider';
import { joinAiWaitlist } from '../../config/tracer-ai-content';

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const INDIGO = '#7861ff';

/** Small email-capture modal for the TRACE IA waitlist. */
export function AiWaitlistModal({ open, onClose, defaultEmail }: { open: boolean; onClose: () => void; defaultEmail?: string }) {
  const { push } = useToast();
  const [email, setEmail] = useState(defaultEmail ?? '');

  useEffect(() => { if (open) setEmail(defaultEmail ?? ''); }, [open, defaultEmail]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const valid = /.+@.+\..+/.test(email.trim());
  const submit = () => {
    if (!valid) return;
    joinAiWaitlist(email);
    push({ kind: 'success', text: 'Te avisaremos en cuanto TRACE IA esté disponible' });
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111113', border: `1px solid rgba(120,97,255,0.25)`, borderRadius: 14, width: '100%', maxWidth: 420, padding: 28, fontFamily: fontBody, color: '#e0e0e8', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(120,97,255,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>🧠</span>
          <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>Waitlist de TRACE IA</div>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#888898', lineHeight: 1.5, marginBottom: 16 }}>
          Te avisaremos por email en cuanto el coach virtual esté disponible. Sin spam.
        </p>
        <input
          type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="tu@email.com"
          style={{ width: '100%', boxSizing: 'border-box', background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 8, padding: '11px 14px', color: '#e0e0e8', fontFamily: fontBody, fontSize: '0.88rem', outline: 'none', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #1e1e20', color: '#888898', borderRadius: 8, padding: '9px 16px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: fontBody }}>Cancelar</button>
          <button onClick={submit} disabled={!valid} style={{ background: INDIGO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: '0.82rem', fontWeight: 600, cursor: valid ? 'pointer' : 'not-allowed', opacity: valid ? 1 : 0.5, fontFamily: fontBody }}>Notifícame</button>
        </div>
      </div>
    </div>
  );
}

export default AiWaitlistModal;
