'use client';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="flex items-center justify-between py-6 px-8 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
      <div className="flex items-center gap-3">
        {/* اللوجو اللي إنت بعته */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#9d50bb] p-[2px]">
            <div className="w-full h-full bg-[#020617] rounded-full flex items-center justify-center text-[10px] font-black text-white italic">
                {`</>`}
            </div>
        </div>
        <span className="text-xl font-black tracking-tighter text-white uppercase italic">DevPulse</span>
      </div>
      
      <button onClick={handleLogout} className="text-[10px] font-black text-gray-500 hover:text-red-500 uppercase tracking-widest transition-all">
        Logout_Session
      </button>
    </nav>
  );
}