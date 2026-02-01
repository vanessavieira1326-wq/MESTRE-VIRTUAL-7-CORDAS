
import React, { useState, useRef, useEffect } from 'react';
import { Ear, Square, Play, Loader2, Music, Sparkles, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { analyzeBaixaria } from '../services/geminiService';

const SmartEar: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 29) stopRecording(); // Limite de 30s
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      setError("Permissão de microfone negada ou não disponível.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const result = await analyzeBaixaria(base64Audio, 'audio/webm');
        setAnalysisResult(result);
        setIsAnalyzing(false);
      };
    } catch (err: any) {
      setError(err.message);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-600/20 rounded-xl">
              <Ear className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Ouvido Inteligente 7C</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Análise de Baixarias em Tempo Real</p>
            </div>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-600/20 rounded-full border border-red-500/30 animate-pulse">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span className="text-[10px] font-mono font-bold text-red-500">00:{recordingTime.toString().padStart(2, '0')}s</span>
            </div>
          )}
        </div>

        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 relative min-h-[120px] flex flex-col items-center justify-center text-center overflow-hidden">
          {!isRecording && !isAnalyzing && !analysisResult && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
                Toque uma baixaria ou frase de 7 cordas e o mestre irá transcrever para você.
              </p>
              <button 
                onClick={startRecording}
                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center gap-2 mx-auto transition-all active:scale-95"
              >
                <Ear className="w-4 h-4" /> Iniciar Audição
              </button>
            </div>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-amber-500 rounded-full animate-bounce" 
                    style={{ height: `${Math.random() * 40 + 10}px`, animationDelay: `${i * 0.1}s` }}
                  ></div>
                ))}
              </div>
              <button 
                onClick={stopRecording}
                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center gap-2 transition-all active:scale-95"
              >
                <Square className="w-3 h-3 fill-current" /> Parar e Analisar
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 animate-pulse">O Mestre está processando as frases...</p>
            </div>
          )}

          {analysisResult && (
            <div className="w-full text-left space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Transcrição Detectada
                </span>
                <button 
                  onClick={() => setAnalysisResult(null)}
                  className="text-[9px] font-black uppercase text-slate-500 hover:text-white"
                >
                  Nova Audição
                </button>
              </div>
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-black/40 p-3 rounded-xl border border-white/5 overflow-x-auto max-h-[300px] custom-scrollbar">
                {analysisResult}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-[10px] font-bold uppercase tracking-wide">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center justify-between text-[9px] text-slate-600 font-black uppercase tracking-widest italic opacity-40">
          <span>Detecção Multimodal IA</span>
          <span>Regional 7C V2.5</span>
        </div>
      </div>
    </div>
  );
};

export default SmartEar;
