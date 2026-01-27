
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getTeacherInsights, ChatMessage } from '../services/geminiService';
import { 
  Sparkles, Send, Loader2, Zap, Copy, Check, 
  Mic, MicOff, Music, Trash2, Volume2, VolumeX,
  MessageCircle, Headset, AlertCircle, RefreshCw
} from 'lucide-react';

interface AITeacherProps {
  onResetKey?: () => void;
}

const AITeacher: React.FC<AITeacherProps> = ({ onResetKey }) => {
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isListeningManualRef = useRef(false);

  const WHATSAPP_NUMBER = "5519987719618";

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const speak = (text: string, index: number) => {
    if (!synthRef.current) return;

    if (speakingIndex === index) {
      synthRef.current.cancel();
      setSpeakingIndex(null);
      return;
    }

    synthRef.current.cancel();
    const cleanedText = text.replace(/[*#|]/g, '').replace(/7 \(C\/B\).*/s, '[Tablatura omitida na leitura]');
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 0.9;
    
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    
    setSpeakingIndex(index);
    synthRef.current.speak(utterance);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        if (currentTranscript) {
          setTopic(prev => (prev ? prev + ' ' + currentTranscript.trim() : currentTranscript.trim()));
        }
      };

      recognition.onend = () => {
        if (isListeningManualRef.current) {
          try { recognition.start(); } catch (e) {}
        } else {
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'network') setConnectionError("Microfone: Falha na rede.");
        console.error("Recognition Error:", event.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Microfone não suportado.");
      return;
    }

    if (isListening) {
      isListeningManualRef.current = false;
      setIsListening(false);
      recognitionRef.current.stop();
    } else {
      setConnectionError(null);
      isListeningManualRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
        isListeningManualRef.current = false;
      }
    }
  }, [isListening]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async (customPrompt?: string) => {
    const textToSearch = customPrompt || topic;
    if (!textToSearch.trim() || loading) return;

    setConnectionError(null);
    if (isListening) {
      isListeningManualRef.current = false;
      setIsListening(false);
      recognitionRef.current?.stop();
    }
    if (synthRef.current) synthRef.current.cancel();

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
    } catch (err: any) {
      if (err.message === "REAUTH_REQUIRED") {
        setConnectionError("Sua chave de acesso expirou ou é inválida.");
        if (onResetKey) onResetKey();
      } else {
        setConnectionError(err.message || "Erro na conexão.");
        setMessages(prev => prev.slice(0, -1));
        setTopic(textToSearch);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {connectionError && (
        <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex items-center gap-3 text-red-200 text-[10px] animate-in fade-in slide-in-from-top-2 uppercase font-black tracking-widest">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="flex-1">{connectionError}</div>
          <button onClick={() => setConnectionError(null)} className="bg-red-500/20 px-2 py-1 rounded">X</button>
        </div>
      )}

      <div className="w-full space-y-3">
        <div className="flex flex-col gap-2 p-2 bg-black/60 border border-white/10 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Pergunte ao Mestre..."
              className="flex-1 bg-transparent border-none py-2 text-white placeholder:text-slate-600 focus:ring-0 outline-none font-bold text-base px-2"
            />
            <button 
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition-all relative ${
                isListening ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-white/5 text-amber-500'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListening && <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></span>}
            </button>
          </div>
          <button 
            onClick={() => handleAsk()}
            disabled={loading || !topic.trim()}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-20 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px]"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Consultar Mestre
          </button>
        </div>
      </div>

      <div className="bg-black/80 border border-white/10 rounded-[1.5rem] flex flex-col h-[380px] md:h-[500px] overflow-hidden">
        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500 w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Aula Particular</span>
          </div>
          <button onClick={() => setMessages([])} className="p-1.5 text-slate-600 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center opacity-10 text-center">
              <Music className="w-16 h-16 mb-4" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">Mestre em Silêncio</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[95%] p-4 rounded-xl shadow-md ${
                msg.role === 'user' 
                ? 'bg-amber-900/30 text-white border border-amber-600/20 rounded-tr-none' 
                : 'bg-white/5 text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap rounded-tl-none border border-white/5'
              }`}>
                {msg.text}
                {msg.role === 'model' && (
                  <div className="mt-3 flex gap-2 justify-end border-t border-white/5 pt-2">
                    <button onClick={() => speak(msg.text, idx)} className="p-1.5 bg-white/5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">
                      {speakingIndex === idx ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                      setCopiedIndex(idx);
                      setTimeout(() => setCopiedIndex(null), 2000);
                    }} className="p-1.5 bg-white/5 rounded-lg text-slate-400 hover:text-amber-500">
                      {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3 border border-amber-500/10">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-900">O mestre está formulando a resposta...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <button 
        onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')} 
        className="flex items-center justify-between p-3 bg-green-950/20 border border-green-900/30 rounded-xl hover:bg-green-900/40 transition-all group"
      >
        <div className="flex items-center gap-2">
          <Headset className="w-4 h-4 text-green-500" />
          <div className="text-left">
            <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Mentoria Vip</h4>
          </div>
        </div>
        <MessageCircle className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};

export default AITeacher;
