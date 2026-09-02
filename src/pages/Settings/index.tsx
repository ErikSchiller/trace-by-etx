import { useMemo, useRef, useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore, type Currency, type Settings, TIMEZONES } from '../../store/settingsStore';
import { useTradeStore, useUserTrades } from '../../store/tradeStore';
import { useNotebookStore } from '../../store/notebookStore';
import { useToast } from '../../components/UI/ToastProvider';
import { useUpgradeModal } from '../../store/upgradeModalStore';
import { usePlan } from '../../hooks/usePlan';
import { ProLock } from '../../components/UI/ProLock';
import { Button } from '../../components/UI/Button';
import { Toggle } from '../../components/UI/Toggle';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';
import { exportToCSV, exportToJSON, parseCSV, applyAccentColor } from '../../utils/export';
import { previewSound } from '../../utils/sounds';
import { isAffiliateVisible, setAffiliateVisible } from '../../config/affiliates';
import i18n, { useTranslation } from '../../i18n/i18n';

/** Resize an image data URL to a square 200x200 JPEG. */
function resizeAvatar(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 200;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const fontHead = "'Syne', sans-serif";
const fontBody = "'Space Grotesk', sans-serif";

type SectionKey = 'profile' | 'appearance' | 'trading' | 'plan' | 'notifications' | 'language' | 'security' | 'data' | 'danger';
const SECTIONS: { id: SectionKey; label: string; icon: string }[] = [
  { id: 'profile', label: 'Mi perfil', icon: '👤' },
  { id: 'appearance', label: 'Apariencia', icon: '🎨' },
  { id: 'trading', label: 'Trading', icon: '📈' },
  { id: 'plan', label: 'Plan y facturación', icon: '💳' },
  { id: 'notifications', label: 'Notificaciones', icon: '🔔' },
  { id: 'language', label: 'Idioma y región', icon: '🌐' },
  { id: 'security', label: 'Seguridad', icon: '🔐' },
  { id: 'data', label: 'Datos y exportación', icon: '📊' },
  { id: 'danger', label: 'Zona de peligro', icon: '⚠️' },
];

const ACCENT_COLORS = ['#4f8fff', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#06b6d4', '#ffffff'];

const inp: React.CSSProperties = {
  fontFamily: fontBody, background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 8,
  padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box',
};

function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  if (!p[0]) return '?';
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'; }

/** Fields committed via the floating save bar (form-like). */
type Draft = {
  name: string;
  accountSize: number; dailyLossLimit: number; defaultCommission: number; defaultMultiplier: number;
  currency: Currency; timezone: string; defaultInputMode: 'direct' | 'calculated';
  numberFormat: 'es' | 'us'; dateFormat: 'dmy' | 'mdy' | 'ymd';
};

export default function Settings() {
  const [section, setSection] = useState<SectionKey>('profile');
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);
  const updateAvatar = useAuthStore(s => s.updateAvatar);
  const downgrade = useAuthStore(s => s.downgradeToFree);
  const settings = useSettingsStore();
  const trades = useUserTrades();
  const clearTrades = useTradeStore(s => s.clearAll);
  const clearNotes = useNotebookStore(s => s.clearAll);
  const allNotes = useNotebookStore(s => s.notes);
  const { push } = useToast();
  const openUpgrade = useUpgradeModal(s => s.open);
  const { isPro, isFree } = usePlan();
  const { t } = useTranslation();

  const baseDraft: Draft = useMemo(() => ({
    name: user?.name ?? '',
    accountSize: settings.accountSize, dailyLossLimit: settings.dailyLossLimit,
    defaultCommission: settings.defaultCommission, defaultMultiplier: settings.defaultMultiplier,
    currency: settings.currency, timezone: settings.timezone, defaultInputMode: settings.defaultInputMode,
    numberFormat: settings.numberFormat, dateFormat: settings.dateFormat,
  }), [user?.name, settings.accountSize, settings.dailyLossLimit, settings.defaultCommission, settings.defaultMultiplier, settings.currency, settings.timezone, settings.defaultInputMode, settings.numberFormat, settings.dateFormat]);

  const [draft, setDraft] = useState<Draft>(baseDraft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseDraft);
  const setD = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }));

  const saveDraft = () => {
    if (draft.name.trim() && draft.name !== user?.name) updateUser({ name: draft.name.trim() });
    const s: Partial<Settings> = {
      accountSize: draft.accountSize, dailyLossLimit: draft.dailyLossLimit, defaultCommission: draft.defaultCommission,
      defaultMultiplier: draft.defaultMultiplier, currency: draft.currency, timezone: draft.timezone,
      defaultInputMode: draft.defaultInputMode, numberFormat: draft.numberFormat, dateFormat: draft.dateFormat,
    };
    settings.updateSettings(s);
    push({ kind: 'success', text: 'Cambios guardados' });
  };

  const onPickColor = (hex: string) => { settings.updateSettings({ accentColor: hex }); applyAccentColor(hex); };

  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const onImportCSV = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const parsed = await parseCSV(files[0]);
    push({ kind: 'success', text: `${parsed.length} operaciones leídas del CSV` });
  };
  const onAvatarFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const resized = await resizeAvatar(reader.result as string);
      updateAvatar(resized);
      push({ kind: 'success', text: 'Foto actualizada' });
    };
    reader.readAsDataURL(file);
  };
  const changeLanguage = (lang: 'es' | 'en') => {
    settings.updateSettings({ language: lang });
    i18n.changeLanguage(lang);
    push({ kind: 'success', text: i18n.t('toast.languageUpdated') });
  };

  const [affVisible, setAffVisible] = useState(isAffiliateVisible());
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteAcct, setConfirmDeleteAcct] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [dangerText, setDangerText] = useState('');
  const [emailText, setEmailText] = useState('');

  if (!user) return null;
  const initials = getInitials(draft.name || user.name);
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthCount = trades.filter(t => t.date.startsWith(monthPrefix)).length;

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* LEFT NAV */}
      <nav style={{ width: 220, flexShrink: 0, background: '#0d0d0f', borderRight: '1px solid var(--border-subtle)', padding: '24px 12px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, padding: '0 12px 12px' }}>Ajustes</div>
        {SECTIONS.map(s => {
          const active = section === s.id;
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{
                fontFamily: fontBody, display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: active ? '8px 12px 8px 10px' : '8px 12px', borderRadius: 6, marginBottom: 2, fontSize: '0.82rem', cursor: 'pointer',
                border: 'none', borderLeft: active ? '2px solid var(--blue)' : '2px solid transparent',
                background: active ? 'rgba(79,143,255,0.08)' : 'transparent', color: active ? 'var(--blue)' : '#c8c8d8',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#c8c8d8'; } }}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{s.icon}</span>
              <span style={{ flex: 1 }}>{t(`settings.${s.id}`)}</span>
            </button>
          );
        })}
        <div style={{ marginTop: 'auto', padding: '16px 12px 0', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <div>TRACE v0.1.0</div>
          <a href="/changelog" style={{ color: 'var(--blue)', textDecoration: 'none' }}>Últimos cambios →</a>
        </div>
      </nav>

      {/* RIGHT CONTENT */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ maxWidth: 720, padding: '40px 48px' }}>
            {section === 'profile' && (
              <Section title="Mi perfil" subtitle="Gestiona tu información personal.">
                <Row label="Foto de perfil" desc="Se muestra en el sidebar y al exportar reportes.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {user.avatar
                      ? <img src={user.avatar} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(79,143,255,0.2)', flexShrink: 0 }} />
                      : <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(79,143,255,0.15)', border: '1px solid rgba(79,143,255,0.2)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontHead, fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{initials}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <Button variant="ghost" size="sm" onClick={() => avatarRef.current?.click()}>Subir imagen</Button>
                      <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onAvatarFile(e.target.files)} />
                      {user.avatar && <span style={{ fontSize: '0.68rem', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => { updateAvatar(undefined); push({ kind: 'success', text: 'Foto eliminada' }); }}>Eliminar</span>}
                    </div>
                  </div>
                </Row>
                <Row label="Nombre" desc="Cómo apareces en TRACE.">
                  <input value={draft.name} onChange={e => setD('name', e.target.value)} style={inp} />
                </Row>
                <Row label="Email" desc="Se usa para iniciar sesión.">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input value={user.email} readOnly style={{ ...inp, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }} />
                    <span style={{ fontSize: '0.68rem', color: 'var(--blue)', cursor: 'pointer' }} onClick={() => push({ kind: 'info', text: 'Cambio de email próximamente con Supabase' })}>Cambiar</span>
                  </div>
                </Row>
                <Row label="Zona horaria" desc="Afecta a fechas y horas mostradas." last>
                  <select value={draft.timezone} onChange={e => setD('timezone', e.target.value)} style={inp}>
                    {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </Row>
              </Section>
            )}

            {section === 'appearance' && (
              <Section title="Apariencia" subtitle="Personaliza cómo se ve TRACE.">
                <ProLock feature="Apariencia" description="Personaliza colores y densidad">
                  <Row label="Color principal" desc="Se aplica a botones, gráficos y resaltados.">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {ACCENT_COLORS.map(hex => {
                        const sel = settings.accentColor.toLowerCase() === hex.toLowerCase();
                        return <button key={hex} onClick={() => onPickColor(hex)} style={{ width: 32, height: 32, borderRadius: '50%', background: hex, border: 'none', cursor: 'pointer', outline: sel ? '2px solid #fff' : 'none', outlineOffset: 2, boxShadow: sel ? `0 0 0 4px ${hex}40` : 'none' }} />;
                      })}
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        🎨<input type="color" value={settings.accentColor} onChange={e => onPickColor(e.target.value)} style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} />
                      </label>
                    </div>
                  </Row>
                  <Row label="Modo compacto" desc="Reduce espaciado en tablas y listas.">
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle checked={settings.compactMode} onChange={v => settings.updateSettings({ compactMode: v })} /></div>
                  </Row>
                  <Row label="Densidad" desc="Nivel de padding global.">
                    <Segmented options={[['comfortable', 'Cómoda'], ['standard', 'Estándar'], ['compact', 'Compacta']]} value={settings.density} onChange={v => settings.updateSettings({ density: v as Settings['density'] })} />
                  </Row>
                  <Row label="Números destacados" desc="Usar tipografía Syne en KPIs.">
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle checked={settings.syneNumbers} onChange={v => settings.updateSettings({ syneNumbers: v })} /></div>
                  </Row>
                  <Row label="Celebraciones visuales" desc="Confetti al alcanzar hitos (pasar una eval, rachas, etc.).">
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle checked={settings.celebrationsEnabled} onChange={v => settings.updateSettings({ celebrationsEnabled: v })} /></div>
                  </Row>

                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: '18px 0 4px' }}>PnL Cards</div>
                  <Row label="Diseño por defecto" desc="Se pre-selecciona al generar una PnL Card.">
                    <select value={settings.cardDefaultVariant} onChange={e => settings.updateSettings({ cardDefaultVariant: e.target.value as Settings['cardDefaultVariant'] })} style={inp}>
                      <option value="clasico">Clásico</option><option value="minimo">Mínimo</option><option value="ganador">Ganador</option><option value="retro">Retro</option><option value="cinematico">Cinemático</option>
                    </select>
                  </Row>
                  <Row label="Formato por defecto" desc="Vertical (Stories) o cuadrado.">
                    <Segmented options={[['vertical', 'Vertical'], ['square', 'Cuadrado']]} value={settings.cardDefaultFormat} onChange={v => settings.updateSettings({ cardDefaultFormat: v as Settings['cardDefaultFormat'] })} />
                  </Row>
                  <Row label="Incluir @handle en cards" desc="Tu identificador público, mostrado sutilmente en la card.">
                    <input value={settings.cardHandle} onChange={e => settings.updateSettings({ cardHandle: e.target.value })} placeholder="@tu_handle" style={{ ...inp, maxWidth: 180 }} />
                  </Row>
                  <Row label="Sugerir cards en trades destacados" desc="Propone compartir cuando registras un récord o un gran trade." last>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle checked={settings.cardSuggest} onChange={v => settings.updateSettings({ cardSuggest: v })} /></div>
                  </Row>
                </ProLock>
              </Section>
            )}

            {section === 'trading' && (
              <Section title="Trading" subtitle="Valores por defecto para tus operaciones.">
                <Row label="Tamaño de cuenta" desc="Usado para calcular % rendimiento y drawdown.">
                  <PrefixInput prefix={settings.currencySymbol} value={draft.accountSize} onChange={v => setD('accountSize', v)} />
                </Row>
                <Row label="Límite de pérdida diaria" desc="Alerta cuando llegues al límite.">
                  <PrefixInput prefix={settings.currencySymbol} value={draft.dailyLossLimit} onChange={v => setD('dailyLossLimit', v)} />
                </Row>
                <Row label="Comisión por defecto" desc="Se pre-rellena en el modal de operación.">
                  <input type="number" value={draft.defaultCommission} onChange={e => setD('defaultCommission', parseFloat(e.target.value) || 0)} style={inp} />
                </Row>
                <Row label="Multiplicador" desc="Contract multiplier estándar.">
                  <input type="number" value={draft.defaultMultiplier} onChange={e => setD('defaultMultiplier', parseFloat(e.target.value) || 1)} style={inp} />
                </Row>
                <Row label="Moneda" desc="Para todos los importes.">
                  <select value={draft.currency} onChange={e => setD('currency', e.target.value as Currency)} style={inp}>
                    <option value="EUR">EUR (€)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option>
                  </select>
                </Row>
                <Row label="Modo de entrada" desc="PnL directo (rápido) o Cálculo automático (detallado)." last>
                  <Segmented options={[['direct', 'PnL directo'], ['calculated', 'Cálculo']]} value={draft.defaultInputMode} onChange={v => setD('defaultInputMode', v as 'direct' | 'calculated')} />
                </Row>
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 12 }}>Setups y estrategias</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {settings.setups.map(s => (
                      <span key={s} style={{ background: 'rgba(79,143,255,0.08)', color: 'var(--blue)', border: '1px solid rgba(79,143,255,0.2)', borderRadius: 12, padding: '4px 10px', fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {s}<button onClick={() => settings.removeSetup(s)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>✕</button>
                      </span>
                    ))}
                  </div>
                  <AddSetupRow onAdd={v => settings.addSetup(v)} />
                </div>
              </Section>
            )}

            {section === 'plan' && (
              <Section title="Plan y facturación" subtitle="Gestiona tu suscripción.">
                <div style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '20px 24px' }}>
                  {isFree ? (
                    <>
                      <span style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Plan Gratis</span>
                      <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}><span>Operaciones este mes</span><span>{thisMonthCount} / 30</span></div>
                        <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, (thisMonthCount / 30) * 100)}%`, height: '100%', background: 'var(--blue)' }} /></div>
                      </div>
                      <div style={{ marginTop: 18, fontFamily: fontHead, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Actualiza a Pro para desbloquear todo</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {['Ops ilimitadas', 'Brokers', 'Analíticas', 'Exportación'].map(f => <span key={f} style={{ background: 'rgba(120,97,255,0.1)', color: 'var(--indigo)', borderRadius: 8, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600 }}>{f}</span>)}
                      </div>
                      <div style={{ marginTop: 18 }}><Button variant="primary" onClick={() => openUpgrade()}>Ver planes →</Button></div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: 'rgba(120,97,255,0.12)', color: 'var(--indigo)', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Plan Pro</span>
                        <Button variant="ghost" size="sm" onClick={() => push({ kind: 'info', text: 'Portal de Stripe próximamente' })}>Gestionar suscripción</Button>
                      </div>
                      <div style={{ marginTop: 14, fontSize: 14, color: 'var(--text-primary)' }}>Se renueva el <strong>{fmtDate(user.planExpiresAt)}</strong></div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Facturación {user.billingCycle === 'annual' ? 'anual' : 'mensual'} · •••• 4242 (Visa)</div>
                      <button onClick={() => setConfirmCancel(true)} style={{ background: 'transparent', border: 'none', padding: 0, marginTop: 14, textDecoration: 'underline', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar plan</button>
                    </>
                  )}
                </div>
                {isPro && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 12 }}>Historial de facturación</div>
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aún no tienes facturas</div>
                  </div>
                )}
              </Section>
            )}

            {section === 'notifications' && (
              <Section title="Notificaciones" subtitle="Decide qué avisos quieres recibir.">
                <Row label="Alertas de riesgo" desc="Avisos cuando te acerques a tu daily loss limit.">
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle checked={settings.notifyRisk} onChange={v => settings.updateSettings({ notifyRisk: v })} /></div>
                </Row>
                <Row label="Notificaciones de racha" desc="Celebra cuando alcances hitos de tu Progress Tracker.">
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle checked={settings.notifyStreak} onChange={v => settings.updateSettings({ notifyStreak: v })} /></div>
                </Row>
                <Row label="Resumen semanal" desc="Recibe cada domingo un resumen de tu semana por email.">
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle checked={settings.notifyWeekly} onChange={v => settings.updateSettings({ notifyWeekly: v })} /></div>
                </Row>
                <Row label="Alertas de mercado" desc="Notificaciones de eventos económicos.">
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: 'rgba(245,185,66,0.12)', color: 'var(--warning)', fontSize: '0.65rem', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>Próximamente</span>
                    <Toggle checked={false} onChange={() => {}} disabled />
                  </div>
                </Row>
                <Row label="Sonidos de la interfaz" desc="Sonidos sutiles al ganar un trade, completar la rutina o pasar una eval.">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <Toggle checked={settings.soundsEnabled} onChange={v => settings.updateSettings({ soundsEnabled: v })} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([['positive', 'Positivo'], ['alert', 'Alerta'], ['success', 'Completado']] as const).map(([type, lbl]) => (
                        <button key={type} onClick={() => previewSound(type)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 7, padding: '4px 9px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>{lbl} <span style={{ color: 'var(--blue)' }}>▶</span></button>
                      ))}
                    </div>
                  </div>
                </Row>
                <Row label="Mostrar descuentos de afiliados" desc="TRACE tiene acuerdos con firmas prop. Si lo desactivas, no verás los códigos de descuento." last>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Toggle checked={affVisible} onChange={v => { setAffiliateVisible(v); setAffVisible(v); }} /></div>
                </Row>
              </Section>
            )}

            {section === 'language' && (
              <Section title="Idioma y región" subtitle="Formato de idioma, números y fechas.">
                <Row label="Idioma" desc="Idioma de la interfaz.">
                  <select style={inp} value={settings.language} onChange={e => changeLanguage(e.target.value as 'es' | 'en')}>
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="" disabled>Otros idiomas próximamente</option>
                  </select>
                </Row>
                <Row label="Formato de números" desc="Cómo se muestran cantidades.">
                  <select value={draft.numberFormat} onChange={e => setD('numberFormat', e.target.value as 'es' | 'us')} style={inp}>
                    <option value="es">1.234,56 (España)</option><option value="us">1,234.56 (US)</option>
                  </select>
                </Row>
                <Row label="Formato de fecha" desc="Cómo se muestran las fechas." last>
                  <select value={draft.dateFormat} onChange={e => setD('dateFormat', e.target.value as Draft['dateFormat'])} style={inp}>
                    <option value="dmy">DD/MM/AAAA</option><option value="mdy">MM/DD/YYYY</option><option value="ymd">AAAA-MM-DD</option>
                  </select>
                </Row>
              </Section>
            )}

            {section === 'security' && (
              <Section title="Seguridad" subtitle="Protege el acceso a tu cuenta.">
                <Row label="Cambiar contraseña" desc="Actualiza tu contraseña regularmente.">
                  <Button variant="ghost" size="sm" onClick={() => push({ kind: 'info', text: 'Próximamente con Supabase' })}>Cambiar contraseña</Button>
                </Row>
                <Row label="Sesiones activas" desc="Dispositivos donde tienes sesión iniciada.">
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Solo este dispositivo</span>
                </Row>
                <Row label="Autenticación en dos pasos" desc="Añade una capa extra de seguridad." last>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: 'rgba(245,185,66,0.12)', color: 'var(--warning)', fontSize: '0.65rem', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>Próximamente</span>
                  </div>
                </Row>
              </Section>
            )}

            {section === 'data' && (
              <Section title="Datos y exportación" subtitle="Exporta o importa tus datos.">
                <ProLock feature="Exportación de datos" description="Exporta tus operaciones y notas">
                  <Row label="Exportar operaciones" desc="Descarga todas tus operaciones en CSV.">
                    <Button variant="primary" size="sm" iconLeft={<Download size={14} />} onClick={() => { exportToCSV(trades); push({ kind: 'success', text: 'CSV exportado' }); }}>Descargar CSV</Button>
                  </Row>
                  <Row label="Exportar backup completo" desc="Todo tu diario + notas + configuración en JSON.">
                    <Button variant="ghost" size="sm" iconLeft={<Download size={14} />} onClick={() => { exportToJSON({ trades, notes: allNotes, settings: { ...settings } }); push({ kind: 'success', text: 'JSON exportado' }); }}>Descargar JSON</Button>
                  </Row>
                  <Row label="Importar CSV" desc="Añade operaciones desde un archivo CSV." last>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <Button variant="ghost" size="sm" iconLeft={<Upload size={14} />} onClick={() => fileRef.current?.click()}>Elegir archivo</Button>
                      <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => onImportCSV(e.target.files)} />
                      <span style={{ fontSize: '0.68rem', color: 'var(--blue)', cursor: 'pointer' }} onClick={() => { exportToCSV([]); push({ kind: 'info', text: 'Plantilla descargada' }); }}>Descargar plantilla →</span>
                    </div>
                  </Row>
                </ProLock>
              </Section>
            )}

            {section === 'danger' && (
              <Section title="Zona de peligro" subtitle="Acciones irreversibles. Procede con cuidado.">
                <div style={{ border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '4px 24px' }}>
                  <Row label="Borrar todos los datos" desc="Elimina tus operaciones, notas y configuración. Tu cuenta permanece activa.">
                    <Button variant="ghost" size="sm" onClick={() => { setDangerText(''); setConfirmClear(true); }} style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}><Trash2 size={13} /> Borrar datos</Button>
                  </Row>
                  <Row label="Eliminar cuenta" desc="Elimina tu cuenta y todos sus datos permanentemente." last>
                    <Button variant="danger" size="sm" onClick={() => { setEmailText(''); setConfirmDeleteAcct(true); }}>Eliminar cuenta</Button>
                  </Row>
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Floating save bar */}
        {dirty && (
          <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: 'rgba(21,23,29,0.92)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border-subtle)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Tienes cambios sin guardar</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={() => setDraft(baseDraft)}>Descartar</Button>
              <Button variant="primary" size="sm" onClick={saveDraft}>Guardar</Button>
            </div>
          </div>
        )}
      </div>

      {/* Typed-confirm: borrar datos */}
      <TypedConfirm
        open={confirmClear} title="¿Borrar todos los datos?" desc="Esta acción no se puede deshacer. Escribe «borrar todo» para confirmar."
        expected="borrar todo" value={dangerText} onChange={setDangerText}
        confirmText="Borrar datos" onCancel={() => setConfirmClear(false)}
        onConfirm={() => { clearTrades(); clearNotes(); push({ kind: 'success', text: 'Datos eliminados' }); setConfirmClear(false); }}
      />
      {/* Typed-confirm: eliminar cuenta */}
      <TypedConfirm
        open={confirmDeleteAcct} title="¿Eliminar cuenta?" desc={`Escribe tu email (${user.email}) para confirmar la eliminación permanente.`}
        expected={user.email} value={emailText} onChange={setEmailText}
        confirmText="Eliminar cuenta" onCancel={() => setConfirmDeleteAcct(false)}
        onConfirm={() => { push({ kind: 'info', text: 'Eliminación de cuenta próximamente con Supabase' }); setConfirmDeleteAcct(false); }}
      />
      <ConfirmDialog open={confirmCancel} title="¿Cancelar plan Pro?" description="Volverás al plan Gratis al final del periodo." confirmText="Cancelar plan" destructive
        onConfirm={() => { downgrade(); push({ kind: 'success', text: 'Plan cancelado' }); setConfirmCancel(false); }} onCancel={() => setConfirmCancel(false)} />
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ paddingBottom: 20, borderBottom: '1px solid var(--border-subtle)', marginBottom: 24 }}>
        <h1 style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
        <div style={{ fontFamily: fontBody, fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function Row({ label, desc, children, last }: { label: string; desc: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, alignItems: 'center', padding: '20px 0', borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontFamily: fontBody, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontFamily: fontBody, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function PrefixInput({ prefix, value, onChange }: { prefix: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{prefix}</span>
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} style={{ ...inp, paddingLeft: 26 }} />
    </div>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--card-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 3, gap: 2, width: '100%' }}>
      {options.map(([v, l]) => {
        const active = v === value;
        return <button key={v} onClick={() => onChange(v)} style={{ flex: 1, fontFamily: fontBody, fontSize: '0.76rem', fontWeight: 600, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', border: 'none', background: active ? 'var(--blue)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)' }}>{l}</button>;
      })}
    </div>
  );
}

function AddSetupRow({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6, maxWidth: 360 }}>
      <input value={v} onChange={e => setV(e.target.value)} placeholder="Nueva estrategia..." style={{ ...inp, flex: 1 }} />
      <Button variant="primary" size="sm" onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(''); } }}>Añadir</Button>
    </div>
  );
}

function TypedConfirm({ open, title, desc, expected, value, onChange, confirmText, onConfirm, onCancel }: {
  open: boolean; title: string; desc: string; expected: string; value: string; onChange: (v: string) => void; confirmText: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  const ok = value.trim().toLowerCase() === expected.trim().toLowerCase();
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 420, padding: 24, fontFamily: fontBody, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: fontHead, fontWeight: 800, fontSize: '1.05rem', color: 'var(--danger)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>{desc}</div>
        <input autoFocus value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, marginBottom: 16 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" size="sm" disabled={!ok} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}
