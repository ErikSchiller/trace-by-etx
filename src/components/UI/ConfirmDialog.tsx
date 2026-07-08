import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description,
  confirmText = 'Confirmar', cancelText = 'Cancelar',
  destructive = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111113', border: '1px solid #1e1e20', borderRadius: 14,
          padding: 24, width: '100%', maxWidth: 400,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginBottom: description ? 8 : 16 }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: '0.86rem', color: '#888898', lineHeight: 1.55, marginBottom: 20 }}>{description}</p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: '1px solid #1e1e20', color: '#e0e0e8', borderRadius: 8, padding: '9px 18px', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >{cancelText}</button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{
              background: destructive ? '#ef4444' : '#4f8fff', color: '#fff', border: 'none',
              borderRadius: 8, padding: '9px 18px', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
