'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useLang } from '@/context/LanguageContext';

export default function SettingsPage() {
  const router = useRouter();
  const { lang, switchLanguage, t } = useLang();
  const [activeSection, setActiveSection] = useState('Account preferences');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // بيانات البروفايل
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [theme, setTheme] = useState('dark');

  // State شامل لكل "فتفوتة" 
  const [prefs, setPrefs] = useState<any>({
    autoplay: true, soundEffects: true, showPhotos: 'All members', feedView: 'Most relevant', 
    syncCalendar: false, syncContacts: false, microsoftPartner: true,
    twoFactor: false,
    pageVisitVis: true, connectionsVis: true, representingOrg: true, dataExportOwners: false,
    jobChangesVis: false, newsNotify: true, mentionedByOthers: true, discoveryEmail: 'Anyone', discoveryPhone: 'Everyone',
    policyResearch: true, genAI: true, researchInvis: true, focusedInbox: true, typingIndicators: true,
    msgSuggestions: true, msgNudges: true, harmfulDetection: true, shareProfileApply: true, signalRecruiters: false, microsoftWord: true,
    adConnections: true, adCompanies: true, adGroups: true, adEdu: true, adJob: true, adEmployer: true,
    adDisplay: true, adLocation: true, adInferredCity: true, adAge: true, adGender: true, adsOffLinkedIn: true,
    adDataOthers: true, adMeasure: true, adShareAffiliates: true,
    notifJobs: true, notifHiring: true, notifConnect: true, notifNetwork: true, notifPost: true, notifMsg: true,
    notifGroups: true, notifPages: true, notifEvents: true, notifNews: true, notifProfile: true, notifVerif: true,
    notifGames: true, notifAdBiz: true
  });

  // تمييز الأقسام بروابط الترجمة
  const SECTIONS = [
    { id: "Account preferences", tx: "account_prefs" },
    { id: "Sign in & security", tx: "security" },
    { id: "Visibility", tx: "visibility" },
    { id: "Data privacy", tx: "data_privacy" },
    { id: "Advertising data", tx: "ads_data" },
    { id: "Notifications", tx: "notifications" }
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      setUser(session.user);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) { setFullName(profile.full_name || ''); setPhone(profile.phone || ''); }
      const savedTheme = localStorage.getItem('system_theme') || 'dark';
      setTheme(savedTheme);
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  const toggle = (key: string) => { setPrefs((p: any) => ({ ...p, [key]: !p[key] })); toast.success("Updated"); };

  const handleSavePhone = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ phone }).eq('id', user.id);
      if (error) throw error;
      toast.success("Phone saved!"); setShowPhoneInput(false);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const toggleTheme = (t: string) => {
    setTheme(t); localStorage.setItem('system_theme', t);
    document.documentElement.classList.toggle('light-mode', t === 'light');
    document.documentElement.classList.toggle('dark', t === 'dark');
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black text-cyan-500 animate-pulse text-xl uppercase font-sans tracking-widest">{t('compiling')}</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white font-sans transition-colors duration-500">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-[100] bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group font-sans">
            <span className="text-slate-400 group-hover:text-cyan-500 rtl:rotate-180 inline-block">←</span>
            <span className="font-black text-xs uppercase tracking-widest text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white">{t('back_to_feed')}</span>
          </Link>
          <div className="flex items-center gap-3 font-mono font-bold text-[10px] text-slate-400 uppercase tracking-widest">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> {t('system_operational')}
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-65px)]">
        
        {/* Sidebar */}
        <aside className="lg:col-span-3 border-r border-slate-200 dark:border-white/5 bg-white dark:bg-black/20 p-8 font-sans">
          <div className="mb-10">
            <h1 className="text-3xl font-black uppercase tracking-tighter">{t('settings')}</h1>
            <p className="text-[10px] font-mono text-slate-400 mt-2 uppercase">{t('mainframe_node')}</p>
          </div>
          <div className="space-y-1">
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} className={`w-full text-left px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl ${activeSection === s.id ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}>
                {t(s.tx)}
              </button>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-9 p-8 md:p-16 lg:p-24 overflow-y-auto custom-scrollbar bg-white dark:bg-transparent font-sans">
          <div className="max-w-3xl space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Section 1: Account Preferences */}
            {activeSection === 'Account preferences' && (
              <div className="space-y-12">
                <section>
                  <h2 className="text-2xl font-black uppercase border-b border-slate-100 dark:border-white/5 pb-4 mb-8">{t('profile_info')}</h2>
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    <div className="py-6 flex justify-between items-center"><div><p className="font-bold text-sm">{t('name_location')}</p><p className="text-xs text-slate-500">{fullName}</p></div><button className="text-cyan-500 text-[10px] font-black uppercase">{t('change')}</button></div>
                    <div className="py-6 flex justify-between items-center"><p className="font-bold text-sm">{t('demographics')}</p><span className="text-slate-300 rtl:rotate-180 inline-block">→</span></div>
                    <div className="py-6 flex justify-between items-center"><p className="font-bold text-sm">{t('verifications')}</p><span className="text-purple-500 font-black text-[10px]">{t('verified')}</span></div>
                  </div>
                </section>
                
                <section>
                  <h2 className="text-2xl font-black uppercase mb-8">{t('display_prefs')}</h2>
                  
                  {/* Language Controls */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button onClick={() => switchLanguage('en')} className={`p-8 rounded-3xl border-2 transition-all font-black text-[10px] ${lang === 'en' ? 'border-cyan-500 bg-cyan-500/5 text-cyan-500' : 'border-slate-200 dark:border-white/5 text-slate-500'}`}>{t('english_ui')}</button>
                    <button onClick={() => switchLanguage('ar')} className={`p-8 rounded-3xl border-2 transition-all font-black text-[10px] ${lang === 'ar' ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500' : 'border-slate-200 dark:border-white/5 text-slate-500'}`}>{t('arabic_ui')}</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button onClick={() => toggleTheme('dark')} className={`p-8 rounded-3xl border-2 transition-all font-black text-[10px] ${theme === 'dark' ? 'border-purple-500 bg-purple-500/5 text-purple-500' : 'border-slate-200 dark:border-white/5 text-slate-500'}`}>{t('dark_mode')}</button>
                    <button onClick={() => toggleTheme('light')} className={`p-8 rounded-3xl border-2 transition-all font-black text-[10px] ${theme === 'light' ? 'border-amber-500 bg-amber-500/5 text-amber-500' : 'border-slate-200 dark:border-white/5 text-slate-500'}`}>{t('light_mode')}</button>
                  </div>
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl flex justify-between items-center"><p className="font-bold text-sm">{t('autoplay')}</p><input type="checkbox" checked={prefs.autoplay} onChange={() => toggle('autoplay')} className="w-5 h-5 accent-cyan-500" /></div>
                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl flex justify-between items-center"><p className="font-bold text-sm">{t('sound_effects')}</p><input type="checkbox" checked={prefs.soundEffects} onChange={() => toggle('soundEffects')} className="w-5 h-5 accent-cyan-500" /></div>
                  </div>
                </section>
                <section className="pt-10 border-t-2 border-red-500/10">
                   <h2 className="text-red-500 text-2xl font-black uppercase mb-8">{t('account_mgmt')}</h2>
                   <button className="w-full text-left rtl:text-right p-8 border border-slate-200 dark:border-white/10 rounded-3xl mb-4 hover:border-amber-500 font-bold uppercase text-xs">{t('hibernate')}</button>
                   <button onClick={() => supabase.auth.signOut()} className="w-full text-left rtl:text-right p-8 bg-red-500/5 border border-red-500/10 rounded-3xl hover:bg-red-500 hover:text-white transition-all font-bold uppercase text-xs">{t('close_delete')}</button>
                </section>
              </div>
            )}

            {/* Section 2: Sign in & security */}
            {activeSection === 'Sign in & security' && (
              <div className="space-y-12">
                <h2 className="text-2xl font-black uppercase border-b border-slate-100 dark:border-white/5 pb-4">{t('account_access')}</h2>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  <div className="py-8 flex justify-between items-center"><div><p className="font-bold text-sm">{t('email_addresses')}</p><p className="text-xs text-slate-500">abdoyehia3347@gmail.com</p></div><span className="text-[10px] font-black text-slate-400">{t('primary')}</span></div>
                  <div className="py-8">
                    <div className="flex justify-between items-center"><div><p className="font-bold text-sm">{t('phone_numbers')}</p><p className="text-xs text-slate-500">{phone || t('none_added')}</p></div><button onClick={() => setShowPhoneInput(!showPhoneInput)} className="text-cyan-500 text-[10px] font-black uppercase">{phone ? t('change') : t('add')}</button></div>
                    {showPhoneInput && (
                      <div className="mt-4 flex gap-2"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none" /><button onClick={handleSavePhone} className="bg-cyan-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase">{t('save')}</button></div>
                    )}
                  </div>
                  <div className="py-8 flex justify-between items-center"><p className="font-bold text-sm">{t('two_factor')}</p><button onClick={() => toggle('twoFactor')} className={`px-4 py-1 rounded-full text-[10px] font-black ${prefs.twoFactor ? 'bg-green-500 text-white' : 'bg-slate-300'}`}>{prefs.twoFactor ? t('on') : t('off')}</button></div>
                </div>
              </div>
            )}

            {/* Section 3: Visibility */}
            {activeSection === 'Visibility' && (
              <div className="space-y-12">
                <h2 className="text-2xl font-black uppercase border-b border-slate-100 dark:border-white/5 pb-4">{t('vis_profile_network')}</h2>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  <div className="py-6 flex justify-between items-center"><div><p className="font-bold text-sm">{t('profile_viewing')}</p><p className="text-xs text-slate-500">{t('name_headline')}</p></div><button className="text-cyan-500 text-[10px] font-black uppercase">{t('edit')}</button></div>
                  {[
                    { id: 'pageVisitVis', tx: 'page_visit' },
                    { id: 'connectionsVis', tx: 'see_connections' },
                    { id: 'representingOrg', tx: 'rep_org' },
                    { id: 'newsNotify', tx: 'notify_news' },
                    { id: 'mentionedByOthers', tx: 'mentioned' }
                  ].map(i => (
                    <div key={i.id} className="py-6 flex justify-between items-center"><p className="font-bold text-sm">{t(i.tx)}</p><button onClick={() => toggle(i.id)} className={`px-4 py-1 rounded-full text-[10px] font-black ${prefs[i.id] ? 'bg-green-500 text-white' : 'bg-slate-300'}`}>{prefs[i.id] ? t('on') : t('off')}</button></div>
                  ))}
                  <div className="py-6 flex justify-between items-center"><p className="font-bold text-sm uppercase text-red-500">{t('blocked_members')}</p><button className="text-red-500 text-[10px] font-black uppercase">{t('manage')}</button></div>
                </div>
              </div>
            )}

            {/* Section 4: Data Privacy */}
            {activeSection === 'Data privacy' && (
              <div className="space-y-12">
                <section>
                  <h2 className="text-2xl font-black uppercase border-b border-slate-100 dark:border-white/5 pb-4 mb-8">{t('how_data_used')}</h2>
                  <div className="space-y-4">
                    <div className="p-8 border border-slate-200 dark:border-white/5 rounded-3xl flex justify-between items-center hover:border-cyan-500 transition-all cursor-pointer"><p className="font-bold text-sm uppercase">{t('download_data')}</p><span className="rtl:rotate-180 inline-block">→</span></div>
                    <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-3xl flex justify-between items-center"><div><p className="font-bold text-sm uppercase">{t('gen_ai')}</p></div><button onClick={() => toggle('genAI')} className={`px-6 py-2 rounded-full text-[10px] font-black ${prefs.genAI ? 'bg-green-500 text-white' : 'bg-slate-400'}`}>{prefs.genAI ? t('on') : t('off')}</button></div>
                    <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-3xl flex justify-between items-center"><div><p className="font-bold text-sm uppercase">{t('policy_research')}</p></div><button onClick={() => toggle('policyResearch')} className={`px-6 py-2 rounded-full text-[10px] font-black ${prefs.policyResearch ? 'bg-green-500 text-white' : 'bg-slate-400'}`}>{prefs.policyResearch ? t('on') : t('off')}</button></div>
                  </div>
                </section>
                <section>
                   <h2 className="text-2xl font-black uppercase border-b border-slate-100 dark:border-white/5 pb-4 mb-8">{t('messaging_exp')}</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'focusedInbox', tx: 'focused_inbox' },
                        { id: 'msgSuggestions', tx: 'msg_suggestions' },
                        { id: 'msgNudges', tx: 'msg_nudges' },
                        { id: 'harmfulDetection', tx: 'harmful_detect' }
                      ].map(i => (
                        <div key={i.id} className="p-6 bg-slate-100 dark:bg-white/5 rounded-3xl flex justify-between items-center"><p className="font-bold text-[10px] uppercase">{t(i.tx)}</p><input type="checkbox" checked={prefs[i.id]} onChange={() => toggle(i.id)} className="w-5 h-5 accent-cyan-500" /></div>
                      ))}
                   </div>
                </section>
                <section>
                   <h2 className="text-2xl font-black uppercase border-b border-slate-100 dark:border-white/5 pb-4 mb-8">{t('job_seeking')}</h2>
                   <div className="p-8 border border-slate-200 dark:border-white/10 rounded-3xl flex justify-between items-center"><p className="font-bold text-sm uppercase">{t('share_profile')}</p><button onClick={() => toggle('shareProfileApply')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${prefs.shareProfileApply ? 'bg-cyan-500 text-black' : 'bg-slate-400'}`}>{prefs.shareProfileApply ? t('on') : t('off')}</button></div>
                </section>
                <section>
                   <h2 className="text-2xl font-black uppercase border-b border-slate-100 dark:border-white/5 pb-4 mb-8">{t('other_apps')}</h2>
                   <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-3xl flex justify-between items-center"><p className="font-bold text-sm uppercase">{t('ms_word')}</p><button onClick={() => toggle('microsoftWord')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${prefs.microsoftWord ? 'bg-green-500 text-white' : 'bg-slate-400'}`}>{prefs.microsoftWord ? t('on') : t('off')}</button></div>
                </section>
              </div>
            )}

            {/* Section 5: Advertising Data */}
            {activeSection === 'Advertising data' && (
              <div className="space-y-12">
                <h2 className="text-2xl font-black uppercase border-b border-slate-100 dark:border-white/5 pb-4">{t('profile_data_ads')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'adConnections', tx: 'connections' }, { id: 'adCompanies', tx: 'companies_followed' },
                    { id: 'adGroups', tx: 'groups' }, { id: 'adEdu', tx: 'edu_skills' },
                    { id: 'adJob', tx: 'job_info' }, { id: 'adEmployer', tx: 'employer' },
                    { id: 'adLocation', tx: 'location' }, { id: 'adAge', tx: 'age_range' },
                    { id: 'adGender', tx: 'gender' }, { id: 'adsOffLinkedIn', tx: 'ads_off' },
                    { id: 'adMeasure', tx: 'measure_ads' }, { id: 'adShareAffiliates', tx: 'share_partners' }
                  ].map(i => (
                    <div key={i.id} className="p-6 bg-slate-100 dark:bg-white/5 rounded-2xl flex justify-between items-center"><p className="font-bold text-[10px] uppercase">{t(i.tx)}</p><input type="checkbox" checked={prefs[i.id]} onChange={() => toggle(i.id)} className="w-4 h-4 accent-cyan-500" /></div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 6: Notifications */}
            {activeSection === 'Notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black uppercase border-b border-slate-100 dark:border-white/5 pb-4">{t('alert_matrix')}</h2>
                {[
                  { id: 'notifJobs', tx: 'search_job' }, { id: 'notifHiring', tx: 'hiring' },
                  { id: 'notifConnect', tx: 'connect_others' }, { id: 'notifNetwork', tx: 'network_updates' },
                  { id: 'notifPost', tx: 'posting' }, { id: 'notifMsg', tx: 'messaging' },
                  { id: 'notifGroups', tx: 'groups' }, { id: 'notifPages', tx: 'pages' },
                  { id: 'notifEvents', tx: 'attending_events' }, { id: 'notifNews', tx: 'news_reports' },
                  { id: 'notifProfile', tx: 'update_profile' }, { id: 'notifVerif', tx: 'verifications' },
                  { id: 'notifGames', tx: 'games' }, { id: 'notifAdBiz', tx: 'ad_business' }
                ].map(i => (
                  <div key={i.id} className="p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-3xl flex justify-between items-center group transition-all">
                    <p className="font-bold text-sm uppercase group-hover:text-cyan-500">{t(i.tx)}</p>
                    <div className="flex items-center gap-4"><span className="text-[9px] font-mono text-slate-500 font-bold">{t('email_push')}</span><input type="checkbox" checked={prefs[i.id]} onChange={() => toggle(i.id)} className="w-5 h-5 accent-cyan-500" /></div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}