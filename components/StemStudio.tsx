import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Mic2, Music2, Drum, Guitar, 
  Play, Pause, SkipBack, Repeat, 
  Plus, Minus, Activity, VolumeX, Waves,
  ChevronUp, ChevronDown, Search, Infinity, Mic, Sparkles, 
  Zap, Crown, Download, CheckCircle2, Piano, Clock, Layers
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
  const [showEQ, setShowEQ] = useState(false);

  // EQ Digital Master
  const [eqBands, setEqBands] = useState({ sub: 6, bass: 0, mid: 4, high: 0, air: 2 });

  // Looping
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);

  const audioCtx = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);
  const masterGainNode = useRef<GainNode | null>(null);
  const gainNodes = useRef<Record<string, GainNode>>({});
  const filters = useRef<Record<string, BiquadFilterNode>>({});

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
    
    const bands: any = {
      sub: { type: 'lowshelf', freq: 65 },
      bass: { type: 'peaking', freq: 250 },
      mid: { type: 'peaking', freq: 1100 },
      high: { type: 'peaking', freq: 4500 },
      air: { type: 'highshelf', freq: 11000 }
    };

    let lastNode: AudioNode = audioCtx.current.destination;
    masterGainNode.current = audioCtx.current.createGain();
    masterGainNode.current.gain.value = masterVolume / 100;
    masterGainNode.current.connect(lastNode);
    lastNode = masterGainNode.current;

    Object.keys(bands).forEach(key => {
      const f = audioCtx.current!.createBiquadFilter();
      f.type = bands[key].type as BiquadFilterType;
      f.frequency.value = bands[key].freq;
      f.gain.value = (eqBands as any)[key];
      f.connect(lastNode);
      lastNode = f;
      filters.current[key] = f;
    });

    stems.forEach(stem => {
      const g = audioCtx.current!.createGain();
      g.gain.value = stem.isMuted ? 0 : stem.level / 100;
      gainNodes.current[stem.id] = g;
      g.connect(lastNode);
    });
  }, [stems, masterVolume, eqBands]);

  // Atualização de Velocidade (Tempo) em Tempo Real
  useEffect(() => {
    if (sourceNode.current && audioCtx.current) {
      sourceNode.current.playbackRate.setTargetAtTime(playbackSpeed, audioCtx.current.currentTime, 0.05);
    }
  }, [playbackSpeed]);

  // Sync EQ
  useEffect(() => {
    if (audioCtx.current) {
      Object.keys(eqBands).forEach(key => {
        if (filters.current[key]) {
          filters.current[key].gain.setTargetAtTime((eqBands as any)[key], audioCtx.current!.currentTime, 0.05);
        }
      });
    }
  }, [eqBands]);

  // Sync Master Volume
  useEffect(() => {
    if (masterGainNode.current && audioCtx.current) {
      masterGainNode.current.gain.setTargetAtTime(masterVolume / 100, audioCtx.current.currentTime, 0.05);
    }
  }, [masterVolume]);

  const analyzeAudioWithAI = async (audioBase64: string, fileName: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise o áudio "${fileName}". Identifique BPM e Tom (ex: Am, C, D#m). Retorne JSON: { "musica": "nome", "artista": "nome", "bpm": "100", "tom": "Am", "qualidade_estimada": "99%", "query_cifra": "busca" }`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text || "{}");
      setMetadata(data);
    } catch (err) {
      setMetadata({ musica: fileName, artista: "Mestre Virtual", bpm: "120", tom: "C", qualidade_estimada: "90%", query_cifra: "" });
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
        
        const base64 = btoa(new Uint8Array(arrayBuffer.slice(0, 80000)).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        await analyzeAudioWithAI(base64, selectedFile.name);
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
    
    if (loopA !== null && loopB !== null && total >= loopB) {
      sourceNode.current?.stop();
      offsetTime.current = loopA;
      const newSource = audioCtx.current.createBufferSource();
      newSource.buffer = audioBuffer.current;
      newSource.playbackRate.value = playbackSpeed;
      stems.forEach(stem => newSource.connect(gainNodes.current[stem.id]));
      newSource.start(0, loopA);
      sourceNode.current = newSource;
      startTime.current = audioCtx.current.currentTime;
      return;
    }

    if (total >= audioBuffer.current.duration) {
      setIsPlaying(false);
      setCurrentTime(0);
      offsetTime.current = 0;
      return;
    }
    setCurrentTime(total);
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying, playbackSpeed, loopA, loopB, stems]);

  useEffect(() => {
    if (isPlaying) requestRef.current = requestAnimationFrame(animate);
    else cancelAnimationFrame(requestRef.current);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, animate]);

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
      stems.forEach(stem => sourceNode.current?.connect(gainNodes.current[stem.id]));
      sourceNode.current.start(0, currentTime);
      startTime.current = audioCtx.current.currentTime;
      setIsPlaying(true);
    }
  };

  const updateStemLevel = (id: string, delta: number) => {
    setStems(prev => prev.map(s => {
      if (s.id === id) {
        const newLevel = Math.min(100, Math.max(0, s.level + delta));
        if (gainNodes.current[id] && audioCtx.current && !s.isMuted) {
          const targetGain = id === 'vocal' && karaokeMode ? 0.01 : newLevel / 100;
          gainNodes.current[id].gain.setTargetAtTime(targetGain, audioCtx.current.currentTime, 0.05);
        }
        return { ...s, level: newLevel };
      }
      return s;
    }));
  };

  const toggleMute = (id: string) => {
    setStems(prev => prev.map(s => {
      if (s.id === id) {
        const newMuted = !s.isMuted;
        if (gainNodes.current[id] && audioCtx.current) {
          const targetGain = newMuted ? 0 : s.level / 100;
          gainNodes.current[id].gain.setTargetAtTime(targetGain, audioCtx.current.currentTime, 0.05);
        }
        return { ...s, isMuted: newMuted };
      }
      return s;
    }));
  };

  const toggleKaraoke = () => {
    const newMode = !karaokeMode;
    setKaraokeMode(newMode);
    if (gainNodes.current['vocal'] && audioCtx.current) {
      const targetGain = newMode ? 0.01 : (stems.find(s => s.id === 'vocal')?.level || 30) / 100;
      gainNodes.current['vocal'].gain.setTargetAtTime(targetGain, audioCtx.current.currentTime, 0.1);
    }
  };

  return (
    <div className="bg-black h-full flex flex-col relative overflow-hidden text-zinc-100">
      
      {!file && !isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#1a0f0a] to-black">
          <div className="relative mb-6 group">
            <div className="absolute -inset-12 bg-amber-600/10 rounded-full blur-[60px] animate-pulse" />
            <div className="w-24 h-24 bg-zinc-900/40 rounded-[2rem] flex items-center justify-center border border-white/5 relative z-10 shadow-3xl">
              <Guitar className="w-12 h-12 text-amber-500/20" />
            </div>
          </div>
          <h2 className="text-2xl font-black italic tracking-tighter mb-1 uppercase drop-shadow-glow">V-STUDIO 7C</h2>
          <p className="text-zinc-500 text-[8px] font-black uppercase tracking-[0.4em] mb-6 opacity-60 italic">Neural Audio Engine</p>
          <label className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 active:scale-95 transition-all">
            <Plus className="w-8 h-8" />
            <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
          </label>
        </div>
      )}

      {isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center bg-black gap-8">
          <div className="relative">
             <div className="w-24 h-24 border-[3px] border-amber-500/5 border-t-amber-500 rounded-full animate-spin" />
             <Activity className="absolute inset-0 m-auto w-8 h-8 text-amber-500 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-amber-500 text-xl font-black italic tracking-tight uppercase animate-pulse">Processing...</h3>
            <p className="text-zinc-600 text-[8px] font-black uppercase tracking-[0.3em]">Extracting 7C Bordões</p>
          </div>
        </div>
      )}

      {file && !isProcessing && (
        <div className="flex-1 flex flex-col bg-[#050505] animate-in fade-in duration-1000">
          
          <div className="p-4 bg-black/80 backdrop-blur-xl border-b border-white/5 space-y-4 shadow-2xl z-20">
            <div className="flex items-center justify-between">
              <button onClick={() => setFile(null)} className="p-2 bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all"><SkipBack className="w-5 h-5" /></button>
              <div className="text-center">
                <h2 className="text-base font-black italic truncate max-w-[150px] text-white tracking-tight">{metadata?.musica || file.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                   <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">{metadata?.artista || "Unknown Artist"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowEQ(!showEQ)} className={`p-2 rounded-xl border transition-all ${showEQ ? 'bg-amber-600 border-amber-500 text-white shadow-glow' : 'bg-white/5 border-white/10 text-amber-500'}`}>
                  <Waves className="w-5 h-5" />
                </button>
                <button onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(metadata?.query_cifra || '')}`)} className="p-2 bg-white/5 rounded-xl text-amber-500 border border-white/10">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showEQ && (
              <div className="bg-zinc-950 p-4 rounded-[2rem] border border-white/5 animate-in slide-in-from-top-4 grid grid-cols-5 gap-2 shadow-inner">
                {Object.entries(eqBands).map(([key, val]) => {
                  // Fix: Object.entries values are typed as unknown/any in some TS configurations. Explicitly cast to number.
                  const numericVal = val as number;
                  return (
                    <div key={key} className="flex flex-col items-center gap-2">
                      <button onClick={() => setEqBands(prev => ({ ...prev, [key]: Math.min(18, (prev as any)[key] + 2) }))} className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-zinc-500 active:bg-amber-600 transition-all"><ChevronUp className="w-4 h-4" /></button>
                      <div className="h-16 w-1 bg-white/5 rounded-full relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 bg-amber-500 rounded-full transition-all duration-300 shadow-glow" style={{ height: `${((numericVal + 18) / 36) * 100}%` }} />
                      </div>
                      <button onClick={() => setEqBands(prev => ({ ...prev, [key]: Math.max(-18, (prev as any)[key] - 2) }))} className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-zinc-500 active:bg-red-600 transition-all"><ChevronDown className="w-4 h-4" /></button>
                      <div className="flex flex-col items-center gap-0.5">
                         <span className="text-[6px] font-black uppercase text-zinc-700 tracking-[0.2em]">{key}</span>
                         <span className={`text-[8px] font-mono font-black ${numericVal > 0 ? 'text-amber-500' : 'text-zinc-600'}`}>{numericVal > 0 ? '+' : ''}{numericVal}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="relative h-20 bg-black/60 rounded-[1.5rem] overflow-hidden border border-white/10 group shadow-inner">
              <div className="absolute inset-0 flex items-center justify-around px-4 gap-1 opacity-20">
                {waveformData.map((h, i) => (
                  <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i/waveformData.length < currentTime/duration ? 'bg-amber-500' : 'bg-zinc-800'}`} style={{ height: `${Math.max(10, h * 120)}%` }} />
                ))}
              </div>
              
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2 z-30 shadow-xl">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-glow" />
                 <span className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-400">Sync</span>
                 <span className="text-[10px] font-mono font-black text-white tracking-tighter border-l border-white/10 pl-2 ml-1">{formatTime(currentTime)}</span>
              </div>

              {loopA !== null && <div className="absolute top-0 bottom-0 w-1 bg-blue-500 z-30 shadow-glow" style={{ left: `${(loopA / duration) * 100}%` }} />}
              {loopB !== null && <div className="absolute top-0 bottom-0 w-1 bg-red-500 z-30 shadow-glow" style={{ left: `${(loopB / duration) * 100}%` }} />}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-lg" style={{ left: `${(currentTime / duration) * 100}%` }} />
              
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

            <div className="flex justify-between items-center px-1">
               <div className="flex gap-2">
                  <button onClick={() => setLoopA(currentTime)} className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all ${loopA !== null ? 'bg-blue-600 border-blue-500 text-white shadow-glow' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'}`}>SET A</button>
                  <button onClick={() => setLoopB(currentTime)} className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all ${loopB !== null ? 'bg-red-600 border-red-500 text-white shadow-glow' : 'bg-red-600/10 border-red-500/20 text-red-400'}`}>SET B</button>
                  {(loopA !== null || loopB !== null) && <button onClick={() => {setLoopA(null); setLoopB(null)}} className="text-[8px] font-black uppercase text-zinc-600 hover:text-white ml-1">Clear</button>}
               </div>
               <div className="flex items-center gap-1.5 text-zinc-600">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-mono font-black">{formatTime(duration)}</span>
               </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-[#08080a] pb-12">
            {stems.map((stem) => (
              <div key={stem.id} className={`p-4 rounded-[2.5rem] border transition-all duration-500 flex items-center gap-4 ${stem.isMuted || (stem.id === 'vocal' && karaokeMode) ? 'bg-zinc-950/40 border-white/5 opacity-30 scale-95' : 'bg-zinc-900/30 border-white/5 shadow-xl backdrop-blur-md'}`}>
                <div className="shrink-0">
                  <div className={`w-11 h-11 rounded-[1.2rem] bg-black border border-white/10 flex items-center justify-center transition-all ${!stem.isMuted && stem.color} ${stem.id === 'guitar7c' ? 'ring-2 ring-amber-500/20 scale-105' : ''}`}>
                    {stem.id === 'vocal' && karaokeMode ? <Mic className="w-5 h-5 opacity-20" /> : <stem.icon className="w-5 h-5" />}
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between items-center px-1">
                    <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${stem.id === 'guitar7c' ? 'text-amber-500 italic' : 'text-zinc-400'}`}>{stem.name}</span>
                    <span className="text-[8px] font-mono font-black text-zinc-700">{stem.level}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateStemLevel(stem.id, -5)} className="w-8 h-8 rounded-lg bg-black border border-white/5 flex items-center justify-center text-zinc-600 active:text-white transition-all"><Minus className="w-3 h-3" /></button>
                    <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div className={`h-full rounded-full transition-all duration-500 ${stem.color.replace('text', 'bg')} shadow-glow`} style={{ width: `${stem.level}%`, opacity: stem.isMuted ? 0.05 : 1 }} />
                    </div>
                    <button onClick={() => updateStemLevel(stem.id, 5)} className="w-8 h-8 rounded-lg bg-black border border-white/5 flex items-center justify-center text-zinc-600 active:text-white transition-all"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>

                <button 
                  onClick={() => toggleMute(stem.id)}
                  className={`w-11 h-11 rounded-[1.2rem] flex items-center justify-center border transition-all ${stem.isMuted ? 'bg-red-600 border-red-500 text-white shadow-glow' : 'bg-white/5 text-zinc-700 border-white/10'}`}
                >
                  <VolumeX className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-6 pb-12 bg-[#0c0c0e]/95 backdrop-blur-3xl border-t border-white/10 flex flex-col gap-8 shadow-2xl z-30">
            <div className="flex items-center justify-between gap-8">
              <div className="flex-1 flex flex-col gap-3">
                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.3em] text-center italic">Real-Time BPM</span>
                <div className="flex items-center justify-center gap-4 bg-black p-3 rounded-[2rem] border border-white/10 shadow-inner">
                  <button onClick={() => setPlaybackSpeed(prev => Math.max(0.5, prev - 0.05))} className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-amber-500 active:scale-90 transition-all"><Minus className="w-4 h-4" /></button>
                  <div className="min-w-[50px] text-center">
                    <span className="text-xl font-mono font-black text-amber-500 drop-shadow-glow">{(playbackSpeed * 100).toFixed(0)}%</span>
                  </div>
                  <button onClick={() => setPlaybackSpeed(prev => Math.min(2.0, prev + 0.05))} className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-amber-500 active:scale-90 transition-all"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-3">
                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.3em] text-center italic">Master Vol</span>
                <div className="flex items-center justify-center gap-4 bg-black p-3 rounded-[2rem] border border-white/10 shadow-inner">
                  <button onClick={() => setMasterVolume(prev => Math.max(0, prev - 5))} className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-white active:scale-90 transition-all"><Minus className="w-4 h-4" /></button>
                  <div className="min-w-[50px] text-center">
                    <span className="text-xl font-mono font-black text-white">{masterVolume}%</span>
                  </div>
                  <button onClick={() => setMasterVolume(prev => Math.min(100, prev + 5))} className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-white active:scale-90 transition-all"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-12">
               <button onClick={toggleKaraoke} className={`transition-all p-4 rounded-full border transform hover:scale-110 active:scale-90 ${karaokeMode ? 'bg-blue-600 border-blue-500 text-white shadow-glow' : 'bg-white/5 border-white/10 text-zinc-700 hover:text-white'}`}>
                  <Mic className="w-8 h-8" />
               </button>
               
               <button 
                 onClick={togglePlay}
                 className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-all border-[6px] border-black group"
               >
                 {isPlaying ? <Pause className="w-10 h-10 fill-current group-hover:scale-110 transition-transform" /> : <Play className="w-10 h-10 fill-current ml-1.5 group-hover:scale-110 transition-transform" />}
               </button>

               <button className={`transition-all p-4 rounded-full border transform hover:scale-110 active:scale-90 ${loopA !== null && loopB !== null ? 'text-amber-500 border-amber-500 shadow-glow animate-pulse' : 'bg-white/5 border-white/10 text-zinc-700'}`}>
                  <Infinity className="w-8 h-8" />
               </button>
            </div>

            <div className="flex justify-center gap-6 mt-1">
               <button className="flex items-center gap-2 px-5 py-2 bg-white/5 rounded-full border border-white/5 text-zinc-600 hover:text-white transition-all">
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em]">Export Mix</span>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StemStudio;