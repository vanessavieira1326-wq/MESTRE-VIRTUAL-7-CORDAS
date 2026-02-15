
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic2, Music2, Drum, Guitar, 
  Play, Pause, SkipBack, 
  Plus, Minus, Activity, VolumeX, Waves,
  ChevronUp, ChevronDown, Search, Infinity, Mic, Sparkles, 
  Zap, Crown, Download, Piano, Clock, Layers,
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
  const [showConsole, setShowConsole] = useState<'eq' | 'fx' | 'stems'>('stems');

  // Master Audio FX State
  const [bass, setBass] = useState(6); 
  const [mid, setMid] = useState(0);   
  const [treble, setTreble] = useState(4); 
  const [balance, setBalance] = useState(0); 
  const [distortion, setDistortion] = useState(0); 

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
  
  // Stem Isolators (Vocal Kill System)
  const vocalInverterNode = useRef<GainNode | null>(null); // For Phase Cancellation
  const splitterNode = useRef<ChannelSplitterNode | null>(null);
  const mergerNode = useRef<ChannelMergerNode | null>(null);
  const vocalNotchFilter = useRef<BiquadFilterNode | null>(null);
  const guitarBoostNode = useRef<BiquadFilterNode | null>(null);

  const startTime = useRef<number>(0);
  const offsetTime = useRef<number>(0);
  const requestRef = useRef<number>(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const makeDistortionCurve = (amount: number) => {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  const initAudioEngine = useCallback(() => {
    if (audioCtx.current) return;
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx.current;

    // Create Nodes
    masterGainNode.current = ctx.createGain();
    pannerNode.current = ctx.createStereoPanner();
    distNode.current = ctx.createWaveShaper();
    
    // Vocal Extraction/Removal Engine (Center Cut Phase Cancellation)
    splitterNode.current = ctx.createChannelSplitter(2);
    mergerNode.current = ctx.createChannelMerger(2);
    vocalInverterNode.current = ctx.createGain(); // Inverts Right to cancel Center
    vocalInverterNode.current.gain.value = karaokeMode ? -1 : 1;

    // Surgical EQ for Stems
    vocalNotchFilter.current = ctx.createBiquadFilter();
    vocalNotchFilter.current.type = 'peaking';
    vocalNotchFilter.current.frequency.value = 1200;
    vocalNotchFilter.current.Q.value = 0.6;

    guitarBoostNode.current = ctx.createBiquadFilter();
    guitarBoostNode.current.type = 'peaking';
    guitarBoostNode.current.frequency.value = 180;
    guitarBoostNode.current.Q.value = 1.2;

    // Standard EQ
    bassFilter.current = ctx.createBiquadFilter();
    bassFilter.current.type = 'lowshelf';
    bassFilter.current.frequency.value = 250;

    midFilter.current = ctx.createBiquadFilter();
    midFilter.current.type = 'peaking';
    midFilter.current.frequency.value = 1000;

    trebleFilter.current = ctx.createBiquadFilter();
    trebleFilter.current.type = 'highshelf';
    trebleFilter.current.frequency.value = 3000;

    // Connections Chain
    // Source -> Splitter -> Merger (Karaoke Logic) -> Filters -> FX -> Master
    // (Actual connection happens in togglePlay when source is created)
    
    // Static FX Chain
    vocalNotchFilter.current.connect(guitarBoostNode.current);
    guitarBoostNode.current.connect(distNode.current);
    distNode.current.connect(bassFilter.current);
    bassFilter.current.connect(midFilter.current);
    midFilter.current.connect(trebleFilter.current);
    trebleFilter.current.connect(pannerNode.current);
    pannerNode.current.connect(masterGainNode.current);
    masterGainNode.current.connect(ctx.destination);

    // Initial Values
    masterGainNode.current.gain.value = masterVolume / 100;
    pannerNode.current.pan.value = balance;
    bassFilter.current.gain.value = bass;
    midFilter.current.gain.value = mid;
    trebleFilter.current.gain.value = treble;
  }, [masterVolume, balance, bass, mid, treble, karaokeMode]);

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
      
      // Setup Vocal Kill Routing
      const ctx = audioCtx.current;
      const src = sourceNode.current;
      
      if (karaokeMode) {
        // Advanced Vocal Removal: Phase Inversion of Center Channel
        src.connect(splitterNode.current!);
        // Left goes directly
        splitterNode.current!.connect(mergerNode.current!, 0, 0);
        // Right is inverted and merged to both
        splitterNode.current!.connect(vocalInverterNode.current!, 1);
        vocalInverterNode.current!.connect(mergerNode.current!, 0, 0);
        vocalInverterNode.current!.connect(mergerNode.current!, 0, 1);
        
        mergerNode.current!.connect(vocalNotchFilter.current!);
      } else {
        src.connect(vocalNotchFilter.current!);
      }
      
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
            const isKill = newLevel === 0 || karaokeMode;
            vocalNotchFilter.current!.gain.setTargetAtTime(isKill ? -40 : (newLevel - 50) / 2, audioCtx.current.currentTime, 0.1);
          } else if (id === 'guitar7c') {
            // Precision 7C Boost: Enhance frequencies of 7-string bass lines
            guitarBoostNode.current!.gain.setTargetAtTime((newLevel - 50) / 1.5, audioCtx.current.currentTime, 0.1);
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
    
    // Stop and restart for re-routing phase cancellation
    if (isPlaying) {
      sourceNode.current?.stop();
      offsetTime.current = currentTime;
      setIsPlaying(false);
      setTimeout(() => togglePlay(), 50);
    }
    
    if (audioCtx.current && vocalNotchFilter.current) {
      vocalNotchFilter.current.gain.setTargetAtTime(newMode ? -40 : 0, audioCtx.current.currentTime, 0.1);
      if (vocalInverterNode.current) vocalInverterNode.current.gain.value = newMode ? -1 : 1;
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
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.5em] mb-8 opacity-60 italic">Precision Neural Audio Engine</p>
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
          <h3 className="text-amber-500 text-xl font-black italic tracking-tight uppercase animate-pulse">Extraindo 7C Bordões...</h3>
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

          {/* Controller Tabs */}
          <div className="flex bg-zinc-950/40 p-1 mx-6 mt-4 rounded-2xl border border-white/5">
             {[
               { id: 'stems', label: 'Canais', icon: Layers },
               { id: 'fx', label: 'Estúdio FX', icon: Wand2 },
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

          {/* Main Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#08080a] pb-24">
            
            {showConsole === 'stems' && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                {stems.map((stem) => (
                  <div key={stem.id} className={`p-4 rounded-[2rem] border transition-all duration-300 flex items-center gap-5 ${stem.id === 'vocal' && (karaokeMode || stem.level === 0) ? 'bg-red-600/10 border-red-500/20 opacity-60' : 'bg-zinc-900/40 border-white/5 shadow-2xl backdrop-blur-md'}`}>
                    <div className={`w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center ${stem.id === 'vocal' && (karaokeMode || stem.level === 0) ? 'text-red-500' : stem.color}`}>
                       <stem.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-center px-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${stem.id === 'guitar7c' ? 'text-amber-500 shadow-glow text-lg' : 'text-zinc-400'}`}>{stem.name}</span>
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
                  </div>
                ))}
              </div>
            )}

            {showConsole === 'fx' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5">
                   <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                      <Speaker className="w-4 h-4" /> Balanço & Panorâmica
                   </h4>
                   <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-zinc-700">L</span>
                      <input type="range" min="-1" max="1" step="0.01" value={balance} onChange={(e) => setBalance(parseFloat(e.target.value))} className="flex-1 h-1.5 bg-black rounded-full appearance-none accent-amber-500" />
                      <span className="text-xs font-black text-zinc-700">R</span>
                   </div>
                </div>
                <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5">
                   <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Distorção de Harmonia
                   </h4>
                   <input type="range" min="0" max="100" value={distortion} onChange={(e) => setDistortion(parseInt(e.target.value))} className="w-full h-1.5 bg-black rounded-full appearance-none accent-red-600" />
                </div>
              </div>
            )}

            {showConsole === 'eq' && (
              <div className="grid grid-cols-3 gap-6 animate-in zoom-in-95 duration-500">
                {[
                  { label: 'GRAVE', val: bass, set: setBass, color: 'text-amber-500' },
                  { label: 'MÉDIO', val: mid, set: setMid, color: 'text-indigo-400' },
                  { label: 'AGUDO', val: treble, set: setTreble, color: 'text-emerald-400' }
                ].map(band => (
                  <div key={band.label} className="flex flex-col items-center gap-4 bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5">
                    <button onClick={() => band.set(Math.min(20, band.val + 1))} className="p-3 bg-black hover:bg-zinc-800 rounded-xl transition-colors"><ChevronUp className="w-5 h-5" /></button>
                    <div className="h-48 w-2 bg-black rounded-full relative overflow-hidden">
                       <div className={`absolute bottom-0 left-0 right-0 ${band.color.replace('text', 'bg')} rounded-full transition-all duration-300 shadow-glow`} style={{ height: `${((band.val + 20) / 40) * 100}%` }} />
                    </div>
                    <button onClick={() => band.set(Math.max(-20, band.val - 1))} className="p-3 bg-black hover:bg-zinc-800 rounded-xl transition-colors"><ChevronDown className="w-5 h-5" /></button>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${band.color}`}>{band.label}</span>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Footer Controls */}
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
                  <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest text-center">Volume Master</span>
                  <div className="flex items-center gap-4 bg-black p-3 rounded-3xl border border-white/10">
                    <button onClick={() => setMasterVolume(prev => Math.max(0, prev - 5))} className="text-white"><Minus className="w-4 h-4" /></button>
                    <span className="text-sm font-mono font-black text-white w-8 text-center">{masterVolume}%</span>
                    <button onClick={() => setMasterVolume(prev => Math.min(100, prev + 5))} className="text-white"><Plus className="w-4 h-4" /></button>
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
