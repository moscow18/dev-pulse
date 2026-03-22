'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
// 👇 استدعاء محرك اللغة 👇
import { useLang } from '@/context/LanguageContext';

export default function ChatPage() {
  const { id: receiverId } = useParams();
  const router = useRouter();
  const { t } = useLang(); // 👈 تفعيل الترجمة
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiver, setReceiver] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false); // 👈 حالة الاتصال الجديدة

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markAsRead = useCallback(async (myId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', receiverId)
      .eq('receiver_id', myId)
      .eq('is_read', false);
  }, [receiverId]);

  const fetchChatData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setCurrentUser(session.user);

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', receiverId).single();
      setReceiver(profileData);

      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(msgs || []);
      
      markAsRead(session.user.id);
      setTimeout(scrollToBottom, 100);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [receiverId, router, markAsRead]);

  useEffect(() => {
    fetchChatData();
  }, [fetchChatData]);

  // 📡 نظام المراسلة اللحظية
  useEffect(() => {
    if (!currentUser?.id || !receiverId) return;

    const channel = supabase.channel(`chat_room_${receiverId}`)
      .on('postgres_changes' as any, { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new;
          if ((newMsg.sender_id === currentUser.id && newMsg.receiver_id === receiverId) || (newMsg.sender_id === receiverId && newMsg.receiver_id === currentUser.id)) {
            setMessages((prev) => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
            if (newMsg.receiver_id === currentUser.id) markAsRead(currentUser.id);
            setTimeout(scrollToBottom, 100);
          }
        }
        if (payload.eventType === 'UPDATE') {
          const updatedMsg = payload.new;
          setMessages((prev) => prev.map(msg => msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, receiverId, markAsRead]);

  // 🟢 نظام معرفة حالة الاتصال (Online/Offline) عن طريق Supabase Presence
  useEffect(() => {
    if (!currentUser?.id || !receiverId) return;

    const presenceChannel = supabase.channel('global_presence', {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        // التحقق هل الـ ID بتاع الطرف التاني موجود في المتصلين
        const isReceiverHere = !!state[receiverId as string];
        setIsOnline(isReceiverHere);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser?.id, receiverId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    const msgContent = newMessage.trim();
    setNewMessage(''); 
    try {
      const { error } = await supabase.from('messages').insert({ sender_id: currentUser.id, receiver_id: receiverId, content: msgContent });
      if (error) throw error;
      await supabase.from('notifications').insert({ user_id: receiverId, sender_id: currentUser.id, type: 'message' });
    } catch (err) { toast.error(t('transmission_failed')); }
  };

  if (loading) return (
    <div className="h-screen bg-white dark:bg-[#020617] flex items-center justify-center font-black text-cyan-600 animate-pulse uppercase tracking-widest text-xs">
      {t('syncing_channel')}
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 dark:bg-[#020617] flex flex-col font-sans selection:bg-cyan-500/20 overflow-hidden transition-all duration-500">
      
      {/* 🛰️ Header */}
      <div className="w-full px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/inbox" className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 transition-all">
            <span className="text-slate-500 dark:text-slate-400 font-black text-lg rtl:rotate-180">←</span>
          </Link>
          <div className="flex items-center gap-4">
            <img src={receiver?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${receiver?.id}`} className="w-11 h-11 rounded-2xl border border-slate-200 dark:border-white/10 object-cover shadow-sm" />
            <div>
              <h2 className="font-black uppercase tracking-wider text-slate-900 dark:text-white text-[13px] leading-none">{receiver?.full_name}</h2>
              {/* 🟢 مؤشر حالة الاتصال */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : 'bg-slate-500'}`}></span>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-500 uppercase tracking-widest font-black block italic">
                  {isOnline ? t('online_status') : t('offline_status')} • {t('encrypted_node')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📥 Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50 dark:bg-[#020617] custom-scrollbar transition-all duration-500">
        <div className="text-center pb-6 border-b border-slate-200 dark:border-white/5 mb-10">
           <p className="text-[9px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] font-black italic">{t('transmission_active')}</p>
        </div>

        {messages.map((msg, index) => {
          const isMe = msg.sender_id === currentUser?.id;
          return (
            <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                
                {/* 💬 Bubble Styling with FORCED Colors */}
                <div 
                   className={`px-6 py-4 shadow-sm text-[14px] font-bold leading-relaxed rounded-[1.8rem] transition-all ${
                    isMe 
                    ? 'bg-cyan-600 text-white rtl:rounded-tl-none ltr:rounded-tr-none dark:bg-cyan-500/10 dark:text-cyan-400 dark:border dark:border-cyan-500/20' 
                    : 'bg-white border border-slate-200 rtl:rounded-tr-none ltr:rounded-tl-none dark:bg-[#0f172a] dark:border-white/10 shadow-md'
                   }`}
                   // إجبار اللون هنا للرسايل اللي جايه لك
                   style={!isMe ? { color: '#000000' } : {}} 
                >
                  <span className={!isMe ? "dark:text-slate-200" : ""}>
                    {msg.content}
                  </span>
                </div>
                
                {/* Time & Seen Indicator */}
                <div className="flex items-center gap-3 mt-2 px-3">
                  <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                  {isMe && (
                    <span className={`text-[12px] font-black transition-all ${msg.is_read ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-300 dark:text-slate-800'}`}>
                      {msg.is_read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ⌨️ Input Area */}
      <div className="p-6 bg-white dark:bg-[#020617] border-t border-slate-200 dark:border-white/5 z-20">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={sendMessage} className="flex gap-4">
            <div className="flex-1 relative group">
               <span className="absolute rtl:right-6 ltr:left-6 top-1/2 -translate-y-1/2 text-cyan-600/40 dark:text-cyan-500/30 font-mono text-xl font-black rtl:rotate-180">{'>_'}</span>
               <input 
                 type="text" 
                 value={newMessage} 
                 onChange={(e) => setNewMessage(e.target.value)} 
                 placeholder={t('type_signal')} 
                 className="w-full bg-slate-100 dark:bg-white/[0.02] border-2 border-transparent focus:border-cyan-500 rounded-[1.8rem] rtl:pr-16 rtl:pl-8 ltr:pl-16 ltr:pr-8 py-5 text-[14px] text-black dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-800 outline-none transition-all shadow-inner group-hover:border-slate-300 dark:group-hover:border-white/10"
                 autoComplete="off"
               />
            </div>
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="bg-slate-950 dark:bg-cyan-600 hover:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-black px-10 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all disabled:opacity-30 active:scale-95 shadow-lg shrink-0"
            >
              {t('transmit_btn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}