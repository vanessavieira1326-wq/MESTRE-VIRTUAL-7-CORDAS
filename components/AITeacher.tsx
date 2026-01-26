
import React, { useState, useRef, useEffect } from 'react';
import { getTeacherInsights, ChatMessage } from '../services/geminiService';
import { 
  Sparkles, Send, Loader2, Zap, Copy, Check, 
  Mic, MicOff, Music, Trash2, RotateCcw,
  MessageCircle, Headset
} from 'lucide-react';

const AITeacher: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const WHATSAPP_NUMBER = "5519987719618";

  const quickPrompts = [
    { label: "Dino: Baixarias", prompt: "Gere uma tablatura de baixaria clássica do Dino em Sol Maior." },
    { label: "Raphael: Harmonia", prompt: "Como Raphael Rabello pensava a harmonia na 7ª corda?" },
    { label: "Técnica Dedeira", prompt: "Qual a melhor forma de atacar a 7ª corda com dedeira de aço?" }
  ];

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setTopic(prev => (prev.length > 0 ? prev + ' ' : '') + finalTranscript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async (customPrompt?: string) => {
    const textToSearch = customPrompt || topic;
    if (!textToSearch.trim() || loading) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }

    const newUserMessage = { role: 'user' as const, text: textToSearch };
    const currentHistory: ChatMessage[] = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    setMessages(prev => [...prev, newUserMessage]);
    setTopic('');
    setLoading(true);

    try {
      const responseText = await getTeacherInsights(textToSearch, currentHistory);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "O Mestre teve um problema na conexão. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      
      {/* INPUT IA - TOPO */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row gap-3 p-3 bg-[#050505] border-2 border-amber-600/30 rounded-3xl md:rounded-[4rem] shadow-2xl items-center hover:border-amber-500 transition-all group">
          
          <div className="flex items-center w-full sm:w-auto gap-2">
            <button 
              onClick={toggleListening}
              className={`flex-1 sm:flex-none h-14 px-6 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                isListening 
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white animate-pulse shadow-[0_0_20px_rgba(139,92,246,0.5)]' 
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              <span className="ml-2 text-[10px] font-black uppercase tracking-widest">{isListening ? 'Ouvindo' : 'Voz'}</span>
            </button>
            {topic && (
              <button onClick={() => setTopic('')} className="p-4 h-14 rounded-2xl bg-white/5 text-slate-400 border border-white/10">
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <input 
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Dúvida técnica ou baixaria..."
            className="flex-1 w-full bg-transparent border-none py-4 text-white placeholder:text-slate-700 focus:ring-0 outline-none font-bold text-lg md:text-xl px-2"
          />
          
          <button 
            onClick={() => handleAsk()}
            disabled={loading || !topic.trim()}
            className="w-full sm:w-auto bg-gradient-to-br from-amber-400 to-orange-600 disabled:from-slate-800 disabled:text-slate-600 text-white h-14 px-10 rounded-2xl transition-all flex items-center justify-center gap-3 font-black shadow-xl border-b-4 border-amber-900 active:translate-y-1"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            <span className="text-xs uppercase tracking-widest">Enviar</span>
          </button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {quickPrompts.map((q, i) => (
            <button key={i} onClick={() => handleAsk(q.prompt)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-500 transition-all bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Zap className="w-3 h-3 text-amber-500 mr-2 inline" /> {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="bg-[#030303] border border-white/5 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col h-[450px] md:h-[600px] relative overflow-hidden">
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-black text-white italic">Mestre IA Online</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[8px] uppercase font-bold text-slate-500 tracking-widest">Pronto para responder</span>
              </div>
            </div>
          </div>
          <button onClick={() => setMessages([])} className="p-2 text-slate-600 hover:text-red-500 transition-all">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar relative">
          <div className="space-y-6 relative z-10">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] ${
                  msg.role === 'user' 
                  ? 'bg-amber-600 text-white rounded-tr-none' 
                  : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none leading-relaxed text-base md:text-xl whitespace-pre-wrap'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">O Mestre está escrevendo...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* CONSULTORIA PREMIUM */}
      <div className="mt-2">
        <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')} className="w-full group relative p-1 rounded-3xl bg-gradient-to-r from-green-600/20 via-amber-600/10 to-green-600/20 hover:from-green-600/40 transition-all duration-500 overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-3xl" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-10 border border-white/10 rounded-3xl">
            <div className="flex items-center gap-5 text-center md:text-left flex-col md:flex-row">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Headset className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <div>
                <h4 className="text-xl md:text-2xl font-black text-white italic">Consultoria Premium</h4>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Tire suas dúvidas técnicas diretamente no WhatsApp</p>
              </div>
            </div>
            <div className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95 flex items-center gap-3">
              <MessageCircle className="w-5 h-5" />
              Falar com o Mestre
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AITeacher;
