'use client';
import { useState, useEffect } from 'react';

export default function LiveSandbox({ code, language }: { code: string, language: string }) {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // إحنا هنا بندعم تشغيل الويب (HTML/JS/CSS)
    const isWebCode = language.toLowerCase() === 'javascript' || language.toLowerCase() === 'html';
    
    if (isWebCode && isRunning) {
      let finalCode = code;
      
      // لو الكود جافاسكريبت صافي، هنغلفه في HTML عشان المتصفح يفهمه ويطبع النتيجة
      if (language.toLowerCase() === 'javascript') {
        finalCode = `
          <!DOCTYPE html>
          <html>
            <body style="background-color: #0f172a; color: #22d3ee; font-family: monospace; padding: 20px;">
              <h3 style="color: #cbd5e1; margin-bottom: 10px; border-bottom: 1px solid #334155; padding-bottom: 5px;">Console Output:</h3>
              <div id="output"></div>
              <script>
                // تعديل الـ console.log عشان تطبع النتيجة جوه الشاشة مش في المتصفح المخفي
                const originalLog = console.log;
                console.log = function(...args) {
                  const outputDiv = document.getElementById('output');
                  outputDiv.innerHTML += '> ' + args.join(' ') + '<br>';
                  originalLog.apply(console, args);
                };
                try {
                  ${code}
                } catch (error) {
                  document.getElementById('output').innerHTML += '<span style="color: #ef4444;">Error: ' + error.message + '</span>';
                }
              </script>
            </body>
          </html>
        `;
      } else {
         // لو HTML جاهز، هنشغله زي ما هو بس نديله خلفية تليق على الموقع
         finalCode = `
          <!DOCTYPE html>
          <html>
            <body style="background-color: #ffffff; margin: 0; padding: 10px;">
              ${code}
            </body>
          </html>
         `;
      }
      setOutput(finalCode);
    }
  }, [code, language, isRunning]);

  if (language.toLowerCase() !== 'javascript' && language.toLowerCase() !== 'html') {
    return (
      <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono p-4 rounded-xl uppercase tracking-widest text-center">
        ⚠️ Live execution is currently restricted to JS & HTML nodes.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 mt-6 animate-in fade-in duration-500">
      {!isRunning ? (
        <button 
          onClick={() => setIsRunning(true)}
          className="w-full bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-400 border border-cyan-500/30 px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
        >
          <span className="text-lg">▶</span> Initialize_Live_Execution
        </button>
      ) : (
        <div className="border border-cyan-500/30 rounded-[2rem] overflow-hidden bg-[#010409] shadow-[0_0_30px_rgba(6,182,212,0.1)] relative">
          <div className="bg-[#0f172a] px-6 py-3 border-b border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-black uppercase text-cyan-500 tracking-[0.4em]">Live_Output_Terminal</span>
            <button onClick={() => setIsRunning(false)} className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest font-black">Terminate 🛑</button>
          </div>
          <iframe
            srcDoc={output}
            title="Live Code Output"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-80 bg-transparent"
          />
        </div>
      )}
    </div>
  );
}