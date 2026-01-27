
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const recognitionRef = useRef<any>(null);

  const WHATSAPP_NUMBER = "5519987719618";

  const quickPrompts = [
    { label: "Dino: Baixarias", prompt: "Gere uma tablatura de baixaria clássica do Dino em Sol Maior." },
    { label: "Raphael: Harmonia", prompt: "Como Raphael Rabello pensava a harmonia na 7ª corda?" },
    { label: "Técnica Dedeira", prompt: "Qual a melhor forma de atacar a 7ª corda com dedeira de aço?" }
  ];

  // Configuração do reconhecimento de voz com melhor tratamento de erros
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Melhor para mobile para evitar loops de processamento
      recognition.interimResults = false;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setTopic(prev => (prev.length > 0 ? prev + ' ' : '') + transcript);
        }
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
      }
    }
  }, [isListening]);

  // Scroll otimizado
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleAsk = async (customPrompt?: string) => {
    const textToSearch = customPrompt || topic;
    if (!textToSearch.trim() || loading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const newUserMessage = { role: 'user' as const, text: textToSearch };
    
    setMessages(prev => [...prev, newUserMessage]);
    setTopic('');
    setLoading(true);

    try {
      const currentHistory: ChatMessage[] = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

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
    <div className="flex flex-col gap-4 w-full">
      
      {/* Input de IA Otimizado */}
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-3 p-3 bg-black/60 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Pergunte ao mestre..."
              className="flex-1 bg-transparent border-none py-3 text-white placeholder:text-slate-600 focus:ring-0 outline-none font-bold text-lg md:text-xl px-2"
            />
            <button 
              onClick={toggleListening}
              className={`p-3 rounded-2xl transition-all ${
                isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-white/5 text-amber-500'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          
          <button 
            onClick={() => handleAsk()}
            disabled={loading || !topic.trim()}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-20 text-white py-4 rounded-2xl transition-all flex items-center justify-center gap-2 font-black shadow-lg uppercase tracking-widest text-xs"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Consultar Mestre
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center">
          {quickPrompts.map((q, i) => (
            <button key={i} onClick={() => handleAsk(q.prompt)} className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-white/5 px-3 py-2 rounded-full border border-white/5 hover:border-amber-500/30 transition-all">
              <Zap className="w-3 h-3 text-amber-600 mr-1 inline" /> {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area - Altura ajustada para mobile */}
      <div className="bg-black/80 border border-white/10 rounded-[2rem] flex flex-col h-[400px] md:h-[550px] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <Sparkles className="text-amber-500 w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Chat Técnico</span>
          </div>
          <button onClick={() => setMessages([])} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
              <Music className="w-12 h-12 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Aguardando consulta</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-4 md:p-6 rounded-2xl ${
                msg.role === 'user' 
                ? 'bg-amber-900/40 text-white rounded-tr-none border border-amber-600/20' 
                : 'bg-white/5 text-slate-300 rounded-tl-none leading-relaxed text-sm md:text-lg whitespace-pre-wrap'
              }`}>
                {msg.text}
                {msg.role === 'model' && (
                  <button onClick={() => copyToClipboard(msg.text, idx)} className="mt-3 block ml-auto p-2 bg-white/5 rounded-lg text-slate-500 hover:text-amber-500">
                    {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-900">Processando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* WhatsApp Support */}
      <button 
        onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')} 
        className="w-full flex items-center justify-between p-4 bg-green-950/20 border border-green-900/30 rounded-2xl hover:bg-green-900/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <Headset className="w-5 h-5 text-green-500" />
          <div className="text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Mentoria Individual</h4>
            <p className="text-[9px] text-slate-500 uppercase tracking-tighter">Fale direto com o mestre</p>
          </div>
        </div>
        <MessageCircle className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};

export default AITeacher;
