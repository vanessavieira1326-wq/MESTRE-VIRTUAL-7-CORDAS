
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
    // Preservamos o histórico atual antes de atualizar o estado para enviar à API
    const currentHistory: ChatMessage[] = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    setMessages(prev => [...prev, newUserMessage]);
    setTopic('');
    setLoading(true);

    try {
      const responseText = await getTeacherInsights(textToSearch, currentHistory);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Erro ao conectar com o Mestre. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-700">
      
      {/* 1. BARRA DE INPUT IA NO TOPO */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 p-3 md:p-5 bg-[#050505] border-2 border-amber-600/40 rounded-[1.5rem] md:rounded-[3rem] shadow-[0_0_50px_rgba(217,119,6,0.1)] items-center transition-all hover:border-amber-500 group">
          
          <div className="flex items-center w-full sm:w-auto gap-3">
            <button 
              onClick={toggleListening}
              className={`flex-1 sm:flex-none h-14 md:h-16 px-6 md:px-8 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${
                isListening 
                ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-blue-500 text-white animate-pulse ring-4 ring-fuchsia-500/30 drop-shadow-[0_0_15px_rgba(192,38,211,0.6)]' 
                : 'bg-gradient-to-br from-indigo-600 to-blue-800 text-white hover:scale-105 active:scale-95 shadow-indigo-900/40 border-b-4 border-indigo-950'
              }`}
              title="Comando de Voz"
            >
              {isListening ? <MicOff className="w-6 h-6 mr-2" /> : <Mic className="w-6 h-6 mr-2" />}
              <span className="text-[11px] md:text-xs font-black uppercase tracking-widest">{isListening ? 'Ouvindo...' : 'Voz'}</span>
            </button>
            
            {topic && (
              <button onClick={() => setTopic('')} className="p-4 h-14 md:h-16 rounded-2xl bg-white/5 text-slate-400 hover:text-white border border-white/10">
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <input 
            ref={inputRef}
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Pergunte ao Mestre sobre baixarias e técnicas..."
            className="flex-1 w-full bg-transparent border-none py-4 text-white placeholder:text-slate-700 focus:ring-0 outline-none font-bold text-lg md:text-2xl px-2"
          />
          
          <button 
            onClick={() => handleAsk()}
            disabled={loading || !topic.trim()}
            className="w-full sm:w-auto bg-gradient-to-br from-amber-300 via-orange-500 to-amber-700 hover:from-amber-200 hover:to-orange-400 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 text-white h-14 md:h-16 px-10 md:px-14 rounded-2xl transition-all flex items-center justify-center gap-3 font-black shadow-[0_10px_30px_rgba(245,158,11,0.25)] active:translate-y-1 border-b-4 border-amber-900 shrink-0 group-hover:shadow-[0_10px_40px_rgba(245,158,11,0.4)]"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            <span className="text-xs md:text-sm uppercase tracking-[0.25em]">Enviar IA</span>
          </button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          {quickPrompts.map((q, i) => (
            <button key={i} onClick={() => handleAsk(q.prompt)} className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-400 transition-all bg-amber-500/5 px-5 py-2.5 rounded-full border border-amber-500/10 hover:border-amber-500/40 hover:bg-amber-500/10">
              <Zap className="w-3.5 h-3.5 text-amber-500 mr-2 inline" /> {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CHAT AREA */}
      <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl flex flex-col h-[500px] md:h-[650px] relative overflow-hidden">
        <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between bg-black/60 backdrop-blur-xl relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-lg border border-amber-400/20">
              <Sparkles className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="text-base md:text-xl font-black text-white italic tracking-tight">Sala de Aula do Mestre</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest">{loading ? 'Mestre formulando...' : 'Sincronizado'}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setMessages([])} className="p-3 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-xl transition-all" title="Resetar">
            <Trash2 className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-12 custom-scrollbar relative">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-amber-500/5 rounded-full flex items-center justify-center mb-6 border border-amber-500/10">
                <Music className="w-10 h-10 text-amber-900/50" />
              </div>
              <p className="text-slate-600 text-xs font-black uppercase tracking-[0.4em]">Inicie o Diálogo Musical</p>
            </div>
          )}

          <div className="space-y-8 md:space-y-12 relative z-10">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`max-w-[92%] md:max-w-[85%] p-6 md:p-10 rounded-[1.8rem] md:rounded-[3rem] shadow-2xl transition-all ${
                  msg.role === 'user' 
                  ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white rounded-tr-none border border-amber-400/20 shadow-amber-900/20' 
                  : 'bg-white/5 border border-white/10 text-slate-100 rounded-tl-none leading-relaxed text-base md:text-2xl whitespace-pre-wrap font-medium'
                }`}>
                  {msg.text}
                  {msg.role === 'model' && (
                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                      <button onClick={() => copyToClipboard(msg.text, idx)} className="p-3 bg-white/5 hover:bg-amber-500/20 rounded-xl text-slate-500 hover:text-amber-400 transition-all border border-white/5">
                        {copiedIndex === idx ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] rounded-tl-none flex items-center gap-6 shadow-xl">
                  <div className="relative">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <div className="absolute inset-0 bg-amber-500 blur-lg opacity-20 animate-pulse" />
                  </div>
                  <span className="text-xs md:text-sm font-black text-amber-500 uppercase tracking-[0.3em]">Aguarde o Mestre...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* 3. CONSULTORIA SECTION (Atualizado: Sem Aulas) */}
      <div className="mt-2">
        <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')} className="w-full group relative p-1 rounded-[2rem] md:rounded-[3.5rem] bg-gradient-to-r from-green-600/40 via-amber-600/20 to-green-600/40 hover:from-green-500 hover:to-green-500 transition-all duration-700 shadow-2xl overflow-hidden active:scale-[0.98]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-[2rem] md:rounded-[3.5rem]" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-12 border border-white/10 rounded-[2rem] md:rounded-[3.5rem]">
            <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-green-900/40 group-hover:scale-110 transition-transform duration-500 border border-green-400/30">
                <Headset className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div>
                <h4 className="text-2xl md:text-3xl font-black text-white italic tracking-tight">Consultoria Premium</h4>
                <p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mt-2">Tire suas dúvidas técnicas diretamente com o mestre no WhatsApp</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-green-600 hover:bg-green-500 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs md:text-sm transition-all shadow-[0_10px_30px_rgba(22,163,74,0.4)] whitespace-nowrap">
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
              Falar com o Mestre
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AITeacher;
