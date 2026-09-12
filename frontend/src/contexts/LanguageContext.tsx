/**
 * LanguageContext — compatibility shim for pages using useLanguage()
 *
 * Works with or without LanguageProvider. When no Provider is present,
 * reads/writes language from i18n (react-i18next).
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../i18n';
import { Language, translations, TranslationKey } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKey;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    (i18n.language?.startsWith('gu') ? 'gu' : 'en') as Language
  );

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
  };

  // Sync when i18n language changes externally
  useEffect(() => {
    const handler = (lng: string) => {
      setLanguageState(lng.startsWith('gu') ? 'gu' : 'en');
    };
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);

  const t = translations[language] as TranslationKey;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook — works both inside and outside LanguageProvider.
 * When no Provider is present, reads from the i18n singleton.
 */
export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);

  // If we have a context provider, use it
  if (ctx) return ctx;

  // Fallback: derive state from i18n singleton (no provider needed)
  const currentLang = (i18n.language?.startsWith('gu') ? 'gu' : 'en') as Language;

  return {
    language: currentLang,
    setLanguage: (lang: Language) => { i18n.changeLanguage(lang); },
    t: translations[currentLang] as TranslationKey,
  };
}
