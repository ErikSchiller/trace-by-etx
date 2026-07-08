import { useMemo, useRef, useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore, type Currency, TIMEZONES } from '../../store/settingsStore';
import { useTradeStore, useUserTrades } from '../../store/tradeStore';
import { useNotebookStore } from '../../store/notebookStore';
import { useToast } from '../../components/UI/ToastProvider';
import { useUpgradeModal } from '../../store/upgradeModalStore';
import { usePlan } from '../../hooks/usePlan';
import { ProLock } from '../../components/UI/ProLock';
import { exportToCSV, exportToJSON, parseCSV, applyAccentColor } from '../../utils/export';
import { LogoMark } from '../../components/UI/LogoMark';
import { ConfirmDialog } from '../../components/UI/ConfirmDialog';

type SectionKey = 'profile' | 'appearance' | 'trading' | 'plan' | 'data';

const SECTIONS: { id: SectionKey; label: string }[] = [
  { id: 'profile',    label: 'Mi perfil' },
  { id: 'appearance', label: 'Apariencia' },
  { id: 'trading',    label: 'Trading' },
  { id: 'plan',       label: 'Plan y facturación' },
  { id: 'data',       label: 'Datos y exportación' },
];

const ACCENT_COLORS = ['#4f8fff', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#ffffff'];

const cardStyle: React.CSSProperties = {
  background: '#161618', border: '1px solid #1e1e20', borderRadius: 10,
  padding: '20px 24px', marginBottom: 16, position: 'relative',
};
const sectionTitle: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: '#fff',
};
const divider: React.CSSProperties = { height: 1, background: '#1e1e20', margin: '12px 0' };
const label: React.CSSProperties = {
  fontSize: '0.62rem', color: '#4a4a60', textTransform: 'uppercase',
  letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6, display: 'block',
};
const subText: React.CSSProperties = { fontSize: 11, color: '#33334a', marginTop: 4 };
const primaryBtn: React.CSSProperties = {
  background: '#4f8fff', color: '#fff', border: 'none',
  borderRadius: 7, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: "'Space Grotesk', sans-serif",
};
const ghostBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid #1e1e20', color: '#888898',
  borderRadius: 7, padding: '8px 14px', fontSize: 13, cursor: 'pointer',
  fontFamily: "'Space Grotesk', sans-serif",
};
const dangerBtn: React.CSSProperties = {
  background: 'transparent', color: '#ef4444',
  border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: 7, padding: '8px 14px', fontSize: 13, cursor: 'pointer',
  fontFamily: "'Space Grotesk', sans-serif",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Settings() {
  const [section, setSection] = useState<SectionKey>('profile');
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);
  const downgrade = useAuthStore(s => s.downgradeToFree);
  const settings = useSettingsStore();
  const trades = useUserTrades();
  const clearTrades = useTradeStore(s => s.clearAll);
  const clearNotes = useNotebookStore(s => s.clearAll);
  const allNotes = useNotebookStore(s => s.notes);
  const { push } = useToast();
  const openUpgrade = useUpgradeModal(s => s.open);
  const { isPro, isFree } = usePlan();

  const [name, setName] = useState(user?.name ?? '');
  const [billingPreview, setBillingPreview] = useState<'monthly' | 'annual'>('annual');

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return trades.filter(t => t.date.startsWith(key)).length;
  }, [trades]);

  const usagePct = Math.min(100, (thisMonthCount / 30) * 100);
  const usageColor = usagePct >= 100 ? '#ef4444' : usagePct >= 80 ? '#f59e0b' : '#4f8fff';

  const onSaveProfile = () => {
    updateUser({ name: name.trim() });
    push({ kind: 'success', text: 'Perfil actualizado' });
  };

  const onPickColor = (hex: string) => {
    settings.updateSettings({ accentColor: hex });
    applyAccentColor(hex);
    push({ kind: 'success', text: 'Color actualizado' });
  };

  const onAddSetup = (val: string) => {
    if (!val.trim()) return;
    settings.addSetup(val);
  };

  const onExportCSV = () => {
    exportToCSV(trades);
    push({ kind: 'success', text: 'CSV exportado' });
  };
  const onExportJSON = () => {
    exportToJSON({ trades, notes: allNotes, settings: { ...settings } });
    push({ kind: 'success', text: 'JSON exportado' });
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onImportCSV = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const parsed = await parseCSV(files[0]);
    push({ kind: 'success', text: `${parsed.length} operaciones leídas del CSV` });
  };
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const onClearAll = () => setConfirmClear(true);
  const doClearAll = () => {
    clearTrades();
    clearNotes();
    push({ kind: 'success', text: 'Todos los datos han sido eliminados' });
    setConfirmClear(false);
  };
  const onCancelPlan = () => setConfirmCancel(true);
  const doCancelPlan = () => {
    downgrade();
    push({ kind: 'success', text: 'Plan cancelado' });
    setConfirmCancel(false);
  };

  if (!user) return null;
  const initials = getInitials(user.name);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header band with gradient */}
      <div style={{
        height: 110, padding: '0 32px',
        background: 'linear-gradient(135deg, #1a1a2e, #16213e 50%, #0f3460)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <LogoMark size="md" showByEtx={false} />
        <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: '#fff' }}>
          Ajustes
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</span>
          <span style={{
            background: isPro ? 'rgba(79,143,255,0.2)' : 'rgba(255,255,255,0.08)',
            color: isPro ? '#6b9fff' : 'rgba(255,255,255,0.6)',
            fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 600,
          }}>{isPro ? 'Plan Pro' : 'Plan Gratis'}</span>
        </div>
      </div>

      {/* Body — nav + content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <nav style={{
          width: 200, flexShrink: 0, background: '#161618',
          borderRight: '1px solid #1e1e20', padding: '16px 8px',
        }}>
          {SECTIONS.map(s => {
            const active = section === s.id;
            return (
              <button
                key={s.id} onClick={() => setSection(s.id)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: active ? 'rgba(79,143,255,0.1)' : 'transparent',
                  color: active ? '#4f8fff' : '#4a4a60',
                  border: 'none',
                  borderLeft: active ? '2px solid #4f8fff' : '2px solid transparent',
                  padding: '8px 12px', fontSize: 13,
                  fontWeight: active ? 600 : 500, cursor: 'pointer',
                  borderRadius: 6, margin: '1px 0',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >{s.label}</button>
            );
          })}
        </nav>

        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          {section === 'profile' && (
            <div style={cardStyle}>
              <div style={sectionTitle}>Mi perfil</div>
              <div style={divider} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={label}>Nombre completo</label>
                  <input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label style={label}>Email</label>
                  <input value={user.email} readOnly style={{ background: 'rgba(255,255,255,0.02)', color: '#4a4a60' }} />
                </div>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'rgba(79,143,255,0.15)', border: '2px solid rgba(79,143,255,0.2)',
                    color: '#4f8fff', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '1.1rem',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{initials}</div>
                  <div style={{ ...subText, textAlign: 'center', marginTop: 6 }}>
                    Las iniciales se generan automáticamente
                  </div>
                </div>
                <button onClick={onSaveProfile} style={{ ...primaryBtn, alignSelf: 'flex-start' }}>
                  Guardar cambios
                </button>
              </div>
            </div>
          )}

          {section === 'appearance' && (
            <div style={cardStyle}>
              <div style={sectionTitle}>Apariencia</div>
              <div style={divider} />
              <ProLock feature="Color personalizable" description="Personaliza el color de acento de la app">
                <div>
                  <label style={label}>Color de acento</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                    {ACCENT_COLORS.map(hex => {
                      const sel = settings.accentColor.toLowerCase() === hex.toLowerCase();
                      return (
                        <button
                          key={hex} onClick={() => onPickColor(hex)}
                          style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: hex, border: 'none', cursor: 'pointer',
                            outline: sel ? '2px solid #fff' : 'none',
                            outlineOffset: sel ? 2 : 0,
                            boxShadow: sel ? `0 0 0 4px ${hex}40` : 'none',
                          }}
                        />
                      );
                    })}
                  </div>
                  <label style={label}>Color personalizado</label>
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={e => onPickColor(e.target.value)}
                    style={{ width: 60, height: 36, border: '1px solid #1e1e20', borderRadius: 7, background: 'transparent', cursor: 'pointer', padding: 2 }}
                  />
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: settings.accentColor }} />
                    <span style={{ fontSize: 13, color: '#888898' }}>Color actual: {settings.accentColor}</span>
                  </div>
                </div>
              </ProLock>
            </div>
          )}

          {section === 'trading' && (
            <div style={cardStyle}>
              <div style={sectionTitle}>Configuración de trading</div>
              <div style={divider} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={label}>Tamaño de cuenta</label>
                  <input type="number" value={settings.accountSize} onChange={e => settings.updateSettings({ accountSize: parseFloat(e.target.value) || 0 })} />
                  <div style={subText}>Usado para calcular % rendimiento y drawdown</div>
                </div>
                <div>
                  <label style={label}>Límite de pérdida diaria</label>
                  <input type="number" value={settings.dailyLossLimit} onChange={e => settings.updateSettings({ dailyLossLimit: parseFloat(e.target.value) || 0 })} />
                  <div style={subText}>Alerta al alcanzar este límite</div>
                </div>
                <div>
                  <label style={label}>Comisión por defecto</label>
                  <input type="number" value={settings.defaultCommission} onChange={e => settings.updateSettings({ defaultCommission: parseFloat(e.target.value) || 0 })} />
                  <div style={subText}>Se auto-rellena al añadir operaciones</div>
                </div>
                <div>
                  <label style={label}>Multiplicador por defecto</label>
                  <input type="number" value={settings.defaultMultiplier} onChange={e => settings.updateSettings({ defaultMultiplier: parseFloat(e.target.value) || 1 })} />
                </div>
                <div>
                  <label style={label}>Moneda</label>
                  <select value={settings.currency} onChange={e => settings.updateSettings({ currency: e.target.value as Currency })}>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label style={label}>Zona horaria</label>
                  <select value={settings.timezone} onChange={e => settings.updateSettings({ timezone: e.target.value })}>
                    {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                  <div style={subText}>Usada para mostrar fechas y horas</div>
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingTop: 16, borderTop: '1px solid #1e1e20' }}>
                <div>
                  <label style={{ ...label, marginBottom: 4 }}>Break even cuenta como ganado</label>
                  <div style={subText}>Las operaciones con PnL = 0 sumarán como ganadas en tu win rate</div>
                </div>
                <button
                  role="switch"
                  aria-checked={settings.beCountsAsWin}
                  onClick={() => settings.updateSettings({ beCountsAsWin: !settings.beCountsAsWin })}
                  style={{
                    flexShrink: 0, width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: settings.beCountsAsWin ? '#4f8fff' : '#2a2a35',
                    position: 'relative', transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: settings.beCountsAsWin ? 21 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
                  }} />
                </button>
              </div>

              <div style={{ marginTop: 20 }}>
                <label style={label}>Mis setups / estrategias</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {settings.setups.map(s => (
                    <span key={s} style={{
                      background: 'rgba(79,143,255,0.08)', color: '#4f8fff',
                      border: '1px solid rgba(79,143,255,0.2)', borderRadius: 12,
                      padding: '4px 10px', fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center',
                    }}>
                      {s}
                      <button
                        onClick={() => settings.removeSetup(s)}
                        style={{ background: 'transparent', border: 'none', color: '#3a3a55', cursor: 'pointer', fontSize: 11 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#3a3a55')}
                      >✕</button>
                    </span>
                  ))}
                </div>
                <AddSetupRow onAdd={onAddSetup} />
              </div>
            </div>
          )}

          {section === 'plan' && (
            <div style={cardStyle}>
              <div style={sectionTitle}>Plan y facturación</div>
              <div style={divider} />
              {isFree ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      background: 'rgba(255,255,255,0.06)', color: '#888898',
                      padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    }}>Plan Gratis</span>
                    <button onClick={() => openUpgrade()} style={primaryBtn}>Actualizar a Pro →</button>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#888898' }}>Operaciones este mes</span>
                      <span style={{ fontSize: 12, color: '#888898' }}>{thisMonthCount} / 30</span>
                    </div>
                    <div style={{ height: 6, background: '#1e1e20', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${usagePct}%`, height: '100%', background: usageColor, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  <div style={{ marginTop: 20, background: '#0d0d0f', border: '1px solid #1e1e20', borderRadius: 8, padding: '12px 16px' }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ color: '#4a4a60' }}>
                          <th style={{ textAlign: 'left', padding: '4px 0' }}></th>
                          <th style={{ padding: '4px 0', textAlign: 'center' }}>Gratis</th>
                          <th style={{ padding: '4px 0', textAlign: 'center', color: '#4f8fff' }}>Pro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Operaciones/mes', '30', 'Ilimitadas'],
                          ['Analíticas', 'Básicas', 'Completas'],
                          ['Brokers', '✗', '✓'],
                          ['Color personalizable', '✗', '✓'],
                          ['Múltiples cuentas', '✗', '✓'],
                          ['Exportación', '✗', '✓'],
                          ['IA (próx.)', '✗', 'Incluida'],
                        ].map(([feat, f, p]) => (
                          <tr key={feat} style={{ borderTop: '1px solid #1e1e20' }}>
                            <td style={{ padding: '6px 0', color: '#888898' }}>{feat}</td>
                            <td style={{ padding: '6px 0', textAlign: 'center', color: '#4a4a60' }}>{f}</td>
                            <td style={{ padding: '6px 0', textAlign: 'center', color: '#4f8fff' }}>{p}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      display: 'inline-flex', background: '#161618', border: '1px solid #1e1e20',
                      borderRadius: 20, padding: 3, gap: 2,
                    }}>
                      {(['monthly', 'annual'] as const).map(c => {
                        const active = billingPreview === c;
                        return (
                          <button key={c} onClick={() => setBillingPreview(c)} style={{
                            background: active ? '#1e1e28' : 'transparent',
                            border: active ? '1px solid #2a2a35' : '1px solid transparent',
                            color: active ? '#fff' : '#4a4a60',
                            borderRadius: 16, padding: '4px 12px',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}>{c === 'monthly' ? 'Mensual' : 'Anual'}</button>
                        );
                      })}
                    </div>
                    {billingPreview === 'annual' && (
                      <span style={{ background: 'rgba(79,143,255,0.1)', color: '#4f8fff', fontSize: 11, padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>
                        Ahorra 34%
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 12, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '2rem', color: '#fff' }}>
                    €{billingPreview === 'annual' ? 19 : 29}<span style={{ fontSize: 14, color: '#4a4a60', fontWeight: 400, fontFamily: "'Space Grotesk'" }}>/mes</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#4a4a60' }}>
                    {billingPreview === 'annual' ? 'facturado €228/año' : 'sin compromiso anual'}
                  </div>

                  <button onClick={() => openUpgrade()} style={{ ...primaryBtn, width: '100%', padding: 12, marginTop: 16 }}>
                    Actualizar a Pro →
                  </button>
                </>
              ) : (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(15,52,96,0.2), rgba(22,33,62,0.2))',
                  border: '1px solid rgba(79,143,255,0.2)', borderRadius: 9, padding: 18,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      background: 'rgba(79,143,255,0.2)', color: '#6b9fff',
                      padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    }}>Plan Pro</span>
                    <button disabled style={{ ...ghostBtn, opacity: 0.5, cursor: 'not-allowed' }} title="Próximamente — gestión via Stripe">
                      Gestionar suscripción
                    </button>
                  </div>
                  <div style={{ marginTop: 14, fontSize: 14, color: '#fff' }}>
                    Tu plan renueva el <strong>{fmtDate(user.planExpiresAt)}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: '#888898', marginTop: 4 }}>
                    Facturación {user.billingCycle === 'annual' ? 'anual' : 'mensual'}
                  </div>
                  <button onClick={onCancelPlan} style={{ ...dangerBtn, background: 'transparent', border: 'none', padding: 0, marginTop: 14, textDecoration: 'underline', fontSize: 12 }}>
                    Cancelar plan
                  </button>
                </div>
              )}
            </div>
          )}

          {section === 'data' && (
            <div style={cardStyle}>
              <div style={sectionTitle}>Datos y exportación</div>
              <div style={divider} />
              <ProLock feature="Exportación de datos" description="Exporta tus operaciones y notas">
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={onExportCSV} style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Download size={14} /> Exportar operaciones (CSV)
                  </button>
                  <button onClick={onExportJSON} style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Download size={14} /> Exportar todo (JSON)
                  </button>
                </div>

                <div style={{ marginTop: 20 }}>
                  <label style={label}>Importar operaciones desde CSV</label>
                  <input type="file" accept=".csv" ref={fileInputRef} onChange={e => onImportCSV(e.target.files)} />
                  <div style={subText}>El CSV debe tener las columnas exportadas por TRACE.</div>
                </div>

                <div style={{ marginTop: 20, border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 16 }}>
                  <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Zona de peligro</div>
                  <div style={{ fontSize: 12, color: '#888898', marginBottom: 12 }}>
                    Eliminará todas las operaciones y notas. Esta acción no se puede deshacer.
                  </div>
                  <button onClick={onClearAll} style={{ ...dangerBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={13} /> Borrar todos los datos
                  </button>
                </div>
              </ProLock>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="¿Borrar todos los datos?"
        description="Esta acción eliminará todas tus operaciones y notas. No se puede deshacer."
        confirmText="Borrar todo"
        destructive
        onConfirm={doClearAll}
        onCancel={() => setConfirmClear(false)}
      />
      <ConfirmDialog
        open={confirmCancel}
        title="¿Cancelar plan Pro?"
        description="Volverás al plan Gratis y perderás acceso a las funciones premium al final del periodo."
        confirmText="Cancelar plan"
        destructive
        onConfirm={doCancelPlan}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}

function AddSetupRow({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input value={v} onChange={e => setV(e.target.value)} placeholder="Nueva estrategia..." style={{ flex: 1 }} />
      <button
        onClick={() => { onAdd(v); setV(''); }}
        style={{ background: '#4f8fff', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >Añadir</button>
    </div>
  );
}

// Required to use Upload icon import without warning when no inline use needed
void Upload;
