import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic2, Music2, Drum, Guitar, 
  Play, Pause, SkipBack, 
  Plus, Minus, Activity, VolumeX, Waves,
  ChevronUp, ChevronDown, Search, Infinity, Mic, Sparkles, 
  Zap, Crown, Download, Piano, Clock, Layers,
  Sliders, Wand2, AudioLines, Speaker, Settings2
} from 'lucide-react';

interface StemFX {
  volume: number;
  bass: number;
  mid: number;
  treble: number;
  balance: number;
  isMuted: boolean;
}

interface StemChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  freqRange: { freq: number; Q: number; type: BiquadFilterType };
}

const STEM_CONFIGS: StemChannel[] = [
  { id: 'guitar7c', name: 'Violão 7C', icon: Guitar, color: 'text-amber-500', freqRange: { freq: 180, Q: 1.5, type: 'peaking' } },
  { id: 'vocal', name: 'Vocal', icon: Mic2, color: 'text-blue-400', freqRange: { freq: 1200, Q: 0.6, type: 'peaking' } },
  { id: 'bateria', name: 'Bateria', icon: Drum, color: 'text-emerald-400', freqRange: { freq: 6000, Q: 0.4, type: 'highshelf' } },
  { id: 'baixo', name: 'Baixo', icon: Music2, color: 'text-purple-400', freqRange: { freq: 80, Q: 1.2, type: 'lowshelf' } },
  { id: 'outros', name: 'Harmonia', icon: Piano, color: 'text-indigo-400', freqRange: { freq: 600, Q: 0.8, type: 'peaking' } },
];

const StemStudio: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [karaokeMode, setKaraokeMode] = useState(false);
  const [expandedStem, setExpandedStem] = useState<string | null>(null);

  // Estado de FX por Canal
  const [stemsFX, setStemsFX] = useState<Record<string, StemFX>>(
    STEM_CONFIGS.reduce((acc, stem) => ({
      ...acc,
      [stem.id]: { volume: stem.id === 'guitar7c' ? 100 : 50, bass: 0, mid: 0, treble: 0, balance: 0, isMuted: false }
    }), {})
  );

  const audioCtx = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);
  
  // Audio Nodes Map
  const stemFilters = useRef<Record<string, { bass: BiquadFilterNode; mid: BiquadFilterNode; treble: BiquadFilterNode; gain: GainNode; panner: StereoPannerNode; kill: BiquadFilterNode }>>({});
  const masterGain = useRef<GainNode | null>(null);

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
    const ctx = audioCtx.current;

    masterGain.current = ctx.createGain();
    masterGain.current.connect(ctx.destination);

    STEM_CONFIGS.forEach(stem => {
      const kill = ctx.createBiquadFilter();
      kill.type = stem.freqRange.type;
      kill.frequency.value = stem.freqRange.freq;
      kill.Q.value = stem.freqRange.Q;

      const bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 200;

      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;

      const treble = ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 3000;

      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();

      // Chain: Source -> Kill -> Bass -> Mid -> Treble -> Gain -> Panner -> Master
      kill.connect(bass);
      bass.connect(mid);
      mid.connect(treble);
      treble.connect(gain);
      gain.connect(panner);
      panner.connect(masterGain.current!);

      stemFilters.current[stem.id] = { kill, bass, mid, treble, gain, panner };
      
      // Aplicar valores iniciais
      const fx = stemsFX[stem.id];
      gain.gain.value = fx.isMuted ? 0 : (fx.volume / 100);
      panner.pan.value = fx.balance;
    });
  }, [stemsFX]);

  const updateFX = (id: string, key: keyof StemFX, value: any) => {
    setStemsFX(prev => {
      const newFX = { ...prev[id], [key]: value };
      
      if (audioCtx.current && stemFilters.current[id]) {
        const nodes = stemFilters.current[id];
        const ctx = audioCtx.current;

        switch(key) {
          case 'volume': 
          case 'isMuted':
            const targetGain = (newFX.isMuted || (id === 'vocal' && karaokeMode)) ? 0 : (newFX.volume / 100);
            nodes.gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1);
            // Se for vocal e volume 0, usamos o filtro de 'kill' para remoção total
            if (id === 'vocal') {
                const killGain = (newFX.volume === 0 || karaokeMode) ? -40 : 0;
                nodes.kill.gain.setTargetAtTime(killGain, ctx.currentTime, 0.1);
            }
            break;
          case 'bass': nodes.bass.gain.setTargetAtTime(value, ctx.currentTime, 0.1); break;
          case 'mid': nodes.mid.gain.setTargetAtTime(value, ctx.currentTime, 0.1); break;
          case 'treble': nodes.treble.gain.setTargetAtTime(value, ctx.currentTime, 0.1); break;
          case 'balance': nodes.panner.pan.setTargetAtTime(value, ctx.currentTime, 0.1); break;
        }
      }
      return { ...prev, [id]: newFX };
    });
  };

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
      
      // Conectar source a todos os canais de processamento
      STEM_CONFIGS.forEach(stem => {
        sourceNode.current?.connect(stemFilters.current[stem.id].kill);
      });
      
      sourceNode.current.start(0, currentTime);
      startTime.current = audioCtx.current.currentTime;
      setIsPlaying(true);
    }
  };

  const toggleKaraoke = () => {
    const newMode = !karaokeMode;
    setKaraokeMode(newMode);
    if (audioCtx.current && stemFilters.current['vocal']) {
      const ctx = audioCtx.current;
      const nodes = stemFilters.current['vocal'];
      const targetGain = newMode ? 0 : (stemsFX['vocal'].volume / 100);
      const killGain = newMode ? -40 : 0;
      nodes.gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.2);
      nodes.kill.gain.setTargetAtTime(killGain, ctx.currentTime, 0.2);
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
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.5em] mb-8 opacity-60 italic">Precision Regional Mix v4.0</p>
          <label className="group relative w-20 h-20 bg-amber-600 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] cursor-pointer hover:scale-110 active:scale-95 transition-all">
            <Plus className="w-10 h-10" />
            <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
          </label>
        </div>
      )}

      {isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center bg-black gap-8">
          <div className="relative">
             <div className="w-32 h-32 border-[4px] border-amber-500/5 border-t-amber-500 rounded-full animate-spin" />
             <Zap className="absolute inset-0 m-auto w-10 h-10 text-amber-500 animate-pulse" />
          </div>
          <h3 className="text-amber-500 text-xl font-black italic tracking-tight uppercase animate-pulse">Analizando Bordões...</h3>
        </div>
      )}

      {file && !isProcessing && (
        <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-700">
          
          <div className="p-6 bg-black/60 backdrop-blur-3xl border-b border-white/5 space-y-6 z-20">
            <div className="flex items-center justify-between">
              <button onClick={() => setFile(null)} className="p-3 bg-white/5 rounded-2xl text-zinc-500 hover:text-white transition-all"><SkipBack className="w-5 h-5" /></button>
              <div className="text-center">
                <h2 className="text-lg font-black italic truncate max-w-[200px] text-white tracking-tighter">{file.name}</h2>
              </div>
              <button className="p-3 bg-amber-600/10 rounded-2xl text-amber-500 border border-amber-500/20"><Crown className="w-5 h-5" /></button>
            </div>

            <div className="relative h-24 bg-black/40 rounded-[2rem] overflow-hidden border border-white/5 shadow-inner group">
              <div className="absolute inset-0 flex items-center justify-around px-6 gap-[2px] opacity-10">
                {waveformData.map((h, i) => (
                  <div key={i} className={`flex-1 rounded-full ${i/waveformData.length < currentTime/duration ? 'bg-amber-500' : 'bg-zinc-800'}`} style={{ height: `${Math.max(10, h * 150)}%` }} />
                ))}
              </div>
              <div className="absolute top-0 bottom-0 w-1 bg-amber-500 z-20 shadow-glow" style={{ left: `${(currentTime / duration) * 100}%` }} />
              <div className="absolute top-2 right-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 z-30">
                 <span className="text-[10px] font-mono font-black text-white">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <div className="absolute inset-0 z-40 cursor-pointer" onClick={(e) => {
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

          <div className="flex-1 p-6 overflow-y-auto bg-[#08080a] pb-24 space-y-4">
            {STEM_CONFIGS.map((stem) => {
              const fx = stemsFX[stem.id];
              const isExpanded = expandedStem === stem.id;
              const isVocalMuted = stem.id === 'vocal' && (karaokeMode || fx.volume === 0 || fx.isMuted);

              return (
                <div key={stem.id} className={`p-4 rounded-[2rem] border transition-all duration-300 flex flex-col gap-4 ${isVocalMuted ? 'bg-red-600/5 border-red-500/20 opacity-60' : 'bg-zinc-900/40 border-white/5 shadow-2xl backdrop-blur-md'}`}>
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center transition-all ${isVocalMuted ? 'text-red-500' : stem.color}`}>
                       <stem.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-center px-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${stem.id === 'guitar7c' ? 'text-amber-500 shadow-glow' : 'text-zinc-400'}`}>{stem.name}</span>
                        <span className="text-[10px] font-mono font-black text-amber-500/40">{fx.volume}%</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={() => updateFX(stem.id, 'volume', Math.max(0, fx.volume - 5))} className="p-2 rounded-xl bg-black hover:bg-zinc-800 transition-colors"><Minus className="w-4 h-4" /></button>
                        <div className="flex-1 h-2 bg-black rounded-full p-0.5 border border-white/5">
                          <div className={`h-full rounded-full transition-all duration-300 ${stem.color.replace('text', 'bg')} shadow-glow`} style={{ width: `${fx.volume}%` }} />
                        </div>
                        <button onClick={() => updateFX(stem.id, 'volume', Math.min(100, fx.volume + 5))} className="p-2 rounded-xl bg-black hover:bg-zinc-800 transition-colors"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => updateFX(stem.id, 'isMuted', !fx.isMuted)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${fx.isMuted ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 text-zinc-700 border-white/10'}`}
                      >
                        <VolumeX className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setExpandedStem(isExpanded ? null : stem.id)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${isExpanded ? 'bg-amber-600 text-white shadow-glow' : 'bg-white/5 text-zinc-700 border-white/10'}`}
                      >
                        <Settings2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-black/60 rounded-3xl animate-in slide-in-from-top-4 duration-300 border border-white/5">
                        {/* EQ Controls */}
                        {[
                          { label: 'Grave', key: 'bass' as keyof StemFX, min: -15, max: 15 },
                          { label: 'Médio', key: 'mid' as keyof StemFX, min: -15, max: 15 },
                          { label: 'Agudo', key: 'treble' as keyof StemFX, min: -15, max: 15 },
                          { label: 'Balanço', key: 'balance' as keyof StemFX, min: -1, max: 1, step: 0.1 },
                        ].map(control => (
                          <div key={control.label} className="flex flex-col gap-2">
                            <div className="flex justify-between px-1">
                                <span className="text-[8px] font-black uppercase text-zinc-600">{control.label}</span>
                                <span className="text-[8px] font-mono text-amber-500">{(fx[control.key] as number).toFixed(control.key === 'balance' ? 1 : 0)}</span>
                            </div>
                            <input 
                              type="range" 
                              min={control.min} max={control.max} step={control.step || 1} 
                              value={fx[control.key] as number}
                              onChange={(e) => updateFX(stem.id, control.key, parseFloat(e.target.value))}
                              className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-amber-600"
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-8 pb-12 bg-[#0c0c0e]/95 backdrop-blur-3xl border-t border-white/5 flex flex-col gap-8 shadow-3xl z-30">
            <div className="flex items-center justify-around gap-8 max-w-2xl mx-auto w-full">
               <button onClick={toggleKaraoke} className={`p-6 rounded-[2rem] border transition-all active:scale-90 relative group ${karaokeMode ? 'bg-red-600 border-red-500 text-white shadow-glow' : 'bg-white/5 border-white/10 text-zinc-700 hover:text-white'}`}>
                  {karaokeMode ? <VolumeX className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                  <span className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black px-3 py-1 rounded text-[8px] font-black uppercase whitespace-nowrap border border-white/10">Modo Playback/Karaoke (Vocal Kill)</span>
               </button>
               
               <button onClick={togglePlay} className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-3xl active:scale-95 transition-all border-[10px] border-black">
                 {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
               </button>

               <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest text-center italic">Time-Stretch (BPM)</span>
                  <div className="flex items-center gap-4 bg-black p-3 rounded-3xl border border-white/10">
                    <button onClick={() => setPlaybackSpeed(prev => Math.max(0.5, prev - 0.1))} className="text-white"><Minus className="w-4 h-4" /></button>
                    <span className="text-sm font-mono font-black text-amber-500 w-8 text-center">{Math.round(playbackSpeed * 100)}%</span>
                    <button onClick={() => setPlaybackSpeed(prev => Math.min(2.0, prev + 0.1))} className="text-white"><Plus className="w-4 h-4" /></button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StemStudio;