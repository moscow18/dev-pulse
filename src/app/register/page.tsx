'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) { toast.error(error.message); setLoading(false); } else {
      if (data.user) await supabase.from('profiles').upsert({ id: data.user.id, full_name: fullName, avatar_url: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${fullName}` });
      toast.success("ACCOUNT_CREATED"); router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden italic">
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full"></div>
      <div className="w-full max-w-md bg-[#0f172a]/40 border border-white/5 backdrop-blur-2xl rounded-[3rem] p-12 shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">New_Node_Registration</h1>
        </div>
        <form onSubmit={handleRegister} className="space-y-6">
          <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 font-mono" placeholder="IDENTITY (FULL NAME)" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 font-mono" placeholder="ACCESS_KEY (EMAIL)" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-purple-500/50 font-mono" placeholder="SECURE_PASS" />
          <button disabled={loading} className="w-full bg-purple-600 text-white font-black uppercase py-4 rounded-2xl text-[11px] hover:bg-cyan-500 hover:text-black transition-all shadow-xl shadow-purple-500/10 italic">{loading ? 'Encrypting...' : 'Create_Node'}</button>
        </form>
        <p className="text-center mt-10 text-[10px] font-black uppercase text-slate-600 tracking-widest">Already Linked? <Link href="/login" className="text-purple-500 underline underline-offset-4">Return_to_Login</Link></p>
      </div>
    </div>
  );
}