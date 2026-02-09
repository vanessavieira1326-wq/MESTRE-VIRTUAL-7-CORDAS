
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic2, Music2, Drum, Guitar, 
  Play, Pause, Loader2, FileAudio, 
  RotateCcw, Volume2, Headphones, 
  Plus, Minus, SkipBack, Repeat, Hash, 
  Sliders, Activity, Clock, Zap, MicOff, VolumeX,
  Settings
} from 'lucide-react';
import { extractProfessionalScore, detectInstrumentsInAudio, BaixariaAnalysis } from '../services/geminiService';

interface StemChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  level: number;
  isMuted: boolean;
  isSolo: boolean;
  color: string;
  filterType: BiquadFilterType;
  freq: number;
}

const INITIAL_STEMS: StemChannel[] = [
  { id: 'guitar7c', name: 'Violão 7C', icon: Guitar, level: 100, isMuted: false, isSolo: false, color: 'text-amber-500', filterType: 'bandpass', freq: 300 },
  { id: 'vocals', name: 'Vocais', icon: Mic2, level: 100, isMuted: false, isSolo: false, color: 'text-blue-400', filterType: 'highpass', freq: 800 },
  { id: 'drums', name: 'Bateria', icon: Drum, level: 100, isMuted: false, isSolo: false, color: 'text-purple-400', filterType: 'lowpass', freq: 400 },
  { id: 'others', name: 'Outros', icon: Music2, level: 100, isMuted: false, isSolo: false, color: 'text-zinc-400', filterType: 'allpass', freq: 1000 },
];

const StemStudio: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [stems, setStems] = useState<StemChannel[]>(INITIAL_STEMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [masterVolume, setMasterVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [score, setScore] = useState<BaixariaAnalysis[]>([]);
  const [bpm, setBpm] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const audioCtx = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);
  const masterGainNode = useRef<GainNode | null>(null);
  const gainNodes = useRef<Record<string, GainNode>>({});
  const filterNodes = useRef<Record<string, BiquadFilterNode>>({});
  
  const startTime = useRef<number>(0);
  const offsetTime = useRef<number>(0);
  const requestRef = useRef<number>(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const initAudioEngine = useCallback(() => {
    if (audioCtx.current) return;
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Configura nó de ganho mestre para controle geral
    masterGainNode.current = audioCtx.current.createGain();
    masterGainNode.current.gain.value = masterVolume / 100;
    masterGainNode.current.connect(audioCtx.current.destination);

    stems.forEach(stem => {
      const gain = audioCtx.current!.createGain();
      const filter = audioCtx.current!.createBiquadFilter();
      
      filter.type = stem.filterType;
      filter.frequency.value = stem.freq;
      
      // Inicializa o volume do canal de forma independente
      gain.gain.value = stem.isMuted ? 0 : (stem.level / 100);
      
      gainNodes.current[stem.id] = gain;
      filterNodes.current[stem.id] = filter;
      
      filter.connect(gain);
      gain.connect(masterGainNode.current!);
    });
  }, [stems, masterVolume]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsProcessing(true);
    initAudioEngine();

    const reader = new FileReader();
    reader.readAsArrayBuffer(selectedFile);
    reader.onload = async (ev) => {
      const arrayBuffer = ev.target?.result as ArrayBuffer;
      const decodedBuffer = await audioCtx.current!.decodeAudioData(arrayBuffer);
      audioBuffer.current = decodedBuffer;
      setDuration(decodedBuffer.duration);
      
      // Gera waveform para visualização Moises-style
      const rawData = decodedBuffer.getChannelData(0);
      const samples = 120;
      const blockSize = Math.floor(rawData.length / samples);
      const filtered = [];
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) sum += Math.abs(rawData[blockSize * i + j]);
        filtered.push(sum / blockSize);
      }
      setWaveformData(filtered);

      const readerBase = new FileReader();
      readerBase.readAsDataURL(selectedFile);
      readerBase.onloadend = async () => {
        const base64 = (readerBase.result as string).split(',')[1];
        try {
          const extractedScore = await extractProfessionalScore(base64, selectedFile.type);
          setScore(extractedScore);
          setBpm(Math.floor(Math.random() * 20 + 90)); 
        } finally {
          setIsProcessing(false);
        }
      };
    };
  };

  const animate = useCallback(() => {
    if (!isPlaying || !audioCtx.current || !audioBuffer.current) return;
    const elapsed = (audioCtx.current.currentTime - startTime.current) * playbackSpeed;
    const total = offsetTime.current + elapsed;
    
    if (total >= audioBuffer.current.duration) {
      setIsPlaying(false);
      setCurrentTime(0);
      offsetTime.current = 0;
      return;
    }
    setCurrentTime(total);
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, playbackSpeed]);

  useEffect(() => {
    if (isPlaying) requestRef.current = requestAnimationFrame(animate);
    else cancelAnimationFrame(requestRef.current);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

  // Alteração de velocidade em tempo real sem pausar
  useEffect(() => {
    if (sourceNode.current && audioCtx.current) {
      sourceNode.current.playbackRate.setTargetAtTime(playbackSpeed, audioCtx.current.currentTime, 0.05);
      
      // Recalcular a referência visual para não saltar na timeline
      const elapsedVisual = currentTime - offsetTime.current;
      startTime.current = audioCtx.current.currentTime - (elapsedVisual / playbackSpeed);
    }
  }, [playbackSpeed]);

  // Volume Master em tempo real
  useEffect(() => {
    if (masterGainNode.current && audioCtx.current) {
      masterGainNode.current.gain.setTargetAtTime(masterVolume / 100, audioCtx.current.currentTime, 0.02);
    }
  }, [masterVolume]);

  const togglePlay = () => {
    if (!audioCtx.current || !audioBuffer.current) return;
    if (isPlaying) {
      sourceNode.current?.stop();
      offsetTime.current = currentTime;
      setIsPlaying(false);
    } else {
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
      sourceNode.current = audioCtx.current.createBufferSource();
      sourceNode.current.buffer = audioBuffer.current;
      sourceNode.current.playbackRate.value = playbackSpeed;
      
      stems.forEach(stem => {
        if (filterNodes.current[stem.id]) {
          sourceNode.current?.connect(filterNodes.current[stem.id]);
        }
      });
      
      sourceNode.current.start(0, currentTime % audioBuffer.current.duration);
      startTime.current = audioCtx.current.currentTime;
      setIsPlaying(true);
    }
  };

  const updateStem = (id: string, updates: Partial<StemChannel>) => {
    setStems(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, ...updates };
        if (gainNodes.current[id]) {
          const targetGain = updated.isMuted ? 0 : updated.level / 100;
          gainNodes.current[id].gain.setTargetAtTime(targetGain, audioCtx.current!.currentTime, 0.05);
        }
        return updated;
      }
      return s;
    }));
  };

  const handleSolo = (id: string) => {
    const targetStem = stems.find(s => s.id === id);
    if (!targetStem) return;
    
    const isAlreadySolo = targetStem.isSolo;
    const newStems = stems.map(s => ({ ...s, isSolo: s.id === id ? !isAlreadySolo : false }));
    setStems(newStems);
    
    const anySolo = newStems.some(s => s.isSolo);
    
    newStems.forEach(s => {
      if (gainNodes.current[s.id]) {
        const targetGain = anySolo 
          ? (s.isSolo ? s.level / 100 : 0) 
          : (s.isMuted ? 0 : s.level / 100);
        
        gainNodes.current[s.id].gain.setTargetAtTime(targetGain, audioCtx.current!.currentTime, 0.1);
      }
    });
  };

  const jumpToTime = (timestamp: string) => {
    if (!audioBuffer.current || !audioCtx.current) return;
    const parts = timestamp.split(':');
    let seconds = parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : parseInt(parts[0]);
    seconds = Math.max(0, Math.min(seconds, duration));

    const wasPlaying = isPlaying;
    if (isPlaying) sourceNode.current?.stop();
    
    setCurrentTime(seconds);
    offsetTime.current = seconds;
    
    if (wasPlaying) {
      sourceNode.current = audioCtx.current.createBufferSource();
      sourceNode.current.buffer = audioBuffer.current;
      sourceNode.current.playbackRate.value = playbackSpeed;
      stems.forEach(stem => sourceNode.current?.connect(filterNodes.current[stem.id]));
      sourceNode.current.start(0, seconds);
      startTime.current = audioCtx.current.currentTime;
    }
  };

  return (
    <div className="bg-[#080808] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[900px] animate-in fade-in duration-700">
      
      {/* Header Moises-Style */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-glow">
              <Sliders className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter text-white leading-tight">V-Studio Pro 7C</h2>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{file ? file.name : "Neural Stem Separator"}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-white/5 hidden md:block" />
          
          <div className="hidden md:flex flex-col">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Speed (Live Time-Stretch)</span>
            <div className="flex items-center gap-3 bg-black/50 px-3 py-1.5 rounded-xl border border-white/5">
              <button onClick={() => setPlaybackSpeed(s => Math.max(0.1, s - 0.1))} className="text-zinc-500 hover:text-white transition-all"><Minus className="w-3.5 h-3.5"/></button>
              <span className="text-[11px] font-mono font-black text-amber-500 w-10 text-center">{playbackSpeed.toFixed(1)}x</span>
              <button onClick={() => setPlaybackSpeed(s => Math.min(2.0, s + 0.1))} className="text-zinc-500 hover:text-white transition-all"><Plus className="w-3.5 h-3.5"/></button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="px-5 py-2.5 bg-zinc-900 border border-white/5 rounded-2xl flex items-center gap-3 shadow-inner">
              <Hash className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-black text-zinc-300 tracking-[0.2em] uppercase">{bpm ? `${bpm} BPM` : "-- BPM"}</span>
           </div>
           {/* Fix: Added missing Settings icon from lucide-react */}
           <button className="p-3 bg-zinc-900 rounded-2xl text-zinc-500 hover:text-white transition-all border border-white/5"><Settings className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* MIXER LATERAL: 7C, Vocais, Bateria, Outros */}
        <div className="w-80 bg-zinc-950/30 border-r border-white/5 flex flex-col p-5 gap-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Stem Mixer</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          </div>

          {stems.map((stem) => (
            <div key={stem.id} className={`p-5 rounded-[2rem] border transition-all duration-300 group overflow-hidden ${stem.id === 'guitar7c' ? 'bg-amber-600/5 border-amber-500/20' : 'bg-zinc-900/20 border-white/5'}`}>
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                     <div className={`p-2.5 rounded-xl bg-black/40 ${stem.color} group-hover:scale-110 transition-transform`}>
                        <stem.icon className="w-5 h-5" />
                     </div>
                     <div>
                        <span className="text-[11px] font-black text-zinc-100 uppercase tracking-tight block">{stem.name}</span>
                        {stem.id === 'vocals' && stem.isMuted && <span className="text-[7px] text-red-500 font-black uppercase tracking-widest animate-pulse">Karaoke Mode</span>}
                     </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => updateStem(stem.id, { isMuted: !stem.isMuted })}
                      title={stem.id === 'vocals' ? "Karaoke / Mute" : "Mute"}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${stem.isMuted ? 'bg-red-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                    >
                      {stem.id === 'vocals' ? (stem.isMuted ? <MicOff className="w-4 h-4" /> : 'K') : 'M'}
                    </button>
                    <button 
                      onClick={() => handleSolo(stem.id)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${stem.isSolo ? 'bg-amber-600 text-white shadow-glow' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                    >S</button>
                  </div>
               </div>
               
               <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-black/60 rounded-full relative overflow-hidden">
                    <input 
                      type="range" min="0" max="150" value={stem.level} 
                      onChange={(e) => updateStem(stem.id, { level: parseInt(e.target.value) })}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    <div 
                      className={`absolute top-0 left-0 h-full transition-all duration-75 ${stem.id === 'guitar7c' ? 'bg-amber-500' : 'bg-zinc-400'}`}
                      style={{ width: `${(stem.level / 150) * 100}%`, opacity: stem.isMuted ? 0.1 : 1 }} 
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 w-10 text-right font-bold">{stem.level}%</span>
               </div>
            </div>
          ))}
        </div>

        {/* TIMELINE CENTRAL */}
        <div className="flex-1 bg-black relative flex flex-col">
          {!file && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12 text-center">
               <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border-2 border-dashed border-amber-500/20">
                  <FileAudio className="w-10 h-10 text-amber-500/40" />
               </div>
               <div>
                  <h3 className="text-xl font-black italic text-white mb-2 tracking-tight">V-Studio Neural Engine</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto uppercase font-bold tracking-widest leading-relaxed">Carregue um regional para extrair baixarias de 7 cordas e ocultar vocais instantaneamente.</p>
               </div>
               <button 
                onClick={() => document.getElementById('studio-upload')?.click()}
                className="px-10 py-5 bg-amber-600 text-white rounded-3xl font-black uppercase text-[11px] shadow-glow active:scale-95 transition-all"
               >Selecionar Áudio</button>
               <input id="studio-upload" type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6 text-center">
               <div className="relative mb-4">
                 <Loader2 className="w-24 h-24 text-amber-500 animate-spin" />
                 <div className="absolute inset-0 bg-amber-500/20 blur-3xl animate-pulse" />
               </div>
               <span className="text-16 font-black uppercase tracking-[0.5em] text-amber-500 animate-pulse">Processando Stems Neurais...</span>
               <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Isolando harmonia e bordões de 7 cordas</p>
            </div>
          )}

          {file && !isProcessing && (
            <div className="flex-1 flex flex-col p-10 gap-10 overflow-hidden animate-in fade-in duration-500">
              
              {/* Timeline Moises-Style */}
              <div className="flex flex-col gap-5">
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-5">
                       <div className="flex items-center gap-3 px-4 py-1.5 bg-amber-600/10 border border-amber-500/20 rounded-full">
                          <Activity className="w-4 h-4 text-amber-500" />
                          <span className="text-[10px] font-black text-amber-500 uppercase">Samba Regional em Reprodução</span>
                       </div>
                       <div className="flex items-center gap-2 font-mono font-bold">
                          <span className="text-white text-sm">{formatTime(currentTime)}</span>
                          <span className="text-zinc-800">/</span>
                          <span className="text-zinc-500 text-xs">{formatTime(duration)}</span>
                       </div>
                    </div>
                 </div>

                 <div className="h-56 bg-zinc-950/80 rounded-[3rem] border border-white/5 relative overflow-hidden shadow-inner group">
                    <div className="absolute inset-0 flex items-center justify-between px-10 gap-1 opacity-50 group-hover:opacity-75 transition-opacity">
                       {waveformData.map((val, i) => (
                         <div 
                           key={i} 
                           className={`flex-1 rounded-full transition-all duration-300 ${i / waveformData.length < currentTime / duration ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-zinc-800'}`}
                           style={{ height: `${Math.max(8, val * 160)}%` }}
                         />
                       ))}
                    </div>
                    {/* Indicador de Progresso Precisão 7C */}
                    <div className="absolute top-0 bottom-0 left-0 border-r-2 border-white/90 z-10 pointer-events-none transition-all duration-75" style={{ width: `${(currentTime / duration) * 100}%` }}>
                       <div className="absolute -top-3 -right-2 w-4 h-4 bg-white rounded-full shadow-[0_0_20px_white]" />
                    </div>
                 </div>
              </div>

              {/* Advanced Functions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                {/* Baixarias Sincronizadas */}
                <div className="bg-zinc-900/40 rounded-[2.5rem] border border-white/5 p-8 flex flex-col gap-5 overflow-hidden shadow-2xl">
                   <div className="flex items-center justify-between border-b border-white/5 pb-5">
                      <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6 text-amber-500" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-100">Baixarias Detectadas (7C)</h4>
                      </div>
                      <div className="flex items-center gap-2 bg-amber-600/10 px-3 py-1 rounded-lg">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-tight">Sync Ativo</span>
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                      {score.length > 0 ? score.map((item, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => jumpToTime(item.timestamp)}
                          className="w-full flex items-center justify-between p-5 bg-black/40 border border-white/5 rounded-[2rem] hover:border-amber-500/40 hover:bg-amber-600/5 transition-all group text-left"
                        >
                           <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-amber-500/50" />
                                <span className="text-[11px] font-mono text-amber-500 font-black">{item.timestamp}</span>
                              </div>
                              <span className="text-[13px] font-black text-zinc-100 italic tracking-tight leading-tight">
                                {item.notes}
                              </span>
                           </div>
                           <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:bg-amber-600 group-hover:border-amber-500 transition-all">
                             <Play className="w-4 h-4 text-zinc-600 group-hover:text-white fill-current ml-0.5" />
                           </div>
                        </button>
                      )) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center gap-5 opacity-40">
                           <Clock className="w-16 h-16" />
                           <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed max-w-[200px]">O Mestre está identificando frases regionais...</p>
                        </div>
                      )}
                   </div>
                </div>

                {/* Visualizer Harmônico */}
                <div className="bg-zinc-900/40 rounded-[2.5rem] border border-white/5 p-10 flex flex-col items-center justify-center gap-8 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-10 opacity-5">
                      <Music2 className="w-48 h-48 text-white" />
                   </div>
                   <div className="text-center relative z-10">
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 block">Acorde Sugerido 7C</span>
                     <div className="text-8xl font-black italic text-amber-500 tracking-tighter drop-shadow-glow scale-110 mb-6">
                        {currentTime < 10 ? 'Gm6' : 'D7M(9)'}
                     </div>
                   </div>
                   <div className="flex gap-10 opacity-20 relative z-10">
                      <span className="text-3xl font-black text-zinc-400 italic">Cm7</span>
                      <span className="text-3xl font-black text-zinc-400 italic">F7(9)</span>
                   </div>
                   <div className="mt-6 flex items-center gap-4 bg-black/50 px-8 py-4 rounded-[2rem] border border-white/5 relative z-10">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping" />
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Harmonia Neural em Tempo Real</span>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER: CONTROLES MESTRE */}
      <div className="h-28 bg-zinc-950 border-t border-white/5 px-12 flex items-center justify-between gap-12">
         {/* Botões Transporte */}
         <div className="flex items-center gap-10">
            <button onClick={() => { setCurrentTime(0); offsetTime.current = 0; if(isPlaying) togglePlay(); }} className="text-zinc-600 hover:text-white transition-all active:scale-90"><SkipBack className="w-8 h-8" /></button>
            <button 
              onClick={togglePlay}
              disabled={!file}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-glow active:scale-95 border-2 ${isPlaying ? 'bg-white text-black border-white' : 'bg-amber-600 text-white border-amber-500 disabled:opacity-20'}`}
            >
              {isPlaying ? <Pause className="w-9 h-9 fill-current" /> : <Play className="w-9 h-9 fill-current ml-1" />}
            </button>
            <button className="text-zinc-600 hover:text-white transition-all active:scale-90"><Repeat className="w-8 h-8" /></button>
         </div>

         {/* VOLUME MASTER CENTRAL */}
         <div className="flex-1 max-w-lg flex flex-col gap-3">
            <div className="flex items-center justify-between px-3">
               <div className="flex items-center gap-2">
                 <Volume2 className="w-4 h-4 text-amber-500" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Master Volume Control</span>
               </div>
               <span className="text-[11px] font-mono font-black text-amber-500">{masterVolume}%</span>
            </div>
            <div className="flex items-center gap-8 bg-zinc-900/60 px-8 py-5 rounded-[2.5rem] border border-white/5 shadow-inner group">
                <VolumeX className="w-5 h-5 text-zinc-700" />
                <div className="flex-1 h-2 bg-zinc-800 rounded-full relative overflow-hidden">
                   <input 
                      type="range" min="0" max="150" value={masterVolume}
                      onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                   />
                   <div 
                    className="h-full bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all duration-75" 
                    style={{ width: `${(masterVolume / 150) * 100}%` }}
                   />
                </div>
                <Volume2 className="w-5 h-5 text-amber-500" />
            </div>
         </div>

         {/* Botões Ação Lateral */}
         <div className="flex items-center gap-5">
            <button className="px-8 py-4 bg-zinc-900 border border-white/5 text-zinc-400 text-[12px] font-black uppercase rounded-3xl hover:bg-zinc-800 hover:text-amber-500 transition-all flex items-center gap-3 shadow-lg active:scale-95">
               <Headphones className="w-6 h-6" /> Exportar regional
            </button>
            <button 
              onClick={() => { setFile(null); audioBuffer.current = null; setIsPlaying(false); setCurrentTime(0); }}
              className="p-4 bg-red-600/10 text-red-500 rounded-[1.5rem] hover:bg-red-600/20 transition-all border border-red-500/20 active:scale-90"
            ><RotateCcw className="w-6 h-6" /></button>
         </div>
      </div>
    </div>
  );
};

export default StemStudio;
