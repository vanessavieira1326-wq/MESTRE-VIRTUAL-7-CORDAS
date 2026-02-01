
import React, { useState, useRef, useEffect } from 'react';
import { getTeacherInsights, ChatMessage } from '../services/geminiService';
import { 
  Sparkles, Send, Loader2, Zap, Copy, Check, 
  Mic, MicOff, Music, Trash2, Volume2, VolumeX,
  Wifi, WifiOff
} from 'lucide-react';

const AITeacher: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
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
    const cleanedText = text.replace(/[*#|`-]/g, '').split('|')[0];
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'pt-BR';
    utterance.onend = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    synthRef.current.speak(utterance);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'pt-BR';
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTopic(transcript);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Mic error");
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async () => {
    if (!topic.trim() || loading) return;

    const currentPrompt = topic.trim();
    setTopic('');
    
    const currentHistory: ChatMessage[] = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    setMessages(prev => [...prev, { role: 'user', text: currentPrompt }]);
    setLoading(true);

    try {
      const responseText = await getTeacherInsights(currentPrompt, currentHistory);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: "Sinal de IA interrompido. Verifique sua chave ou conexão." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      <div className="bg-black/80 border border-white/10 rounded-[2rem] flex flex-col h-[500px] md:h-[600px] overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-amber-900/10">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isOnline ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
              {isOnline ? <Wifi className="w-2.5 h-2.5 text-green-500" /> : <WifiOff className="w-2.5 h-2.5 text-red-500" />}
              <span className={`text-[8px] font-black uppercase tracking-widest ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                {isOnline ? 'Online' : 'Desconectado'}
              </span>
            </div>
          </div>
          <button onClick={() => setMessages([])} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
              <Sparkles className="w-12 h-12 text-amber-500 animate-pulse" />
              <div className="max-w-[250px]">
                <p className="text-[10px] font-black uppercase tracking-widest text-white mb-2">Regional Virtual 7C</p>
                <p className="text-[9px] text-slate-400">Peça escalas, tablaturas de baixarias ou tire dúvidas de harmonia.</p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-4 rounded-2xl shadow-xl ${
                msg.role === 'user' 
                ? 'bg-amber-600/20 text-white border border-amber-600/30 rounded-tr-none' 
                : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
              }`}>
                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'model' ? 'font-mono text-[11px] overflow-x-auto' : ''}`}>
                  {msg.text}
                </div>
                {msg.role === 'model' && (
                  <div className="mt-3 flex gap-2 justify-end border-t border-white/5 pt-2">
                    <button onClick={() => speak(msg.text, idx)} className="p-1.5 hover:text-amber-500 transition-colors">
                      {speakingIndex === idx ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-4 rounded-2xl border border-amber-500/20 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">O Mestre está escrevendo...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white/5 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl flex items-center px-3">
              <input 
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="Ex: Escala de Ré maior..."
                className="flex-1 bg-transparent border-none py-3 text-sm text-white focus:ring-0 outline-none placeholder:text-slate-600"
              />
              <button 
                onClick={toggleListening}
                className={`p-2 rounded-lg transition-all ${isListening ? 'text-red-500 scale-110' : 'text-slate-500'}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            <button 
              onClick={handleAsk}
              disabled={loading || !topic.trim()}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-20 p-3.5 rounded-xl text-white shadow-lg transition-all active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITeacher;
