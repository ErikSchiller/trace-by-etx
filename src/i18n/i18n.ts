import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * First-pass i18n. Infrastructure is ready; only a subset of strings is
 * migrated (sidebar, section headers, settings sections, common buttons).
 * The rest of the app stays Spanish for both languages until fully migrated.
 */
const es = {
  translation: {
    section: { principal: 'PRINCIPAL', analisis: 'ANÁLISIS', config: 'CONFIG' },
    nav: {
      dashboard: 'Dashboard', journal: 'Diario Diario', trades: 'Operaciones', notebook: 'Notebook',
      reports: 'Reportes', progress: 'Progress Tracker', replay: 'Trade Replay', simulator: 'Simulador',
      propFirms: 'Prop Firms', brokers: 'Brokers', settings: 'Ajustes',
    },
    addTrade: 'Añadir operación',
    settings: {
      title: 'Ajustes',
      profile: 'Mi perfil', appearance: 'Apariencia', trading: 'Trading', plan: 'Plan y facturación',
      notifications: 'Notificaciones', language: 'Idioma y región', security: 'Seguridad',
      data: 'Datos y exportación', danger: 'Zona de peligro',
    },
    common: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', add: 'Añadir', apply: 'Aplicar' },
    toast: { languageUpdated: 'Idioma actualizado' },
  },
};

const en = {
  translation: {
    section: { principal: 'MAIN', analisis: 'ANALYSIS', config: 'CONFIG' },
    nav: {
      dashboard: 'Dashboard', journal: 'Daily Journal', trades: 'Trades', notebook: 'Notebook',
      reports: 'Reports', progress: 'Progress Tracker', replay: 'Trade Replay', simulator: 'Simulator',
      propFirms: 'Prop Firms', brokers: 'Brokers', settings: 'Settings',
    },
    addTrade: 'Add trade',
    settings: {
      title: 'Settings',
      profile: 'My profile', appearance: 'Appearance', trading: 'Trading', plan: 'Plan & billing',
      notifications: 'Notifications', language: 'Language & region', security: 'Security',
      data: 'Data & export', danger: 'Danger zone',
    },
    common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', add: 'Add', apply: 'Apply' },
    toast: { languageUpdated: 'Language updated' },
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
