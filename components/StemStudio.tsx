
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic2, Music2, Drum, Guitar, Layers, 
  Play, Pause, Download, Share2, Loader2, 
  FileAudio, Save, Circle, RotateCcw,
  Headphones as SoloIcon, Plus, Minus, MessageSquare, 
  StopCircle, Radio, Sparkles, Volume2
} from 'lucide-react';
import { streamExtractBaixarias, BaixariaAnalysis } from '../services/geminiService';

interface StemChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  db: number;
  isMuted: boolean;
  color: string;
  filterType: 'notch' | 'lowpass' | 'highpass' | 'bandpass' | 'none';
  freq: number;
}

const INITIAL_STEMS: StemChannel[] = [
  { id: 'vocals', name: 'Voz', icon: Mic2, db: 0, isMuted: false, color: 'text-blue-400', filterType: 'notch', freq: 1500 },
  { id: 'drums', name: 'Bateria', icon: Drum, db: 0, isMuted: false, color: 'text-purple-400', filterType: 'highpass', freq: 300 },
  { id: 'bass', name: 'Baixo', icon: Layers, db: 0, isMuted: false, color: 'text-green-400', filterType: 'lowpass', freq: 200 },
  { id: 'guitar', name: 'Violão 7C', icon: Guitar, db: -2, isMuted: false, color: 'text-amber-500', filterType: 'bandpass', freq: 600 },
  { id: 'others', name: 'Outros', icon: Music2, db: -6, isMuted: false, color: 'text-slate-400', filterType: 'none', freq: 1000 },
];

const STRING_FREQS = [65.41, 82.41, 110.00, 146.83, 196.00, 246.94, 329.63];

const StemStudio: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [stems, setStems] = useState<StemChannel[]>(INITIAL_STEMS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [results, setResults] = useState<BaixariaAnalysis[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [playingTabIdx, setPlayingTabIdx] = useState<number | null>(null);
  
  const audioCtx = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const gainNodes = useRef<Record<string, GainNode>>({});
  const filterNodes = useRef<Record<string, BiquadFilterNode>>({});
  const analyserNode = useRef<AnalyserNode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const audioBuffer = useRef<AudioBuffer | null>(null);
  const startTime = useRef<number>(0);
  const pausedAt = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  const initAudioEngine = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
      analyserNode.current = audioCtx.current.createAnalyser();
      
      // Compressor de Masterização Transparente (Proteção contra clipping)
      const masterLimiter = audioCtx.current.createDynamicsCompressor();
      masterLimiter.threshold.setValueAtTime(-15, audioCtx.current.currentTime);
      masterLimiter.knee.setValueAtTime(10, audioCtx.current.currentTime);
      masterLimiter.ratio.setValueAtTime(4, audioCtx.current.currentTime);
      masterLimiter.attack.setValueAtTime(0.005, audioCtx.current.currentTime);
      masterLimiter.release.setValueAtTime(0.2, audioCtx.current.currentTime);
      
      masterLimiter.connect(audioCtx.current.destination);
      analyserNode.current.connect(masterLimiter);

      INITIAL_STEMS.forEach(stem => {
        const gainNode = audioCtx.current!.createGain();
        const filterNode = audioCtx.current!.createBiquadFilter();
        gainNode.gain.value = stem.isMuted ? 0 : dbToLinear(stem.db);
        if (stem.filterType !== 'none') {
          filterNode.type = stem.filterType;
          filterNode.frequency.value = stem.freq;
          filterNode.Q.value = 1.0; // Q de 1.0 conforme solicitado
        }
        gainNodes.current[stem.id] = gainNode;
        filterNodes.current[stem.id] = filterNode;
        filterNode.connect(gainNode);
        gainNode.connect(analyserNode.current!);
      });
    }
  };

  const dbToLinear = (db: number) => (db <= -50 ? 0 : Math.pow(10, db / 20));

  /**
   * MOTOR DE SÍNTESE ACÚSTICA ULTRA-REALISTA 7C (ZERO ARTIFACTS)
   */
  const playGuitarNote = (ctx: AudioContext, stringIdx: number, fret: number, time: number) => {
    const freq = STRING_FREQS[stringIdx] * Math.pow(2, fret / 12);
    const isBass = stringIdx < 3;
    const duration = isBass ? 5.0 : 3.5;

    // 1. EXCITADOR DINÂMICO (Simula o ataque orgânico da corda de aço)
    const attackSamples = Math.floor(ctx.sampleRate * 0.02);
    const attackBuffer = ctx.createBuffer(1, attackSamples, ctx.sampleRate);
    const attackData = attackBuffer.getChannelData(0);
    for (let i = 0; i < attackSamples; i++) {
      const env = Math.pow((attackSamples - i) / attackSamples, 2.5);
      // Mix de impacto de madeira (200Hz) e brilho de aço (High-Pass Noise)
      const impact = Math.sin(i * 0.05) * 0.5;
      const snap = (Math.random() * 2 - 1) * 0.2;
      attackData[i] = (impact + snap) * env;
    }
    const exciter = ctx.createBufferSource();
    exciter.buffer = attackBuffer;

    // 2. MODELAGEM DE CORDA (Delay Line Vibrational Analysis)
    const delay = ctx.createDelay(0.1);
    delay.delayTime.setValueAtTime(1 / freq, time);

    const feedback = ctx.createGain();
    const feedbackVal = Math.pow(0.001, (1 / freq) / duration);
    feedback.gain.setValueAtTime(feedbackVal, time);

    // 3. FILTROS DE TIMBRE ACÚSTICO (Ressonância de Madeira)
    const damping = ctx.createBiquadFilter();
    damping.type = 'lowpass';
    damping.frequency.setValueAtTime(isBass ? 900 : 5000, time);
    damping.frequency.exponentialRampToValueAtTime(120, time + duration);

    // Ressonância da Caixa (Acoustic Body IR Emulation)
    const bodyRes1 = ctx.createBiquadFilter();
    bodyRes1.type = 'peaking';
    bodyRes1.frequency.setValueAtTime(92, time); // Ressonância de Ar (Grave)
    bodyRes1.gain.setValueAtTime(8, time);
    bodyRes1.Q.setValueAtTime(2.0, time);

    const bodyRes2 = ctx.createBiquadFilter();
    bodyRes2.type = 'peaking';
    bodyRes2.frequency.setValueAtTime(400, time); // Ressonância de Médios
    bodyRes2.gain.setValueAtTime(4, time);
    bodyRes2.Q.setValueAtTime(1.0, time);

    // 4. SAÍDA LÍMIDA
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, time);
    masterGain.gain.linearRampToValueAtTime(isBass ? 0.5 : 0.35, time + 0.015);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    // Cadeia: Exciter -> Delay -> Damping -> BodyRes -> Feedback -> Loop
    exciter.connect(delay);
    delay.connect(damping);
    damping.connect(bodyRes1);
    bodyRes1.connect(bodyRes2);
    bodyRes2.connect(feedback);
    feedback.connect(delay);
    
    // Conexão de saída
    delay.connect(masterGain);
    masterGain.connect(ctx.destination);

    exciter.start(time);
  };

  const playTablatureAudio = (tab: string, index: number) => {
    if (!audioCtx.current) initAudioEngine();
    const ctx = audioCtx.current!;
    if (ctx.state === 'suspended') ctx.resume();

    setPlayingTabIdx(index);
    const startT = ctx.currentTime + 0.05;
    const lines = tab.split('\n');
    const tempo = 0.22; // Cadência natural de Samba

    lines.forEach((line) => {
      const match = line.match(/^(\d)\|/);
      if (!match) return;
      const strIdx = 7 - parseInt(match[1]);
      const content = line.substring(line.indexOf('|') + 1);
      
      for (let i = 0; i < content.length; i++) {
        if (/\d/.test(content[i])) {
          let fretStr = content[i];
          if (/\d/.test(content[i+1])) { fretStr += content[i+1]; i++; }
          const fret = parseInt(fretStr);
          const noteTime = startT + (i * tempo);
          playGuitarNote(ctx, strIdx, fret, noteTime);
        }
      }
    });

    setTimeout(() => setPlayingTabIdx(null), 4000);
  };

  const togglePlay = () => {
    if (!audioCtx.current || !audioBuffer.current) return;
    if (isPlaying) {
      pausedAt.current += audioCtx.current.currentTime - startTime.current;
      if (sourceNode.current) {
        sourceNode.current.stop();
        sourceNode.current.disconnect();
      }
      setIsPlaying(false);
    } else {
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
      sourceNode.current = audioCtx.current.createBufferSource();
      sourceNode.current.buffer = audioBuffer.current;
      Object.keys(filterNodes.current).forEach(id => {
        sourceNode.current!.connect(filterNodes.current[id]);
      });
      sourceNode.current.start(0, pausedAt.current % audioBuffer.current.duration);
      startTime.current = audioCtx.current.currentTime;
      setIsPlaying(true);
      requestAnimationFrame(drawWaveform);
    }
  };

  const handleToggleExtraction = async () => {
    if (isProcessing) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsProcessing(false);
      setProgressMessage("Transcrição finalizada.");
      return;
    }
    if (!file) return;
    setIsProcessing(true);
    setResults([]);
    setProgressMessage("Escuta Ativa: Detectando Bordões...");
    abortControllerRef.current = new AbortController();
    if (!isPlaying) togglePlay(); 
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const stream = streamExtractBaixarias(base64Audio, file.type, abortControllerRef.current?.signal);
        for await (const analysis of stream) {
          if (!abortControllerRef.current) break;
          setResults(prev => [...prev, analysis]);
        }
        setIsProcessing(false);
      };
    } catch (e) { setIsProcessing(false); }
  };

  const adjustVolume = (id: string, delta: number) => {
    setStems(prev => prev.map(s => {
      if (s.id === id) {
        let newDb = Math.min(Math.max(s.db + delta, -60), 12);
        if (gainNodes.current[id] && audioCtx.current) {
          gainNodes.current[id].gain.setTargetAtTime(newDb <= -50 ? 0 : dbToLinear(newDb), audioCtx.current.currentTime, 0.1);
        }
        return { ...s, db: newDb, isMuted: newDb <= -50 };
      }
      return s;
    }));
  };

  const drawWaveform = useCallback(() => {
    if (!analyserNode.current || !canvasRef.current || !isPlaying) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyserNode.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const render = () => {
      if (!isPlaying) return;
      analyserNode.current!.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `hsla(30, 100%, 50%, 0.7)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
      requestAnimationFrame(render);
    };
    render();
  }, [isPlaying]);

  return (
    <div className="bg-[#0f0a08] border border-amber-900/40 rounded-[3rem] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-6 min-h-[900px]">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between border-b border-white/5 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-600 rounded-2xl shadow-glow">
            <SoloIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase text-white tracking-tighter italic leading-none">Acoustic Pro Studio</h3>
            <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Motor de Síntese Orgânica v5</span>
          </div>
        </div>
      </div>

      {!file ? (
        <div onClick={() => fileInputRef.current?.click()} className="flex-1 border-2 border-dashed border-amber-600/10 rounded-[2.5rem] flex flex-col items-center justify-center p-12 cursor-pointer hover:bg-amber-600/5 transition-all bg-black/20">
          <FileAudio className="w-16 h-16 text-amber-500 mb-4" />
          <p className="font-black text-slate-100 text-lg uppercase tracking-widest text-center">Carregar Áudio para Escuta Inteligente</p>
          <input type="file" ref={fileInputRef} onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f); setLoadingAudio(true); initAudioEngine();
              const buffer = await f.arrayBuffer();
              audioBuffer.current = await audioCtx.current!.decodeAudioData(buffer);
              setLoadingAudio(false);
            }
          }} className="hidden" accept="audio/*" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6">
          <div className="h-44 bg-black/80 rounded-[2.5rem] border border-white/5 relative flex items-center justify-center overflow-hidden">
             <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-40" width={1000} height={180} />
             {loadingAudio ? (
               <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
             ) : (
               <button onClick={togglePlay} className="p-10 bg-amber-600 rounded-full shadow-glow active:scale-90 hover:scale-105 transition-all flex items-center justify-center z-10">
                 {isPlaying ? <Pause className="w-12 h-12 text-white fill-current" /> : <Play className="w-12 h-12 text-white fill-current ml-2" />}
               </button>
             )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stems.map((stem) => (
              <div key={stem.id} className={`bg-white/5 p-4 rounded-3xl border flex flex-col items-center gap-3 ${stem.isMuted ? 'border-red-900/40 opacity-40 grayscale' : 'border-amber-600/20'}`}>
                <stem.icon className={`w-5 h-5 ${stem.color}`} />
                <span className="text-[9px] font-black uppercase text-slate-400">{stem.name}</span>
                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl">
                   <button onClick={() => adjustVolume(stem.id, -4)} className="p-2 text-slate-500 hover:text-white"><Minus className="w-3 h-3" /></button>
                   <span className="text-[10px] font-mono text-amber-500 font-bold w-6 text-center">{stem.isMuted ? 'OFF' : stem.db}</span>
                   <button onClick={() => adjustVolume(stem.id, 4)} className="p-2 text-slate-500 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
             <button 
                onClick={handleToggleExtraction} 
                className={`w-full ${isProcessing ? 'bg-red-600' : 'bg-amber-600'} py-6 rounded-[2rem] flex items-center justify-center gap-4 text-white text-[13px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl`}
             >
                {isProcessing ? <StopCircle className="w-6 h-6 animate-pulse" /> : <Sparkles className="w-6 h-6" />}
                {isProcessing ? 'Parar Escuta Ativa' : 'Transcrição Nota por Nota'}
             </button>

             <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar bg-black/60 p-8 rounded-[3rem] border border-amber-600/20 relative shadow-inner">
               <div className="flex items-center justify-between border-b border-amber-600/20 pb-3 mb-6">
                 <h4 className="text-[12px] font-black uppercase text-amber-500 tracking-widest">Partitura Dinâmica Hi-Fi</h4>
                 {isProcessing && <div className="text-[8px] font-black uppercase text-red-500 animate-pulse">Analizando bordões...</div>}
               </div>

               <div className="grid grid-cols-1 gap-4">
                 {results.map((res, idx) => (
                   <div key={idx} className="bg-white/5 p-6 rounded-[2rem] border border-white/5 group hover:border-amber-500/30 transition-all">
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="px-4 py-1.5 bg-amber-600/20 rounded-xl text-amber-500 font-mono font-black text-xs">{res.timestamp}</span>
                          <span className="text-[10px] text-slate-200 font-black uppercase tracking-tight italic">{res.notes}</span>
                        </div>
                        <button 
                          onClick={() => playTablatureAudio(res.tablature, idx)}
                          className={`p-3 rounded-2xl transition-all ${playingTabIdx === idx ? 'bg-amber-600 text-white shadow-glow' : 'bg-white/5 text-amber-500 hover:bg-amber-600/20'}`}
                        >
                          {playingTabIdx === idx ? <Volume2 className="w-4 h-4 animate-bounce" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                     </div>
                     <pre className="text-[14px] font-mono text-slate-100 bg-black/80 p-6 rounded-3xl overflow-x-auto border border-white/10 leading-relaxed tracking-[0.2em]">
                        {res.tablature}
                     </pre>
                   </div>
                 ))}
                 <div ref={resultsEndRef} className="h-4 w-full" />
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StemStudio;
