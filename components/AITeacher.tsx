
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
        <div className="flex flex-col sm:flex-row gap-4 p-3 md:p-5 bg-black/40 border-2 border-amber-900/40 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl items-center transition-all hover:border-amber-600/50 group backdrop-blur-md">
          
          <div className="flex items-center w-full sm:w-auto gap-3">
            <button 
              onClick={toggleListening}
              className={`flex-1 sm:flex-none h-14 md:h-16 px-6 md:px-8 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${
                isListening 
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white animate-pulse ring-4 ring-amber-500/30' 
                : 'bg-gradient-to-br from-[#3d2516] to-[#1a0f0a] text-amber-200 hover:scale-105 active:scale-95 border border-amber-800/20'
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
            placeholder="Fale com o mestre..."
            className="flex-1 w-full bg-transparent border-none py-4 text-white placeholder:text-slate-700 focus:ring-0 outline-none font-bold text-lg md:text-2xl px-2"
          />
          
          <button 
            onClick={() => handleAsk()}
            disabled={loading || !topic.trim()}
            className="w-full sm:w-auto bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 hover:from-amber-500 hover:to-amber-600 disabled:opacity-20 text-white h-14 md:h-16 px-10 md:px-14 rounded-2xl transition-all flex items-center justify-center gap-3 font-black shadow-lg active:translate-y-1 border-b-4 border-amber-950 shrink-0"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            <span className="text-xs md:text-sm uppercase tracking-[0.25em]">Consultar</span>
          </button>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          {quickPrompts.map((q, i) => (
            <button key={i} onClick={() => handleAsk(q.prompt)} className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-400 transition-all bg-amber-950/5 px-5 py-2.5 rounded-full border border-amber-900/10 hover:border-amber-700/40">
              <Zap className="w-3.5 h-3.5 text-amber-700 mr-2 inline" /> {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CHAT AREA */}
      <div className="bg-[#0c0706] border border-white/5 rounded-[2.5rem] md:rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col h-[500px] md:h-[650px] relative overflow-hidden">
        <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between bg-black/60 backdrop-blur-3xl relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#452618] to-[#080403] rounded-2xl flex items-center justify-center shadow-lg border border-amber-800/20">
              <Sparkles className="text-amber-500 w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h3 className="text-base md:text-xl font-black text-white italic tracking-tight uppercase">Mestre 7 Cordas</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-green-700'}`} />
                <span className="text-[9px] uppercase font-black text-slate-600 tracking-widest">IA Conectada</span>
              </div>
            </div>
          </div>
          <button onClick={() => setMessages([])} className="p-3 hover:bg-red-500/10 text-slate-700 hover:text-red-500 rounded-xl transition-all">
            <Trash2 className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-12 custom-scrollbar relative">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
          
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <Music className="w-16 h-16 text-amber-900 mb-4" />
              <p className="text-slate-600 text-xs font-black uppercase tracking-[0.5em]">Aguardando sua dúvida técnica</p>
            </div>
          )}

          <div className="space-y-8 md:space-y-12 relative z-10">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`max-w-[92%] md:max-w-[85%] p-6 md:p-10 rounded-[1.8rem] md:rounded-[3rem] shadow-2xl transition-all ${
                  msg.role === 'user' 
                  ? 'bg-gradient-to-br from-[#3d2516] to-[#1a0f0a] text-white rounded-tr-none border border-amber-900/20' 
                  : 'bg-white/5 border border-white/5 text-slate-300 rounded-tl-none leading-relaxed text-base md:text-2xl whitespace-pre-wrap font-medium italic'
                }`}>
                  {msg.text}
                  {msg.role === 'model' && (
                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                      <button onClick={() => copyToClipboard(msg.text, idx)} className="p-3 bg-white/5 hover:bg-amber-500/20 rounded-xl text-slate-600 hover:text-amber-500 transition-all border border-white/5">
                        {copiedIndex === idx ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem] rounded-tl-none flex items-center gap-6 shadow-xl">
                  <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                  <span className="text-xs md:text-sm font-black text-amber-900 uppercase tracking-[0.4em]">O Mestre está pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* 3. CONSULTORIA SECTION */}
      <div className="mt-2">
        <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')} className="w-full group relative p-1 rounded-[2.5rem] bg-gradient-to-r from-amber-900/20 via-green-900/10 to-amber-900/20 hover:from-green-900 hover:to-green-700 transition-all duration-700 shadow-2xl overflow-hidden active:scale-[0.98]">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-[2.5rem]" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-12 border border-white/5 rounded-[2.5rem]">
            <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#121c12] rounded-2xl flex items-center justify-center shadow-2xl border border-green-900/30">
                <Headset className="w-8 h-8 md:w-10 md:h-10 text-green-500" />
              </div>
              <div>
                <h4 className="text-2xl md:text-3xl font-black text-white italic tracking-tight">Mentoria Individual</h4>
                <p className="text-slate-600 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mt-2 italic">Aperfeiçoe sua técnica com acompanhamento personalizado</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-[#1a2e1a] hover:bg-green-700 text-green-400 hover:text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs md:text-sm transition-all border border-green-900/50">
              <MessageCircle className="w-5 h-5" />
              WhatsApp do Mestre
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AITeacher;
