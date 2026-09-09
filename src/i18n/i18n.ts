import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * App i18n (react-i18next). Migrated in tranches, namespaced by surface.
 * Tranche 1 covers the persistent chrome: sidebar, topbar, user menus,
 * upgrade banner, sync label, page titles, plan labels and common buttons.
 */
const es = {
  translation: {
    section: { principal: 'PRINCIPAL', analisis: 'ANÁLISIS', config: 'CONFIG' },
    nav: {
      dashboard: 'Dashboard', journal: 'Diario Diario', trades: 'Operaciones', notebook: 'Notebook',
      reports: 'Reportes', progress: 'Progress Tracker', replay: 'Trade Replay', simulator: 'Simulador',
      propFirms: 'Prop Firms', gallery: 'Galería', brokers: 'Brokers', settings: 'Ajustes',
    },
    addTrade: 'Añadir operación',
    settings: {
      title: 'Ajustes',
      profile: 'Mi perfil', appearance: 'Apariencia', trading: 'Trading', plan: 'Plan y facturación',
      notifications: 'Notificaciones', language: 'Idioma y región', security: 'Seguridad',
      data: 'Datos y exportación', danger: 'Zona de peligro',
    },
    plan: { free: 'Plan Gratis', pro: 'Plan Pro', pro_ai: 'Plan Pro AI', founder: 'Fundador', freeShort: 'Gratis', proBadge: 'Pro ✓' },
    chrome: {
      version: 'v0.1.0 · Beta',
      syncNone: 'Sin datos aún',
      syncNow: 'Sincronizado ahora mismo',
      syncMin: 'Sincronizado hace {{n}} min',
      syncHour: 'Sincronizado hace {{n}} h',
      syncDay: 'Sincronizado hace {{n}} d',
    },
    topbar: {
      searchTitle: 'Buscar (Cmd+K)', searchAria: 'Buscar',
      filters: 'Filtros', dates: 'Fechas',
    },
    upgrade: { cta: '✦ Actualiza a Pro', sub: 'Desde €9.92/mes. Analíticas, brokers y más.', seePlans: 'Ver planes →' },
    userMenu: {
      profile: 'Mi perfil', appearance: 'Apariencia', plan: 'Plan y facturación',
      data: 'Datos y exportación', settings: 'Ajustes', upgrade: 'Actualizar a Pro',
      help: 'Ayuda y soporte', discord: 'Discord', logout: 'Cerrar sesión',
    },
    auth: {
      logoutConfirmTitle: '¿Cerrar sesión?',
      logoutConfirmDesc: 'Volverás a la pantalla de inicio de sesión.',
      sessionClosed: 'Sesión cerrada',
    },
    common: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', add: 'Añadir', apply: 'Aplicar', close: 'Cerrar' },
    toast: { languageUpdated: 'Idioma actualizado a Español' },
  },
};

const en = {
  translation: {
    section: { principal: 'MAIN', analisis: 'ANALYSIS', config: 'CONFIG' },
    nav: {
      dashboard: 'Dashboard', journal: 'Daily Journal', trades: 'Trades', notebook: 'Notebook',
      reports: 'Reports', progress: 'Progress Tracker', replay: 'Trade Replay', simulator: 'Simulator',
      propFirms: 'Prop Firms', gallery: 'Gallery', brokers: 'Brokers', settings: 'Settings',
    },
    addTrade: 'Add trade',
    settings: {
      title: 'Settings',
      profile: 'My profile', appearance: 'Appearance', trading: 'Trading', plan: 'Plan & billing',
      notifications: 'Notifications', language: 'Language & region', security: 'Security',
      data: 'Data & export', danger: 'Danger zone',
    },
    plan: { free: 'Free plan', pro: 'Pro plan', pro_ai: 'Pro AI plan', founder: 'Founder', freeShort: 'Free', proBadge: 'Pro ✓' },
    chrome: {
      version: 'v0.1.0 · Beta',
      syncNone: 'No data yet',
      syncNow: 'Synced just now',
      syncMin: 'Synced {{n}} min ago',
      syncHour: 'Synced {{n}} h ago',
      syncDay: 'Synced {{n}} d ago',
    },
    topbar: {
      searchTitle: 'Search (Cmd+K)', searchAria: 'Search',
      filters: 'Filters', dates: 'Dates',
    },
    upgrade: { cta: '✦ Upgrade to Pro', sub: 'From €9.92/mo. Analytics, brokers and more.', seePlans: 'See plans →' },
    userMenu: {
      profile: 'My profile', appearance: 'Appearance', plan: 'Plan & billing',
      data: 'Data & export', settings: 'Settings', upgrade: 'Upgrade to Pro',
      help: 'Help & support', discord: 'Discord', logout: 'Log out',
    },
    auth: {
      logoutConfirmTitle: 'Log out?',
      logoutConfirmDesc: "You'll return to the login screen.",
      sessionClosed: 'Logged out',
    },
    common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', add: 'Add', apply: 'Apply', close: 'Close' },
    toast: { languageUpdated: 'Language changed to English' },
  },
};

function initialLang(): 'es' | 'en' {
  try {
    const s = JSON.parse(localStorage.getItem('trace_settings') || '{}');
    const l = s?.state?.language;
    return l === 'en' ? 'en' : 'es';
  } catch { return 'es'; }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { es, en },
    lng: initialLang(),
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
export { useTranslation } from 'react-i18next';
