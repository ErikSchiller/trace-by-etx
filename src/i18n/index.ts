import { es } from './es';
import { en } from './en';
import type { Language } from '../types';

export const translations = { es, en };

export function t(lang: Language) {
  return translations[lang] || translations.es;
}

export { es, en };
