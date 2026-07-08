import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useTradeStore, useUserTrades,
  calcGrossPnl,
  type Direction, type Session, type EmotionalState, type InputMode,
} from '../../store/tradeStore';
import { useToast } from '../UI/ToastProvider';
import { useSettingsStore } from '../../store/settingsStore';
import { usePlan } from '../../hooks/usePlan';
import { useUserAccounts, getActiveAccounts } from '../../store/propFirmStore';

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  tradeId?: string;
}

const ERROR_TAGS = ['FOMO', 'Revenge trade', 'Salida temprana', 'Entrada tardía', 'Oversized', 'Sin setup', 'Movió SL'];
const SESSIONS: { value: Session; label: string }[] = [
  { value: 'london', label: 'Londres' },
  { value: 'new_york', label: 'Nueva York' },
  { value: 'asia', label: 'Asia' },
  { value: 'premarket', label: 'Pre-market' },
];
const EMOTIONS: { v: EmotionalState; emoji: string }[] = [
  { v: 1, emoji: '😌' }, { v: 2, emoji: '🙂' }, { v: 3, emoji: '😐' }, { v: 4, emoji: '😟' }, { v: 5, emoji: '😰' },
];

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const MODE_KEY = 'trace_addtrade_mode';

function todayDate() { return new Date().toISOString().slice(0, 10); }
function nowTime() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

const label: React.CSSProperties = {
  fontSize: '0.6rem', fontWeight: 600, color: '#4a4a60',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  display: 'block', marginBottom: 8,
};
const input: React.CSSProperties = {
  background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 8,
  padding: '10px 14px', color: '#e0e0e8', fontFamily: fontBody,
  fontSize: '0.88rem', width: '100%', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const fieldErr = (msg?: string) => msg ? <div style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: 4 }}>{msg}</div> : null;

const css = `
  @keyframes traceModalIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
  .trace-add-modal input:focus, .trace-add-modal select:focus {
    border-color: #4f8fff !important; box-shadow: 0 0 0 3px rgba(79,143,255,0.08) !important;
  }
  .trace-add-modal input::placeholder { color: #2a2a35; }
  .trace-add-modal .asset-input::placeholder { color: #1a1a1c; }
  .trace-add-modal .asset-input:focus { border-bottom-color: #4f8fff !important; box-shadow: none !important; }
  .trace-add-modal .save-btn:hover { background: #3d7aee !important; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(79,143,255,0.35) !important; }
  .trace-add-modal .drop-zone:hover { border-color: #4f8fff !important; background: rgba(79,143,255,0.03) !important; }
  @media (max-width: 700px) {
    .trace-add-modal .modal-box { max-width: 100% !important; width: 100% !important; min-height: 100vh; border-radius: 0 !important; }
    .trace-add-modal .modal-body { grid-template-columns: 1fr !important; }
    .trace-add-modal .modal-right { border-top: 1px solid #1e1e20; }
    .trace-add-modal .asset-input { font-size: 1.8rem !important; }
  }
`;

export function AddTradeModal({ open, onClose, mode = 'create', tradeId }: Props) {
  const addTrade = useTradeStore(s => s.addTrade);
  const updateTrade = useTradeStore(s => s.updateTrade);
  const allTrades = useUserTrades();
  const editTrade = mode === 'edit' && tradeId ? allTrades.find(t => t.id === tradeId) : undefined;
  const { push } = useToast();
  const defaultCommission = useSettingsStore(s => s.defaultCommission);
  const defaultMultiplier = useSettingsStore(s => s.defaultMultiplier);
  const currencySymbol = useSettingsStore(s => s.currencySymbol);
  const dailyLossLimit = useSettingsStore(s => s.dailyLossLimit);
  const { isFree } = usePlan();
  const allAccounts = useUserAccounts();
  const activeAccounts = useMemo(() => getActiveAccounts(allAccounts), [allAccounts]);

  const [inputMode, setInputMode] = useState<InputMode>(() => {
    return (localStorage.getItem(MODE_KEY) as InputMode) || 'direct';
  });
  const [asset, setAsset] = useState('');
  const [direction, setDirection] = useState<Direction>('long');
  const [pnlText, setPnlText] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [positionSize, setPositionSize] = useState('1');
  const [multiplier, setMultiplier] = useState(String(defaultMultiplier ?? 1));
  const [commission, setCommission] = useState(String(defaultCommission ?? 0));
  const [date, setDate] = useState(todayDate());
  const [time, setTime] = useState(nowTime());
  const [session, setSession] = useState<Session>('new_york');
  const [accountId, setAccountId] = useState('');
  const [emotionalState, setEmotionalState] = useState<EmotionalState>(3);
  const [isPlanBased, setIsPlanBased] = useState(true);
  const [errorTags, setErrorTags] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const assetRef = useRef<HTMLInputElement>(null);

  // Pre-fill on edit / focus on open
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editTrade) {
      setInputMode(editTrade.inputMode || 'calculated');
      setAsset(editTrade.asset);
      setDirection(editTrade.direction);
      setPnlText(String(editTrade.pnl));
      setEntryPrice(editTrade.entryPrice ? String(editTrade.entryPrice) : '');
      setExitPrice(editTrade.exitPrice ? String(editTrade.exitPrice) : '');
      setPositionSize(String(editTrade.positionSize || 1));
      setMultiplier(String(editTrade.multiplier || 1));
      setCommission(String(editTrade.commission));
      setDate(editTrade.date);
      setTime(editTrade.time);
      setSession(editTrade.session);
      setAccountId(editTrade.accountId ?? '');
      setEmotionalState(editTrade.emotionalState);
      setIsPlanBased(editTrade.isPlanBased);
      setErrorTags(editTrade.errorTags);
      setScreenshots(editTrade.screenshots);
    }
    setTimeout(() => assetRef.current?.focus(), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tradeId]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const switchMode = (m: InputMode) => {
    setInputMode(m);
    localStorage.setItem(MODE_KEY, m);
  };

  // Calculated-mode live PnL
  const calc = useMemo(() => {
    const ep = parseFloat(entryPrice), xp = parseFloat(exitPrice);
    const ps = parseFloat(positionSize) || 0, cm = parseFloat(commission) || 0;
    const mp = parseFloat(multiplier) || 1;
    if (!isFinite(ep) || !isFinite(xp) || ps <= 0) return { gross: 0, pnl: 0, valid: false };
    const gross = calcGrossPnl({ direction, entryPrice: ep, exitPrice: xp, positionSize: ps, multiplier: mp });
    return { gross, pnl: gross - cm, valid: true };
  }, [entryPrice, exitPrice, positionSize, commission, multiplier, direction]);

  // Direct-mode parsed pnl (0 allowed = break even)
  const directPnl = parseFloat(pnlText.replace(',', '.'));
  const directValid = isFinite(directPnl);
  const isBreakEven = directValid && directPnl === 0;

  if (!open) return null;

  const fmtMoney = (n: number) => `${n >= 0 ? '+' : '-'}${currencySymbol}${Math.abs(n).toFixed(2)}`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!asset.trim()) e.asset = 'Activo requerido';
    if (inputMode === 'direct') {
      if (!directValid) e.pnl = 'Introduce el PnL de la operación';
    } else {
      if (!entryPrice || parseFloat(entryPrice) <= 0) e.entryPrice = 'Precio inválido';
      if (!exitPrice || parseFloat(exitPrice) <= 0) e.exitPrice = 'Precio inválido';
      if (!positionSize || parseFloat(positionSize) <= 0) e.positionSize = 'Tamaño inválido';
    }
    return e;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) { push({ kind: 'error', text: 'Revisa los campos marcados' }); return; }
    setSaving(true);

    const cm = parseFloat(commission) || 0;
    const common = {
      date, time,
      asset: asset.trim().toUpperCase(),
      direction,
      commission: cm,
      session, emotionalState, isPlanBased, errorTags, screenshots,
      setup: editTrade?.setup ?? '',
      stopLoss: 0, takeProfit: 0,
      exitType: 'manual' as const,
      entryReason: editTrade?.entryReason ?? '',
      postTradeNotes: editTrade?.postTradeNotes ?? '',
      inputMode,
      accountId: accountId || undefined,
    };

    if (editTrade) {
      if (inputMode === 'direct') {
        updateTrade(editTrade.id, { ...common, pnl: directPnl, entryPrice: 0, exitPrice: 0, positionSize: 1, multiplier: 1 });
      } else {
        updateTrade(editTrade.id, {
          ...common,
          entryPrice: parseFloat(entryPrice), exitPrice: parseFloat(exitPrice),
          positionSize: parseFloat(positionSize), multiplier: parseFloat(multiplier) || 1,
        });
      }
      push({ kind: 'success', text: 'Operación actualizada' });
      setSaving(false);
      onClose();
      return;
    }

    if (inputMode === 'direct') {
      addTrade({
        ...common,
        entryPrice: 0, exitPrice: 0, positionSize: 1, multiplier: 1,
        directPnl,
      });
    } else {
      addTrade({
        ...common,
        entryPrice: parseFloat(entryPrice), exitPrice: parseFloat(exitPrice),
        positionSize: parseFloat(positionSize), multiplier: parseFloat(multiplier) || 1,
      });
    }
    push({ kind: 'success', text: 'Operación guardada' });

    // After-save warnings
    setTimeout(() => {
      const todayKey = todayDate();
      const todayPnl = useTradeStore.getState().trades.filter(t => t.date === todayKey).reduce((s, t) => s + t.pnl, 0);
      if (todayPnl <= -dailyLossLimit) push({ kind: 'error', text: '⚠️ Has alcanzado tu límite de pérdida diaria' });
      if (isFree) {
        const mk = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        if (useTradeStore.getState().trades.filter(t => t.date.startsWith(mk)).length >= 30) {
          push({ kind: 'error', text: 'Has alcanzado tu límite mensual de 30 operaciones' });
        }
      }
    }, 0);

    // reset
    setAsset(''); setPnlText(''); setEntryPrice(''); setExitPrice('');
    setPositionSize('1'); setCommission(String(defaultCommission ?? 0));
    setMultiplier(String(defaultMultiplier ?? 1));
    setErrorTags([]); setScreenshots([]); setEmotionalState(3); setIsPlanBased(true);
    setAccountId('');
    setSaving(false);
    onClose();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Promise.all(Array.from(files).filter(f => f.type.startsWith('image/')).map(f => new Promise<string>((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f);
    }))).then(arr => setScreenshots(s => [...s, ...arr]));
  };

  const pnlPreviewColor = directValid ? (directPnl > 0 ? '#4f8fff' : directPnl < 0 ? '#ef4444' : '#888898') : '#fff';

  return (
    <div
      className="trace-add-modal"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}
    >
      <style>{css}</style>
      <form
        className="modal-box"
        onClick={e => e.stopPropagation()}
        onSubmit={onSubmit}
        style={{ background: '#111113', border: '1px solid #1e1e20', borderRadius: 14, width: '100%', maxWidth: 720, fontFamily: fontBody, color: '#e0e0e8', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', animation: 'traceModalIn 0.2s ease' }}
      >
        {/* Header */}
        <div style={{ background: '#161618', borderBottom: '1px solid #1e1e20', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1rem', color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
              {editTrade ? 'Editar operación' : 'Añadir operación'}
            </h2>
            {!editTrade && <span style={{ background: 'rgba(79,143,255,0.15)', color: '#4f8fff', fontSize: '0.58rem', padding: '3px 8px', borderRadius: 5, fontWeight: 700, letterSpacing: '0.06em' }}>NUEVO</span>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid #1e1e20', color: '#4a4a60', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✕</button>
        </div>

        {/* Mode toggle */}
        <div style={{ padding: '12px 22px 0' }}>
          <div style={{ display: 'inline-flex', background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 22, padding: 3, gap: 2 }}>
            {(['direct', 'calculated'] as InputMode[]).map(m => {
              const active = inputMode === m;
              return (
                <button key={m} type="button" onClick={() => switchMode(m)} style={{
                  padding: '6px 16px', borderRadius: 18, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  background: active ? '#1e1e28' : 'transparent',
                  border: active ? '1px solid #2a2a35' : '1px solid transparent',
                  color: active ? '#fff' : '#4a4a60', fontFamily: fontBody,
                }}>{m === 'direct' ? 'PnL directo' : 'Cálculo automático'}</button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 20, padding: '18px 22px 22px' }}>
          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Asset */}
            <div>
              <input
                ref={assetRef}
                className="asset-input"
                value={asset}
                onChange={e => setAsset(e.target.value.toUpperCase())}
                placeholder="NQ"
                style={{ fontFamily: fontHead, fontStyle: 'normal', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '0.05em', color: '#fff', background: 'transparent', border: 'none', borderBottom: '2px solid #1e1e20', padding: '6px 0 10px', width: '100%', outline: 'none', transition: 'border-color 0.15s ease' }}
              />
              {fieldErr(errors.asset)}
            </div>

            {/* Direction */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['long', 'short'] as Direction[]).map(d => {
                const active = direction === d;
                const isLong = d === 'long';
                const color = isLong ? '#4f8fff' : '#ef4444';
                return (
                  <button key={d} type="button" onClick={() => setDirection(d)} style={{
                    padding: '10px 16px', borderRadius: 8, fontFamily: fontBody, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    border: `1px solid ${active ? color : '#1e1e20'}`,
                    background: active ? (isLong ? 'rgba(79,143,255,0.1)' : 'rgba(239,68,68,0.08)') : 'transparent',
                    color: active ? color : '#4a4a60',
                    boxShadow: active && isLong ? '0 0 12px rgba(79,143,255,0.15)' : 'none',
                  }}>{d.toUpperCase()}</button>
                );
              })}
            </div>

            {inputMode === 'direct' ? (
              <>
                {/* PnL input */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ ...label, marginBottom: 0 }}>PnL neto</label>
                    <button
                      type="button"
                      onClick={() => setPnlText('0')}
                      style={{
                        background: isBreakEven ? 'rgba(136,136,152,0.15)' : 'transparent',
                        border: `1px solid ${isBreakEven ? '#888898' : '#1e1e20'}`,
                        color: isBreakEven ? '#c8d4e8' : '#4a4a60',
                        borderRadius: 14, padding: '3px 10px', fontSize: '0.62rem', fontWeight: 600,
                        cursor: 'pointer', fontFamily: fontBody,
                      }}
                    >Break even</button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={pnlText}
                      onChange={e => setPnlText(e.target.value)}
                      placeholder="+250.00 / -180.00"
                      inputMode="decimal"
                      style={{ background: '#0a0a0c', border: '1.5px solid #1e1e20', borderRadius: 10, padding: '14px 40px 14px 16px', fontFamily: fontHead, fontWeight: 700, fontSize: '1.4rem', color: pnlPreviewColor, width: '100%', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                    />
                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#4a4a60', fontFamily: fontHead, fontWeight: 700, fontSize: '1.1rem' }}>{currencySymbol}</span>
                  </div>
                  {isBreakEven && <div style={{ fontSize: '0.68rem', color: '#888898', marginTop: 4 }}>Break even · sin ganancia ni pérdida</div>}
                  {fieldErr(errors.pnl)}
                </div>
                {/* Commission */}
                <div>
                  <label style={label}>Comisión (opcional)</label>
                  <input type="number" step="any" value={commission} onChange={e => setCommission(e.target.value)} style={input} />
                  <div style={{ fontSize: '0.68rem', color: '#33334a', marginTop: 4 }}>Se restará del PnL bruto</div>
                </div>
              </>
            ) : (
              <>
                {/* Prices */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={label}>Entrada</label><input type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} style={input} placeholder="0.00" />{fieldErr(errors.entryPrice)}</div>
                  <div><label style={label}>Salida</label><input type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)} style={input} placeholder="0.00" />{fieldErr(errors.exitPrice)}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div><label style={label}>Tamaño</label><input type="number" step="any" value={positionSize} onChange={e => setPositionSize(e.target.value)} style={input} />{fieldErr(errors.positionSize)}</div>
                  <div><label style={label}>Comisión</label><input type="number" step="any" value={commission} onChange={e => setCommission(e.target.value)} style={input} /></div>
                  <div><label style={label}>Multipl.</label><input type="number" step="any" value={multiplier} onChange={e => setMultiplier(e.target.value)} style={input} /></div>
                </div>
                {/* Live preview */}
                <div style={{ position: 'relative', background: '#0a0a0c', border: '1px solid rgba(79,143,255,0.2)', borderRadius: 10, padding: '14px 16px', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #4f8fff, transparent)' }} />
                  <div style={{ ...label, marginBottom: 4 }}>PnL estimado</div>
                  <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.5rem', color: calc.valid ? (calc.pnl >= 0 ? '#4f8fff' : '#ef4444') : '#33334a' }}>
                    {calc.valid ? fmtMoney(calc.pnl) : '—'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#4a4a60', marginTop: 4 }}>Calculado automáticamente · Bruto {calc.valid ? fmtMoney(calc.gross) : '—'}</div>
                </div>
              </>
            )}

            {/* Date + Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10 }}>
              <div><label style={label}>Fecha</label><input type="date" max={todayDate()} value={date} onChange={e => setDate(e.target.value)} style={{ ...input, fontFamily: fontBody }} /></div>
              <div><label style={label}>Hora</label><input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...input, fontFamily: fontBody }} /></div>
            </div>

            {/* Cuenta prop firm (solo si hay cuentas activas) */}
            {activeAccounts.length > 0 && (
              <div>
                <label style={label}>Cuenta</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ ...input, fontFamily: fontBody, cursor: 'pointer' }}>
                  <option value="">Sin asignar</option>
                  {activeAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.firm} · ${Math.round(a.accountSize / 1000)}K</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="modal-right" style={{ background: '#0d0d0f', borderRadius: 10, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ ...label, fontSize: '0.58rem' }}>Sesión</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SESSIONS.map(s => {
                  const active = session === s.value;
                  return <button key={s.value} type="button" onClick={() => setSession(s.value)} style={pill(active, 'blue')}>{s.label}</button>;
                })}
              </div>
            </div>

            <div>
              <label style={{ ...label, fontSize: '0.58rem' }}>Estado emocional</label>
              <div style={{ display: 'flex', gap: 5 }}>
                {EMOTIONS.map(em => {
                  const active = emotionalState === em.v;
                  return <button key={em.v} type="button" onClick={() => setEmotionalState(em.v)} style={{ flex: 1, height: 36, background: active ? 'rgba(79,143,255,0.1)' : '#161618', border: `1px solid ${active ? '#4f8fff' : '#1e1e20'}`, borderRadius: 8, fontSize: '1.1rem', cursor: 'pointer' }}>{em.emoji}</button>;
                })}
              </div>
            </div>

            <div>
              <label style={{ ...label, fontSize: '0.58rem' }}>¿Según el plan?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[true, false].map(v => {
                  const active = isPlanBased === v;
                  return <button key={String(v)} type="button" onClick={() => setIsPlanBased(v)} style={{ padding: '6px 14px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? '#4f8fff' : '#1e1e20'}`, background: active ? 'rgba(79,143,255,0.1)' : '#161618', color: active ? '#4f8fff' : '#4a4a60', fontFamily: fontBody }}>{v ? 'Sí' : 'No'}</button>;
                })}
              </div>
            </div>

            <div>
              <label style={{ ...label, fontSize: '0.58rem' }}>Errores</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {ERROR_TAGS.map(tag => {
                  const active = errorTags.includes(tag);
                  return <button key={tag} type="button" onClick={() => setErrorTags(s => active ? s.filter(t => t !== tag) : [...s, tag])} style={pill(active, 'red')}>{tag}</button>;
                })}
              </div>
            </div>

            {/* Dropzone */}
            <div
              className="drop-zone"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
              style={{ flex: 1, minHeight: 80, border: `1.5px dashed ${isDragOver ? '#4f8fff' : '#1e1e20'}`, background: isDragOver ? 'rgba(79,143,255,0.06)' : 'transparent', borderRadius: 9, padding: '18px 12px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              {screenshots.length === 0 ? (
                <>
                  <div style={{ fontSize: '1.4rem', color: '#2a2a35' }}>📎</div>
                  <div style={{ fontSize: '0.7rem', color: '#4a4a60', marginTop: 4 }}>Arrastra capturas</div>
                  <div style={{ fontSize: '0.7rem', color: '#4a4a60' }}>o <span style={{ color: '#4f8fff', textDecoration: 'underline' }}>busca archivos</span></div>
                </>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
                  {screenshots.map((src, i) => (
                    <div key={i} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                      <img src={src} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #1e1e20', display: 'block' }} />
                      <button type="button" onClick={() => setScreenshots(s => s.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', lineHeight: 1 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            </div>

            <button
              type="submit" className="save-btn" disabled={saving}
              style={{ width: '100%', background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 8, padding: 11, fontFamily: fontBody, fontWeight: 600, fontSize: '0.88rem', cursor: saving ? 'default' : 'pointer', boxShadow: '0 4px 16px rgba(79,143,255,0.25)', transition: 'all 0.15s', opacity: saving ? 0.7 : 1 }}
            >{saving ? 'Guardando…' : (editTrade ? 'Guardar cambios' : 'Guardar →')}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function pill(active: boolean, kind: 'blue' | 'red'): React.CSSProperties {
  const color = kind === 'blue' ? '#4f8fff' : '#ef4444';
  return {
    background: active ? (kind === 'blue' ? 'rgba(79,143,255,0.1)' : 'rgba(239,68,68,0.08)') : '#161618',
    border: `1px solid ${active ? (kind === 'blue' ? '#4f8fff' : 'rgba(239,68,68,0.4)') : '#1e1e20'}`,
    color: active ? color : '#888898',
    borderRadius: 14, padding: '5px 11px', fontSize: '0.7rem', cursor: 'pointer',
    transition: 'all 0.12s', fontFamily: "'Space Grotesk', sans-serif",
  };
}

export default AddTradeModal;
