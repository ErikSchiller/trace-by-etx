import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useTradeStore, useUserTrades,
  calcGrossPnl,
  type Direction, type Session, type EmotionalState, type InputMode,
} from '../../store/tradeStore';
import { useToast } from '../UI/ToastProvider';
import { useSettingsStore, type Currency } from '../../store/settingsStore';
import { usePlan } from '../../hooks/usePlan';
import { useUserAccounts, getActiveAccounts } from '../../store/propFirmStore';
import { useNotebookStore } from '../../store/notebookStore';
import { checkTradeMilestones } from '../../utils/milestones';
import { playSound } from '../../utils/sounds';
import { processImageForUpload } from '../../utils/imageProcessing';
import { ImageLightbox } from '../UI/ImageLightbox';
import {
  X, ArrowUpRight, ArrowDownRight, Calculator, Target, Calendar, Clock,
  ChevronDown, ArrowRight, Info, Check,
} from 'lucide-react';

const MAX_SCREENSHOTS = 5;

const PHASE_LABEL: Record<string, string> = { eval_p1: 'Eval 1', eval_p2: 'Eval 2', funded: 'Funded', passed_pending: 'Passed' };
function firmColor(firm: string) {
  const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#eab308'];
  let h = 0; for (const ch of firm) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  tradeId?: string;
}

// New 6 error tags shown in the selector. Historical tags (Oversized, Sin setup,
// Movió SL…) are NOT listed here but are preserved on trades that already carry
// them — see `errorOptions` below, which appends any already-selected legacy tag.
const ERROR_TAGS = ['FOMO', 'Revenge trade', 'Salida temprana', 'Entrada tardía', 'Overtrading', 'Otro'];
const SESSIONS: { value: Session; label: string }[] = [
  { value: 'london', label: 'Londres' },
  { value: 'new_york', label: 'Nueva York' },
  { value: 'asia', label: 'Asia' },
  { value: 'premarket', label: 'Pre-market' },
];
// Word-based emotional state, mapped to the existing 1–5 numeric scale for
// backward compatibility (Muy malo = 1 … Excelente = 5).
type Tone = 'blue' | 'blueLight' | 'neutral' | 'redLight' | 'red';
const EMOTIONS: { v: EmotionalState; label: string; tone: Tone }[] = [
  { v: 5, label: 'Excelente', tone: 'blue' },
  { v: 4, label: 'Bueno', tone: 'blueLight' },
  { v: 3, label: 'Neutral', tone: 'neutral' },
  { v: 2, label: 'Malo', tone: 'redLight' },
  { v: 1, label: 'Muy malo', tone: 'red' },
];
const CURRENCIES: { code: Currency; symbol: string }[] = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
];

const TONES: Record<Tone, { fg: string; bg: string; bd: string }> = {
  blue:      { fg: '#4f8fff', bg: 'rgba(79,143,255,0.08)', bd: 'rgba(79,143,255,0.4)' },
  blueLight: { fg: '#8bb3ff', bg: 'rgba(79,143,255,0.06)', bd: 'rgba(79,143,255,0.3)' },
  neutral:   { fg: '#f7f8fa', bg: 'rgba(255,255,255,0.06)', bd: 'rgba(255,255,255,0.16)' },
  redLight:  { fg: '#f98a8a', bg: 'rgba(239,68,68,0.06)', bd: 'rgba(239,68,68,0.3)' },
  red:       { fg: '#ef4444', bg: 'rgba(239,68,68,0.08)', bd: 'rgba(239,68,68,0.4)' },
};

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";
const MODE_KEY = 'trace_addtrade_mode';

// Palette (bluer dark per the redesign)
const C = {
  bg: '#0f1115', field: '#1a1d26', border: '#22252e', borderSoft: '#1a1d26',
  primary: '#f7f8fa', muted: '#a1a9ba', label: '#6b7382', faint: '#4a4f5e',
  blue: '#4f8fff', red: '#ef4444',
};

function todayDate() { return new Date().toISOString().slice(0, 10); }
function nowTime() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

const sectionLabel: React.CSSProperties = {
  fontSize: '0.68rem', fontWeight: 600, color: C.label,
  textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: fontBody,
  display: 'block', marginBottom: 10,
};
const fieldInput: React.CSSProperties = {
  background: C.field, border: `1px solid ${C.border}`, borderRadius: 10,
  padding: '14px 18px', color: C.primary, fontFamily: fontBody,
  fontSize: '1rem', fontWeight: 500, width: '100%', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const fieldErr = (msg?: string) => msg ? <div style={{ color: C.red, fontSize: '0.72rem', marginTop: 6 }}>{msg}</div> : null;

function OptLabel({ children }: { children: React.ReactNode }) {
  return <label style={sectionLabel}>{children}<span style={{ color: C.faint, marginLeft: 6 }}>(opcional)</span></label>;
}

function Chip({ active, tone = 'blue', onClick, children, full }: { active: boolean; tone?: Tone; onClick: () => void; children: React.ReactNode; full?: boolean }) {
  const t = TONES[tone];
  return (
    <button type="button" onClick={onClick} style={{
      padding: '10px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 500,
      cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s', fontFamily: fontBody,
      background: active ? t.bg : C.field,
      border: `1px solid ${active ? t.bd : C.border}`,
      color: active ? t.fg : C.muted,
      width: full ? '100%' : undefined,
    }}>{children}</button>
  );
}

const css = `
  @keyframes traceModalIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
  @keyframes traceSpin { to { transform: rotate(360deg); } }
  .trace-add-modal * { box-sizing: border-box; }
  .trace-add-modal input:focus, .trace-add-modal textarea:focus {
    border-color: ${C.blue} !important; box-shadow: 0 0 0 3px rgba(79,143,255,0.08) !important;
  }
  .trace-add-modal input::placeholder, .trace-add-modal textarea::placeholder { color: ${C.faint}; }
  .trace-add-modal .asset-input:focus { border-color: ${C.blue} !important; }
  .trace-add-modal .save-btn:hover:not(:disabled) { background: #6b9fff !important; }
  .trace-add-modal .cancel-btn:hover { background: rgba(255,255,255,0.03); color: ${C.primary}; }
  .trace-add-modal .drop-zone:hover { border-color: ${C.blue} !important; background: rgba(79,143,255,0.03) !important; }
  .trace-add-modal .net-input { color-scheme: dark; }
  .trace-add-modal .dt-input { color-scheme: dark; }
  /* Let grid/flex tracks shrink below their content so nothing overflows horizontally. */
  .trace-add-modal .modal-body > div { min-width: 0; }
  .trace-add-modal .modal-body input, .trace-add-modal .modal-body textarea { min-width: 0; }
  @media (max-width: 900px) {
    .trace-add-modal .modal-box { max-width: 100% !important; width: 100% !important; height: 100vh; max-height: 100vh !important; border-radius: 0 !important; }
    .trace-add-modal .modal-body { grid-template-columns: 1fr !important; gap: 24px !important; }
    .trace-add-modal .dt-grid { grid-template-columns: 1fr !important; }
  }
`;

export function AddTradeModal({ open, onClose, mode = 'create', tradeId }: Props) {
  const addTrade = useTradeStore(s => s.addTrade);
  const updateTrade = useTradeStore(s => s.updateTrade);
  const updateGroup = useTradeStore(s => s.updateGroup);
  const allTrades = useUserTrades();
  const editTrade = mode === 'edit' && tradeId ? allTrades.find(t => t.id === tradeId) : undefined;
  const { push } = useToast();
  const defaultCommission = useSettingsStore(s => s.defaultCommission);
  const defaultMultiplier = useSettingsStore(s => s.defaultMultiplier);
  const currencySymbol = useSettingsStore(s => s.currencySymbol);
  const updateSettings = useSettingsStore(s => s.updateSettings);
  const dailyLossLimit = useSettingsStore(s => s.dailyLossLimit);
  const cardSuggest = useSettingsStore(s => s.cardSuggest);
  const { isFree } = usePlan();
  const allAccounts = useUserAccounts();
  const activeAccounts = useMemo(() => getActiveAccounts(allAccounts), [allAccounts]);
  const upsertTradeNote = useNotebookStore(s => s.upsertTradeNote);
  const deleteNotesByTrade = useNotebookStore(s => s.deleteNotesByTrade);

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
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [editScope, setEditScope] = useState<'one' | 'group'>('one');
  const [quickNote, setQuickNote] = useState('');
  const groupMembers = useMemo(
    () => (editTrade?.groupId ? allTrades.filter(t => t.groupId === editTrade.groupId) : []),
    [editTrade?.groupId, allTrades],
  );
  const [emotionalState, setEmotionalState] = useState<EmotionalState>(3);
  const [isPlanBased, setIsPlanBased] = useState(true);
  const [errorTags, setErrorTags] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploadingShots, setUploadingShots] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTrade, setSavedTrade] = useState<import('../../store/tradeStore').Trade | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const assetRef = useRef<HTMLInputElement>(null);

  // Pre-fill on edit / focus on open
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSavedTrade(null);
    setAccountMenuOpen(false);
    setCurrencyMenuOpen(false);
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
      setAccountIds(editTrade.accountId ? [editTrade.accountId] : []);
      setEditScope('one');
      setQuickNote(editTrade.quickNote ?? '');
      setEmotionalState(editTrade.emotionalState);
      setIsPlanBased(editTrade.isPlanBased);
      setErrorTags(editTrade.errorTags);
      setScreenshots(editTrade.screenshots);
    } else {
      // New trade: re-sync commission/multiplier to the CURRENT settings defaults.
      // (They are only seeded once at mount, so later Settings changes were stale.)
      setCommission(String(defaultCommission ?? 0));
      setMultiplier(String(defaultMultiplier ?? 1));
      // Auto-select the only active account, if there is exactly one.
      setAccountIds(activeAccounts.length === 1 ? [activeAccounts[0].id] : []);
    }
    setTimeout(() => assetRef.current?.focus(), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tradeId]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !lightboxOpen) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, lightboxOpen]);

  // Safety net: never let the Guardar button strand on "Guardando…" if, despite
  // the try/finally in onSubmit, the saving state is somehow left on.
  useEffect(() => {
    if (!saving) return;
    const to = setTimeout(() => {
      setSaving(false);
      push({ kind: 'error', text: 'El guardado tardó demasiado. Inténtalo de nuevo.' });
    }, 10000);
    return () => clearTimeout(to);
  }, [saving, push]);

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
    if (saving) return; // guard against double-submit while a save is in flight
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) { push({ kind: 'error', text: 'Revisa los campos marcados' }); return; }
    setSaving(true);

    try {
    const cm = parseFloat(commission) || 0;
    const assetUp = asset.trim().toUpperCase();
    const common = {
      date, time,
      asset: assetUp,
      direction,
      commission: cm,
      session, emotionalState, isPlanBased, errorTags, screenshots,
      setup: editTrade?.setup ?? '',
      stopLoss: 0, takeProfit: 0,
      exitType: 'manual' as const,
      entryReason: editTrade?.entryReason ?? '',
      postTradeNotes: editTrade?.postTradeNotes ?? '',
      inputMode,
      quickNote: quickNote.trim() ? quickNote.trim().slice(0, 500) : undefined,
    };
    const modeFields = inputMode === 'direct'
      ? { pnl: directPnl, entryPrice: 0, exitPrice: 0, positionSize: 1, multiplier: 1 }
      : { entryPrice: parseFloat(entryPrice), exitPrice: parseFloat(exitPrice), positionSize: parseFloat(positionSize), multiplier: parseFloat(multiplier) || 1 };

    // Each account links the trade to its CURRENT phase (eval vs funded).
    const phaseIdFor = (accId?: string) => accId ? allAccounts.find(a => a.id === accId)?.currentPhaseId : undefined;

    // Keep the auto-linked Trade Notes note in sync with the quickNote.
    const syncNote = (tradeId: string) => {
      const note = quickNote.trim();
      if (note) upsertTradeNote(tradeId, `${assetUp} · ${date}`, note.slice(0, 500));
      else deleteNotesByTrade(tradeId);
    };

    if (editTrade) {
      const upd = { ...common, ...modeFields };
      if (editScope === 'group' && editTrade.groupId) {
        updateGroup(editTrade.groupId, upd);
        groupMembers.forEach(m => syncNote(m.id));
      } else {
        updateTrade(editTrade.id, { ...upd, accountId: accountIds[0] || undefined, accountPhaseId: phaseIdFor(accountIds[0] || undefined) });
        syncNote(editTrade.id);
      }
      push({ kind: 'success', text: editScope === 'group' && editTrade.groupId ? `Grupo actualizado (${groupMembers.length} operaciones)` : 'Operación actualizada' });
      setSaving(false);
      onClose();
      return;
    }

    // Create — one trade per selected account (shared groupId when > 1).
    const selected = accountIds;
    const groupId = selected.length > 1 ? crypto.randomUUID() : undefined;
    const isMultiAccount = selected.length > 1;
    const targets: (string | undefined)[] = selected.length === 0 ? [undefined] : selected;
    const createdTrades = targets.map(acc =>
      addTrade({ ...common, ...modeFields, accountId: acc, accountPhaseId: phaseIdFor(acc), groupId, isMultiAccount, directPnl: inputMode === 'direct' ? directPnl : undefined })
    );
    syncNote(createdTrades[0].id);
    push({ kind: 'success', text: selected.length > 1 ? `Operación guardada en ${selected.length} cuentas ✓` : 'Operación guardada' });

    // Sound cue based on the trade result, then one-time milestone celebrations.
    const primaryPnl = createdTrades[0].pnl;
    if (primaryPnl > 0) playSound('positive');
    else if (primaryPnl < 0) playSound('alert');
    checkTradeMilestones();

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

    // Show the in-modal success screen (offers the PnL Card generator) instead
    // of closing immediately. The success screen's buttons reset + close.
    setSavedTrade(createdTrades[0]);
    } catch (err) {
      console.error('[AddTradeModal] Error al guardar la operación:', err);
      // localStorage quota is the most common real failure here: screenshots are
      // stored inline as base64, so a few can exhaust the ~5MB budget. Give an
      // actionable message instead of the raw browser error.
      const isQuota = err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22);
      push({
        kind: 'error',
        text: isQuota
          ? 'Almacenamiento lleno: no se pudo guardar. Quita capturas de esta operación o elimina operaciones antiguas para liberar espacio.'
          : (err instanceof Error && err.message ? err.message : 'Error al guardar la operación'),
      });
    } finally {
      // Guarantee the Guardar button never strands on "Guardando…" no matter what throws.
      setSaving(false);
    }
  };

  const resetForm = () => {
    setAsset(''); setPnlText(''); setEntryPrice(''); setExitPrice('');
    setPositionSize('1'); setCommission(String(defaultCommission ?? 0));
    setMultiplier(String(defaultMultiplier ?? 1));
    setErrorTags([]); setScreenshots([]); setEmotionalState(3); setIsPlanBased(true);
    setAccountIds([]); setQuickNote('');
    setSavedTrade(null);
  };
  const closeAfterSave = () => { resetForm(); onClose(); };
  const openCardFor = (id: string) => { closeAfterSave(); setTimeout(() => window.dispatchEvent(new CustomEvent('trace:open-pnl-card', { detail: { tradeId: id } })), 60); };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!images.length) return;
    const remaining = MAX_SCREENSHOTS - screenshots.length;
    if (remaining <= 0) { push({ kind: 'error', text: `Máximo ${MAX_SCREENSHOTS} imágenes por operación` }); return; }
    if (images.length > remaining) { push({ kind: 'error', text: `Solo puedes añadir ${remaining} imagen${remaining === 1 ? '' : 'es'} más (máx ${MAX_SCREENSHOTS})` }); }

    setUploadingShots(true);
    for (const file of images.slice(0, remaining)) {
      try {
        const processed = await processImageForUpload(file);
        setScreenshots(s => (s.length >= MAX_SCREENSHOTS ? s : [...s, processed]));
      } catch (err) {
        push({ kind: 'error', text: err instanceof Error ? err.message : 'Error al procesar imagen' });
      }
    }
    setUploadingShots(false);
  };

  // ── Success screen after saving a trade (offers the PnL Card generator) ──
  if (savedTrade) {
    const col = savedTrade.pnl > 0 ? C.blue : savedTrade.pnl < 0 ? C.red : '#888898';
    const cutoff = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })();
    const recent = allTrades.filter(t => t.date >= cutoff);
    const maxRecent = recent.length ? Math.max(...recent.map(t => t.pnl)) : 0;
    const isRecord = savedTrade.pnl > 0 && recent.length > 1 && savedTrade.pnl >= maxRecent;
    const bigR = (savedTrade.realRR || 0) >= 3;
    const standout = (isRecord || bigR) && cardSuggest;
    return (
      <div className="trace-add-modal" onClick={closeAfterSave} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
        <style>{css}</style>
        <div onClick={e => e.stopPropagation()} style={{ background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 16, width: '100%', maxWidth: 440, fontFamily: fontBody, color: C.primary, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', animation: 'traceModalIn 0.2s ease', textAlign: 'center', padding: '36px 28px' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', margin: '0 auto 18px', background: 'rgba(79,143,255,0.12)', border: '2px solid rgba(79,143,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue, animation: 'traceModalIn 0.35s ease' }}><Check size={34} /></div>
          <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.1rem', color: C.primary }}>Operación guardada</div>
          <div style={{ fontSize: '0.9rem', color: C.muted, marginTop: 6 }}>Net PnL: <b style={{ color: col }}>{fmtMoney(savedTrade.pnl)}</b></div>
          {standout && (
            <div style={{ marginTop: 16, background: 'rgba(120,97,255,0.08)', border: '1px solid rgba(120,97,255,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem', color: '#c8d4e8' }}>
              {isRecord ? '🎉 ¡Nuevo récord del mes! Compártelo →' : '🔥 Gran trade (+3R). Compártelo →'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <button onClick={closeAfterSave} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 10, padding: 12, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>Cerrar</button>
            <button onClick={() => openCardFor(savedTrade.id)} style={{ flex: 1.4, background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: fontBody }}>Generar PnL Card ✨</button>
          </div>
        </div>
      </div>
    );
  }

  const pnlColor = !pnlText.trim() ? C.primary : directValid ? (directPnl > 0 ? C.blue : directPnl < 0 ? C.red : C.muted) : C.primary;
  const onPnlBlur = () => { if (directValid) setPnlText((directPnl > 0 ? '+' : '') + String(directPnl)); };

  // New-6 tags plus any legacy tag already on the trade (kept visible/removable).
  const errorOptions = [...ERROR_TAGS, ...errorTags.filter(t => !ERROR_TAGS.includes(t))];

  const selectedAccounts = activeAccounts.filter(a => accountIds.includes(a.id));

  return (
    <div
      className="trace-add-modal"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', overflowY: 'auto' }}
    >
      <style>{css}</style>
      <form
        className="modal-box"
        onClick={e => e.stopPropagation()}
        onSubmit={onSubmit}
        style={{ background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 16, width: '100%', maxWidth: 1140, maxHeight: '90vh', display: 'flex', flexDirection: 'column', fontFamily: fontBody, color: C.primary, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', animation: 'traceModalIn 0.2s ease' }}
      >
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: `1px solid ${C.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.25rem', color: C.primary, margin: 0, letterSpacing: '-0.01em' }}>
              {editTrade ? 'Editar operación' : 'Añadir operación'}
            </h2>
            {!editTrade && <span style={{ background: C.blue, color: '#fff', fontSize: '0.6rem', padding: '3px 8px', borderRadius: 5, fontWeight: 700, letterSpacing: '0.08em' }}>NUEVO</span>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: 8, background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '28px 32px' }}>
          {/* Grouped-trade edit banner */}
          {editTrade?.groupId && groupMembers.length > 1 && (
            <div style={{ marginBottom: 20, background: 'rgba(79,143,255,0.08)', border: '1px solid rgba(79,143,255,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: '0.8rem', color: '#c8d4e8' }}>
              <div style={{ marginBottom: 8 }}>🔗 Esta operación está agrupada con {groupMembers.length - 1} más (misma entrada en distintas cuentas).</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {([['one', 'Editar solo esta operación'], ['group', 'Editar todas las del grupo']] as const).map(([scope, lbl]) => (
                  <label key={scope} onClick={() => setEditScope(scope)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.76rem', color: editScope === scope ? C.blue : C.muted }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: `1px solid ${editScope === scope ? C.blue : '#33334a'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {editScope === scope && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.blue }} />}
                    </span>
                    {lbl}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
            {/* ───────────── LEFT COLUMN ───────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Mode toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([['direct', 'PnL directo', Target], ['calculated', 'Cálculo automático', Calculator]] as const).map(([m, lbl, Icon]) => {
                  const active = inputMode === m;
                  return (
                    <button key={m} type="button" onClick={() => switchMode(m)} style={{
                      padding: '16px 20px', borderRadius: 12, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', fontWeight: 600, fontFamily: fontBody, transition: 'all 0.15s',
                      background: active ? 'rgba(79,143,255,0.08)' : C.field,
                      border: `1px solid ${active ? 'rgba(79,143,255,0.4)' : C.border}`,
                      color: active ? C.blue : C.muted,
                      boxShadow: active ? '0 0 0 3px rgba(79,143,255,0.08)' : 'none',
                    }}><Icon size={18} />{lbl}</button>
                  );
                })}
              </div>

              {/* Símbolo (activo) — required for saving */}
              <div>
                <label style={sectionLabel}>Símbolo</label>
                <input
                  ref={assetRef}
                  className="asset-input"
                  value={asset}
                  onChange={e => setAsset(e.target.value.toUpperCase())}
                  placeholder="NQ, ES, EURUSD…"
                  style={{ ...fieldInput, fontWeight: 700, letterSpacing: '0.04em' }}
                />
                {fieldErr(errors.asset)}
              </div>

              {inputMode === 'direct' ? (
                <>
                  {/* Resultado neto */}
                  <div>
                    <label style={{ ...sectionLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                      Resultado neto
                      <span title="El PnL neto después de comisiones" style={{ display: 'inline-flex', color: C.faint, cursor: 'help' }}><Info size={12} /></span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                      <input
                        className="net-input"
                        value={pnlText}
                        onChange={e => setPnlText(e.target.value)}
                        onBlur={onPnlBlur}
                        placeholder="0.00"
                        inputMode="decimal"
                        style={{ background: C.field, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', fontFamily: fontHead, fontWeight: 800, fontSize: '2.4rem', letterSpacing: '-0.02em', color: pnlColor, width: '100%', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                      />
                      <div style={{ position: 'relative' }}>
                        <button type="button" onClick={() => setCurrencyMenuOpen(o => !o)} style={{ height: '100%', background: C.field, border: `1px solid ${C.border}`, borderRadius: 12, padding: '0 18px', display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: '1.3rem', color: C.primary, fontFamily: fontBody }}>
                          {currencySymbol}<ChevronDown size={18} color={C.muted} />
                        </button>
                        {currencyMenuOpen && (
                          <>
                            <div onClick={() => setCurrencyMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 11, background: C.field, border: `1px solid ${C.border}`, borderRadius: 10, padding: 6, minWidth: 120, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
                              {CURRENCIES.map(cur => (
                                <button key={cur.code} type="button" onClick={() => { updateSettings({ currency: cur.code }); setCurrencyMenuOpen(false); }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 7, background: currencySymbol === cur.symbol ? 'rgba(79,143,255,0.1)' : 'transparent', border: 'none', color: currencySymbol === cur.symbol ? C.blue : C.muted, cursor: 'pointer', fontFamily: fontBody, fontSize: '0.85rem' }}>
                                  <span style={{ fontSize: '1rem' }}>{cur.symbol}</span>{cur.code}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {isBreakEven && <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: 6 }}>Break even · sin ganancia ni pérdida</div>}
                    {fieldErr(errors.pnl)}
                  </div>
                </>
              ) : (
                <>
                  {/* Cálculo automático inputs */}
                  <div>
                    <label style={sectionLabel}>Precios y tamaño</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div><input type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} style={fieldInput} placeholder="Entrada" />{fieldErr(errors.entryPrice)}</div>
                      <div><input type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)} style={fieldInput} placeholder="Salida" />{fieldErr(errors.exitPrice)}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div><input type="number" step="any" value={positionSize} onChange={e => setPositionSize(e.target.value)} style={fieldInput} placeholder="Tamaño" />{fieldErr(errors.positionSize)}</div>
                      <div><input type="number" step="any" value={commission} onChange={e => setCommission(e.target.value)} style={fieldInput} placeholder="Comisión" /></div>
                      <div><input type="number" step="any" value={multiplier} onChange={e => setMultiplier(e.target.value)} style={fieldInput} placeholder="Multipl." /></div>
                    </div>
                    <div style={{ position: 'relative', background: C.field, border: '1px solid rgba(79,143,255,0.2)', borderRadius: 12, padding: '16px 18px', overflow: 'hidden', marginTop: 12 }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #4f8fff, transparent)' }} />
                      <div style={{ ...sectionLabel, marginBottom: 4 }}>PnL estimado</div>
                      <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.6rem', color: calc.valid ? (calc.pnl >= 0 ? C.blue : C.red) : C.faint }}>
                        {calc.valid ? fmtMoney(calc.pnl) : '—'}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: C.muted, marginTop: 4 }}>Calculado automáticamente · Bruto {calc.valid ? fmtMoney(calc.gross) : '—'}</div>
                    </div>
                  </div>
                </>
              )}

              {/* Long / Short */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([['long', ArrowUpRight], ['short', ArrowDownRight]] as const).map(([d, Icon]) => {
                  const active = direction === d;
                  const isLong = d === 'long';
                  const color = isLong ? C.blue : C.red;
                  return (
                    <button key={d} type="button" onClick={() => setDirection(d)} style={{
                      padding: '18px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.08em', fontFamily: fontBody, transition: 'all 0.15s',
                      background: active ? (isLong ? 'rgba(79,143,255,0.08)' : 'rgba(239,68,68,0.08)') : C.field,
                      border: `1px solid ${active ? (isLong ? 'rgba(79,143,255,0.5)' : 'rgba(239,68,68,0.5)') : C.border}`,
                      color: active ? color : C.muted,
                      boxShadow: active ? `0 0 0 3px ${isLong ? 'rgba(79,143,255,0.08)' : 'rgba(239,68,68,0.08)'}` : 'none',
                    }}><Icon size={22} />{d.toUpperCase()}</button>
                  );
                })}
              </div>

              {/* Comisión (direct mode only) */}
              {inputMode === 'direct' && (
                <div>
                  <OptLabel>Comisión</OptLabel>
                  <div style={{ position: 'relative' }}>
                    <input type="number" step="any" value={commission} onChange={e => setCommission(e.target.value)} placeholder="0.00" style={{ ...fieldInput, paddingRight: 36 }} />
                    <span style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: C.faint }}>{currencySymbol}</span>
                  </div>
                </div>
              )}

              {/* Fecha + Hora */}
              <div className="dt-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={sectionLabel}>Fecha</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.field, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
                    <Calendar size={16} color={C.label} style={{ flexShrink: 0 }} />
                    <input className="dt-input" type="date" max={todayDate()} value={date} onChange={e => setDate(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: C.primary, fontFamily: fontBody, fontSize: '0.92rem', width: '100%' }} />
                  </div>
                </div>
                <div>
                  <label style={sectionLabel}>Hora</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.field, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
                    <Clock size={16} color={C.label} style={{ flexShrink: 0 }} />
                    <input className="dt-input" type="time" value={time} onChange={e => setTime(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: C.primary, fontFamily: fontBody, fontSize: '0.92rem', width: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Nota de la operación */}
              <div>
                <OptLabel>Nota de la operación</OptLabel>
                <div style={{ position: 'relative' }}>
                  <textarea
                    value={quickNote}
                    onChange={e => setQuickNote(e.target.value.slice(0, 500))}
                    placeholder="Escribe una nota sobre la operación..."
                    style={{ background: C.field, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', minHeight: 90, resize: 'vertical', fontSize: '0.9rem', color: C.primary, lineHeight: 1.55, width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: fontBody, transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  />
                  <span style={{ position: 'absolute', right: 12, bottom: 10, fontSize: '0.65rem', color: quickNote.length >= 500 ? C.red : C.faint }}>{quickNote.length}/500</span>
                </div>
              </div>

              {/* Capturas */}
              <div>
                <OptLabel>Capturas</OptLabel>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                <div
                  className="drop-zone"
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
                  onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
                  style={{ display: 'flex', gap: 10, flexWrap: 'wrap', minHeight: 100, alignItems: 'flex-start', padding: 12, borderRadius: 12, border: `1.5px dashed ${isDragOver ? C.blue : C.border}`, background: isDragOver ? 'rgba(79,143,255,0.04)' : 'transparent', transition: 'all 0.15s' }}
                >
                  {screenshots.map((src, i) => (
                    <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                      <img src={src} alt={`Captura ${i + 1}`} title="Ver captura" onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.border}`, display: 'block', cursor: 'pointer' }} />
                      <button type="button" aria-label="Quitar captura" onClick={() => setScreenshots(s => s.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: C.red, border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                  {screenshots.length < MAX_SCREENSHOTS && (
                    <button type="button" onClick={() => fileRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 8, border: `1.5px dashed ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: fontBody }}>
                      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>+</span>
                      <span style={{ fontSize: '0.6rem' }}>añadir ({screenshots.length}/{MAX_SCREENSHOTS})</span>
                    </button>
                  )}
                  {uploadingShots && <span style={{ fontSize: '0.7rem', color: C.blue, alignSelf: 'center' }}>Procesando…</span>}
                </div>
              </div>
            </div>

            {/* ───────────── RIGHT COLUMN ───────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {/* Cuenta */}
              {activeAccounts.length > 0 && (
                <div>
                  <label style={sectionLabel}>Cuenta</label>
                  <div style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setAccountMenuOpen(o => !o)} style={{ width: '100%', background: C.field, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                      {selectedAccounts.length === 1 ? (
                        <>
                          <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: firmColor(selectedAccounts[0].firm), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700 }}>{selectedAccounts[0].firm.slice(0, 2).toUpperCase()}</span>
                          <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: C.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedAccounts[0].firm}</span>
                            <span style={{ fontSize: '0.72rem', color: C.muted }}>{Math.round(selectedAccounts[0].accountSize / 1000)}K</span>
                          </span>
                          <PhaseBadge phase={selectedAccounts[0].phase} />
                        </>
                      ) : selectedAccounts.length > 1 ? (
                        <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600, color: C.primary }}>{selectedAccounts.length} cuentas seleccionadas</span>
                      ) : (
                        <span style={{ flex: 1, fontSize: '0.88rem', color: C.muted }}>Sin cuenta asignada</span>
                      )}
                      <ChevronDown size={14} color={C.muted} style={{ flexShrink: 0 }} />
                    </button>
                    {accountMenuOpen && (
                      <>
                        <div onClick={() => setAccountMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 11, background: C.field, border: `1px solid ${C.border}`, borderRadius: 10, padding: 6, boxShadow: '0 12px 30px rgba(0,0,0,0.5)', maxHeight: 280, overflowY: 'auto' }}>
                        {activeAccounts.map(a => {
                          const sel = accountIds.includes(a.id);
                          return (
                            <button key={a.id} type="button" onClick={() => setAccountIds(ids => ids.includes(a.id) ? ids.filter(x => x !== a.id) : [...ids, a.id])} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, background: sel ? 'rgba(79,143,255,0.1)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                              <span style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1px solid ${sel ? C.blue : C.border}`, background: sel ? C.blue : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{sel && <Check size={11} color="#fff" />}</span>
                              <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: firmColor(a.firm), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700 }}>{a.firm.slice(0, 2).toUpperCase()}</span>
                              <span style={{ flex: 1, fontSize: '0.82rem', color: C.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.firm} <span style={{ color: C.muted }}>{Math.round(a.accountSize / 1000)}K</span></span>
                              <PhaseBadge phase={a.phase} />
                            </button>
                          );
                        })}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px 4px', fontSize: '0.72rem' }}>
                          <span onClick={() => setAccountIds(activeAccounts.map(a => a.id))} style={{ color: C.blue, cursor: 'pointer' }}>Seleccionar todas</span>
                          <span onClick={() => setAccountIds([])} style={{ color: C.blue, cursor: 'pointer' }}>Ninguna</span>
                        </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Sesión */}
              <div>
                <label style={sectionLabel}>Sesión</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {SESSIONS.map(s => (
                    <Chip key={s.value} active={session === s.value} tone="blue" onClick={() => setSession(s.value)} full>{s.label}</Chip>
                  ))}
                </div>
              </div>

              {/* Estado emocional */}
              <div>
                <label style={sectionLabel}>Estado emocional</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EMOTIONS.map(em => (
                    <Chip key={em.v} active={emotionalState === em.v} tone={em.tone} onClick={() => setEmotionalState(em.v)}>{em.label}</Chip>
                  ))}
                </div>
              </div>

              {/* ¿Según el plan? */}
              <div>
                <label style={sectionLabel}>¿Según el plan?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Chip active={isPlanBased === true} tone="blue" onClick={() => setIsPlanBased(true)} full>Sí</Chip>
                  <Chip active={isPlanBased === false} tone="red" onClick={() => setIsPlanBased(false)} full>No</Chip>
                </div>
              </div>

              {/* Errores */}
              <div>
                <OptLabel>Errores</OptLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {errorOptions.map(tag => {
                    const active = errorTags.includes(tag);
                    return <Chip key={tag} active={active} tone="red" onClick={() => setErrorTags(s => active ? s.filter(t => t !== tag) : [...s, tag])}>{tag}</Chip>;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px', borderTop: `1px solid ${C.borderSoft}`, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button type="button" className="cancel-btn" onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '12px 24px', borderRadius: 10, fontSize: '0.92rem', fontWeight: 500, cursor: 'pointer', fontFamily: fontBody, transition: 'all 0.15s' }}>Cancelar</button>
          <button type="submit" className="save-btn" disabled={saving} style={{ background: C.blue, color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontSize: '0.92rem', fontWeight: 600, cursor: saving ? 'default' : 'pointer', fontFamily: fontBody, display: 'inline-flex', alignItems: 'center', gap: 10, opacity: saving ? 0.6 : 1, transition: 'all 0.15s' }}>
            {saving ? (
              <>
                <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', display: 'inline-block', animation: 'traceSpin 0.7s linear infinite' }} />
                Guardando…
              </>
            ) : (
              <>{editTrade ? 'Guardar cambios' : 'Guardar operación'}<ArrowRight size={16} /></>
            )}
          </button>
        </div>

        <ImageLightbox
          images={screenshots}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          caption={asset ? `${asset} — captura` : 'Captura'}
          tradeId={tradeId}
        />
      </form>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const funded = phase === 'funded';
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600, flexShrink: 0, fontFamily: fontBody,
      background: funded ? 'rgba(79,143,255,0.12)' : 'rgba(255,255,255,0.06)',
      color: funded ? C.blue : C.muted,
    }}>{PHASE_LABEL[phase] ?? phase}</span>
  );
}

export default AddTradeModal;
