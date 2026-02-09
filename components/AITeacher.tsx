
import React, { useState, useRef, useEffect } from 'react';
import { getTeacherInsights } from '../services/geminiService';
import { 
  Send, Loader2, BrainCircuit, Check, Copy, Zap, MessageSquare, 
  Terminal, ShieldCheck, Info, Sparkles, BookOpen, ChevronRight, AlertTriangle, RefreshCw
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  "Dicas para a 7ª corda em Dó no Samba-enredo",
  "Como fazer baixaria cromática no Choro?",
  "Sugira rearmonização para 'O Mundo é um Moinho'",
  "Técnica de apoio do polegar nas baixarias",
];

const AITeacher: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, copied?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
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

  const handleAsk = async (customPrompt?: string) => {
    const textToSubmit = customPrompt || topic.trim();
    if (!textToSubmit || loading) return;

    setErrorStatus(null);
    
    // Verifica se temos chave de API antes de começar
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Após abrir o diálogo, assumimos que o usuário selecionou ou está selecionando.
        // A próxima chamada deve funcionar.
      }
    }

    setTopic('');
    setMessages(prev => [...prev, { role: 'user', text: textToSubmit }]);
    setLoading(true);

    try {
      // Passa apenas o histórico necessário para economizar tokens e evitar erros
      const history = messages.slice(-4).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await getTeacherInsights(textToSubmit, history);
      setMessages(prev => [...prev, { role: 'model', text: responseText || "O Mestre processou sua dúvida, mas o resultado foi vazio. Tente reformular." }]);
    } catch (err: any) {
      console.error("Erro Crítico Consultoria:", err);
      
      let errorMessage = `[ERRO]: O Mestre está com dificuldades de conexão.`;
      
      if (err.message?.includes("404") || err.message?.includes("Requested entity") || err.message?.includes("API_KEY_MISSING")) {
        setErrorStatus("Chave de API requer atenção.");
        errorMessage = `[ERRO DE CHAVE]: Sua chave de API não foi validada. Por favor, selecione uma chave de um projeto com faturamento ativo em ai.google.dev/gemini-api/docs/billing.`;
        if (window.aistudio) window.aistudio.openSelectKey();
      } else if (err.message?.includes("429") || err.message?.includes("503") || err.message?.includes("overloaded")) {
        setErrorStatus("Servidor sobrecarregado.");
        errorMessage = `[CONGESTIONAMENTO]: Muitos violonistas estão consultando o mestre agora. Tentei 3 vezes e falhei. Aguarde 30 segundos e clique em 'Tentar Novamente'.`;
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-[600px]">
      <div className="bg-[#0c0604] border border-white/10 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl relative border-b-4 border-amber-600/20">
        
        {/* Header Profissional */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-amber-950/20 z-40">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-600 rounded-2xl shadow-glow">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Consultoria Técnica 7C</h3>
              <div className="flex items-center gap-2 mt-0.5">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                 <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500/60">Expert Neural Engine Ativo</p>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
             <Terminal className="w-3 h-3 text-amber-500/40" />
             <span className="text-[9px] font-mono font-black uppercase tracking-widest text-white/40">PRO-CONSOLE v2.8</span>
          </div>
        </div>

        <div className="flex-1 relative flex flex-col overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-6">
                <div className="relative">
                  <div className="absolute -inset-8 bg-amber-600/10 rounded-full blur-3xl animate-pulse" />
                  <BrainCircuit className="w-16 h-16 text-amber-600/40 relative z-10" />
                </div>
                <div>
                  <h3 className="text-white font-black italic text-xl mb-3 tracking-tighter">O que vamos analisar hoje?</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest max-w-[280px] mx-auto">
                    Solicite uma consultoria sobre harmonia, tablaturas de baixarias ou rearmonização regional.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                   {SUGGESTED_QUERIES.map((q, i) => (
                     <button 
                       key={i}
                       onClick={() => handleAsk(q)}
                       className="text-left p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-600/30 hover:bg-amber-600/5 transition-all text-[9px] font-bold text-slate-400 hover:text-amber-500 group flex items-center justify-between"
                     >
                       <span className="line-clamp-1">{q}</span>
                       <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </button>
                   ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[94%] p-6 rounded-[2.2rem] shadow-2xl relative group transition-all ${
                  msg.role === 'user' 
                  ? 'bg-amber-600/10 text-white border border-amber-600/30 rounded-tr-none' 
                  : 'bg-[#120a08] text-slate-200 border border-white/10 rounded-tl-none'
                }`}>
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'model' ? 'font-mono text-[11px] text-amber-100/90' : 'font-sans font-medium'}`}>
                    {msg.text}
                  </div>
                  {msg.role === 'model' && (
                    <div className="absolute -bottom-3 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleCopy(msg.text, idx)}
                        className="p-2.5 bg-amber-600 rounded-xl shadow-lg hover:bg-amber-500 transition-all active:scale-90 flex items-center gap-2 text-[8px] font-black uppercase text-white"
                      >
                        {msg.copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Copiar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-amber-600/5 p-5 rounded-[2rem] border border-amber-500/20 flex flex-col gap-3 max-w-[80%]">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 italic">O Mestre está analisando...</span>
                  </div>
                  <div className="h-1 w-32 bg-amber-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 animate-[shimmer_1.5s_infinite] w-1/2" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {errorStatus && (
            <div className="mx-6 mb-4 p-4 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-[10px] font-black uppercase text-red-200 tracking-wider">{errorStatus}</p>
              </div>
              <button 
                onClick={() => handleAsk(messages[messages.length - 1]?.text)} 
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-lg"
              >
                <RefreshCw className="w-3 h-3" /> Tentar Novamente
              </button>
            </div>
          )}

          <div className="p-5 bg-black/40 backdrop-blur-xl border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative group">
                <input 
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="Peça uma baixaria ou tire uma dúvida técnica..."
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl py-4.5 px-6 text-sm text-white focus:ring-2 focus:ring-amber-600/40 outline-none transition-all placeholder:text-slate-600"
                />
                <Sparkles className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600/20 group-focus-within:text-amber-500/40 transition-colors" />
              </div>
              <button 
                onClick={() => handleAsk()}
                disabled={loading || !topic.trim()}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-20 p-4.5 rounded-2xl text-white transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-90"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITeacher;
