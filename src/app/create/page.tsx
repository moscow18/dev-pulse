'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/context/LanguageContext'; // 👈 المحرك

export default function CreatePostPage() {
  const router = useRouter();
  const { t, lang } = useLang(); // 👈 استدعاء الترجمة
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const LANGUAGES = [
    { value: 'javascript', label: 'Javascript' },
    { value: 'html', label: 'HTML_UI' },
    { value: 'css', label: 'CSS_Styles' },
    { value: 'typescript', label: 'Typescript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' },
    { value: 'go', label: 'Go_Lang' },
    { value: 'rust', label: 'Rust' },
    { value: 'sql', label: 'SQL_Query' },
    { value: 'shell', label: 'Shell_Script' },
    { value: 'kotlin', label: 'Kotlin' }
  ];

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("UNAUTHORIZED_ACCESS");
        router.push('/login');
      } else {
        setUser(session.user);
      }
    };
    getSession();
  }, [router]);

  const getLivePreviewDoc = () => {
    const isDark = language !== 'html';
    const bg = isDark ? '#020617' : '#ffffff';
    const color = isDark ? '#22d3ee' : '#000000';

    if (language === 'html' || language === 'javascript' || language === 'css') {
      let content = code;
      if (language === 'css') content = `<style>${code}</style><div class="preview-target">UI_PREVIEW_ACTIVE</div>`;
      
      return `
        <!DOCTYPE html>
        <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
          <head>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { 
                background: ${bg}; color: ${color}; font-family: sans-serif; 
                margin: 0; padding: 60px; min-height: 100vh;
                display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
              }
              #console { width: 100%; max-width: 800px; font-family: monospace; font-size: 14px; line-height: 1.8; text-align: left; direction: ltr; }
              .preview-wrapper { width: 100%; display: flex; justify-content: center; }
              .log-line { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0; }
              .prefix { color: #64748b; margin-right: 10px; font-weight: 900; }
            </style>
          </head>
          <body>
            <div class="preview-wrapper">
              ${language === 'javascript' ? '<div id="console"></div>' : content}
            </div>
            <script>
              if ("${language}" === "javascript") {
                const con = document.getElementById('console');
                console.log = (...args) => {
                  con.innerHTML += '<div class="log-line"><span class="prefix">></span>' + args.join(' ') + '</div>';
                };
                try { ${code} } catch (e) {
                  con.innerHTML += '<div style="color: #ef4444; margin-top: 15px; font-weight: 900;">[SYSTEM_ERROR]: ' + e.message + '</div>';
                }
              }
            </script>
          </body>
        </html>
      `;
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return toast.error("DATA_INPUT_REQUIRED");
    setLoading(true);
    try {
      let uploadedImageUrl = '';
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('post-images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
        uploadedImageUrl = publicUrl;
      }
      const { error } = await supabase.from('snippets').insert({
        title, code, language, difficulty, image_url: uploadedImageUrl, user_id: user.id
      });
      if (error) throw error;
      toast.success("PACKET_DEPLOYED");
      router.push('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/30">
      
      <nav className="p-5 border-b border-white/5 bg-[#020617] sticky top-0 z-50 flex justify-between items-center">
        <Link href="/" className="text-[10px] font-black uppercase text-slate-500 hover:text-cyan-400 tracking-[0.4em] transition-all flex items-center gap-2">
          <span className="rtl:rotate-180 inline-block">←</span> {t('back_to_feed')}
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Moscow_Studio_v4.2</span>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        
        <div className="p-8 md:p-14 border-r border-white/5 space-y-10 h-[calc(100vh-65px)] overflow-y-auto custom-scrollbar">
          <header>
            <h1 className="text-5xl font-black uppercase tracking-tighter">{t('dev_studio')}</h1>
            <p className="text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.5em] mt-2">{t('core_env')}</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest rtl:mr-4 ltr:ml-4 block">{t('complexity_level')}</label>
                <select 
                  value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest text-amber-500 focus:border-amber-500/40 outline-none appearance-none cursor-pointer"
                >
                  <option value="Beginner" className="bg-black">{t('lvl_beginner')}</option>
                  <option value="Intermediate" className="bg-black">{t('lvl_intermediate')}</option>
                  <option value="Advanced" className="bg-black">{t('lvl_advanced')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest rtl:mr-4 ltr:ml-4 block">{t('syntactic_env')}</label>
                <select 
                  value={language} onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest text-cyan-400 focus:border-cyan-400/40 outline-none appearance-none cursor-pointer"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value} className="bg-black">{lang.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest rtl:mr-4 ltr:ml-4 block">{t('packet_title')}</label>
              <input 
                value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={t('packet_placeholder')}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-5 text-sm font-bold uppercase tracking-tight focus:border-cyan-500/40 outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest rtl:mr-4 ltr:ml-4 block">{t('source_code')}</label>
              <textarea 
                value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="// INITIALIZE_CODE..."
                className="w-full bg-[#010409] border border-white/10 rounded-[2rem] px-10 py-10 h-96 font-mono text-xs text-cyan-100/80 leading-relaxed focus:border-purple-500/40 outline-none resize-none shadow-2xl custom-scrollbar text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-600 tracking-widest rtl:mr-4 ltr:ml-4 block">{t('media_asset')}</label>
              <label className="w-full h-24 border-2 border-white/5 border-dashed rounded-3xl bg-white/[0.02] flex items-center justify-center cursor-pointer hover:bg-white/[0.04] transition-all group">
                <span className="text-[10px] font-black text-slate-500 group-hover:text-cyan-400 uppercase tracking-widest">
                  {imageFile ? `${imageFile.name}` : t('choose_file')}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            <button 
              disabled={loading}
              className="w-full py-7 rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black uppercase tracking-[0.8em] text-[12px] shadow-[0_20px_50px_-15px_rgba(6,182,212,0.3)] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? t('transmitting') : t('deploy_packet')}
            </button>
          </form>
        </div>

        {/* --- Right Side: The Unbound Live Environment --- */}
        <div className="bg-[#010409] p-4 md:p-8 h-[calc(100vh-65px)] flex flex-col">
          <div className="mb-6 flex justify-between items-center px-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">{t('live_node_env')}</h2>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div>
            </div>
          </div>

          <div className="flex-1 bg-white/[0.01] border border-white/10 rounded-[4rem] overflow-hidden relative shadow-2xl group flex items-center justify-center">
            {(language === 'html' || language === 'javascript' || language === 'css') && code.trim() ? (
              <iframe 
                srcDoc={getLivePreviewDoc()} 
                title="Live Output" 
                sandbox="allow-scripts allow-same-origin" 
                className={`w-full h-full transition-all duration-700 border-none ${language === 'html' ? 'bg-white' : 'bg-transparent'}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-20 opacity-20">
                <div className="text-6xl mb-6">🛰️</div>
                <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400">{t('awaiting_logic')}</p>
              </div>
            )}
            
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/5 px-6 py-2 rounded-full text-[8px] font-black text-cyan-500/60 uppercase tracking-widest pointer-events-none whitespace-nowrap">
              {t('matrix_active')}
            </div>
          </div>
          
          <div className="mt-8 p-6 border border-white/5 rounded-2xl bg-white/[0.01]">
            <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em] text-center">
              {t('node_status')}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}