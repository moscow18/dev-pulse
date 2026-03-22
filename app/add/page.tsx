'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AddSnippet() {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('snippets')
      .insert([{ title, code, language }]);

    if (!error) {
      router.push('/'); // هيرجعنا للصفحة الرئيسية بعد الإضافة
      router.refresh();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">إضافة قطعة كود جديدة 🚀</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input 
          type="text" placeholder="عنوان الكود" 
          className="p-2 border rounded text-black"
          onChange={(e) => setTitle(e.target.value)}
        />
        <select 
          className="p-2 border rounded text-black"
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
        </select>
        <textarea 
          placeholder="اكتب الكود هنا..." 
          className="p-4 border rounded h-40 font-mono text-black"
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          نشر الكود
        </button>
      </form>
    </div>
  );
}