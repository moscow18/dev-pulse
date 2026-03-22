'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
// 👇 استدعاء محرك اللغة 👇
import { useLang } from '@/context/LanguageContext';

export default function VaultPage() {
  const { t } = useLang(); // 👈 تفعيل الترجمة
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchVaultData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      setCurrentUser(authUser);

      if (!authUser) {
        setLoading(false);
        return;
      }

      // 1. جلب بيانات الخزنة
      const { data: vaultData } = await supabase.from('vault').select('post_id').eq('user_id', authUser.id);
      const savedPostIds = vaultData?.map(v => v.post_id) || [];

      if (savedPostIds.length === 0) {
        setSavedPosts([]);
        setLoading(false);
        return;
      }

      // 2. جلب البوستات وتفاصيل التفاعل
      const { data: snippetsData } = await supabase.from('snippets').select('*').in('id', savedPostIds).order('created_at', { ascending: false });
      const { data: profilesData } = await supabase.from('profiles').select('*');
      const { data: likesData } = await supabase.from('likes').select('*').in('post_id', savedPostIds);
      const { data: commentsData } = await supabase.from('comments').select('post_id').in('post_id', savedPostIds);

      const formattedSavedPosts = (snippetsData || []).map(post => ({
        ...post,
        profiles: profilesData?.find(p => p.id === post.user_id) || { full_name: t('unknown_node'), rank: t('junior_node') },
        likes_count: likesData?.filter(l => l.post_id === post.id).length || 0,
        comments_count: commentsData?.filter(c => c.post_id === post.id).length || 0,
        is_liked: likesData?.some(l => l.post_id === post.id && l.user_id === authUser.id) || false,
      }));

      setSavedPosts(formattedSavedPosts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchVaultData(); }, [fetchVaultData]);

  // --- ✅ محرك اللايكات التفاعلي ---
  const handleToggleLike = async (postId: string, currentStatus: boolean) => {
    if (!currentUser) return toast.error(t('auth_required'));

    // تحديث محلي سريع للـ UI (Optimistic Update)
    setSavedPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_liked: !currentStatus,
          likes_count: currentStatus ? p.likes_count - 1 : p.likes_count + 1
        };
      }
      return p;
    }));

    try {
      if (currentStatus) {
        await supabase.from('likes').delete().match({ user_id: currentUser.id, post_id: postId });
      } else {
        await supabase.from('likes').insert({ user_id: currentUser.id, post_id: postId });
      }
    } catch (err) {
      toast.error(t('database_sync_error'));
      fetchVaultData(); // استرجاع الحالة الأصلية لو فشل
    }
  };

  const handleRemoveFromVault = async (postId: string) => {
    if (!currentUser) return;
    try {
      await supabase.from('vault').delete().match({ user_id: currentUser.id, post_id: postId });
      setSavedPosts(prev => prev.filter(p => p.id !== postId));
      toast.success(t('log_purged'));
    } catch (err) {
      toast.error(t('vault_error'));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-sans font-black text-cyan-500 uppercase tracking-[0.5em] text-center p-4">
      <div className="w-20 h-20 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin mb-8"></div>
      {t('decrypting_vault')}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-12 font-sans selection:bg-cyan-500/30">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <Link href="/" className="text-[10px] font-black uppercase text-slate-500 hover:text-cyan-400 transition-all tracking-[0.3em]">
            <span className="rtl:hidden">{t('back_to_mainframe')}</span>
            <span className="ltr:hidden">← {t('back_to_mainframe')}</span>
          </Link>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('vault_locked')}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 rounded-[3rem] p-12 md:p-20 mb-16 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 rtl:left-0 ltr:right-0 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full"></div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4 bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">{t('secure_vault')}</h1>
          <p className="text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.4em]">{t('intercepted_logs')}: {savedPosts.length}</p>
        </div>

        {/* Saved Posts List */}
        {savedPosts.length === 0 ? (
           <div className="text-center py-32 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]">
             <p className="text-slate-500 font-black text-xs uppercase tracking-[0.3em]">{t('vault_is_empty')}</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 gap-10">
            <AnimatePresence>
              {savedPosts.map((post) => (
                <motion.div 
                  layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  key={post.id} 
                  className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 group hover:border-cyan-500/20 transition-all duration-500"
                >
                  {/* Meta Info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <Link href={`/profile/${post.user_id}`} className="flex items-center gap-5">
                      <img src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${post.user_id}`} className="w-16 h-16 rounded-2xl border-2 border-white/5" />
                      <div>
                        <h4 className="font-black text-white text-sm uppercase">{post.profiles?.full_name}</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{formatDistanceToNow(new Date(post.created_at))} {t('ago')} • {post.profiles?.rank}</p>
                      </div>
                    </Link>
                    <div className="px-5 py-2 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-cyan-500">{post.language}</span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <Link href={`/post/${post.id}`}>
                    <h3 className="text-3xl font-black text-white mb-8 hover:text-cyan-400 transition-colors leading-tight tracking-tighter">{post.title}</h3>
                  </Link>
                  
                  <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-black/40 mb-8">
                    <pre dir="ltr" className="p-10 text-[12px] text-cyan-200/80 font-mono overflow-x-auto leading-relaxed custom-scrollbar text-left"><code>{post.code}</code></pre>
                  </div>
                  
                  {/* Interactions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-10 gap-8">
                    <div className="flex gap-12">
                      {/* Like Button الشغال */}
                      <button 
                        onClick={() => handleToggleLike(post.id, post.is_liked)}
                        className="flex items-center gap-3 group/like"
                      >
                        <span className={`text-2xl transition-transform group-active/like:scale-125 ${post.is_liked ? 'text-red-500' : 'text-slate-500 opacity-40'}`}>
                          {post.is_liked ? '❤️' : '🤍'}
                        </span>
                        <span className="text-xs font-black font-mono text-slate-500">{post.likes_count}</span>
                      </button>

                      {/* Comment Link */}
                      <Link href={`/post/${post.id}`} className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
                        <span className="text-2xl">💬</span>
                        <span className="text-xs font-black font-mono text-slate-500">{post.comments_count}</span>
                      </Link>
                    </div>

                    <div className="flex gap-4 w-full sm:w-auto">
                      <button onClick={() => handleRemoveFromVault(post.id)} className="flex-1 sm:flex-none text-[10px] font-black uppercase text-red-400 border border-red-500/10 px-8 py-4 rounded-2xl bg-red-500/5 hover:bg-red-500 hover:text-white transition-all">{t('purge_log')}</button>
                      <button onClick={() => { navigator.clipboard.writeText(post.code); toast.success(t('copied')); }} className="flex-1 sm:flex-none text-[10px] font-black uppercase text-cyan-500 border border-cyan-500/20 px-8 py-4 rounded-2xl hover:bg-cyan-500 hover:text-black transition-all">{t('copy_src')}</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}