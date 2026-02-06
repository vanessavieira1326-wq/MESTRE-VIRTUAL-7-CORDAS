
import React, { useState, useRef, useEffect } from 'react';
import { getTeacherInsights } from '../services/geminiService';
import { 
  Send, Loader2, BookOpen, Music, 
  ChevronRight, Book, MessageSquare, Zap, BrainCircuit, Share2, Check, Copy
} from 'lucide-react';

interface Lesson {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

const STATIC_CURRICULUM: Lesson[] = [
  {
    id: 'f1',
    category: 'Fundamentos',
    title: 'Afinação da 7ª Corda (Dó)',
    keywords: ['afinar', 'afinação', 'corda', 'dó', 'c'],
    content: "No samba, a 7ª corda é afinada em Dó (C2).\n\nConfiguração:\n7ª -> Dó (C)\n6ª -> Mi (E)\n5ª -> Lá (A)\n4ª -> Ré (D)\n3ª -> Sol (G)\n2ª -> Si (B)\n1ª -> Mi (E)",
  },
  {
    id: 'b1',
    category: 'Baixarias',
    title: 'Frase G7 -> C',
    keywords: ['baixaria', 'frase', 'preparação', 'sol', 'dó'],
    content: "Frase clássica de Dino 7 Cordas.\n\n7|--0--2--4--------|\n6|-----------0--2--|\n5|-----------------3|",
  },
  {
    id: 'h1',
    category: 'Harmonia',
    title: 'Dicionário: C7M(9)',
    keywords: ['acorde', 'harmonia', 'dó maior', 'c7m'],
    content: "Montagem clássica de Choro:\n\nE|--x--|\nB|--3--|\nG|--4--|\nD|--2--|\nA|--3--|\nE|--x--|\nC|--x--|",
  }
];

const AITeacher: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, copied?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'chat' | 'methods'>('chat');
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

  const findLocalAnswer = (input: string) => {
    const lowInput = input.toLowerCase();
    const match = STATIC_CURRICULUM.find(l => 
      l.keywords.some(k => lowInput.includes(k)) || 
      lowInput.includes(l.title.toLowerCase())
    );
    return match ? match.content : "Infelizmente meu sinal de IA foi interrompido por limite de cota. Tente usar termos como 'Afinação' ou 'Baixaria' para buscar em meu arquivo local.";
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setMessages(prev => [
      ...prev, 
      { role: 'user', text: `Lição: ${lesson.title}` },
      { role: 'model', text: lesson.content }
    ]);
    setView('chat');
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
      const localAnswer = findLocalAnswer(currentPrompt);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'model', text: `[ARQUIVO LOCAL]: ${localAnswer}` }]);
        setLoading(false);
      }, 800);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-[550px]">
      <div className="bg-[#0c0604] border border-white/10 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl relative">
        
        {/* Header Inteligente */}
        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-amber-900/5 z-40">
          <div className="flex bg-black/40 p-1 rounded-full border border-white/10">
            <button 
              onClick={() => setView('methods')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${view === 'methods' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}
            >
              <BookOpen className="w-3 h-3" /> Biblioteca
            </button>
            <button 
              onClick={() => setView('chat')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${view === 'chat' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}
            >
              <BrainCircuit className="w-3 h-3" /> IA Mestre
            </button>
          </div>
          <div className="flex items-center gap-2 pr-2">
             <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
             <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Multi-Model Active</span>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {view === 'methods' && (
            <div className="absolute inset-0 overflow-y-auto p-6 space-y-6 custom-scrollbar animate-in fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-amber-500 italic">Lições do Regional</h2>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Conhecimento que funciona Offline</p>
              </div>

              <div className="grid gap-3 pb-20">
                {['Fundamentos', 'Baixarias', 'Harmonia'].map((cat) => (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] border-b border-white/5 pb-1">{cat}</h3>
                    <div className="grid gap-2">
                      {STATIC_CURRICULUM.filter(l => l.category === cat).map(lesson => (
                        <button 
                          key={lesson.id}
                          onClick={() => handleSelectLesson(lesson)}
                          className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-amber-600/10 hover:border-amber-600/30 transition-all group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Music className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-bold text-slate-200">{lesson.title}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-800" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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
                      IA de Alta Precisão. Analisando técnica de Dino, Raphael e o balanço do Samba.
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
                            title="Copiar Lição"
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
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">O Mestre está refletindo...</span>
                      </div>
                      <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-600 animate-progress" />
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
                      placeholder="Ex: Como fazer a baixaria de Am para G?"
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
        @keyframes progress {
          0% { width: 0%; }
          30% { width: 60%; }
          100% { width: 95%; }
        }
        .animate-progress {
          animation: progress 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default AITeacher;
