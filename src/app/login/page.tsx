'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // الدخول التقليدي
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("ACCESS_DENIED: " + error.message.toUpperCase());
      setLoading(false);
    } else {
      toast.success("AUTHENTICATION_SUCCESSFUL");
      router.push('/');
      router.refresh();
    }
  };

  // الدخول بـ Google أو GitHub
  const handleSocialLogin = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) toast.error(`ERROR_CONNECTING_TO_${provider.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-sans italic">
      {/* الديكور الأصلي */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0f172a]/40 border border-white/5 backdrop-blur-2xl rounded-[3rem] p-12 shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <img src="/logo.jpeg" className="w-20 h-20 rounded-2xl mx-auto mb-6 border border-cyan-500/30 shadow-lg object-cover" />
          <h1 className="text-3xl font-black uppercase tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">System_Login</h1>
          <p className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-[0.3em] mt-2">Sector: Moscow_Mainframe</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <input 
            type="email" 
            required 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
            placeholder="ACCESS_KEY (EMAIL)"
          />
          <input 
            type="password" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
            placeholder="SECURE_PASS"
          />
          <button 
            disabled={loading}
            className="w-full bg-cyan-500 text-black font-black uppercase py-4 rounded-2xl text-[11px] tracking-[0.2em] hover:bg-[#adff2f] transition-all active:scale-95"
          >
            {loading ? 'Decrypting...' : 'Initialize_Session'}
          </button>
        </form>

        {/* أزرار الدخول الاجتماعي - الإضافة الجديدة */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-4 my-6">
            <div className="h-[1px] bg-white/5 flex-1"></div>
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Or_Connect_Via</span>
            <div className="h-[1px] bg-white/5 flex-1"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-3 bg-white/5 border border-white/5 py-3 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale hover:grayscale-0 transition-all" />
              <span className="text-[9px] font-black uppercase tracking-tighter">Google</span>
            </button>
            <button 
              onClick={() => handleSocialLogin('github')}
              className="flex items-center justify-center gap-3 bg-white/5 border border-white/5 py-3 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
            >
              <img src="https://github.com/favicon.ico" className="w-4 h-4 invert opacity-50" />
              <span className="text-[9px] font-black uppercase tracking-tighter">GitHub</span>
            </button>
          </div>
        </div>

        <p className="text-center mt-10 text-[10px] font-black uppercase text-slate-600 tracking-widest italic">
          New Node? <Link href="/register" className="text-cyan-500 underline underline-offset-4">Register_Account</Link>
        </p>
      </div>
    </div>
  );
}