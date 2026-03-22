'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function CreatePost({ onPostCreated, user }: { onPostCreated: () => void, user: any }) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // 👇 دي الفانكشن اللي بتعمل شاشة العرض الحية وإنت بتكتب 👇
  const getLivePreviewDoc = () => {
    if (language === 'html') {
      return `<!DOCTYPE html><html><body style="background-color: #ffffff; color: #000000; font-family: sans-serif; margin: 0; padding: 15px;">${code}</body></html>`;
    } else if (language === 'javascript') {
      return `
        <!DOCTYPE html>
        <html>
          <body style="background-color: #010409; color: #22d3ee; font-family: monospace; padding: 10px; margin: 0;">
            <div style="font-size: 10px; color: #475569; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 5px;">Live Console Output</div>
            <script>
              const originalLog = console.log;
              console.log = function(...args) {
                document.body.innerHTML += '<div style="padding: 4px 0; border-bottom: 1px solid #1e293b; word-break: break-all;">> ' + args.join(' ') + '</div>';
                originalLog.apply(console, args);
              };
              try {
                ${code}
              } catch (error) {
                document.body.innerHTML += '<div style="color: #ef4444; padding: 4px 0;">[CRITICAL ERROR]: ' + error.message + '</div>';
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
    if (!title.trim() || !code.trim()) return toast.error("MISSING_DATA_LOGS");
    if (!user) return toast.error("USER_SESSION_NOT_FOUND");

    setLoading(true);
    try {
      let uploadedImageUrl = '';

      // لو فيه صورة مختارها من الجهاز
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);
        
        uploadedImageUrl = publicUrl;
      }

      const { error } = await supabase.from('snippets').insert({
        title,
        code,
        language,
        difficulty,
        image_url: uploadedImageUrl,
        user_id: user.id
      });

      if (error) throw error;

      toast.success("SIGNAL_DEPLOYED");
      setTitle(''); setCode(''); setImageFile(null);
      onPostCreated();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0f172a]/40 border border-white/5 rounded-[3rem] p-10 mb-12 italic shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-500">INITIALIZE_NEW_PACKET</h2>
        <div className="flex gap-4">
          <select 
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono text-amber-500 outline-none uppercase shadow-xl appearance-none cursor-pointer"
          >
            <option value="Beginner">LVL: Beginner</option>
            <option value="Intermediate">LVL: Intermediate</option>
            <option value="Advanced">LVL: Advanced</option>
          </select>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono text-cyan-400 outline-none uppercase shadow-xl appearance-none cursor-pointer"
          >
            <option value="javascript">JAVASCRIPT</option>
            <option value="typescript">TYPESCRIPT</option>
            <option value="html">HTML_UI</option> {/* ضفنالك الـ HTML هنا */}
            <option value="react">REACT</option>
            <option value="python">PYTHON</option>
          </select>
        </div>
      </div>

      <input 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        placeholder="PROJECT_TITLE..." 
        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-8 py-4 mb-6 text-sm focus:outline-none focus:border-cyan-500/30 transition-all" 
      />

      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* مربع كتابة الكود */}
        <textarea 
          value={code} 
          onChange={(e) => setCode(e.target.value)} 
          placeholder="SOURCE_CODE_HERE... (Live Preview active for HTML/JS)" 
          className="w-full bg-[#010409] border border-white/5 rounded-[2rem] px-8 py-8 h-48 font-mono text-xs text-cyan-200/80 focus:outline-none focus:border-purple-500/30 transition-all custom-scrollbar resize-none shadow-inner" 
        />

        {/* 👇 شاشة العرض الحية اللي بتظهر وإنت بتكتب 👇 */}
        {(language === 'html' || language === 'javascript') && code.trim().length > 0 && (
          <div className="rounded-[2rem] overflow-hidden border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] animate-in slide-in-from-top-4 duration-500">
            <div className="bg-[#0f172a] px-6 py-3 border-b border-cyan-500/20 flex justify-between items-center">
              <span className="text-[9px] font-black uppercase text-cyan-400 tracking-[0.4em] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live_Preview_Active
              </span>
              <span className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">{language} Engine</span>
            </div>
            <iframe 
              srcDoc={getLivePreviewDoc()} 
              title="Live Preview" 
              sandbox="allow-scripts allow-same-origin" 
              className={`w-full h-40 ${language === 'html' ? 'bg-white' : 'bg-[#010409]'}`} 
            />
          </div>
        )}
      </div>

      <div className="relative mb-8 mt-4">
        <label className="flex items-center justify-center w-full h-16 border border-white/5 border-dashed rounded-2xl cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            {imageFile ? `IMAGE_LOADED: ${imageFile.name}` : 'UPLOAD_VISUAL_ASSET_FROM_DEVICE...'}
          </span>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
          />
        </label>
      </div>

      <button 
        disabled={loading} 
        className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-black uppercase tracking-[0.5em] py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'TRANSMITTING...' : 'DEPLOY_TO_MAINFRAME'}
      </button>
    </form>
  );
}