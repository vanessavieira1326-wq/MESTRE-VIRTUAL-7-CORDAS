import React, { useState, useRef, useEffect } from 'react';
import { Radio, Square, Loader2, Sparkles, Activity, Music, Zap, Award, Info, X, Bookmark, Trash2, BookOpen, ArrowLeft } from 'lucide-react';
import { identifyLivePhrase } from '../services/geminiService';

const BaixariaRadar: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [identification, setIdentification] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'radar' | 'phrases'>('radar');
  const [memorablePhrases, setMemorablePhrases] = useState<string[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const savedPhrases = localStorage.getItem('mestre7c-memorable-phrases');
      if (savedPhrases) {
        setMemorablePhrases(JSON.parse(savedPhrases));
      }
    } catch (e) {
      console.error("Failed to load memorable phrases from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('mestre7c-memorable-phrases', JSON.stringify(memorablePhrases));
    } catch (e) {
      console.error("Failed to save memorable phrases to localStorage", e);
    }
  }, [memorablePhrases]);

  const startListening = async () => {
    setIdentification(null);
    setError(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          processAudio(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setTimer(0);

      intervalRef.current = window.setInterval(() => {
        setTimer(prev => {
          if (prev >= 10) {
            stopListening();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      setError("Microfone não disponível.");
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        try {
          const result = await identifyLivePhrase(base64Audio, blob.type);
          setIdentification(result);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (err) {
      setError("Falha ao processar som.");
      setIsProcessing(false);
    }
  };
  
  const handleSavePhrase = () => {
    if (identification && !memorablePhrases.includes(identification)) {
      setMemorablePhrases(prev => [identification, ...prev]);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const handleDeletePhrase = (index: number) => {
    setMemorablePhrases(prev => prev.filter((_, i) => i !== index));
  };

  if (view === 'phrases') {
    return (
      <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[300px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Frases Memoráveis</h3>
          </div>
          <button onClick={() => setView('radar')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-[9px] font-black uppercase">
            <ArrowLeft className="w-3 h-3" />
            Voltar ao Radar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
          {memorablePhrases.length > 0 ? (
            <div className="space-y-3">
              {memorablePhrases.map((phrase, index) => (
                <div key={index} className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-slate-300 text-xs whitespace-pre-wrap font-mono flex-1">{phrase}</p>
                  <button onClick={() => handleDeletePhrase(index)} className="p-2 text-slate-600 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-600">
              <BookOpen className="w-8 h-8 mb-3" />
              <p className="text-[10px] font-bold uppercase tracking-widest max-w-[200px]">Nenhuma frase salva. Use o radar para capturar suas melhores baixarias.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isListening ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Radar 7C</h3>
          </div>
          <div className="flex items-center gap-2">
            {isListening && (
              <div className="text-[9px] font-mono font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
                00:{timer.toString().padStart(2, '0')}s
              </div>
            )}
            <button onClick={() => setView('phrases')} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-amber-500 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all border border-white/10">
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">Frases</span> ({memorablePhrases.length})
            </button>
          </div>
        </div>

        <div className="relative min-h-[120px] bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center p-4 transition-all overflow-hidden">
          {isListening ? (
            <div className="flex flex-col items-center gap-4 z-10">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-16 h-16 rounded-full border-2 border-red-500/20 animate-ping"></div>
                <Activity className="w-8 h-8 text-red-500/60 animate-pulse" />
              </div>
              
              <button 
                onClick={stopListening}
                className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg flex items-center gap-2 transition-all active:scale-95"
              >
                <Square className="w-3 h-3 fill-current" /> Interromper e Analisar
              </button>
            </div>
          ) : !isProcessing && !identification ? (
            <div className="text-center space-y-3 z-10">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Toque para identificar a frase
              </p>
              <button 
                onClick={startListening}
                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center gap-2 transition-all active:scale-95"
              >
                <Zap className="w-4 h-4 fill-current" /> Iniciar Escuta
              </button>
            </div>
          ) : null}

          {isProcessing && (
            <div className="flex flex-col items-center gap-3 z-10">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">O Mestre está ouvindo...</p>
            </div>
          )}

          {identification && !isProcessing && (
            <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                 <div className="flex items-center gap-2">
                   <Award className="w-3 h-3 text-amber-500" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Resultado</span>
                 </div>
                <button onClick={() => setIdentification(null)} className="ml-auto text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-slate-200 text-xs leading-relaxed italic bg-black/20 p-3 rounded-xl border border-white/5 max-h-[150px] overflow-y-auto custom-scrollbar">
                {identification}
              </div>
              <button
                onClick={handleSavePhrase}
                disabled={justSaved || memorablePhrases.includes(identification)}
                className="w-full flex items-center justify-center gap-2 bg-amber-600/20 hover:bg-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-amber-500 px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] border border-amber-600/30 transition-all"
              >
                <Bookmark className="w-3 h-3" />
                {justSaved ? 'Salvo com Sucesso!' : memorablePhrases.includes(identification) ? 'Frase já Salva' : 'Salvar Frase'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/5 p-3 rounded-xl border border-red-400/20 text-[9px] font-bold uppercase">
            <Info className="w-4 h-4" /> {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaixariaRadar;
