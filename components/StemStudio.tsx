import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Mic2, Music2, Drum, Guitar, 
  Play, Pause, SkipBack, Repeat, 
  Plus, Minus, Activity, VolumeX, Waves,
  ChevronUp, ChevronDown, Search, Infinity, Mic, Sparkles, 
  Zap, Crown, Download, CheckCircle2, Piano, Clock, Layers,
  Sliders, Wand2, AudioLines, Speaker
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface StemChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  level: number;
  isMuted: boolean;
  color: string;
}

interface TrackMetadata {
  musica: string;
  artista: string;
  bpm: string;
  tom: string; 
  qualidade_estimada: string;
  query_cifra: string;
}

const INITIAL_STEMS: StemChannel[] = [
  { id: 'guitar7c', name: 'Violão 7C', icon: Guitar, level: 100, isMuted: false, color: 'text-amber-500' },
  { id: 'vocal', name: 'Vocal', icon: Mic2, level: 30, isMuted: false, color: 'text-blue-400' },
  { id: 'piano', name: 'Harmonia', icon: Piano, level: 40, isMuted: false, color: 'text-indigo-400' },
  { id: 'bateria', name: 'Rítmica', icon: Drum, level: 50, isMuted: false, color: 'text-emerald-400' },
  { id: 'baixo', name: 'Baixo', icon: Music2, level: 55, isMuted: false, color: 'text-purple-400' },
];

const StemStudio: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [stems, setStems] = useState<StemChannel[]>(INITIAL_STEMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [masterVolume, setMasterVolume] = useState(85);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [metadata, setMetadata] = useState<TrackMetadata | null>(null);
  const [showConsole, setShowConsole] = useState<'eq' | 'fx' | 'stems'>('stems');

  // Master Audio FX State
  const [bass, setBass] = useState(4); // Grave
  const [mid, setMid] = useState(2);   // Médio
  const [treble, setTreble] = useState(5); // Agudo
  const [balance, setBalance] = useState(0); // -1 (L) a 1 (R)
  const [distortion, setDistortion] = useState(0); // 0 a 100

  const audioCtx = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);
  
  // Audio Nodes Chain
  const masterGainNode = useRef<GainNode | null>(null);
  const pannerNode = useRef<StereoPannerNode | null>(null);
  const distNode = useRef<WaveShaperNode | null>(null);
  
  // EQ Nodes
  const bassFilter = useRef<BiquadFilterNode | null>(null);
  const midFilter = useRef<BiquadFilterNode | null>(null);
  const trebleFilter = useRef<BiquadFilterNode | null>(null);
  
  // Stem Isolators (Surgical Filters)
  const vocalKillNode = useRef<BiquadFilterNode | null>(null);
  const guitarBoostNode = useRef<BiquadFilterNode | null>(null);

  const startTime = useRef<number>(0);
  const offsetTime = useRef<number>(0);
  const requestRef = useRef<number>(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Função para criar curva de distorção
  const makeDistortionCurve = (amount: number) => {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  const initAudioEngine = useCallback(() => {
    if (audioCtx.current) return;
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx.current;

    // Create Chain
    masterGainNode.current = ctx.createGain();
    pannerNode.current = ctx.createStereoPanner();
    distNode.current = ctx.createWaveShaper();
    
    // EQ Filters
    bassFilter.current = ctx.createBiquadFilter();
    bassFilter.current.type = 'lowshelf';
    bassFilter.current.frequency.value = 200;

    midFilter.current = ctx.createBiquadFilter();
    midFilter.current.type = 'peaking';
    midFilter.current.frequency.value = 1000;
    midFilter.current.Q.value = 1;

    trebleFilter.current = ctx.createBiquadFilter();
    trebleFilter.current.type = 'highshelf';
    trebleFilter.current.frequency.value = 3000;

    // Surgical Nodes
    vocalKillNode.current = ctx.createBiquadFilter();
    vocalKillNode.current.type = 'peaking';
    vocalKillNode.current.frequency.value = 1200; // Centro da voz humana
    vocalKillNode.current.Q.value = 0.5; // Banda larga para pegar harmônicos da voz

    guitarBoostNode.current = ctx.createBiquadFilter();
    guitarBoostNode.current.type = 'peaking';
    guitarBoostNode.current.frequency.value = 180; // Bordão da 7ª corda
    guitarBoostNode.current.Q.value = 1.5;

    // Connect Chain
    // Source -> vocalKill -> guitarBoost -> dist -> bass -> mid -> treble -> panner -> masterGain -> dest
    vocalKillNode.current.connect(guitarBoostNode.current);
    guitarBoostNode.current.connect(distNode.current);
    distNode.current.connect(bassFilter.current);
    bassFilter.current.connect(midFilter.current);
    midFilter.current.connect(trebleFilter.current);
    trebleFilter.current.connect(pannerNode.current);
    pannerNode.current.connect(masterGainNode.current);
    masterGainNode.current.connect(ctx.destination);

    // Set Initial Values
    masterGainNode.current.gain.value = masterVolume / 100;
    pannerNode.current.pan.value = balance;
    bassFilter.current.gain.value = bass;
    midFilter.current.gain.value = mid;
    trebleFilter.current.gain.value = treble;
  }, [masterVolume, balance, bass, mid, treble]);

  // Effect Syncs
  useEffect(() => {
    if (masterGainNode.current && audioCtx.current) {
      masterGainNode.current.gain.setTargetAtTime(masterVolume / 100, audioCtx.current.currentTime, 0.05);
    }
  }, [masterVolume]);

  useEffect(() => {
    if (pannerNode.current && audioCtx.current) {
      pannerNode.current.pan.setTargetAtTime(balance, audioCtx.current.currentTime, 0.1);
    }
  }, [balance]);

  useEffect(() => {
    if (distNode.current && audioCtx.current) {
      distNode.current.curve = distortion > 0 ? makeDistortionCurve(distortion) : null;
    }
  }, [distortion]);

  useEffect(() => {
    if (bassFilter.current && audioCtx.current) bassFilter.current.gain.setTargetAtTime(bass, audioCtx.current.currentTime, 0.1);
    if (midFilter.current && audioCtx.current) midFilter.current.gain.setTargetAtTime(mid, audioCtx.current.currentTime, 0.1);
    if (trebleFilter.current && audioCtx.current) trebleFilter.current.gain.setTargetAtTime(treble, audioCtx.current.currentTime, 0.1);
  }, [bass, mid, treble]);

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
      
      // Conectar no início da cadeia
      if (vocalKillNode.current) sourceNode.current.connect(vocalKillNode.current);
      
      sourceNode.current.start(0, currentTime);
      startTime.current = audioCtx.current.currentTime;
      setIsPlaying(true);
    }
  };

  const updateStemLevel = (id: string, delta: number) => {
    setStems(prev => prev.map(s => {
      if (s.id === id) {
        const newLevel = Math.min(100, Math.max(0, s.level + delta));
        
        if (audioCtx.current) {
          if (id === 'vocal') {
            // SILENCIAMENTO TOTAL: Se vocal estiver em 0 ou Karaoke, aplicamos um notch filter agressivo
            const shouldKill = newLevel === 0 || karaokeMode;
            vocalKillNode.current!.gain.setTargetAtTime(shouldKill ? -40 : (newLevel - 50) / 2, audioCtx.current.currentTime, 0.1);
          } else if (id === 'guitar7c') {
            // PRECISION BOOST: Aumenta o ganho específico dos bordões
            guitarBoostNode.current!.gain.setTargetAtTime((newLevel - 50) / 2, audioCtx.current.currentTime, 0.1);
          }
        }
        
        return { ...s, level: newLevel };
      }
      return s;
    }));
  };

  const toggleKaraoke = () => {
    const newMode = !karaokeMode;
    setKaraokeMode(newMode);
    if (audioCtx.current && vocalKillNode.current) {
      vocalKillNode.current.gain.setTargetAtTime(newMode ? -40 : -2, audioCtx.current.currentTime, 0.2);
    }
  };

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
      try {
        const decodedBuffer = await audioCtx.current!.decodeAudioData(arrayBuffer);
        audioBuffer.current = decodedBuffer;
        setDuration(decodedBuffer.duration);
        
        // waveform simple analysis
        const rawData = decodedBuffer.getChannelData(0);
        const samples = 100;
        const blockSize = Math.floor(rawData.length / samples);
        const filtered = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) sum += Math.abs(rawData[blockSize * i + j]);
          filtered.push(sum / blockSize);
        }
        setWaveformData(filtered);
        setIsProcessing(false);
      } catch (err) {
        setIsProcessing(false);
      }
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

  return (
    <div className="bg-[#050505] h-full flex flex-col relative overflow-hidden text-zinc-100 rounded-[3rem] border border-white/5 shadow-2xl">
      
      {!file && !isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#1a0f0a] to-black">
          <div className="relative mb-8 group">
            <div className="absolute -inset-16 bg-amber-600/10 rounded-full blur-[80px] animate-pulse" />
            <div className="w-28 h-28 bg-zinc-900/40 rounded-[2.5rem] flex items-center justify-center border border-white/5 relative z-10 shadow-3xl transform group-hover:rotate-12 transition-transform duration-500">
              <AudioLines className="w-14 h-14 text-amber-500/40" />
            </div>
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter mb-2 uppercase drop-shadow-glow">V-STUDIO 7C</h2>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.5em] mb-8 opacity-60 italic">Precision Audio Processing</p>
          <label className="group relative w-20 h-20 bg-amber-600 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] cursor-pointer hover:scale-110 active:scale-95 transition-all">
            <Plus className="w-10 h-10" />
            <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
            <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-widest text-amber-500">Importar MP3</div>
          </label>
        </div>
      )}

      {isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center bg-black gap-8">
          <div className="relative">
             <div className="w-32 h-32 border-[4px] border-amber-500/5 border-t-amber-500 rounded-full animate-spin" />
             <Zap className="absolute inset-0 m-auto w-10 h-10 text-amber-500 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-amber-500 text-xl font-black italic tracking-tight uppercase animate-pulse">Sintonizando Bordões...</h3>
            <p className="text-zinc-600 text-[8px] font-black uppercase tracking-[0.4em]">Neural Precision Analysis v4.0</p>
          </div>
        </div>
      )}

      {file && !isProcessing && (
        <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-700">
          
          {/* Header & Waveform */}
          <div className="p-6 bg-black/60 backdrop-blur-3xl border-b border-white/5 space-y-6 z-20">
            <div className="flex items-center justify-between">
              <button onClick={() => setFile(null)} className="p-3 bg-white/5 rounded-2xl text-zinc-500 hover:text-white transition-all"><SkipBack className="w-5 h-5" /></button>
              <div className="text-center">
                <h2 className="text-lg font-black italic truncate max-w-[200px] text-white tracking-tighter">{file.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                   <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                   <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest italic">Análise de Frequência Ativa</span>
                </div>
              </div>
              <button className="p-3 bg-amber-600/10 rounded-2xl text-amber-500 border border-amber-500/20"><Crown className="w-5 h-5" /></button>
            </div>

            <div className="relative h-24 bg-black/40 rounded-[2rem] overflow-hidden border border-white/5 shadow-inner group">
              <div className="absolute inset-0 flex items-center justify-around px-6 gap-[2px] opacity-10 group-hover:opacity-20 transition-opacity">
                {waveformData.map((h, i) => (
                  <div key={i} className={`flex-1 rounded-full ${i/waveformData.length < currentTime/duration ? 'bg-amber-500' : 'bg-zinc-800'}`} style={{ height: `${Math.max(10, h * 150)}%` }} />
                ))}
              </div>
              
              <div className="absolute top-2 right-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 flex items-center gap-2 z-30 shadow-xl">
                 <span className="text-[10px] font-mono font-black text-white tracking-tighter">{formatTime(currentTime)}</span>
                 <span className="text-zinc-700 font-mono text-[10px]">/</span>
                 <span className="text-zinc-500 font-mono text-[10px]">{formatTime(duration)}</span>
              </div>

              <div className="absolute top-0 bottom-0 w-1 bg-amber-500 z-20 shadow-[0_0_15px_rgba(245,158,11,0.8)]" style={{ left: `${(currentTime / duration) * 100}%` }} />
              
              <div 
                className="absolute inset-0 z-40 cursor-pointer" 
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const newTime = (x / rect.width) * duration;
                  setCurrentTime(newTime);
                  offsetTime.current = newTime;
                  if(isPlaying) { sourceNode.current?.stop(); togglePlay(); }
                }}
              />
            </div>
          </div>

          {/* Controller Tabs */}
          <div className="flex bg-zinc-950/40 p-1 mx-6 mt-4 rounded-2xl border border-white/5">
             {[
               { id: 'stems', label: 'Canais 7C', icon: Layers },
               { id: 'fx', label: 'Efeitos FX', icon: Wand2 },
               { id: 'eq', label: 'Equalizador', icon: Sliders }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setShowConsole(tab.id as any)}
                 className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${showConsole === tab.id ? 'bg-amber-600 text-white shadow-glow' : 'text-zinc-600 hover:text-zinc-400'}`}
               >
                 <tab.icon className="w-4 h-4" />
                 {tab.label}
               </button>
             ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#08080a] pb-24">
            
            {showConsole === 'stems' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {stems.map((stem) => (
                  <div key={stem.id} className={`p-4 rounded-[2rem] border transition-all duration-300 flex items-center gap-5 ${stem.isMuted || (stem.id === 'vocal' && karaokeMode) ? 'bg-zinc-950/40 border-white/5 opacity-40 grayscale' : 'bg-zinc-900/40 border-white/5 shadow-2xl backdrop-blur-md'}`}>
                    <div className={`w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center ${!stem.isMuted && stem.color}`}>
                       <stem.icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-center px-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${stem.id === 'guitar7c' ? 'text-amber-500' : 'text-zinc-400'}`}>{stem.name}</span>
                        <span className="text-[10px] font-mono font-black text-amber-500/40">{stem.level}%</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={() => updateStemLevel(stem.id, -5)} className="p-2 rounded-xl bg-black hover:bg-zinc-800 transition-colors"><Minus className="w-4 h-4" /></button>
                        <div className="flex-1 h-2 bg-black rounded-full p-0.5 border border-white/5">
                          <div className={`h-full rounded-full transition-all duration-300 ${stem.color.replace('text', 'bg')} shadow-glow`} style={{ width: `${stem.level}%` }} />
                        </div>
                        <button onClick={() => updateStemLevel(stem.id, 5)} className="p-2 rounded-xl bg-black hover:bg-zinc-800 transition-colors"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <button 
                      onClick={() => updateStemLevel(stem.id, stem.level > 0 ? -100 : 100)}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${stem.level === 0 || stem.isMuted ? 'bg-red-600/20 border-red-500 text-red-500' : 'bg-white/5 text-zinc-700 border-white/10'}`}
                    >
                      <VolumeX className="w-6 h-6" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showConsole === 'fx' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Balance / Pan */}
                  <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                           <h4 className="text-[11px] font-black uppercase tracking-widest">Balanço (L/R)</h4>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600 italic">Center Focus</span>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-zinc-700 uppercase">L</span>
                        <input 
                          type="range" min="-1" max="1" step="0.01" value={balance}
                          onChange={(e) => setBalance(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-black rounded-full appearance-none accent-amber-500"
                        />
                        <span className="text-[10px] font-black text-zinc-700 uppercase">R</span>
                     </div>
                  </div>

                  {/* Distortion */}
                  <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <Zap className="w-5 h-5 text-red-500" />
                           <h4 className="text-[11px] font-black uppercase tracking-widest">Distorção (Crunch)</h4>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600 italic">{distortion}%</span>
                     </div>
                     <input 
                        type="range" min="0" max="100" step="1" value={distortion}
                        onChange={(e) => setDistortion(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-black rounded-full appearance-none accent-red-600"
                     />
                  </div>
                </div>

                <div className="bg-amber-600/5 p-6 rounded-[2rem] border border-amber-500/20 flex items-start gap-4">
                   <Sparkles className="w-6 h-6 text-amber-500 shrink-0" />
                   <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1 italic">Dica Profissional</h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed italic">O V-Studio utiliza processamento cirúrgico de fase. Ao silenciar o vocal, o sistema foca 100% da energia nas frequências fundamentais dos bordões de 7 cordas.</p>
                   </div>
                </div>
              </div>
            )}

            {showConsole === 'eq' && (
              <div className="grid grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                {[
                  { label: 'GRAVES', val: bass, set: setBass, color: 'text-amber-500', desc: 'Profundidade 7C' },
                  { label: 'MÉDIOS', val: mid, set: setMid, color: 'text-indigo-400', desc: 'Corpo Harmônico' },
                  { label: 'AGUDOS', val: treble, set: setTreble, color: 'text-emerald-400', desc: 'Brilho Regional' }
                ].map(band => (
                  <div key={band.label} className="flex flex-col items-center gap-6 bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                    <button onClick={() => band.set(Math.min(20, band.val + 2))} className="p-3 bg-black hover:bg-zinc-800 rounded-xl transition-colors"><ChevronUp className="w-5 h-5" /></button>
                    <div className="h-48 w-2 bg-black rounded-full relative overflow-hidden p-0.5 border border-white/10">
                       <div className={`absolute bottom-0 left-0 right-0 ${band.color.replace('text', 'bg')} rounded-full transition-all duration-300 shadow-glow`} style={{ height: `${((band.val + 20) / 40) * 100}%` }} />
                    </div>
                    <button onClick={() => band.set(Math.max(-20, band.val - 2))} className="p-3 bg-black hover:bg-zinc-800 rounded-xl transition-colors"><ChevronDown className="w-5 h-5" /></button>
                    <div className="text-center">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${band.color}`}>{band.label}</span>
                       <div className="text-[8px] text-zinc-600 uppercase mt-1 tracking-tight">{band.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Master Playback Controls */}
          <div className="p-8 pb-12 bg-[#0c0c0e]/95 backdrop-blur-3xl border-t border-white/5 flex flex-col gap-8 shadow-3xl z-30">
            <div className="flex items-center justify-between gap-12 max-w-2xl mx-auto w-full">
              
               <div className="flex-1 flex flex-col gap-3">
                  <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em] text-center">BPM Sync</span>
                  <div className="flex items-center justify-center gap-6 bg-black p-3 rounded-3xl border border-white/10">
                    <button onClick={() => setPlaybackSpeed(prev => Math.max(0.5, prev - 0.1))} className="text-amber-500 hover:text-white transition-colors"><Minus className="w-5 h-5" /></button>
                    <span className="text-lg font-mono font-black text-amber-500">{(playbackSpeed * 100).toFixed(0)}%</span>
                    <button onClick={() => setPlaybackSpeed(prev => Math.min(2.0, prev + 0.1))} className="text-amber-500 hover:text-white transition-colors"><Plus className="w-5 h-5" /></button>
                  </div>
               </div>

               <button 
                 onClick={togglePlay}
                 className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.1)] active:scale-95 transition-all border-[10px] border-black group z-10"
               >
                 {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
               </button>

               <div className="flex-1 flex flex-col gap-3">
                  <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em] text-center">Volume Master</span>
                  <div className="flex items-center justify-center gap-6 bg-black p-3 rounded-3xl border border-white/10">
                    <button onClick={() => setMasterVolume(prev => Math.max(0, prev - 5))} className="text-white hover:text-amber-500 transition-colors"><Minus className="w-5 h-5" /></button>
                    <span className="text-lg font-mono font-black text-white">{masterVolume}%</span>
                    <button onClick={() => setMasterVolume(prev => Math.min(100, prev + 5))} className="text-white hover:text-amber-500 transition-colors"><Plus className="w-5 h-5" /></button>
                  </div>
               </div>
            </div>

            <div className="flex items-center justify-center gap-12">
               <button onClick={toggleKaraoke} className={`group relative p-5 rounded-[2rem] border transition-all active:scale-90 ${karaokeMode ? 'bg-red-600 border-red-500 text-white shadow-glow' : 'bg-white/5 border-white/10 text-zinc-700 hover:text-white'}`}>
                  {karaokeMode ? <VolumeX className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase text-zinc-600">Karaoke (Vocal Kill)</span>
               </button>
               
               <button className="p-5 bg-white/5 border border-white/10 text-zinc-700 hover:text-amber-500 rounded-[2rem] transition-all"><Infinity className="w-8 h-8" /></button>
               <button className="p-5 bg-white/5 border border-white/10 text-zinc-700 hover:text-emerald-500 rounded-[2rem] transition-all"><Download className="w-8 h-8" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Re-using Icon component from Lucide
const ArrowLeftRight = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left-right"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
);

export default StemStudio;