import { useEffect, useMemo, useRef, useState } from 'react';
import type { Trade } from '../../store/tradeStore';
import { getUserTrades, getTraceScore } from '../../store/tradeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useUserAccounts } from '../../store/propFirmStore';
import { useRoutineStore } from '../../store/routineStore';
import { useUserNotes } from '../../store/notebookStore';
import { useToast } from '../UI/ToastProvider';
import { celebrate } from '../../utils/celebrate';
import { computeStreaks } from '../../utils/streaks';
import { nodeToPngBlob } from '../../utils/domImage';
import { DIMS } from '../PnLCard/shared';
import { PnLCard, VARIANTS, defaultOpts, type CardData, type CardOpts } from '../PnLCard';

const HEAD = "'Syne', sans-serif";
const BODY = "'Space Grotesk', sans-serif";

interface Props { open: boolean; onClose: () => void; trade: Trade | null; initialOpts?: Partial<CardOpts>; }

export function PnLCardModal({ open, onClose, trade, initialOpts }: Props) {
  const sym = useSettingsStore(s => s.currencySymbol);
  const accountSize = useSettingsStore(s => s.accountSize);
  const settings = useSettingsStore();
  const user = useAuthStore(s => s.user);
  const accounts = useUserAccounts();
  const routine = useRoutineStore(s => s.routine);
  const completions = useRoutineStore(s => s.completions);
  const notes = useUserNotes();
  const dailyLossLimit = useSettingsStore(s => s.dailyLossLimit);
  const { push } = useToast();

  const [opts, setOpts] = useState<CardOpts>(() => defaultOpts({ variant: settings.cardDefaultVariant, format: settings.cardDefaultFormat, ...initialOpts }));
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setOpts(defaultOpts({ variant: settings.cardDefaultVariant, format: settings.cardDefaultFormat, ...initialOpts }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trade?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const streaks = useMemo(
    () => open ? computeStreaks({ routine, completions, trades: getUserTrades(), notes, dailyLossLimit }) : null,
    [open, routine, completions, notes, dailyLossLimit],
  );

  const data: CardData | null = useMemo(() => {
    if (!trade) return null;
    const dayTrades = getUserTrades().filter(t => t.date === trade.date);
    const acc = accounts.find(a => a.id === trade.accountId);
    const handleRaw = settings.cardHandle || user?.name || '';
    const handle = handleRaw ? (handleRaw.startsWith('@') ? handleRaw : `@${handleRaw.replace(/\s+/g, '').toLowerCase()}`) : undefined;
    let streakLabel: string | undefined;
    if (streaks) {
      if (streaks.routine.current >= 7) streakLabel = `${streaks.routine.current} días`;
      else if (streaks.profitable.current >= 5) streakLabel = `${streaks.profitable.current} días`;
    }
    return {
      asset: trade.asset,
      direction: trade.direction,
      pnl: trade.pnl,
      pnlPct: (trade.pnl / (acc?.accountSize || accountSize || 100000)) * 100,
      realRR: trade.realRR || (trade.pnl >= 0 ? 1 : -1),
      setup: trade.setup,
      session: trade.session,
      date: trade.date,
      time: trade.time,
      currencySymbol: sym,
      traceScore: getTraceScore(dayTrades),
      accountLabel: acc ? `${acc.firm} $${Math.round(acc.accountSize / 1000)}K` : undefined,
      screenshots: trade.screenshots,
      handle,
      streakLabel,
    };
  }, [trade, accounts, settings, user, streaks, sym, accountSize]);

  if (!open || !data) return null;

  const set = (patch: Partial<CardOpts>) => setOpts(o => ({ ...o, ...patch }));
  const previewH = opts.format === 'vertical' ? 470 : 400;
  const nativeH = opts.format === 'vertical' ? 1920 : 1080;
  const scale = previewH / nativeH;

  const generate = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const { w, h } = DIMS[opts.format];
    // Dependency-free DOM→PNG (inlines computed styles → foreignObject → canvas).
    // Pass native dimensions because the on-screen card is CSS-scaled.
    return nodeToPngBlob(cardRef.current, { width: w, height: h, scale: 2, bg: '#0a0a0c' });
  };
  const dl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `trace-pnl-${Date.now()}.png`; link.href = url; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const download = async () => {
    setBusy(true);
    try {
      const blob = await generate(); if (!blob) return;
      dl(blob);
      push({ kind: 'success', text: 'PnL Card descargada' });
      celebrate('subtle');
    } catch { push({ kind: 'error', text: 'Error al generar la imagen. Intenta de nuevo.' }); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    setBusy(true);
    try {
      const blob = await generate(); if (!blob) return;
      const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (navigator.clipboard && CI) { await navigator.clipboard.write([new CI({ 'image/png': blob })]); push({ kind: 'success', text: 'Imagen copiada' }); }
      else { dl(blob); push({ kind: 'success', text: 'Imagen descargada' }); }
    } catch { push({ kind: 'error', text: 'Error al generar la imagen. Intenta de nuevo.' }); }
    finally { setBusy(false); }
  };
  const share = async () => {
    setBusy(true);
    try {
      const blob = await generate(); if (!blob) return;
      const file = new File([blob], 'trace-pnl.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files: File[]; title?: string }) => Promise<void> };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], title: 'Mi trade en TRACE' }); }
      else { dl(blob); push({ kind: 'success', text: 'Imagen descargada' }); }
    } catch { push({ kind: 'error', text: 'Error al generar la imagen. Intenta de nuevo.' }); }
    finally { setBusy(false); }
  };

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 320, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="pnl-modal" onClick={e => e.stopPropagation()} style={{ background: '#111113', border: '1px solid #1e2029', borderRadius: 14, width: '100%', maxWidth: 960, height: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', fontFamily: BODY, color: '#e0e0e8', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        {/* header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e2029', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Generar PnL Card ✨</div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30, borderRadius: 7, background: 'transparent', border: '1px solid #1e2029', color: '#6b7280', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="pnl-body" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* preview */}
          <div className="pnl-preview" style={{ width: '58%', background: 'linear-gradient(135deg, rgba(79,143,255,0.05), transparent)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, overflow: 'auto' }}>
            <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>Vista previa — se descarga en alta resolución (1080p / 2160p)</div>
            <div style={{ width: 1080 * scale, height: nativeH * scale, position: 'relative', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <PnLCard ref={cardRef} data={data} opts={opts} />
              </div>
            </div>
          </div>

          {/* controls */}
          <div className="pnl-controls" style={{ width: '42%', borderLeft: '1px solid #1e2029', padding: 20, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>
            <Section title="Formato">
              <Pills options={[['square', 'Cuadrado 1:1'], ['vertical', 'Vertical 9:16']]} value={opts.format} onChange={v => set({ format: v as CardOpts['format'] })} />
            </Section>

            <Section title="Diseño">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {VARIANTS.map(v => (
                  <button key={v.id} onClick={() => set({ variant: v.id })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <div style={{ width: '100%', aspectRatio: opts.format === 'vertical' ? '9/16' : '1', borderRadius: 8, overflow: 'hidden', border: opts.variant === v.id ? '2px solid #4f8fff' : '1px solid #2a2d38', position: 'relative', background: '#0a0a0c' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${(opts.format === 'vertical' ? 48 : 60) / 1080})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                        <PnLCard data={data} opts={{ ...opts, variant: v.id }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '0.6rem', color: opts.variant === v.id ? '#4f8fff' : '#6b7280' }}>{v.name}</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Qué mostrar">
              <Toggle label="PnL en %" checked={opts.pnlMode === 'pct'} onChange={c => set({ pnlMode: c ? 'pct' : 'abs' })} />
              <Toggle label="Setup / estrategia" checked={opts.showSetup} onChange={c => set({ showSetup: c })} />
              <Toggle label="R:R real" checked={opts.showRR} onChange={c => set({ showRR: c })} />
              <Toggle label="Sesión" checked={opts.showSession} onChange={c => set({ showSession: c })} />
              <Toggle label="TRACE Score del día" checked={opts.showScore} onChange={c => set({ showScore: c })} />
              <Toggle label="Racha activa" checked={opts.showStreak} onChange={c => set({ showStreak: c })} />
              <Toggle label="Cuenta / prop firm" checked={opts.showAccount} onChange={c => set({ showAccount: c })} />
              <Toggle label="Fecha exacta" checked={opts.showDate} onChange={c => set({ showDate: c })} />
              {data.handle && <Toggle label={`Mostrar handle (${data.handle})`} checked={opts.showHandle} onChange={c => set({ showHandle: c })} />}
            </Section>

            {data.screenshots && data.screenshots.length > 0 && (
              <Section title="Captura de pantalla (opcional)">
                <Toggle label="Incluir captura del trade" checked={!!opts.screenshot} onChange={c => set({ screenshot: c ? (data.screenshots![0]) : undefined })} />
                {opts.screenshot && data.screenshots.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {data.screenshots.map((s, i) => (
                      <button key={i} onClick={() => set({ screenshot: s })} style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', border: opts.screenshot === s ? '2px solid #4f8fff' : '1px solid #2a2d38', padding: 0, cursor: 'pointer', background: '#0d0d0f' }}>
                        <img src={s} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '0.62rem', color: '#6b7280' }}>Se usa como fondo sutil en el diseño Cinemático.</div>
              </Section>
            )}

            <Section title="Nota corta (opcional)">
              <input value={opts.note} maxLength={60} onChange={e => set({ note: e.target.value })} placeholder="Mi mejor entrada del mes 🎯" style={{ width: '100%', background: '#0d0d0f', border: '1px solid #1e2029', borderRadius: 8, padding: '9px 12px', color: '#e0e0e8', fontSize: '0.82rem', fontFamily: BODY, boxSizing: 'border-box' }} />
            </Section>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <button onClick={download} disabled={busy} style={{ background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 9, padding: 12, fontSize: '0.88rem', fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: BODY, opacity: busy ? 0.7 : 1 }}>{busy ? 'Generando imagen…' : 'Descargar imagen ↓'}</button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <button onClick={copy} disabled={busy} style={{ background: 'transparent', border: 'none', color: '#8a90a8', fontSize: '0.76rem', cursor: 'pointer', fontFamily: BODY }}>Copiar al portapapeles</button>
                {canShare && <button onClick={share} disabled={busy} style={{ background: 'transparent', border: 'none', color: '#4f8fff', fontSize: '0.76rem', cursor: 'pointer', fontFamily: BODY }}>Compartir directo →</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 760px) {
          .pnl-modal { height: 100vh !important; max-height: 100vh !important; max-width: 100vw !important; border-radius: 0 !important; }
          .pnl-body { flex-direction: column !important; }
          .pnl-preview, .pnl-controls { width: 100% !important; }
          .pnl-preview { border-bottom: 1px solid #1e2029; }
          .pnl-controls { border-left: none !important; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: '0.6rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{title}</div>
      {children}
    </div>
  );
}
function Pills({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', background: '#0d0d0f', border: '1px solid #1e2029', borderRadius: 10, padding: 3, gap: 3 }}>
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: BODY, border: 'none', background: value === v ? 'rgba(79,143,255,0.14)' : 'transparent', color: value === v ? '#4f8fff' : '#8a90a8' }}>{l}</button>
      ))}
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 0', fontFamily: BODY }}>
      <span style={{ fontSize: '0.8rem', color: '#c8d4e8' }}>{label}</span>
      <span style={{ width: 34, height: 20, borderRadius: 999, background: checked ? '#4f8fff' : '#2a2d38', position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: checked ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
      </span>
    </button>
  );
}

export default PnLCardModal;
