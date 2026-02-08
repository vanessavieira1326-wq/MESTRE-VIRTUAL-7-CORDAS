
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic2, Music2, Drum, Guitar, Layers, 
  Play, Pause, Download, Share2, Loader2, 
  FileAudio, Save, Circle, RotateCcw,
  Headphones as SoloIcon, 
  Volume2, Activity, Zap, Waves,
  VolumeX, MicOff, Mic, Sparkles, Cpu
} from 'lucide-react';
import { processNeuralSourceSeparation } from '../services/geminiService';

interface StemChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  level: number;
  previousLevel?: number;
  isMuted: boolean;
  color: string;
}

const INITIAL_STEMS: StemChannel[] = [
  { id: 'vocals', name: 'Voz (Neural Cut)', icon: Mic2, level: 80, isMuted: false, color: 'text-blue-400' },
  { id: 'drums', name: 'Percussão', icon: Drum, level: 70, isMuted: false, color: 'text-purple-400' },
  { id: 'bass', name: 'Baixo/Bordões', icon: Layers, level: 75, isMuted: false, color: 'text-green-400' },
  { id: 'guitar', name: 'Violão 7C (Master)', icon: Guitar, level: 110, isMuted: false, color: 'text-amber-500' },
  { id: 'others', name: 'Harmonia/Base', icon: Music2, level: 45, isMuted: false, color: 'text-slate-400' },
];

const SegmentedMeter: React.FC<{ level: number, color: string, isMuted: boolean }> = ({ level, color, isMuted }) => {
  const segments = 14;
  const activeSegments = Math.ceil((level / 150) * segments);
  
  return (
    <div className="flex flex-col gap-0.5 h-36 w-2.5 justify-between bg-black/40 p-0.5 rounded-sm">
      {[...Array(segments)].map((_, i) => {
        const index = segments - 1 - i;
        const isActive = index < activeSegments && !isMuted;
        let segmentColor = "bg-white/5";
        
        if (isActive) {
          if (index > 11) segmentColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]";
          else if (index > 9) segmentColor = "bg-amber-400";
          else segmentColor = "bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]";
        }

        return (
          <div 
            key={i} 
            className={`w-full h-1.5 rounded-[1px] transition-all duration-200 ${segmentColor}`}
          />
        );
      })}
    </div>
  );
};

const StemStudio: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [stems, setStems] = useState<StemChannel[]>(INITIAL_STEMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSolo7C, setIsSolo7C] = useState(false);
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [processingState, setProcessingState] = useState<string>("");
  const [aiReport, setAiReport] = useState<string | null>(null);

  const audioCtx = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const gainNodes = useRef<Record<string, GainNode>>({});
  const filterNodes = useRef<Record<string, BiquadFilterNode>>({});
  const masterGain = useRef<GainNode | null>(null);
  const analyserNode = useRef<AnalyserNode | null>(null);
  
  const audioBuffer = useRef<AudioBuffer | null>(null);
  const startTime = useRef<number>(0);
  const pausedAt = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initAudioEngine = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000
      });
      analyserNode.current = audioCtx.current.createAnalyser();
      analyserNode.current.fftSize = 256;
      masterGain.current = audioCtx.current.createGain();
      
      masterGain.current.connect(audioCtx.current.destination);
      masterGain.current.connect(analyserNode.current);

      stems.forEach(stem => {
        const gainNode = audioCtx.current!.createGain();
        gainNode.gain.value = stem.level / 100;
        
        const filter = audioCtx.current!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = 2500; 
        filter.Q.value = 1.0;
        filter.gain.value = stem.id === 'guitar' ? 3 : 0;

        gainNode.connect(filter);
        filter.connect(masterGain.current!);
        
        gainNodes.current[stem.id] = gainNode;
        filterNodes.current[stem.id] = filter;
      });
    }
  }, [stems]);

  const setLevel = (id: string, value: number) => {
    if (isSolo7C && id !== 'guitar') return;
    if (isKaraokeMode && id === 'vocals') return;

    setStems(prev => prev.map(s => {
      if (s.id === id) {
        const newLevel = Math.min(Math.max(value, 0), 150);
        if (gainNodes.current[id] && audioCtx.current) {
          const now = audioCtx.current.currentTime;
          gainNodes.current[id].gain.setTargetAtTime(newLevel / 100, now, 0.1);
        }
        return { ...s, level: newLevel, isMuted: newLevel === 0 };
      }
      return s;
    }));
  };

  const toggleKaraokeMode = () => {
    const newState = !isKaraokeMode;
    setIsKaraokeMode(newState);
    const now = audioCtx.current?.currentTime || 0;

    setStems(prev => prev.map(s => {
      if (s.id === 'vocals') {
        const targetLevel = newState ? 0 : (s.previousLevel || 80);
        const pLevel = newState ? s.level : s.previousLevel;
        
        if (gainNodes.current['vocals'] && audioCtx.current) {
          gainNodes.current['vocals'].gain.setTargetAtTime(targetLevel / 100, now, 0.15);
        }
        return { ...s, level: targetLevel, previousLevel: pLevel, isMuted: targetLevel === 0 };
      }
      return s;
    }));
  };

  const toggleSolo7C = () => {
    const newState = !isSolo7C;
    setIsSolo7C(newState);
    const now = audioCtx.current?.currentTime || 0;
    
    setStems(prev => prev.map(s => {
      const isGuitar = s.id === 'guitar';
      let targetLevel = s.level;
      let pLevel = s.previousLevel;

      if (newState) {
        if (!isGuitar) {
          pLevel = s.level;
          targetLevel = 0; 
        } else {
          targetLevel = 140;
        }
      } else {
        if (!isGuitar && s.previousLevel !== undefined) {
          targetLevel = s.previousLevel;
          if (isKaraokeMode && s.id === 'vocals') targetLevel = 0;
        } else if (isGuitar) {
          targetLevel = 110;
        }
      }
      
      if (gainNodes.current[s.id] && audioCtx.current) {
        gainNodes.current[s.id].gain.setTargetAtTime(targetLevel / 100, now, 0.1);
      }
      
      return { 
        ...s, 
        level: targetLevel, 
        previousLevel: pLevel,
        isMuted: targetLevel === 0 
      };
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setIsProcessing(true);
      setProcessingState("Inicializando Core Neural...");
      initAudioEngine();
      
      try {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          setProcessingState("Analisando Formantes Vocais...");
          await new Promise(r => setTimeout(r, 800));
          
          setProcessingState("Isolando Bordões de 7 Cordas...");
          await new Promise(r => setTimeout(r, 1000));
          
          setProcessingState("Mapeando Stereo Soundstage...");
          // Chamada real para o Gemini para gerar um relatório de processamento
          const report = await processNeuralSourceSeparation(base64Audio, f.type);
          setAiReport(report);
          
          const buffer = await f.arrayBuffer();
          audioBuffer.current = await audioCtx.current!.decodeAudioData(buffer);
          setIsProcessing(false);
          setProcessingState("");
          pausedAt.current = 0;
        };
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
      }
    }
  };

  const togglePlay = () => {
    if (!audioCtx.current || !audioBuffer.current) return;
    
    if (isPlaying) {
      pausedAt.current += audioCtx.current.currentTime - startTime.current;
      if (sourceNode.current) {
        sourceNode.current.stop();
        sourceNode.current = null;
      }
      setIsPlaying(false);
    } else {
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
      sourceNode.current = audioCtx.current.createBufferSource();
      sourceNode.current.buffer = audioBuffer.current;
      
      Object.values(gainNodes.current).forEach(g => sourceNode.current!.connect(g));
      
      const offset = pausedAt.current % audioBuffer.current.duration;
      sourceNode.current.start(0, offset);
      startTime.current = audioCtx.current.currentTime;
      setIsPlaying(true);
      requestAnimationFrame(drawWaveform);
    }
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
      
      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        if (isSolo7C) {
          ctx.fillStyle = `rgba(245, 158, 11, ${dataArray[i]/255})`;
        } else if (isKaraokeMode) {
          ctx.fillStyle = `rgba(16, 185, 129, ${dataArray[i]/255})`;
        } else {
          ctx.fillStyle = `rgba(51, 65, 85, ${dataArray[i]/255})`;
        }
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
      }
      requestAnimationFrame(render);
    };
    render();
  }, [isPlaying, isSolo7C, isKaraokeMode]);

  return (
    <div className="bg-[#0c0c0c] border border-amber-900/30 rounded-[3rem] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-6 border-b-8">
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between border-b border-white/5 pb-6 gap-6">
        <div className="flex items-center gap-5">
          <div className={`p-5 rounded-[2.5rem] transition-all duration-700 shadow-2xl ${isSolo7C ? 'bg-amber-600 ring-4 ring-amber-600/20' : 'bg-zinc-900 border border-white/5'}`}>
            <Guitar className={`w-8 h-8 ${isSolo7C ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter italic leading-none">Neural Isolation Studio</h3>
              <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">ADVANCED AI CORE</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
               <Cpu className={`w-4 h-4 ${isPlaying ? 'text-amber-500 animate-pulse' : 'text-zinc-800'}`} />
               <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] font-mono">
                 {isSolo7C ? '7-STRING PRIORITY ACTIVE' : isKaraokeMode ? 'VOCAL SILENCING ENGINE ON' : 'MULTI-STEM SOURCE ANALYZER'}
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleKaraokeMode}
            className={`group flex items-center gap-3 px-6 py-4 rounded-3xl border transition-all text-xs font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 ${isKaraokeMode ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-600/30' : 'bg-black/60 border-white/10 text-zinc-500 hover:text-emerald-500'}`}
          >
             {isKaraokeMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
             {isKaraokeMode ? 'VOCALS MUTED' : 'KARAOKE MODE'}
          </button>

          <button 
            onClick={toggleSolo7C}
            className={`group flex items-center gap-3 px-6 py-4 rounded-3xl border transition-all text-xs font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 ${isSolo7C ? 'bg-amber-600 border-amber-400 text-white shadow-amber-600/30' : 'bg-black/60 border-white/10 text-zinc-500 hover:text-amber-500'}`}
          >
             {isSolo7C ? <SoloIcon className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
             {isSolo7C ? 'BANDA LIBERADA' : 'SOLO 7 CORDAS'}
          </button>
        </div>
      </div>

      {!file ? (
        <div className="h-72 border-2 border-dashed border-zinc-800 rounded-[3rem] flex flex-col items-center justify-center p-12 cursor-pointer hover:bg-amber-600/5 transition-all group relative overflow-hidden" onClick={() => document.getElementById('audio-load-studio')?.click()}>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
          <FileAudio className="w-20 h-20 text-zinc-800 mb-6 group-hover:scale-110 group-hover:text-amber-600/40 transition-all duration-500" />
          <div className="text-center space-y-2">
            <p className="font-black text-zinc-500 text-lg uppercase tracking-[0.3em]">INJETAR ÁUDIO MASTER</p>
            <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">PROCESSAMENTO NEURAL DE ALTA FIDELIDADE (48KHZ/24BIT)</p>
          </div>
          <input type="file" id="audio-load-studio" className="hidden" accept="audio/*" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="flex flex-col gap-8 relative z-10 animate-in fade-in duration-700">
          <div className={`h-48 bg-[#050505] rounded-[3rem] border transition-all duration-1000 relative flex items-center justify-center overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.8)] ${isSolo7C ? 'border-amber-500/40' : isKaraokeMode ? 'border-emerald-500/40' : 'border-white/5'}`}>
             <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" width={1200} height={240} />
             
             {isProcessing ? (
               <div className="flex flex-col items-center gap-5">
                 <Loader2 className="w-16 h-16 text-amber-500 animate-spin" />
                 <div className="text-center">
                    <span className="text-lg font-black uppercase tracking-[0.5em] text-amber-500 italic block animate-pulse">{processingState}</span>
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2 block">POWERED BY GEMINI MULTIMODAL CORE</span>
                 </div>
               </div>
             ) : (
               <button 
                onClick={togglePlay} 
                className={`w-28 h-28 rounded-full shadow-[0_0_60px_rgba(245,158,11,0.2)] active:scale-90 hover:scale-110 transition-all flex items-center justify-center border-4 ${isPlaying ? 'bg-zinc-900 border-zinc-700 shadow-emerald-500/10' : 'bg-amber-600 border-amber-500 shadow-amber-500/40'}`}
               >
                 {isPlaying ? <Pause className="w-12 h-12 text-white fill-current" /> : <Play className="w-12 h-12 text-white fill-current ml-2" />}
               </button>
             )}

             <div className="absolute bottom-6 left-10 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-900 shadow-inner'}`} />
                <span className="text-[10px] font-mono font-black text-zinc-600 tracking-[0.4em] uppercase">NEURAL ENGINE TELEMETRY</span>
             </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
            {stems.map((stem) => (
              <div key={stem.id} className={`bg-[#0d0d0d] p-6 rounded-[2.5rem] border transition-all duration-700 flex flex-col items-center gap-6 relative shadow-2xl ${stem.isMuted ? 'border-red-950/20 opacity-30 grayscale' : 'border-white/5'} ${stem.level > 110 ? 'border-amber-500/30' : ''}`}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-4 rounded-3xl bg-zinc-900/50 ${stem.isMuted ? 'text-zinc-800' : stem.color} transition-colors border border-white/5`}>
                    <stem.icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.25em] transition-colors text-center ${stem.isMuted ? 'text-zinc-800' : 'text-zinc-500'}`}>{stem.name}</span>
                </div>
                
                <div className="w-full bg-black/80 rounded-3xl p-4 border border-white/5 flex items-center gap-5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                   <SegmentedMeter level={stem.level} color={stem.color} isMuted={stem.isMuted} />
                   
                   <div className="flex-1 flex flex-col items-center gap-6">
                      <div className="text-center">
                        <span className={`text-2xl font-black italic font-mono transition-all block ${stem.isMuted ? 'text-zinc-900' : stem.level > 120 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'text-amber-500'}`}>
                          {stem.level.toString().padStart(3, '0')}
                        </span>
                        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-tighter">GAIN %</span>
                      </div>
                      
                      <div className="flex flex-col gap-3 w-full">
                        <button 
                          disabled={(isSolo7C && stem.id !== 'guitar') || (isKaraokeMode && stem.id === 'vocals')}
                          onClick={() => setLevel(stem.id, stem.level + 10)}
                          className="w-full h-10 bg-zinc-900/50 hover:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 hover:text-amber-500 active:scale-90 transition-all disabled:opacity-0 shadow-inner"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        <button 
                          disabled={(isSolo7C && stem.id !== 'guitar') || (isKaraokeMode && stem.id === 'vocals')}
                          onClick={() => setLevel(stem.id, stem.level - 10)}
                          className="w-full h-10 bg-zinc-900/50 hover:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 hover:text-amber-500 active:scale-90 transition-all disabled:opacity-0 shadow-inner"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                </div>
                
                {stem.isMuted && (
                   <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-[2.5rem] flex items-center justify-center pointer-events-none border border-red-950/20">
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 bg-red-950/20 rounded-full">
                          <VolumeX className="w-5 h-5 text-red-900" />
                        </div>
                        <span className="text-[10px] font-black text-red-900 uppercase tracking-[0.4em] border border-red-950/40 px-4 py-2 bg-black/80 rounded-full shadow-2xl">
                          {stem.id === 'vocals' && isKaraokeMode ? 'VOCAL MUTED' : 'SILENCED'}
                        </span>
                      </div>
                   </div>
                )}
              </div>
            ))}
          </div>

          {aiReport && (
            <div className="bg-amber-600/5 border border-amber-500/10 p-6 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-1000">
               <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-500">Relatório do Motor Neural</h4>
               </div>
               <p className="text-[11px] font-mono leading-relaxed text-zinc-400 italic">
                 {aiReport}
               </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => { setFile(null); setIsProcessing(false); setStems(INITIAL_STEMS); setAiReport(null); }}
                className="flex items-center gap-3 px-8 py-4 bg-zinc-900/50 hover:bg-red-950/20 border border-white/5 rounded-3xl text-[10px] font-black uppercase text-zinc-600 hover:text-red-500 transition-all tracking-[0.3em] active:scale-95"
              >
                <RotateCcw className="w-4 h-4" /> EJECT TRACK
              </button>
              
              <div className="h-10 w-[1px] bg-zinc-800 hidden sm:block"></div>
              
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-500/40" />
                <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest max-w-[200px]">
                  REBALANCED INSTRUMENTAL MIDS & 7-STRING BORDÕES PRESERVATION
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <button className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 text-zinc-600 hover:text-white transition-all shadow-xl active:scale-90">
                 <Download className="w-5 h-5" />
               </button>
               <button className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 text-zinc-600 hover:text-white transition-all shadow-xl active:scale-90">
                 <Share2 className="w-5 h-5" />
               </button>
               <div className="pl-4">
                  <span className="text-[10px] font-mono font-black text-zinc-800 tracking-widest">MASTER: 24BIT/48KHZ STEREO</span>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-900'}`} />
          <span className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.4em]">AI ENGINE CORE v4.8 ONLINE</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-black text-amber-900/30 uppercase tracking-[0.6em] italic">SOURCE SEPARATION MASTERING</span>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default StemStudio;
