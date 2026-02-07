
import React, { useState, useRef, useEffect } from 'react';
import { getTeacherInsights } from '../services/geminiService';
import ChordLibrary from './ChordLibrary';
import { 
  Send, Loader2, Music, 
  ChevronRight, MessageSquare, Zap, BrainCircuit, Check, Copy, Hash
} from 'lucide-react';

const AITeacher: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, copied?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'chat' | 'chords'>('chords'); // Default para Cifras 7C
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    const newMessages = [...messages];
    newMessages[index].copied = true;
    setMessages(newMessages);
    setTimeout(() => {
      const resetMessages = [...messages];
      if (resetMessages[index]) resetMessages[index].copied = false;
      setMessages(resetMessages);
    }, 2000);
  };

  const handleAsk = async () => {
    if (!topic.trim() || loading) return;

    const currentPrompt = topic.trim();
    setTopic('');
    setMessages(prev => [...prev, { role: 'user', text: currentPrompt }]);
    setLoading(true);

    try {
      const responseText = await getTeacherInsights(currentPrompt, messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      })));
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `[ERRO]: O Mestre está temporariamente indisponível. Tente consultar o dicionário de cifras.` }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-[550px]">
      <div className="bg-[#0c0604] border border-white/10 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl relative">
        
        {/* Header Inteligente com 2 Abas conforme solicitado */}
        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-amber-900/5 z-40">
          <div className="flex bg-black/40 p-1 rounded-full border border-white/10 shrink-0">
            <button 
              onClick={() => setView('chords')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'chords' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}
            >
              <Hash className="w-3 h-3" /> Cifras 7C
            </button>
            <button 
              onClick={() => setView('chat')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'chat' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}
            >
              <BrainCircuit className="w-3 h-3" /> IA Mestre
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-2 pr-2">
             <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
             <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Expert Mode</span>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {view === 'chords' && (
            <div className="absolute inset-0">
              <ChordLibrary />
            </div>
          )}

          {view === 'chat' && (
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-10">
                    <div className="relative">
                      <div className="absolute -inset-4 bg-amber-600/20 rounded-full blur-xl animate-pulse" />
                      <BrainCircuit className="w-10 h-10 text-amber-500 relative z-10" />
                    </div>
                    <h3 className="text-white font-black italic mt-4 mb-2">Mestre Virtual Ativo</h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest max-w-[220px]">
                      Pergunte sobre baixarias, escalas de Raphael Rabello ou condução de Dino.
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[92%] p-5 rounded-[2rem] shadow-2xl relative group transition-all ${
                      msg.role === 'user' 
                      ? 'bg-amber-600/20 text-white border border-amber-600/30 rounded-tr-none' 
                      : 'bg-[#150d0a] text-slate-200 border border-white/10 rounded-tl-none'
                    }`}>
                      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'model' ? 'font-mono text-[11px] text-amber-50/90' : 'font-sans'}`}>
                        {msg.text}
                      </div>
                      {msg.role === 'model' && (
                        <div className="absolute -bottom-2 -right-2 flex gap-1">
                          <button 
                            onClick={() => handleCopy(msg.text, idx)}
                            className="p-2 bg-amber-600 rounded-full shadow-lg hover:bg-amber-500 transition-all active:scale-90"
                          >
                            {msg.copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 p-4 rounded-3xl border border-amber-500/20 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Refletindo sobre a harmonia...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-[#0c0604] border-t border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                      placeholder="Dúvida técnica ou teórica?"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-slate-700"
                    />
                    <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600/30" />
                  </div>
                  <button 
                    onClick={handleAsk}
                    disabled={loading || !topic.trim()}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-20 p-4 rounded-2xl text-white transition-all shadow-lg active:scale-90"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AITeacher;
