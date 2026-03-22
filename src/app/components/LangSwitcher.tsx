'use client';
import { useLang } from '../../context/LanguageContext';

export default function LangSwitcher() {
  const { lang, switchLanguage } = useLang();

  return (
    <div className="flex bg-black/40 border border-white/10 p-1 rounded-2xl">
      <button 
        onClick={() => switchLanguage('en')}
        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${lang === 'en' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white'}`}
      >
        EN
      </button>
      <button 
        onClick={() => switchLanguage('ar')}
        className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${lang === 'ar' ? 'bg-emerald-500 text-black' : 'text-slate-500 hover:text-white'}`}
      >
        AR
      </button>
    </div>
  );
}