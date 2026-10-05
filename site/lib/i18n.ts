import { defineI18n } from 'fumadocs-core/i18n';
export const i18n = defineI18n({ languages: ['de', 'en'], defaultLanguage: 'de', hideLocale: 'never' });
export function isLocale(lang: string): lang is 'de' | 'en' { return lang === 'de' || lang === 'en'; }
