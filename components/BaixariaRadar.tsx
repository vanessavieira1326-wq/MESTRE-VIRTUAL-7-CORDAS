
import React, { useState, useRef, useEffect } from 'react';
import { Radio, Square, Loader2, Sparkles, Activity, Music, Zap, Award, Info } from 'lucide-react';
import { identifyLivePhrase } from '../services/geminiService';

const BaixariaRadar: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [identification, setIdentification] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);

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
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setTimer(0);

      intervalRef.current = window.setInterval(() => {
        setTimer(prev => {
          if (prev >= 7) { // 8 segundos é o tempo ideal para uma baixaria
            stopListening();
            return 7;
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
      if (intervalRef.current) clearInterval(intervalRef.current);
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

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isListening ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Radar de Baixarias 7C</h3>
          </div>
          {isListening && (
            <div className="text-[9px] font-mono font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">
              Gravando: {timer}s
            </div>
          )}
        </div>

        <div className="relative min-h-[140px] bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center p-4 transition-all">
          {isListening && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 rounded-full border-2 border-amber-500/20 animate-ping"></div>
              <Activity className="w-12 h-12 text-amber-500/40 animate-pulse" />
            </div>
          )}

          {!isListening && !isProcessing && !identification && (
            <div className="text-center space-y-3 z-10">
              <Music className="w-8 h-8 text-amber-500/20 mx-auto" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-[180px]">
                Toque as notas no violão para o mestre identificar a frase
              </p>
              <button 
                onClick={startListening}
                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg flex items-center gap-2 transition-all active:scale-95"
              >
                <Zap className="w-3 h-3 fill-current" /> Começar Escuta
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center gap-3 z-10">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">O Mestre está reconhecendo...</p>
            </div>
          )}

          {identification && !isProcessing && (
            <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Frase Identificada</span>
                <button onClick={() => setIdentification(null)} className="ml-auto text-[8px] text-slate-500 hover:text-white uppercase">Limpar</button>
              </div>
              <div className="text-slate-200 text-xs leading-relaxed italic font-medium bg-black/20 p-3 rounded-xl border border-white/5 max-h-[120px] overflow-y-auto custom-scrollbar">
                {identification}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/5 p-3 rounded-xl border border-red-400/20 text-[9px] font-bold uppercase">
            <Info className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="flex items-center gap-2 text-[8px] text-slate-600 font-black uppercase tracking-widest italic">
          <Sparkles className="w-3 h-3 text-amber-700" />
          Reconhecimento inteligente de bordões e cromatismos.
        </div>
      </div>
    </div>
  );
};

export default BaixariaRadar;
