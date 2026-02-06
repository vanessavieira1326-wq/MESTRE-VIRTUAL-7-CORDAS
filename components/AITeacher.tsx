
import React, { useState, useRef, useEffect } from 'react';
import { getTeacherInsights } from '../services/geminiService';
import { 
  Send, Loader2, BookOpen, Music, 
  ChevronRight, Book, MessageSquare, Info, Zap
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
    id: 'b2',
    category: 'Baixarias',
    title: 'Descida Cromática',
    keywords: ['cromatica', 'descida', 'escala'],
    content: "Passagem para tons menores.\n\n5|--3--2--1--0-----|\n6|--------------4--|\n7|-----------------3|",
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
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'chat' | 'methods'>('methods'); // Começa em métodos se o usuário está perdido
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const findLocalAnswer = (input: string) => {
    const lowInput = input.toLowerCase();
    const match = STATIC_CURRICULUM.find(l => 
      l.keywords.some(k => lowInput.includes(k)) || 
      lowInput.includes(l.title.toLowerCase())
    );
    return match ? match.content : "Infelizmente estou sem sinal de IA para responder essa pergunta específica. Tente usar palavras como 'Baixaria', 'Afinação' ou 'Acorde', ou consulte minha BIBLIOTECA de métodos.";
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
      // Mestre Local entra em ação
      const localAnswer = findLocalAnswer(currentPrompt);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'model', text: `[MESTRE LOCAL]: ${localAnswer}` }]);
        setLoading(false);
      }, 800);
      return;
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-[500px]">
      <div className="bg-[#0c0604] border border-white/10 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl relative">
        
        {/* Toggle Centralizado */}
        <div className="p-3 border-b border-white/5 flex items-center justify-center bg-amber-900/5 z-40">
          <div className="flex bg-black/40 p-1 rounded-full border border-white/10">
            <button 
              onClick={() => setView('methods')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'methods' ? 'bg-amber-600 text-white' : 'text-slate-500'}`}
            >
              <Book className="w-3 h-3" /> Biblioteca
            </button>
            <button 
              onClick={() => setView('chat')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'chat' ? 'bg-amber-600 text-white' : 'text-slate-500'}`}
            >
              <MessageSquare className="w-3 h-3" /> Chat
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {/* View: Biblioteca de Métodos */}
          {view === 'methods' && (
            <div className="absolute inset-0 overflow-y-auto p-6 space-y-6 custom-scrollbar animate-in fade-in">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-amber-500 italic">Arquivo do Regional</h2>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Métodos de 7 Cordas que funcionam Offline</p>
              </div>

              <div className="grid gap-4 pb-20">
                {['Fundamentos', 'Baixarias', 'Harmonia'].map((cat) => (
                  <div key={cat} className="space-y-3">
                    <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] border-b border-white/5 pb-1">{cat}</h3>
                    <div className="grid gap-2">
                      {STATIC_CURRICULUM.filter(l => l.category === cat).map(lesson => (
                        <button 
                          key={lesson.id}
                          onClick={() => handleSelectLesson(lesson)}
                          className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-amber-600/10 hover:border-amber-600/30 transition-all group"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className="p-2 bg-black rounded-lg group-hover:bg-amber-600 transition-colors">
                              <Music className="w-4 h-4 text-amber-500 group-hover:text-white" />
                            </div>
                            <span className="text-sm font-bold text-slate-200 group-hover:text-amber-500">{lesson.title}</span>
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

          {/* View: Chat */}
          {view === 'chat' && (
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-10">
                    <div className="w-16 h-16 bg-amber-600/10 rounded-full flex items-center justify-center mb-4">
                      <Zap className="w-8 h-8 text-amber-500" />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium italic">
                      "Sem sinal de IA? Não tem problema. Pergunte sobre afinação ou frases clássicas e eu respondo com o que tenho guardado no arquivo local."
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[90%] p-4 rounded-3xl shadow-xl ${
                      msg.role === 'user' 
                      ? 'bg-amber-600/20 text-white border border-amber-600/30 rounded-tr-none' 
                      : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
                    }`}>
                      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'model' ? 'font-mono text-[11px] text-amber-100/90' : ''}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 p-4 rounded-3xl border border-amber-500/20 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Mestre Local buscando...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white/5 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                    placeholder="Ex: Como afinar a 7ª?"
                    className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:ring-0 outline-none"
                  />
                  <button 
                    onClick={handleAsk}
                    disabled={loading || !topic.trim()}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-20 p-4 rounded-2xl text-white transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITeacher;
