'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
// 👇 استدعاء محرك اللغة 👇
import { useLang } from '@/context/LanguageContext';

export default function InboxPage() {
  const router = useRouter();
  const { t } = useLang(); // 👈 تفعيل الترجمة
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchInbox = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setCurrentUser(session.user);

      // 1. جلب كل الرسايل اللي اليوزر طرف فيها
      const { data: messages, error: msgErr } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

      if (msgErr) throw msgErr;

      // 2. تجميع الـ IDs للناس اللي كلمتهم (بدون تكرار)
      const contactIds = Array.from(new Set(messages?.map(m => 
        m.sender_id === session.user.id ? m.receiver_id : m.sender_id
      )));

      if (contactIds.length === 0) {
        setInboxItems([]);
        setLoading(false);
        return;
      }

      // 3. جلب بروفايلات الناس دي
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', contactIds);

      // 4. تجميع البيانات (البروفايل + آخر رسالة + Seen Logic)
      const finalInbox = profiles?.map(profile => {
        const conversation = messages?.filter(m => 
          m.sender_id === profile.id || m.receiver_id === profile.id
        );
        const lastMsg = conversation?.[0];
        const unreadCount = conversation?.filter(m => 
          m.receiver_id === session.user.id && m.is_read === false
        ).length;

        return {
          ...profile,
          lastMessage: lastMsg?.content || t('signal_lost'),
          lastTimestamp: lastMsg?.created_at,
          unreadCount: unreadCount || 0,
          sentByMe: lastMsg?.sender_id === session.user.id,
          isRead: lastMsg?.is_read
        };
      }).sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());

      setInboxItems(finalInbox || []);
    } catch (err) {
      console.error("INBOX_ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black text-cyan-500 animate-pulse uppercase tracking-widest text-sm">
      {t('establishing_connection')}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/20 overflow-x-hidden">
      
      {/* Navbar Minimal (Vercel Style) */}
      <nav className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-[100]">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-xl rtl:rotate-180">🔙</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">{t('mainframe_nav')}</span>
          </Link>
          <span className="text-xs font-mono text-cyan-500 uppercase tracking-widest">{t('secure_inbox_nav')}</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-16">
        
        {/* Inbox Header (Cyberpunk Panel) */}
        <div className="bg-[#0f172a]/60 border border-white/5 rounded-[2.5rem] p-10 md:p-12 mb-12 relative overflow-hidden shadow-2xl group">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors duration-1000"></div>
          
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter bg-gradient-to-r from-white to-cyan-500 bg-clip-text text-transparent mb-4">
              {t('encrypted_channels')}
            </h1>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse"></span>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                {t('active_nodes')} {inboxItems.length}
              </p>
            </div>
          </div>
        </div>

        {/* Contacts List */}
        <div className="space-y-5">
          {inboxItems.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-white/10 rounded-[3rem] bg-white/[0.01]">
              <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">{t('no_incoming_signals')}</p>
            </div>
          ) : (
            inboxItems.map((item) => (
              <Link 
                href={`/chat/${item.id}`} 
                key={item.id}
                className={`block bg-[#0f172a]/40 border rounded-[2rem] p-5 md:p-6 transition-all duration-500 hover:bg-[#0f172a]/80 group relative overflow-hidden ${
                  item.unreadCount > 0 
                  ? 'border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]' 
                  : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                <div className="flex items-center justify-between relative z-10">
                  
                  {/* Left Side: Avatar & Info */}
                  <div className="flex items-center gap-5 overflow-hidden w-full">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img 
                        src={item.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${item.id}`} 
                        className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-white/10 object-cover shadow-lg group-hover:border-cyan-500/50 transition-colors" 
                      />
                      {/* Fake Online Indicator */}
                      <span className="absolute -bottom-1 rtl:-left-1 ltr:-right-1 w-4 h-4 bg-green-500 border-[3px] border-[#0f172a] rounded-full"></span>
                    </div>
                    
                    {/* Text Data */}
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h4 className="font-black text-white text-xs md:text-sm uppercase tracking-wider group-hover:text-cyan-400 transition-colors truncate">
                          {item.full_name}
                        </h4>
                        {item.unreadCount > 0 && (
                          <span className="text-[8px] font-black text-[#020617] bg-cyan-500 px-2 py-0.5 rounded-md uppercase tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.5)] whitespace-nowrap">
                            {item.unreadCount} {t('new_msg_badge')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {item.sentByMe && (
                          <span className={`text-[10px] font-bold ${item.isRead ? 'text-cyan-400' : 'text-slate-500'}`}>
                            {item.isRead ? '✓✓' : '✓'}
                          </span>
                        )}
                        <p className={`text-[10px] md:text-xs font-mono truncate max-w-[180px] sm:max-w-sm md:max-w-md ${item.unreadCount > 0 ? 'text-cyan-100 font-bold' : 'text-slate-500'}`}>
                          <span className="text-cyan-500/50 rtl:ml-1 ltr:mr-1">{'>_'}</span> 
                          {item.lastMessage}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Timestamp & Arrow */}
                  <div className="flex flex-col items-end gap-3 shrink-0 rtl:mr-4 ltr:ml-4">
                    {item.lastTimestamp && (
                      <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.lastTimestamp))}
                      </p>
                    )}
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-all">
                      <span className="text-xs text-slate-500 group-hover:text-cyan-400 transition-colors rtl:rotate-180">→</span>
                    </div>
                  </div>

                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}