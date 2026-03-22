'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
// 👇 استدعاء محرك اللغة 👇
import { useLang } from '@/context/LanguageContext';

export default function ExplorePage() {
  const { t } = useLang(); // 👈 تفعيل الترجمة

  // --- 🎖️ محرك تحديد الرتب الذكي ---
  const getRankData = (score: number) => {
    if (score >= 150) return { title: t('senior_node_title'), color: 'text-amber-400 border-amber-500/20 bg-amber-500/10', icon: '👑' };
    if (score >= 50) return { title: t('mid_node_title'), color: 'text-purple-400 border-purple-500/20 bg-purple-500/10', icon: '⚡' };
    return { title: t('junior_node_title'), color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10', icon: '🔰' };
  };

  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [topLanguages, setTopLanguages] = useState<any[]>([]);
  const [recentDevs, setRecentDevs] = useState<any[]>([]);
  const [filter, setFilter] = useState('trending'); 
  const [loading, setLoading] = useState(true);

  const fetchExploreData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: snippets, error: sErr } = await supabase
        .from('snippets')
        .select('*, profiles!user_id(*)');

      const { data: likes } = await supabase.from('likes').select('*');
      const { data: comments } = await supabase.from('comments').select('*');
      const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(6);

      if (sErr) {
        console.error("❌ DATABASE_SYNC_ISSUE:", sErr.message);
        const { data: fallbackData } = await supabase.from('snippets').select('*');
        if (fallbackData) processPosts(fallbackData, likes, comments, profiles);
      } else {
        processPosts(snippets, likes, comments, profiles);
      }

    } catch (err: any) {
      console.error("CRITICAL_LOGIC_ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const processPosts = (snippets: any[], likes: any[] | null, comments: any[] | null, profiles: any[] | null) => {
    const langCounts: any = {};
    snippets?.forEach(s => { 
      const lang = s.language || 'Unknown';
      langCounts[lang] = (langCounts[lang] || 0) + 1; 
    });
    setTopLanguages(Object.entries(langCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a: any, b: any) => b.count - a.count).slice(0, 6)); // زودتهم لـ 6 عشان الشكل

    const formatted = (snippets || []).map(post => {
      const pLikes = likes?.filter(l => l.post_id === post.id).length || 0;
      const pComments = comments?.filter(c => c.post_id === post.id).length || 0;
      const score = (pLikes * 2) + (pComments * 5);

      return {
        ...post,
        likes_count: pLikes,
        comments_count: pComments,
        score: score,
        rank: getRankData(score),
        profiles: post.profiles || { full_name: t('unknown_node'), avatar_url: null }
      };
    });

    let sorted = [...formatted];
    if (filter === 'trending') sorted.sort((a, b) => b.score - a.score);
    else if (filter === 'active') sorted.sort((a, b) => b.comments_count - a.comments_count);
    else sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setTrendingPosts(sorted.slice(0, 20));
    setRecentDevs(profiles || []);
  };

  useEffect(() => {
    fetchExploreData();
  }, [fetchExploreData]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black text-cyan-500 animate-pulse uppercase tracking-widest text-sm">
      {t('scanning_network')}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/20 overflow-x-hidden">
      
      {/* Navbar Minimal */}
      <nav className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-[100]">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-xl rtl:rotate-180">🔙</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">{t('mainframe_nav')}</span>
          </Link>
          <span className="text-xs font-mono text-cyan-500 uppercase tracking-widest">{t('explore_nav')}</span>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-10">
        
        {/* Hero Section */}
        <div className="bg-[#0f172a]/60 border border-white/5 rounded-[2rem] p-10 md:p-16 mb-12 relative overflow-hidden group shadow-2xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full group-hover:bg-cyan-500/20 transition-all duration-1000"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full group-hover:bg-purple-500/20 transition-all duration-1000"></div>
          
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left rtl:md:text-right">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter bg-gradient-to-r from-white via-cyan-400 to-cyan-600 bg-clip-text text-transparent mb-4">
              {t('explore_hub_title')}
            </h1>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest max-w-xl leading-relaxed">
              {t('explore_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Sidebar (Left) */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-8">
            
            {/* Trending Languages */}
            <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 shadow-xl sticky top-24">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-6 flex items-center gap-2">
                <span className="text-lg">🔥</span> {t('trending_stack')}
              </h2>
              <div className="space-y-3">
                {topLanguages.map((lang, index) => (
                  <div key={lang.name} className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-500 w-4">{index + 1}.</span>
                      <span className="text-xs font-bold uppercase text-white">{lang.name}</span>
                    </div>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20">{lang.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rising Nodes (Developers) */}
            <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-6 flex items-center gap-2">
                <span className="text-lg">🚀</span> {t('rising_nodes')}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-4">
                {recentDevs.map(dev => (
                  <Link href={`/profile/${dev.id}`} key={dev.id} className="group relative aspect-square">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                    <img src={dev.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${dev.id}`} className="w-full h-full rounded-xl object-cover border border-white/10 group-hover:border-purple-500 relative z-10 transition-colors shadow-md" alt={dev.full_name} title={dev.full_name} />
                  </Link>
                ))}
              </div>
            </div>

          </div>

          {/* Feed Content (Right) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-8">
            
            {/* Filters */}
            <div className="flex gap-4 border-b border-white/5 pb-px overflow-x-auto custom-scrollbar">
                {['trending', 'active', 'recent'].map(tType => (
                    <button 
                        key={tType}
                        onClick={() => setFilter(tType)}
                        className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${filter === tType ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-white'}`}
                    >
                        {tType === 'trending' ? t('trending_filter') : tType === 'active' ? t('active_filter') : t('recent_filter')}
                    </button>
                ))}
            </div>

            {/* Posts List */}
            <div className="space-y-8 pb-20">
              {trendingPosts.length === 0 ? (
                <div className="text-center py-20 bg-[#0f172a] border border-white/5 border-dashed rounded-3xl">
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">{t('waiting_signals')}</p>
                </div>
              ) : (
                trendingPosts.map((post, idx) => (
                  <div key={post.id} className={`bg-[#0f172a] border rounded-[2rem] p-6 md:p-8 hover:border-cyan-500/30 transition-all shadow-xl relative group overflow-hidden ${idx < 3 ? 'border-cyan-500/20' : 'border-white/5'}`}>
                    
                    {/* Glowing effect for top 3 */}
                    {idx < 3 && <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/5 blur-[50px] pointer-events-none"></div>}

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                      <Link href={`/profile/${post.user_id}`} className="flex items-center gap-4 group/user">
                        <img src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${post.user_id}`} className="w-12 h-12 rounded-xl border border-white/10 group-hover/user:border-cyan-500 transition-colors object-cover shadow-md" />
                        <div>
                          <div className="flex items-center gap-3">
                              <h4 className="text-xs font-black uppercase text-white group-hover/user:text-cyan-400 transition-colors tracking-wider">{post.profiles?.full_name}</h4>
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded border tracking-widest flex items-center gap-1 ${post.rank.color}`}>
                                  {post.rank.icon} {post.rank.title}
                              </span>
                          </div>
                          <p className="text-[9px] text-slate-500 font-mono mt-1.5 flex items-center gap-2 uppercase tracking-widest">
                             {formatDistanceToNow(new Date(post.created_at))} {t('ago')} 
                             <span className="w-1 h-1 rounded-full bg-slate-600"></span> 
                             <span className="text-amber-500">{t('score_label')} {post.score}</span>
                          </p>
                        </div>
                      </Link>
                    </div>
                    
                    {/* Content */}
                    <Link href={`/post/${post.id}`}>
                      <h3 className="text-xl md:text-2xl font-black text-white hover:text-cyan-400 transition-colors uppercase tracking-tight mb-6 leading-snug">{post.title}</h3>
                      
                      <div className="bg-[#010409] rounded-2xl p-6 border border-white/5 relative overflow-hidden group-hover:border-white/10 transition-all shadow-inner">
                        <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
                        <pre dir="ltr" className="text-[10px] md:text-xs text-cyan-100/70 font-mono h-20 overflow-hidden leading-relaxed text-left"><code>{post.code}</code></pre>
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#010409] to-transparent pointer-events-none"></div>
                      </div>
                    </Link>

                    {/* Footer Stats */}
                    <div className="mt-6 pt-6 flex justify-between items-center border-t border-white/5">
                      <div className="flex gap-6 bg-black/20 p-2 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-sm">❤️</span>
                            <span className="text-xs font-black text-red-500 font-mono">{post.likes_count}</span>
                        </div>
                        <div className="w-px h-5 bg-white/10"></div>
                        <div className="flex items-center gap-2 px-2">
                            <span className="text-sm">💬</span>
                            <span className="text-xs font-black text-cyan-500 font-mono">{post.comments_count}</span>
                        </div>
                      </div>
                      <Link href={`/post/${post.id}`} className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500 hover:text-cyan-400 tracking-[0.2em] transition-colors bg-white/[0.02] hover:bg-white/[0.05] px-4 py-2 rounded-lg border border-transparent hover:border-white/10">
                        {t('view_log')} <span className="text-sm rtl:rotate-180">→</span>
                      </Link>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}