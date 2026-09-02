import { useEffect } from 'react';
import { useToast } from '../../components/UI/ToastProvider';
import { getAffiliateCode, isAffiliateVisible, trackAffiliateEvent } from '../../config/affiliates';

const fontBody = "'Space Grotesk', sans-serif";
const fontHead = "'Syne', sans-serif";

function copyCode(code: string, firm: string, push: (t: { kind: 'success'; text: string }) => void) {
  const done = () => { trackAffiliateEvent('copy', firm); push({ kind: 'success', text: 'Código copiado' }); };
  try {
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(code).then(done).catch(() => fallback(code, done)); }
    else fallback(code, done);
  } catch { fallback(code, done); }
}
function fallback(code: string, done: () => void) {
  const ta = document.createElement('textarea');
  ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch { /* ignore */ }
  ta.remove();
}

/** Full discount card — shown in the prop-firms hub for a firm with an active code. */
export function AffiliateCodeCard({ firm }: { firm: string }) {
  const { push } = useToast();
  const data = getAffiliateCode(firm);
  useEffect(() => { if (data && isAffiliateVisible()) trackAffiliateEvent('view', firm); }, [firm, data]);
  if (!data || !isAffiliateVisible()) return null;

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(79,143,255,0.08), rgba(120,97,255,0.06))', border: '1px solid rgba(79,143,255,0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🎁</span>
        <div>
          <div style={{ fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Descuento con TRACE</div>
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{data.discount} en {data.displayName}</div>
          {data.description && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>{data.description}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => copyCode(data.code, firm, push)}
          title="Copiar código"
          style={{ background: '#0a0a0c', border: '1px solid rgba(79,143,255,0.3)', borderRadius: 6, padding: '6px 14px', color: '#4f8fff', fontFamily: fontBody, fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.05em', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 12px rgba(79,143,255,0.35)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >{data.code}</button>
        {data.url && (
          <a href={data.url} target="_blank" rel="noopener noreferrer" onClick={() => trackAffiliateEvent('click', firm)}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, padding: '7px 14px', fontSize: '0.76rem', textDecoration: 'none', fontFamily: fontBody }}>Ir a la firma →</a>
        )}
      </div>
    </div>
  );
}

/** Compact pill — shown in the Add Account modal under the selected firm. */
export function AffiliatePill({ firm }: { firm: string }) {
  const { push } = useToast();
  const data = getAffiliateCode(firm);
  useEffect(() => { if (data && isAffiliateVisible()) trackAffiliateEvent('view', firm); }, [firm, data]);
  if (!data || !isAffiliateVisible()) return null;
  return (
    <div style={{ background: 'rgba(79,143,255,0.08)', border: '1px solid rgba(79,143,255,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.78rem', color: '#c8d4e8' }}>
      <span>🎁 Descuento con TRACE: <b style={{ color: '#fff' }}>{data.discount}</b> con código <b style={{ color: '#4f8fff', fontFamily: fontBody, letterSpacing: '0.04em' }}>{data.code}</b></span>
      <button onClick={() => copyCode(data.code, firm, push)} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(79,143,255,0.3)', color: '#4f8fff', borderRadius: 6, padding: '3px 10px', fontSize: '0.72rem', cursor: 'pointer', fontFamily: fontBody, whiteSpace: 'nowrap' }}>Copiar</button>
    </div>
  );
}
