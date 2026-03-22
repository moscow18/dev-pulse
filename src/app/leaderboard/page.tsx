'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
// 👇 استدعاء محرك اللغة 👇
import { useLang } from '@/context/LanguageContext';

export default function LeaderboardPage() {
  const { t } = useLang(); // 👈 تفعيل الترجمة
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('xp'); // xp | signals | likes

  // 🎖️ نظام الرتب الموحد (Clean Sans)
  const calculateRank = (xp: number) => {
    if (xp >= 2000) return { title: t('god_mode'), color: 'text-lime-400 border-lime-400/20 bg-lime-400/5 shadow-[0_0_20px_rgba(163,230,53,0.1)]', icon: '🌌' };
    if (xp >= 1000) return { title: t('architect'), color: 'text-purple-400 border-purple-400/20 bg-purple-400/5 shadow-[0_0_20px_rgba(192,132,252,0.1)]', icon: '💎' };
    if (xp >= 500) return { title: t('senior_node'), color: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5', icon: '⚔️' };
    return { title: t('junior_node'), color: 'text-slate-500 border-white/5 bg-white/5', icon: '🔌' };
  };

  const fetchRankings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: snippets } = await supabase.from('snippets').select('id, user_id, difficulty');
      const { data: likes } = await supabase.from('likes').select('post_id');

      const rankedData = (profiles || []).map((dev: any) => {
        const devSnippets = (snippets || []).filter((s: any) => s.user_id === dev.id);
        const snippetXP = devSnippets.reduce((acc: number, s: any) => {
          if (s.difficulty === 'Advanced') return acc + 50;
          if (s.difficulty === 'Intermediate') return acc + 25;
          return acc + 10;
        }, 0);

        const totalLikes = (likes || []).filter((l: any) => 
          devSnippets.some((s: any) => s.id === l.post_id)
        ).length;
        
        const totalXP = snippetXP + (totalLikes * 5);
        return { 
          ...dev, 
          totalXP, 
          totalLikes,
          signalsCount: devSnippets.length,
          rankInfo: calculateRank(totalXP) 
        };
      });

      const sorted = rankedData.sort((a: any, b: any) => b[sortBy === 'xp' ? 'totalXP' : sortBy === 'signals' ? 'signalsCount' : 'totalLikes'] - a[sortBy === 'xp' ? 'totalXP' : sortBy === 'signals' ? 'signalsCount' : 'totalLikes']);
      setEngineers(sorted);
    } catch (err) {
      toast.error(t('system_sync_failed'));
    } finally {
      setLoading(false);
    }
  }, [sortBy, t]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-sans font-black text-cyan-500 uppercase tracking-[0.5em] p-4 text-center">
      <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-6"></div>
      {t('syncing_global')}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/30 p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* --- Header & Sort Control --- */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-20">
          <div className="text-center md:text-left rtl:md:text-right">
            <Link href="/" className="text-[10px] font-black uppercase text-slate-500 hover:text-cyan-400 tracking-[0.3em] flex items-center justify-center md:justify-start gap-2 transition-all">
              <span className="rtl:hidden">←</span> {t('back_to_mainframe')} <span className="ltr:hidden">→</span>
            </Link>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mt-4">{t('leaderboard_title')}</h1>
            <p className="text-[10px] font-mono text-cyan-500/60 mt-2 uppercase tracking-[0.4em]">{t('leaderboard_desc')}</p>
          </div>

          <div className="flex bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl overflow-x-auto no-scrollbar max-w-full">
            {[
               { id: 'xp', label: t('sort_xp') }, 
               { id: 'signals', label: t('sort_signals') }, 
               { id: 'likes', label: t('sort_likes') }
            ].map((type) => (
              <button 
                key={type.id}
                onClick={() => setSortBy(type.id)}
                className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${sortBy === type.id ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white'}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- 🏆 Top 3 Podium (The Legendary Part) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32 items-end">
          {engineers.slice(0, 3).map((dev, index) => {
            const isFirst = index === 0;
            const isSecond = index === 1;
            return (
              <motion.div 
                key={dev.id}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                className={`relative group ${isFirst ? 'order-1 md:order-2 scale-110 z-10' : isSecond ? 'order-2 md:order-1' : 'order-3'}`}
              >
                <div className={`bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-3xl border rounded-[3rem] p-8 text-center transition-all duration-500 group-hover:translate-y-[-10px] ${isFirst ? 'border-amber-500/40 shadow-[0_30px_60px_-15px_rgba(245,158,11,0.15)] pb-16' : 'border-white/5'}`}>
                  
                  {/* Rank Badge */}
                  <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl border-2 ${isFirst ? 'bg-amber-500 border-amber-300 text-black' : isSecond ? 'bg-slate-300 border-white text-black' : 'bg-orange-700 border-orange-500 text-white'}`}>
                    {index + 1}
                  </div>

                  <div className="relative inline-block mb-6">
                    <img src={dev.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${dev.id}`} className={`w-28 h-28 rounded-[2.5rem] object-cover border-4 ${isFirst ? 'border-amber-500/50' : 'border-white/10'}`} />
                    {isFirst && <div className="absolute inset-0 rounded-[2.5rem] bg-amber-500/20 animate-pulse"></div>}
                  </div>

                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">{dev.full_name}</h3>
                  <div className={`inline-block px-4 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest mb-8 ${dev.rankInfo.color}`}>
                    {dev.rankInfo.icon} {dev.rankInfo.title}
                  </div>

                  <div className="space-y-1">
                    <p className={`text-4xl font-black font-mono tracking-tighter ${isFirst ? 'text-amber-500' : 'text-white'}`}>
                      {sortBy === 'xp' ? dev.totalXP : sortBy === 'signals' ? dev.signalsCount : dev.totalLikes}
                    </p>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">
                       {sortBy === 'xp' ? t('sort_xp') : sortBy === 'signals' ? t('sort_signals') : t('sort_likes')}{t('score_label')}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* --- 📋 The Global List (Rank 4+) --- */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="p-8 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">{t('global_node_dir')}</h2>
          </div>
          <div className="divide-y divide-white/5">
            <AnimatePresence mode="popLayout">
              {engineers.slice(3).map((dev, index) => (
                <motion.div 
                  layout key={dev.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col md:flex-row items-center justify-between p-8 hover:bg-white/[0.03] transition-all group gap-8"
                >
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8 w-full md:w-auto text-center md:text-left rtl:md:text-right">
                    <span className="font-mono text-slate-700 text-xl font-black md:w-10">#{index + 4}</span>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <img src={dev.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${dev.id}`} className="w-16 h-16 rounded-2xl border border-white/10 group-hover:border-cyan-500 transition-all shadow-xl" />
                      <div>
                        <h4 className="text-lg font-black uppercase group-hover:text-cyan-400 transition-colors">{dev.full_name}</h4>
                        <span className={`text-[7px] font-black uppercase tracking-widest mt-1 inline-block px-2 py-0.5 rounded border ${dev.rankInfo.color}`}>
                          {dev.rankInfo.title}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between md:justify-end gap-6 md:gap-12 w-full md:w-auto mt-4 md:mt-0">
                    <div className="text-center md:text-right rtl:md:text-left hidden sm:block">
                      <p className="text-sm font-black font-mono text-slate-400">{dev.signalsCount}</p>
                      <p className="text-[7px] font-black uppercase text-slate-600 tracking-widest">{t('signals_label')}</p>
                    </div>
                    
                    <div className="text-center md:text-right rtl:md:text-left min-w-[120px]">
                      <p className="text-xl font-black font-mono text-cyan-500">
                        {dev.totalXP} <span className="text-[9px] text-cyan-800">XP</span>
                      </p>
                      <div className="w-full bg-white/5 h-1.5 mt-2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} animate={{ width: `${Math.min((dev.totalXP / 2000) * 100, 100)}%` }}
                          className="bg-cyan-500 h-full shadow-[0_0_10px_#06b6d4]"
                        />
                      </div>
                    </div>

                    <Link href={`/profile/${dev.id}`} className="bg-white/5 hover:bg-white text-white hover:text-black border border-white/10 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap">
                      {t('view_node')}
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}