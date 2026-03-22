'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/translations';

const LanguageContext = createContext<any>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState('en');

  // تحميل اللغة المحفوظة أول ما يفتح الموقع
  useEffect(() => {
    const savedLang = localStorage.getItem('app_lang') || 'en';
    setLang(savedLang);
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLang;
  }, []);

  const switchLanguage = (newLang: string) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const t = (key: string) => translations[lang as keyof typeof translations][key as keyof typeof translations['en']] || key;

  return (
    <LanguageContext.Provider value={{ lang, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);