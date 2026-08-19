import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/UI/LogoMark';
import { AddTradeModal } from '../components/Modals/AddTradeModal';
import { useAuthStore } from '../store/authStore';
import { useUserTrades } from '../store/tradeStore';
import { useToast } from '../components/UI/ToastProvider';
import { usePlan } from '../hooks/usePlan';
import { usePageTitle } from '../hooks/usePageTitle';
import { useUpgradeModal } from '../store/upgradeModalStore';
import { ShortcutsHelp } from '../components/UI/ShortcutsHelp';
import { SupportWidget } from '../components/UI/SupportWidget';
import { UndoToast } from '../components/UndoToast';
import { WeeklyRecapModal } from '../components/WeeklyRecap/WeeklyRecapModal';
import { FilterModal } from '../components/Modals/FilterModal';
import { DateRangeModal } from '../components/Modals/DateRangeModal';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { useFilterStore, activeFilterCount } from '../store/filterStore';
import { useDateRangeStore, PRESET_LABEL } from '../store/dateRangeStore';
import { useSettingsStore } from '../store/settingsStore';
import { SOCIAL } from '../config/social';
import { useTranslation } from '../i18n/i18n';

const Icon = {
  Dashboard: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.2"/></svg>),
  Journal: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="12" height="12" rx="1.8" stroke="currentColor" strokeWidth="1.2"/><line x1="4" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><line x1="4" y1="7.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><line x1="4" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>),
  Trades: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><polyline points="1.5,7.5 5,3.5 9,10 12,6 13.5,7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><line x1="1.5" y1="12.5" x2="13.5" y2="12.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>),
  Notebook: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 1.5h6.5l3 3V13a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V2a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2"/><polyline points="9.5,1.5 9.5,4.5 12.5,4.5" stroke="currentColor" strokeWidth="1.1"/><line x1="4.5" y1="7.5" x2="10.5" y2="7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/><line x1="4.5" y1="10" x2="8.5" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>),
  Reports: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="8.5" width="3" height="5" rx=".8" stroke="currentColor" strokeWidth="1.1"/><rect x="6" y="5.5" width="3" height="8" rx=".8" stroke="currentColor" strokeWidth="1.1"/><rect x="10.5" y="2.5" width="3" height="11" rx=".8" stroke="currentColor" strokeWidth="1.1"/></svg>),
  Progress: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/><polyline points="7.5,3.5 10.5,9.5 7.5,8.5 4.5,9.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>),
  Replay: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/><polyline points="6,5 10,7.5 6,10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Brokers: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 4.5V3a2 2 0 014 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7.5" cy="8.5" r="1" stroke="currentColor" strokeWidth="1"/></svg>),
  Settings: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.1 1.1M11 11l1.1 1.1M2.9 12.1l1.1-1.1M11 4l1.1-1.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>),
  Simulator: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="4.8" cy="4.8" r="0.9" fill="currentColor"/><circle cx="10.2" cy="4.8" r="0.9" fill="currentColor"/><circle cx="7.5" cy="7.5" r="0.9" fill="currentColor"/><circle cx="4.8" cy="10.2" r="0.9" fill="currentColor"/><circle cx="10.2" cy="10.2" r="0.9" fill="currentColor"/></svg>),
  PropFirms: () => (<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="4.5" width="10" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.2"/><path d="M4 4.5V3.2a1 1 0 011-1h5a1 1 0 011 1v1.3" stroke="currentColor" strokeWidth="1.1"/><line x1="2.5" y1="7.5" x2="12.5" y2="7.5" stroke="currentColor" strokeWidth="1"/></svg>),
  ChevronDown: () => (<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="3,4.5 6,8 9,4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
};

interface NavItem { to: string; label: string; tKey: string; icon: React.ComponentType; badge?: string }

const sections: { title: string; tKey: string; items: NavItem[] }[] = [
  { title: 'PRINCIPAL', tKey: 'section.principal', items: [
    { to: '/dashboard', label: 'Dashboard',     tKey: 'nav.dashboard', icon: Icon.Dashboard },
    { to: '/journal',   label: 'Diario Diario', tKey: 'nav.journal',   icon: Icon.Journal },
    { to: '/trades',    label: 'Operaciones',   tKey: 'nav.trades',    icon: Icon.Trades },
    { to: '/notebook',  label: 'Notebook',      tKey: 'nav.notebook',  icon: Icon.Notebook },
  ]},
  { title: 'ANÁLISIS', tKey: 'section.analisis', items: [
    { to: '/reports',     label: 'Reportes',         tKey: 'nav.reports',   icon: Icon.Reports, badge: 'NEW' },
    { to: '/progress',    label: 'Progress Tracker', tKey: 'nav.progress',  icon: Icon.Progress },
    { to: '/replay',      label: 'Trade Replay',     tKey: 'nav.replay',    icon: Icon.Replay },
    { to: '/simulator',   label: 'Simulador',        tKey: 'nav.simulator', icon: Icon.Simulator, badge: 'NEW' },
    { to: '/prop-firms',  label: 'Prop Firms',       tKey: 'nav.propFirms', icon: Icon.PropFirms, badge: 'NEW' },
  ]},
  { title: 'CONFIG', tKey: 'section.config', items: [
    { to: '/brokers',  label: 'Brokers', tKey: 'nav.brokers',  icon: Icon.Brokers },
    { to: '/settings', label: 'Ajustes', tKey: 'nav.settings', icon: Icon.Settings },
  ]},
];

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard', '/journal': 'Diario Diario', '/trades': 'Operaciones',
  '/notebook': 'Notebook', '/reports': 'Reportes', '/progress': 'Progress Tracker',
  '/replay': 'Trade Replay', '/simulator': 'Simulador', '/prop-firms': 'Prop Firms',
  '/brokers': 'Brokers', '/settings': 'Ajustes',
};

const PLAN_LABEL: Record<string, string> = { free: 'Plan Gratis', pro: 'Plan Pro' };

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function syncLabel(latestCreatedAt: string | null) {
  if (!latestCreatedAt) return 'Sin datos aún';
  const diff = Date.now() - new Date(latestCreatedAt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Sincronizado ahora mismo';
  if (m < 60) return `Sincronizado hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Sincronizado hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Sincronizado hace ${d} d`;
}

export function AppLayout() {
  const [modalOpen, setModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('trace_sidebar_collapsed') === '1');
  const toggleCollapsed = () => setCollapsed(c => { const n = !c; localStorage.setItem('trace_sidebar_collapsed', n ? '1' : '0'); return n; });
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const filters = useFilterStore();
  const filterCount = activeFilterCount(filters);
  const datePreset = useDateRangeStore(s => s.preset);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const trades = useUserTrades();
  const { t } = useTranslation();
  useSettingsStore(s => s.language); // re-render sidebar when language changes
  const { push } = useToast();
  const { isPro, isFree, isAtTradeLimit } = usePlan();
  const openUpgrade = useUpgradeModal(s => s.open);

  // Count trades this calendar month for free-plan gating
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return trades.filter(t => t.date.startsWith(key)).length;
  }, [trades]);
  const atLimit = isAtTradeLimit(thisMonthCount);

  const pageTitle = titleMap[location.pathname] || 'TRACE';
  usePageTitle(titleMap[location.pathname]);
  const userName = user?.name ?? 'Usuario';
  const userPlan = PLAN_LABEL[user?.plan ?? 'free'];
  const initials = getInitials(userName);
  const avatar = user?.avatar;

  // Apply appearance preferences globally (scales rem-based UI, persists across reloads)
  const compactMode = useSettingsStore(s => s.compactMode);
  const density = useSettingsStore(s => s.density);
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle('compact-mode', compactMode);
    el.dataset.density = density;
  }, [compactMode, density]);

  const latestCreatedAt = useMemo(() => trades[0]?.createdAt ?? null, [trades]);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Listen for empty-state CTA event to open modal
  useEffect(() => {
    const handler = () => setModalOpen(true);
    window.addEventListener('trace:open-add-trade', handler);
    return () => window.removeEventListener('trace:open-add-trade', handler);
  }, []);

  // Weekly recap modal (opened from dashboard card, reportes, or command palette)
  const [recapOpen, setRecapOpen] = useState(false);
  useEffect(() => {
    const handler = () => setRecapOpen(true);
    window.addEventListener('trace:open-weekly-recap', handler);
    return () => window.removeEventListener('trace:open-weekly-recap', handler);
  }, []);

  // Global keyboard shortcuts
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setHelpOpen(false); setTopMenuOpen(false); return; }
      if (isTyping(e.target)) return;
      if (e.key === '?') { e.preventDefault(); setHelpOpen(h => !h); return; }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const map: Record<string, string> = { '1': '/dashboard', '2': '/journal', '3': '/trades', '4': '/notebook' };
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (atLimit) openUpgrade('Has alcanzado el límite de 30 operaciones este mes en el plan gratuito.');
        else setModalOpen(true);
      } else if (e.key === ',') {
        e.preventDefault(); navigate('/settings');
      } else if (map[e.key]) {
        e.preventDefault(); navigate(map[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [atLimit, navigate, openUpgrade]);

  const onLogout = () => {
    logout();
    push({ kind: 'success', text: 'Sesión cerrada' });
    // Hard navigation avoids React/router race: ProtectedRoute would
    // otherwise re-render and redirect to /login before / mounts.
    window.location.href = '/';
  };

  return (
    <div className="trace-app" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.5 }}>
      <aside style={{ width: collapsed ? 64 : 210, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.18s ease' }}>
        <div style={{ padding: collapsed ? '18px 0 14px' : '18px 16px 14px', flexShrink: 0, borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
            {collapsed
              ? <LogoMark size="lg" showByEtx={false} symbolOnly />
              : <LogoMark size="md" showByEtx />}
            {!collapsed && <CollapseButton collapsed={collapsed} onClick={toggleCollapsed} />}
          </div>
          {collapsed && <CollapseButton collapsed={collapsed} onClick={toggleCollapsed} />}
        </div>
        <div style={{ padding: '0 10px', margin: '10px 0 6px', flexShrink: 0 }}>
          <button
            onClick={() => {
              if (atLimit) {
                openUpgrade('Has alcanzado el límite de 30 operaciones este mes en el plan gratuito.');
              } else {
                setModalOpen(true);
              }
            }}
            title={collapsed ? 'Añadir operación' : undefined}
            style={{ width: '100%', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", transition: 'all 0.15s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#3d7aee'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue)'; e.currentTarget.style.transform = 'none'; }}
          >
            {collapsed ? '＋' : `＋ ${t('addTrade')}`}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {sections.map(section => (
            <div key={section.title} style={{ display: 'flex', flexDirection: 'column' }}>
              {!collapsed && (
                <div style={{ fontSize: '0.56rem', color: '#33334a', letterSpacing: '0.14em', padding: '10px 14px 3px', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t(section.tKey)}
                </div>
              )}
              {collapsed && <div style={{ height: 12 }} />}
              <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 8px', gap: 2 }}>
                {section.items.map(item => {
                  const ItemIcon = item.icon;
                  return (
                    <NavLink
                      key={item.to} to={item.to}
                      title={collapsed ? t(item.tKey) : undefined}
                      style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        padding: collapsed ? '9px 0' : '7px 10px', margin: '1px 6px', fontSize: '0.78rem',
                        color: isActive ? 'var(--blue)' : '#4a4a60',
                        background: isActive ? 'rgba(79,143,255,0.1)' : 'transparent',
                        borderRadius: 8,
                        borderLeft: !collapsed && isActive ? '2px solid var(--blue)' : '2px solid transparent',
                        paddingLeft: collapsed ? 0 : isActive ? 8 : 10,
                        textDecoration: 'none', fontWeight: isActive ? 600 : 400,
                        transition: 'all 0.12s ease',
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <span style={{ color: isActive ? '#4f8fff' : '#3a3a55', display: 'inline-flex', alignItems: 'center' }}>
                            <ItemIcon />
                          </span>
                          {!collapsed && <span style={{ flex: 1 }}>{t(item.tKey)}</span>}
                          {!collapsed && item.badge && (
                            <span style={{ background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: 8, padding: '2px 5px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.08em' }}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Upgrade banner for free users */}
        {isFree && !collapsed && (
          <div style={{
            margin: '0 8px 8px',
            background: 'linear-gradient(135deg, rgba(15,52,96,0.35), rgba(22,33,62,0.35))',
            border: '1px solid rgba(79,143,255,0.14)',
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600 }}>✦ Plan Pro</span>
              <span style={{ fontSize: 11, color: 'var(--blue)' }}>→</span>
            </div>
            <div style={{ fontSize: 11, color: '#33334a', marginTop: 2 }}>
              Desbloquea analíticas, brokers y más
            </div>
            <button
              onClick={() => openUpgrade()}
              style={{
                width: '100%', marginTop: 8,
                background: 'var(--blue)', color: '#fff',
                border: 'none', borderRadius: 6,
                padding: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >Actualizar →</button>
          </div>
        )}

        {/* User row */}
        <div style={{ position: 'relative', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute', left: 8, right: 8, bottom: 64,
                background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 50,
              }}
            >
              <MenuItem onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}>Mi perfil</MenuItem>
              <MenuItem onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}>Ajustes</MenuItem>
              <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0' }} />
              <MenuItem onClick={() => { setUserMenuOpen(false); onLogout(); }} danger>Cerrar sesión</MenuItem>
            </div>
          )}
          <div
            onClick={() => setUserMenuOpen(o => !o)}
            title={collapsed ? userName : undefined}
            style={{ padding: '14px 12px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10, cursor: 'pointer' }}
          >
            <Avatar size={28} avatar={avatar} initials={initials} fontSize={12} />
            {!collapsed && (
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
              <div style={{ color: '#ccc', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</span>
                {isPro && (
                  <span style={{
                    background: 'rgba(79,143,255,0.1)', color: 'var(--blue)',
                    fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 600,
                    flexShrink: 0,
                  }}>Pro ✓</span>
                )}
              </div>
              <div style={{ color: '#33334a', fontSize: '0.58rem', letterSpacing: '0.05em', marginTop: 2 }}>
                {userPlan}
              </div>
            </div>
            )}
            {!collapsed && (
            <span style={{ color: 'var(--muted)', display: 'inline-flex', transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <Icon.ChevronDown />
            </span>
            )}
          </div>
          {!collapsed && (
          <div
            onClick={() => navigate('/changelog')}
            title="Ver novedades"
            style={{ padding: '6px 12px 10px', fontSize: '0.6rem', color: '#33334a', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            v0.1.0 · Beta
          </div>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {(
        <header style={{ height: 50, flexShrink: 0, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '-0.01em' }}>{pageTitle}</div>
            <div style={{ fontSize: '0.68rem', color: '#33334a' }}>{syncLabel(latestCreatedAt)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setFilterOpen(true)}
              style={{ position: 'relative', background: filterCount ? 'rgba(79,143,255,0.1)' : 'transparent', border: `1px solid ${filterCount ? 'rgba(79,143,255,0.3)' : 'rgba(255,255,255,0.08)'}`, color: filterCount ? 'var(--blue)' : '#5a6080', fontSize: '0.75rem', padding: '6px 14px', borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { if (!filterCount) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#8a90a8'; } }}
              onMouseLeave={e => { if (!filterCount) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#5a6080'; } }}
            >Filtros{filterCount > 0 && <span style={{ marginLeft: 6, background: 'var(--blue)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, borderRadius: 8, padding: '1px 6px' }}>{filterCount}</span>}</button>
            <button
              onClick={() => setDateOpen(true)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: datePreset !== 'all' ? 'var(--blue)' : '#5a6080', fontSize: '0.75rem', padding: '6px 14px', borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s ease', borderBottom: datePreset !== 'all' ? '2px solid var(--blue)' : '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => { if (datePreset === 'all') { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#8a90a8'; } }}
              onMouseLeave={e => { if (datePreset === 'all') { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#5a6080'; } }}
            >{datePreset !== 'all' ? `Fechas: ${PRESET_LABEL[datePreset]}` : 'Fechas'}</button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setTopMenuOpen(o => !o)}
                style={{
                  background: '#1e1e28', border: '1px solid #2a2a35', color: '#fff',
                  fontSize: '0.72rem', padding: '4px 10px 4px 4px', borderRadius: 999,
                  cursor: 'pointer', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <Avatar size={22} avatar={avatar} initials={initials} fontSize={10} />
                <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</span>
                <Icon.ChevronDown />
              </button>
              {topMenuOpen && (
                <>
                  <div onClick={() => setTopMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 91, background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 8, minWidth: 240, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 6 }}>
                      <Avatar size={36} avatar={avatar} initials={initials} fontSize={13} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</span>
                          <span style={{ flexShrink: 0, background: isPro ? 'rgba(79,143,255,0.12)' : 'rgba(255,255,255,0.06)', color: isPro ? 'var(--blue)' : 'var(--text-secondary)', fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>{isPro ? 'Pro ✓' : 'Gratis'}</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                      </div>
                    </div>
                    <UserRow icon="👤" onClick={() => { setTopMenuOpen(false); navigate('/settings'); }}>Mi perfil</UserRow>
                    <UserRow icon="🎨" onClick={() => { setTopMenuOpen(false); navigate('/settings'); }}>Apariencia</UserRow>
                    <UserRow icon="⚡" onClick={() => { setTopMenuOpen(false); navigate('/settings'); }}>Plan y facturación</UserRow>
                    <UserRow icon="📊" onClick={() => { setTopMenuOpen(false); navigate('/settings'); }}>Datos y exportación</UserRow>
                    <UserRow icon="⚙️" onClick={() => { setTopMenuOpen(false); navigate('/settings'); }}>Ajustes</UserRow>
                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 0' }} />
                    {isFree && (
                      <>
                        <UserRow icon="✨" accent onClick={() => { setTopMenuOpen(false); openUpgrade(); }}>Actualizar a Pro</UserRow>
                        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 0' }} />
                      </>
                    )}
                    <UserRow icon="📚" onClick={() => { setTopMenuOpen(false); navigate('/faq'); }}>Ayuda y soporte</UserRow>
                    <UserRow icon="💬" onClick={() => { setTopMenuOpen(false); window.open(SOCIAL.discord, '_blank', 'noopener'); }}>Discord</UserRow>
                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 0' }} />
                    <UserRow icon="🚪" danger onClick={() => { setTopMenuOpen(false); setConfirmLogout(true); }}>Cerrar sesión</UserRow>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        )}

        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>

      <AddTradeModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <FilterModal open={filterOpen} onClose={() => setFilterOpen(false)} />
      <DateRangeModal open={dateOpen} onClose={() => setDateOpen(false)} />
      <ConfirmDialog
        open={confirmLogout}
        title="¿Cerrar sesión?"
        description="Volverás a la pantalla de inicio de sesión."
        confirmText="Cerrar sesión"
        destructive
        onConfirm={() => { setConfirmLogout(false); logout(); window.location.href = '/login'; }}
        onCancel={() => setConfirmLogout(false)}
      />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SupportWidget />
      <UndoToast />
      <WeeklyRecapModal open={recapOpen} onClose={() => setRecapOpen(false)} />
    </div>
  );
}

function UserRow({ children, icon, onClick, danger, accent }: { children: React.ReactNode; icon: string; onClick: () => void; danger?: boolean; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer',
        padding: '8px 12px', fontSize: '0.8rem', fontFamily: "'Space Grotesk', sans-serif",
        color: danger ? 'var(--danger)' : accent ? 'var(--blue)' : '#c8c8d8', textAlign: 'left',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{icon}</span>
      {children}
    </button>
  );
}

function Avatar({ size, avatar, initials, fontSize }: { size: number; avatar?: string; initials: string; fontSize: number }) {
  if (avatar) {
    return <img src={avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(79,143,255,0.2)' }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(79,143,255,0.15)', border: '1px solid rgba(79,143,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f8fff', fontSize, fontWeight: 700, fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>{initials}</div>
  );
}

function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      title={collapsed ? 'Expandir' : 'Colapsar'}
      style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: 'transparent', border: '1px solid var(--border-subtle)',
        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, lineHeight: 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
    >{collapsed ? '›' : '‹'}</button>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        background: 'transparent', border: 'none',
        color: danger ? 'var(--red)' : 'var(--text)',
        padding: '8px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 5,
        fontFamily: "'Inter', sans-serif",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--dim2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

export default AppLayout;
