'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
export const dynamic = 'force-dynamic'
export default function AddSnippet() {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // التأكد من أن المستخدم مسجل دخول قبل النشر
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('يجب تسجيل الدخول أولاً لنشر كود! ⚠️');
        router.push('/');
      } else {
        setUser(user);
      }
    };
    getUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast.error('لم يتم العثور على بيانات المستخدم');
      setLoading(false);
      return;
    }

    // إدخال البيانات مع الـ user_id الخاص بموسكو
    const { error } = await supabase
      .from('snippets')
      .insert([
        {
          title,
          code,
          language,
          user_id: user.id // ربط الكود ببروفايلك
        }
      ]);

    if (!error) {
      toast.success('تم نشر الكود بنجاح يا موسكو! 🚀', {
        description: 'يمكنك الآن رؤيته في الصفحة الرئيسية وفي بروفايلك.',
      });
      router.push('/');
      router.refresh();
    } else {
      toast.error('حدث خطأ أثناء النشر: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="bg-slate-900/40 border border-white/5 p-10 rounded-[3rem] shadow-2xl backdrop-blur-sm">
        <h1 className="text-4xl font-black mb-10 text-[#adff2f] text-center drop-shadow-[0_0_10px_rgba(173,255,47,0.3)]">
          إضافة قطعة كود جديدة ✨
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* حقل العنوان */}
          <div className="space-y-3">
            <label className="text-gray-400 text-sm font-bold mr-2">عنوان الكود</label>
            <input
              required
              type="text"
              placeholder="مثلاً: دالة التحقق من البريد الإلكتروني"
              className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#adff2f] transition-all"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* حقل اختيار اللغة */}
          <div className="space-y-3">
            <label className="text-gray-400 text-sm font-bold mr-2">لغة البرمجة</label>
            <select
              className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#adff2f] cursor-pointer appearance-none"
              onChange={(e) => setLanguage(e.target.value)}
              value={language}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="css">CSS</option>
              <option value="html">HTML</option>
            </select>
          </div>

          {/* حقل محتوى الكود */}
          <div className="space-y-3">
            <label className="text-gray-400 text-sm font-bold mr-2">محتوى الكود</label>
            <textarea
              required
              placeholder="انسخ كودك هنا..."
              className="w-full p-6 bg-black/40 border border-white/10 rounded-3xl h-72 font-mono text-[#adff2f]/90 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-[#adff2f] resize-none leading-relaxed"
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          {/* زر النشر */}
          <button
            disabled={loading}
            className="w-full bg-[#adff2f] text-black p-5 rounded-2xl font-black text-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(173,255,47,0.2)]"
          >
            {loading ? 'جاري الرفع إلى DevPulse...' : 'نشر الكود الآن 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}