
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getTeacherInsights, ChatMessage } from '../services/geminiService';
import { 
  Sparkles, Send, Loader2, Zap, Copy, Check, 
  Mic, MicOff, Music, Trash2, Volume2, VolumeX,
  MessageCircle, Headset, AlertCircle, RefreshCw
} from 'lucide-react';

const AITeacher: React.FC = () => {
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
    const cleanedText = text.replace(/[*#|]/g, '').split('7 (C/B)')[0];
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
        setTopic(prev => (prev ? prev + ' ' + transcript : transcript));
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
      setConnectionError(null);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        alert("Erro ao acessar microfone.");
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async () => {
    if (!topic.trim() || loading) return;

    const currentPrompt = topic.trim();
    setConnectionError(null);
    setTopic(''); // Limpa o input imediatamente para melhor UX
    
    // Constrói histórico ANTES de adicionar a nova mensagem ao estado
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
      setConnectionError(err.message);
      // Opcional: remover a última mensagem do usuário se falhar
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      <div className="bg-black/80 border border-white/10 rounded-[2rem] flex flex-col h-[500px] md:h-[600px] overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* Header da Sala de Aula */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-amber-900/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Mestre Online</span>
          </div>
          <button onClick={() => setMessages([])} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Área de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <Music className="w-12 h-12 mb-4 text-amber-500" />
              <p className="text-[10px] font-black uppercase tracking-widest">A aula ainda não começou</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] p-4 rounded-2xl shadow-xl ${
                msg.role === 'user' 
                ? 'bg-amber-600/20 text-white border border-amber-600/30 rounded-tr-none' 
                : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                {msg.role === 'model' && (
                  <div className="mt-3 flex gap-2 justify-end border-t border-white/5 pt-2">
                    <button onClick={() => speak(msg.text, idx)} className="p-1.5 hover:text-amber-500 transition-colors">
                      {speakingIndex === idx ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(msg.text);
                        setCopiedIndex(idx);
                        setTimeout(() => setCopiedIndex(null), 2000);
                      }} 
                      className="p-1.5 hover:text-amber-500 transition-colors"
                    >
                      {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-white/5 p-4 rounded-2xl border border-amber-500/20 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">O Mestre está escrevendo...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input da Aula */}
        <div className="p-4 bg-white/5 border-t border-white/5 space-y-3">
          {connectionError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-[10px] text-red-400 font-bold uppercase">
              <AlertCircle className="w-4 h-4" /> {connectionError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl flex items-center px-3">
              <input 
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="Pergunte sobre baixarias..."
                className="flex-1 bg-transparent border-none py-3 text-sm text-white focus:ring-0 outline-none"
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
      
      {/* Botão WhatsApp para Suporte Real */}
      <button 
        onClick={() => window.open(`https://wa.me/5519987719618`, '_blank')} 
        className="w-full flex items-center justify-between p-4 bg-green-950/20 border border-green-500/20 rounded-2xl hover:bg-green-500/20 transition-all group"
      >
        <div className="flex items-center gap-3">
          <Headset className="w-5 h-5 text-green-500" />
          <div className="text-left">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Dúvida Técnica?</h4>
            <p className="text-[9px] text-slate-500">Chame um professor no WhatsApp</p>
          </div>
        </div>
        <MessageCircle className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default AITeacher;
