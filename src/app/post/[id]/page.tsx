'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// --- 🛠️ مكنة التشغيل الـ Live (Terminal Style) ---
function LiveSandbox({ code, language }: { code: string, language: string }) {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const safeLang = (language || '').toLowerCase();

  useEffect(() => {
    const isWebCode = safeLang === 'javascript' || safeLang === 'html';
    if (isWebCode && isRunning) {
      let finalCode = code;
      if (safeLang === 'javascript') {
        finalCode = `
          <!DOCTYPE html>
          <html>
            <body style="background-color: #020617; color: #22d3ee; font-family: sans-serif; padding: 20px; margin: 0;">
              <div style="display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-bottom: 15px;">
                <span style="color: #64748b; font-size: 10px; font-weight: 900; letter-spacing: 1px;">CONSOLE_OUTPUT:</span>
              </div>
              <div id="output" style="font-family: monospace; font-size: 13px; line-height: 1.6;"></div>
              <script>
                const originalLog = console.log;
                console.log = function(...args) {
                  const outputDiv = document.getElementById('output');
                  outputDiv.innerHTML += '<div style="color: #22d3ee; margin-bottom: 4px;"><span style="color: #475569;">></span> ' + args.join(' ') + '</div>';
                  originalLog.apply(console, args);
                };
                try { ${code} } catch (e) {
                  document.getElementById('output').innerHTML += '<div style="color: #ef4444; font-weight: bold;">[RUNTIME_ERROR]: ' + e.message + '</div>';
                }
              </script>
            </body>
          </html>
        `;
      } else {
        finalCode = `<!DOCTYPE html><html><body style="background-color: #ffffff; margin: 0; padding: 15px;">${code}</body></html>`;
      }
      setOutput(finalCode);
    }
  }, [code, safeLang, isRunning]);

  if (safeLang !== 'javascript' && safeLang !== 'html') return null;

  return (
    <div className="mt-6 font-sans">
      {!isRunning ? (
        <button 
          onClick={() => setIsRunning(true)}
          className="w-full bg-white/[0.03] border border-cyan-500/30 hover:bg-cyan-500 hover:text-black text-cyan-500 py-6 rounded-3xl text-[11px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 group"
        >
          <span className="text-xl group-hover:scale-125 transition-transform">⚡</span>
          Execute_Live_Environment
        </button>
      ) : (
        <div className="border border-white/10 rounded-[2.5rem] overflow-hidden bg-[#020617] shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="bg-white/[0.03] px-8 py-4 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Terminal_Session_Active</span>
            </div>
            <button onClick={() => setIsRunning(false)} className="text-[9px] font-black uppercase text-red-500 hover:bg-red-500/10 px-4 py-1 rounded-lg">Terminate_Process</button>
          </div>
          <iframe srcDoc={output} title="Output" className="w-full h-80 bg-transparent" />
        </div>
      )}
    </div>
  );
}

// --- 🚀 الصفحة الأساسية ---
export default function PostDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [commentText, setCommentText] = useState('');

  const fetchPostData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      setUser(authUser);

      const { data: snippet, error } = await supabase.from('snippets').select('*').eq('id', postId).single();
      if (error) throw error;

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', snippet.user_id).single();
      const { data: likes } = await supabase.from('likes').select('*').eq('post_id', postId);
      const { data: comments } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: false });
      
      const userIds = Array.from(new Set(comments?.map(c => c.user_id) || []));
      const { data: cProfiles } = await supabase.from('profiles').select('*').in('id', userIds);

      const formattedComments = (comments || []).map(c => ({
        ...c,
        user: cProfiles?.find(p => p.id === c.user_id)
      }));

      const { data: vault } = authUser ? await supabase.from('vault').select('*').eq('user_id', authUser.id).eq('post_id', postId) : { data: [] };

      setPost({
        ...snippet,
        profiles: profile || { full_name: 'Unknown_Node', rank: 'Junior_Node' },
        likes_count: likes?.length || 0,
        is_liked: likes?.some(l => l.user_id === authUser?.id) || false,
        is_saved: (vault && vault.length > 0) || false,
        comments: formattedComments
      });
    } catch (err) {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [postId, router]);

  useEffect(() => { if (postId) fetchPostData(); }, [postId, fetchPostData]);

  const handleLike = async () => {
    if (!user) return toast.error("ACCESS_DENIED");
    const wasLiked = post.is_liked;
    setPost({ ...post, is_liked: !wasLiked, likes_count: wasLiked ? post.likes_count - 1 : post.likes_count + 1 });
    if (wasLiked) await supabase.from('likes').delete().match({ user_id: user.id, post_id: post.id });
    else await supabase.from('likes').insert({ user_id: user.id, post_id: post.id });
  };

  const handleSaveToVault = async () => {
    if (!user) return toast.error("ACCESS_DENIED");
    if (post.is_saved) {
      await supabase.from('vault').delete().match({ user_id: user.id, post_id: post.id });
      setPost({ ...post, is_saved: false });
      toast.success("REMOVED_FROM_VAULT");
    } else {
      await supabase.from('vault').insert({ user_id: user.id, post_id: post.id });
      setPost({ ...post, is_saved: true });
      toast.success("STORED_IN_SECURE_VAULT");
    }
  };

  const addComment = async () => {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase.from('comments').insert({ post_id: post.id, user_id: user.id, content: commentText });
    if (!error) {
      setCommentText('');
      fetchPostData();
      toast.success("LOG_TRANSMITTED");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-black text-cyan-500 animate-pulse font-sans tracking-[0.5em]">
      <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin mb-8"></div>
      DECRYPTING_NODE_DATA...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-12 font-sans selection:bg-cyan-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* --- Back Button --- */}
        <button onClick={() => router.back()} className="text-[10px] font-black uppercase text-slate-500 hover:text-cyan-400 mb-12 tracking-[0.3em] transition-all flex items-center gap-2">
          <span>←</span> ESCAPE_TO_FEED
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* --- Main Content (The Lab) --- */}
          <div className="lg:col-span-8 space-y-8">
            
            <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 md:p-16 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none"></div>
              
              {/* Post Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <Link href={`/profile/${post.user_id}`} className="flex items-center gap-5">
                  <img src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${post.user_id}`} className="w-16 h-16 rounded-2xl border-2 border-white/5 object-cover" />
                  <div>
                    <h4 className="font-black text-white text-sm uppercase flex items-center gap-3">
                      {post.profiles?.full_name}
                      <span className="text-[8px] bg-cyan-500/10 text-cyan-500 px-2 py-0.5 rounded border border-cyan-500/20">{post.profiles?.rank || 'Node'}</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">{formatDistanceToNow(new Date(post.created_at))} AGO</p>
                  </div>
                </Link>
                <div className="flex gap-3">
                  <span className="text-[9px] font-black px-4 py-1.5 rounded-full border border-white/10 bg-white/5 tracking-widest uppercase">{post.language}</span>
                  <span className="text-[9px] font-black px-4 py-1.5 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 tracking-widest uppercase">{post.difficulty}</span>
                </div>
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-white mb-10 tracking-tighter leading-tight uppercase">{post.title}</h1>
              
              {/* Code IDE Section */}
              <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group">
                <div className="bg-[#0f172a] px-6 py-3 border-b border-white/5 flex justify-between items-center">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{post.language}_SOURCE</span>
                </div>
                <pre className="p-8 md:p-12 text-sm text-cyan-200/90 font-mono overflow-x-auto leading-relaxed custom-scrollbar bg-gradient-to-b from-transparent to-white/[0.01]">
                  <code>{post.code}</code>
                </pre>
              </div>

              <LiveSandbox code={post.code} language={post.language} />

              {post.image_url && (
                <div className="mt-12 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                  <img src={post.image_url} className="w-full h-auto object-contain" alt="Visual" />
                </div>
              )}
            </div>
            
            {/* Interaction Bar */}
            <div className="flex items-center justify-between p-8 bg-white/[0.02] border border-white/5 rounded-3xl shadow-xl">
               <div className="flex gap-10">
                  <button onClick={handleLike} className="flex items-center gap-3 group">
                    <span className={`text-2xl transition-transform group-active:scale-150 ${post.is_liked ? 'text-red-500' : 'text-slate-500 opacity-40'}`}>{post.is_liked ? '❤️' : '🤍'}</span>
                    <span className="text-xs font-black text-slate-400">{post.likes_count}</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl opacity-40">💬</span>
                    <span className="text-xs font-black text-slate-400">{post.comments?.length || 0}</span>
                  </div>
               </div>
               <div className="flex gap-6">
                  <button onClick={handleSaveToVault} className={`text-[10px] font-black uppercase tracking-widest transition-all ${post.is_saved ? 'text-amber-500' : 'text-slate-600 hover:text-white'}`}>
                    {post.is_saved ? 'IN_VAULT' : 'VAULT'}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(post.code); toast.success("SRC_COPIED"); }} className="text-[10px] font-black uppercase text-cyan-500 hover:text-white tracking-widest">Copy</button>
               </div>
            </div>
          </div>

          {/* --- 📟 Interaction Terminal (Comments) --- */}
          <aside className="lg:col-span-4 space-y-6 h-full">
            <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-8 flex flex-col h-[800px] shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-8 pb-4 border-b border-white/5">Signal_Logs</h3>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2 mb-8">
                {post.comments?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[9px] font-bold text-slate-700 uppercase tracking-widest">No_Signals_Detected</div>
                ) : (
                  post.comments.map((c: any) => (
                    <div key={c.id} className="group animate-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center gap-3 mb-2">
                        <img src={c.user?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${c.user?.id}`} className="w-6 h-6 rounded-lg grayscale group-hover:grayscale-0 transition-all" />
                        <span className="text-[9px] font-black text-cyan-500 uppercase">{c.user?.full_name}</span>
                        <span className="text-[8px] text-slate-600 font-bold uppercase">{formatDistanceToNow(new Date(c.created_at))} AGO</span>
                      </div>
                      <div className="pl-9 text-xs text-slate-300 leading-relaxed border-l border-white/5 pb-2">
                        {c.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              {user ? (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <textarea 
                    value={commentText} 
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="ENTER_RESPONSE..." 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-cyan-500/40 min-h-[100px] resize-none font-mono"
                  />
                  <button onClick={addComment} className="w-full bg-cyan-500 text-black py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-white transition-all">Transmit_Signal</button>
                </div>
              ) : (
                <p className="text-center text-[8px] font-black text-slate-600 uppercase tracking-widest">Auth_Required_To_Comment</p>
              )}
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}