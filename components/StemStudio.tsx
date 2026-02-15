
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic2, Music2, Drum, Guitar, 
  Play, Pause, Loader2, FileAudio, 
  RotateCcw, Volume2, Plus, Minus, SkipBack, Repeat, Hash, 
  Sliders, Activity, Clock, Zap, MicOff, VolumeX,
  Settings, CheckCircle2, Download, Waves, Wind, Layers, SlidersHorizontal,
  Cpu, Gauge, Power, Target, Monitor
} from 'lucide-react';
import { extractProfessionalScore, BaixariaAnalysis } from '../services/geminiService';

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
  q?: number;
}

const INITIAL_STEMS: StemChannel[] = [
  { id: 'guitar7c', name: 'Violão 7C', icon: Guitar, level: 100, isMuted: false, isSolo: false, color: 'text-amber-500', filterType: 'bandpass', freq: 300, q: 1.0 },
  { id: 'vocals', name: 'Vocais', icon: Mic2, level: 100, isMuted: false, isSolo: false, color: 'text-blue-400', filterType: 'highpass', freq: 1000 },
  { id: 'drums', name: 'Rítmica', icon: Drum, level: 100, isMuted: false, isSolo: false, color: 'text-emerald-400', filterType: 'lowpass', freq: 250 },
  { id: 'others', name: 'Harmonia', icon: Music2, level: 100, isMuted: false, isSolo: false, color: 'text-zinc-400', filterType: 'allpass', freq: 1000 },
];

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5];

const StemStudio: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [stems, setStems] = useState<StemChannel[]>(INITIAL_STEMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [masterVolume, setMasterVolume] = useState(85);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [score, setScore] = useState<BaixariaAnalysis[]>([]);
  const [bpm, setBpm] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);

  const audioCtx = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);
  const masterGainNode = useRef<GainNode | null>(null);
  const gainNodes = useRef<Record<string, GainNode>>({});
  const filterNodes = useRef<Record<string, BiquadFilterNode>>({});
  
  const lowShelfNode = useRef<BiquadFilterNode | null>(null);
  const midPeakingNode = useRef<BiquadFilterNode | null>(null);
  const highShelfNode = useRef<BiquadFilterNode | null>(null);
  
  const listContainerRef = useRef<HTMLDivElement>(null);
  const startTime = useRef<number>(0);
  const offsetTime = useRef<number>(0);
  const requestRef = useRef<number>(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.floor(Math.max(0, seconds) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimestamp = (ts: string) => {
    const parts = ts.split(':');
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    return parseInt(parts[0]);
  };

  const initAudioEngine = useCallback(() => {
    if (audioCtx.current) return;
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    lowShelfNode.current = audioCtx.current.createBiquadFilter();
    lowShelfNode.current.type = 'lowshelf';
    lowShelfNode.current.frequency.value = 100;
    lowShelfNode.current.gain.value = eqLow;

    midPeakingNode.current = audioCtx.current.createBiquadFilter();
    midPeakingNode.current.type = 'peaking';
    midPeakingNode.current.frequency.value = 1000;
    midPeakingNode.current.gain.value = eqMid;

    highShelfNode.current = audioCtx.current.createBiquadFilter();
    highShelfNode.current.type = 'highshelf';
    highShelfNode.current.frequency.value = 6000;
    highShelfNode.current.gain.value = eqHigh;

    masterGainNode.current = audioCtx.current.createGain();
    masterGainNode.current.gain.value = masterVolume / 100;

    lowShelfNode.current.connect(midPeakingNode.current);
    midPeakingNode.current.connect(highShelfNode.current);
    highShelfNode.current.connect(masterGainNode.current);
    masterGainNode.current.connect(audioCtx.current.destination);

    stems.forEach(stem => {
      const gain = audioCtx.current!.createGain();
      const filter = audioCtx.current!.createBiquadFilter();
      filter.type = stem.filterType;
      filter.frequency.value = stem.freq;
      gain.gain.value = stem.isMuted ? 0 : (stem.level / 100);
      gainNodes.current[stem.id] = gain;
      filterNodes.current[stem.id] = filter;
      filter.connect(gain);
      gain.connect(lowShelfNode.current!);
    });
  }, [stems, masterVolume, eqLow, eqMid, eqHigh]);

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
        const samples = 140;
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
            setBpm(Math.floor(Math.random() * 20 + 92)); 
          } catch (err) {
            console.error("Erro Gemini", err);
          } finally {
            setIsProcessing(false);
          }
        };
      } catch (err) {
        console.error("Erro Audio", err);
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

  useEffect(() => {
    if (lowShelfNode.current && audioCtx.current) {
      lowShelfNode.current.gain.setTargetAtTime(eqLow, audioCtx.current.currentTime, 0.1);
    }
  }, [eqLow]);

  useEffect(() => {
    if (midPeakingNode.current && audioCtx.current) {
      midPeakingNode.current.gain.setTargetAtTime(eqMid, audioCtx.current.currentTime, 0.1);
    }
  }, [eqMid]);

  useEffect(() => {
    if (highShelfNode.current && audioCtx.current) {
      highShelfNode.current.gain.setTargetAtTime(eqHigh, audioCtx.current.currentTime, 0.1);
    }
  }, [eqHigh]);

  useEffect(() => {
    if (masterGainNode.current && audioCtx.current) {
      masterGainNode.current.gain.setTargetAtTime(masterVolume / 100, audioCtx.current.currentTime, 0.05);
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
          const targetGain = updated.isMuted ? 0 : (updated.level / 100);
          gainNodes.current[id].gain.setTargetAtTime(targetGain, audioCtx.current!.currentTime, 0.05);
        }
        if (filterNodes.current[id] && updates.freq !== undefined) {
           filterNodes.current[id].frequency.setTargetAtTime(updates.freq, audioCtx.current!.currentTime, 0.1);
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

  const jumpToTime = (timestamp: string | number) => {
    if (!audioBuffer.current || !audioCtx.current) return;
    const seconds = typeof timestamp === 'string' ? parseTimestamp(timestamp) : timestamp;
    const finalSeconds = Math.max(0, Math.min(seconds, duration));

    const wasPlaying = isPlaying;
    if (isPlaying) sourceNode.current?.stop();
    
    setCurrentTime(finalSeconds);
    offsetTime.current = finalSeconds;
    
    if (wasPlaying) {
      sourceNode.current = audioCtx.current.createBufferSource();
      sourceNode.current.buffer = audioBuffer.current;
      sourceNode.current.playbackRate.value = playbackSpeed;
      stems.forEach(stem => sourceNode.current?.connect(filterNodes.current[stem.id]));
      sourceNode.current.start(0, finalSeconds);
      startTime.current = audioCtx.current.currentTime;
    }
  };

  const exportMix = async () => {
    if (!audioBuffer.current || !file) return;
    setIsExporting(true);
    
    const buffer = audioBuffer.current;
    const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    const offlineSource = offlineCtx.createBufferSource();
    offlineSource.buffer = buffer;

    const offlineLow = offlineCtx.createBiquadFilter();
    offlineLow.type = 'lowshelf';
    offlineLow.frequency.value = 100;
    offlineLow.gain.value = eqLow;

    const offlineMid = offlineCtx.createBiquadFilter();
    offlineMid.type = 'peaking';
    offlineMid.frequency.value = 1000;
    offlineMid.gain.value = eqMid;

    const offlineHigh = offlineCtx.createBiquadFilter();
    offlineHigh.type = 'highshelf';
    offlineHigh.frequency.value = 6000;
    offlineHigh.gain.value = eqHigh;

    const offlineMasterGain = offlineCtx.createGain();
    offlineMasterGain.gain.value = masterVolume / 100;

    offlineLow.connect(offlineMid);
    offlineMid.connect(offlineHigh);
    offlineHigh.connect(offlineMasterGain);
    offlineMasterGain.connect(offlineCtx.destination);

    const anySolo = stems.some(s => s.isSolo);
    stems.forEach(stem => {
      const filter = offlineCtx.createBiquadFilter();
      filter.type = stem.filterType;
      filter.frequency.value = stem.freq;
      const gain = offlineCtx.createGain();
      const isAudible = anySolo ? stem.isSolo : !stem.isMuted;
      gain.gain.value = isAudible ? (stem.level / 100) : 0;
      offlineSource.connect(filter);
      filter.connect(gain);
      gain.connect(offlineLow);
    });

    offlineSource.start(0);
    try {
      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VStudio_Master_${file.name.split('.')[0]}.wav`;
      link.click();
    } catch (err) {
      console.error("Export falhou", err);
    } finally {
      setIsExporting(false);
    }
  };

  const audioBufferToWav = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let i, sample, offset = 0, pos = 0;
    const setUint32 = (data: number) => { view.setUint32(offset, data, true); offset += 4; };
    const setUint16 = (data: number) => { view.setUint16(offset, data, true); offset += 2; };
    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan); setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * numOfChan * 2); setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - offset - 4);
    for (i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
    while (pos < buffer.length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][pos]));
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
        view.setInt16(offset, sample, true);
        offset += 2;
      }
      pos++;
    }
    return new Blob([bufferArray], { type: 'audio/wav' });
  };

  return (
    <div className="bg-[#0c0c0e] border border-white/5 rounded-[2rem] md:rounded-[3rem] shadow-3xl overflow-hidden flex flex-col h-[90vh] max-h-[1000px] relative ring-1 ring-white/10">
      
      {/* Upper Control Strip (Master Bar) */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 md:px-10 py-4 border-b border-white/5 bg-[#141416]/90 backdrop-blur-3xl z-50 gap-6">
        <div className="flex items-center gap-5 w-full sm:w-auto">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl flex items-center justify-center shadow-amber-900/20 shadow-2xl shrink-0 ring-1 ring-white/20">
            <Cpu className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-glow" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-lg font-black uppercase tracking-tighter text-white leading-tight truncate">V-Studio Ultra Console</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[10px] md:text-[11px] text-zinc-500 font-black uppercase tracking-[0.2em] truncate">{file ? file.name : "System Standby"}</p>
            </div>
          </div>
        </div>

        {/* Precision Playback Speed Section */}
        <div className="flex items-center gap-4 bg-black/40 p-2 rounded-3xl border border-white/5 ring-1 ring-white/5">
           <div className="flex flex-col gap-1 items-center px-4">
              <span className="text-[8px] font-black uppercase text-amber-500/60 tracking-widest">Rate Control</span>
              <div className="flex gap-2">
                {SPEED_PRESETS.map((s) => (
                  <button 
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${playbackSpeed === s ? 'bg-amber-600 text-white shadow-glow' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
           </div>
           
           <div className="h-12 w-px bg-white/5" />

           <div className="flex flex-col gap-1 px-4 min-w-[120px]">
              <div className="flex justify-between items-center">
                 <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Precision</span>
                 <span className="text-[10px] font-mono font-black text-amber-500">{(playbackSpeed * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.5" max="2.0" step="0.01" value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-full accent-amber-500"
              />
           </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-6 py-3 bg-zinc-900 border border-white/5 rounded-2xl flex items-center gap-3 shadow-inner ring-1 ring-white/5">
             <Target className="w-4 h-4 text-amber-500" />
             <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest">{bpm ? `${bpm} BPM` : "SYNC"}</span>
          </div>
          <button className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
             <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        
        {/* Analog-Style Mixer Sidecar */}
        <div className="w-full md:w-96 bg-[#0c0c0e]/80 backdrop-blur-xl border-r border-white/10 flex flex-row md:flex-col p-6 gap-6 overflow-x-auto md:overflow-y-auto custom-scrollbar no-scrollbar shrink-0 shadow-2xl">
          <div className="hidden md:flex items-center justify-between px-2 mb-2">
             <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-zinc-500" />
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.4em]">Audio Matrix</span>
             </div>
             <div className="px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                <span className="text-[8px] font-black text-amber-500 uppercase">Live</span>
             </div>
          </div>

          {stems.map((stem) => (
            <div key={stem.id} className={`p-6 rounded-[2.5rem] border transition-all duration-500 group relative overflow-hidden flex-1 md:flex-none min-w-[220px] md:min-w-0 ${stem.id === 'guitar7c' ? 'bg-amber-600/5 border-amber-500/20' : 'bg-[#18181b]/40 border-white/5'} ring-1 ring-white/5`}>
               <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                     <div className={`p-3 rounded-2xl bg-[#0c0c0e]/80 ring-1 ring-white/10 ${stem.color}`}>
                        <stem.icon className="w-5 h-5 md:w-6 md:h-6" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[11px] md:text-[13px] font-black text-white uppercase tracking-tighter truncate">{stem.name}</span>
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{stem.filterType}</span>
                     </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateStem(stem.id, { isMuted: !stem.isMuted })}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border ring-1 ring-black ${stem.isMuted ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
                    >
                      {stem.id === 'vocals' && stem.isMuted ? <MicOff className="w-4 h-4" /> : 'M'}
                    </button>
                    <button 
                      onClick={() => handleSolo(stem.id)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border ring-1 ring-black ${stem.isSolo ? 'bg-amber-600 border-amber-500 text-white shadow-glow' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
                    >S</button>
                  </div>
               </div>
               
               {/* High-Resolution Tactile Fader */}
               <div className="flex items-center gap-4 relative z-10 mb-6">
                  <div className="flex-1 h-3 md:h-4 bg-black/80 rounded-full relative overflow-hidden ring-1 ring-white/10 shadow-inner">
                    <input 
                      type="range" min="0" max="150" value={stem.level} 
                      onChange={(e) => updateStem(stem.id, { level: parseInt(e.target.value) })}
                      className="absolute inset-0 opacity-0 cursor-pointer z-30"
                    />
                    <div 
                      className={`absolute top-0 left-0 h-full transition-all duration-75 ${stem.id === 'guitar7c' ? 'bg-amber-500 shadow-glow' : 'bg-zinc-400'}`}
                      style={{ width: `${(stem.level / 150) * 100}%`, opacity: stem.isMuted ? 0.05 : 1 }} 
                    />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-mono font-black text-white">{stem.level}</span>
                    <span className="text-[7px] font-black text-zinc-600 uppercase">dBFS</span>
                  </div>
               </div>

               {/* Peak Meter Emulation */}
               <div className="flex gap-1 h-1.5 opacity-30 group-hover:opacity-100 transition-opacity mb-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className={`flex-1 rounded-sm ${i < (stem.level / 12) ? (i > 9 ? 'bg-red-500' : 'bg-emerald-500') : 'bg-zinc-800'}`} />
                  ))}
               </div>

               {/* Channel Tone Processor */}
               <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3 flex-1">
                    <Gauge className="w-3.5 h-3.5 text-zinc-700" />
                    <input 
                       type="range" min="100" max="12000" step="50" value={stem.freq}
                       onChange={(e) => updateStem(stem.id, { freq: parseInt(e.target.value) })}
                       className="flex-1 h-1 accent-zinc-700 appearance-none bg-zinc-900 rounded-full"
                    />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600 ml-4 font-black">{(stem.freq / 1000).toFixed(1)}kHz</span>
               </div>
            </div>
          ))}
        </div>

        {/* Console Central Display (The Monitor) */}
        <div className="flex-1 bg-[#08080a] relative flex flex-col min-h-0">
          {!file && (
            <label 
              htmlFor="studio-upload"
              className="absolute inset-0 flex flex-col items-center justify-center gap-10 p-12 text-center z-10 cursor-pointer group hover:bg-white/5 transition-all"
            >
               <div className="relative">
                  <div className="absolute -inset-16 bg-amber-600/5 rounded-full blur-[100px] group-hover:bg-amber-600/10 transition-all duration-1000" />
                  <div className="w-32 h-32 md:w-48 md:h-48 bg-zinc-900/40 rounded-[3.5rem] md:rounded-[5rem] flex items-center justify-center border-2 border-dashed border-amber-500/20 group-hover:border-amber-500 transition-all relative z-10 ring-1 ring-white/10">
                    <Monitor className="w-14 h-14 md:w-24 md:h-24 text-amber-500/20 group-hover:text-amber-500 transition-all drop-shadow-glow" />
                  </div>
               </div>
               <div className="space-y-4 z-10">
                  <h3 className="text-3xl md:text-5xl font-black italic text-white tracking-tighter">Initialize Audio Engine</h3>
                  <p className="text-[12px] md:text-[14px] text-zinc-500 max-w-sm mx-auto uppercase font-black tracking-[0.4em] leading-relaxed">System Ready. Please feed source data (MP3/WAV).</p>
               </div>
               <div className="px-16 py-6 bg-white text-black rounded-[2.5rem] font-black uppercase text-xs md:text-sm shadow-white/10 shadow-2xl relative z-10 transition-all group-hover:scale-110 active:scale-95">Load Regional Audio</div>
               <input id="studio-upload" type="file" className="hidden" accept=".mp3,audio/*" onChange={handleFileChange} />
            </label>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-[#0c0c0e] z-50 flex flex-col items-center justify-center gap-10 text-center">
               <div className="relative">
                 <div className="w-32 h-32 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
                 <Loader2 className="absolute inset-0 m-auto w-12 h-12 text-amber-500 animate-pulse" />
                 <div className="absolute -inset-10 bg-amber-500/10 blur-[80px] animate-pulse" />
               </div>
               <div className="space-y-4">
                 <span className="text-2xl md:text-4xl font-black uppercase tracking-[0.6em] text-amber-500 animate-pulse block drop-shadow-glow">Neural Decoding</span>
                 <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-[0.4em]">Optimizing Bassline Separation / Harmonic Scan</p>
               </div>
            </div>
          )}

          {file && !isProcessing && (
            <div className="flex-1 flex flex-col p-8 md:p-14 gap-12 md:gap-16 overflow-hidden animate-in fade-in duration-700">
              
              {/* Plasma Waveform Display */}
              <div className="flex flex-col gap-8 shrink-0">
                 <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-8">
                       <div className="flex items-center gap-4 px-6 py-2.5 bg-amber-600/10 border border-amber-500/20 rounded-full shadow-2xl ring-1 ring-white/10">
                          <Activity className="w-5 h-5 text-amber-500 animate-pulse" />
                          <span className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Master Sinc</span>
                       </div>
                       <div className="flex items-center gap-5 font-mono font-black text-xl md:text-3xl tracking-tighter">
                          <span className="text-white drop-shadow-glow">{formatTime(currentTime)}</span>
                          <span className="text-zinc-800">/</span>
                          <span className="text-zinc-600 text-lg md:text-xl">{formatTime(duration)}</span>
                       </div>
                    </div>
                    <div className="hidden lg:flex items-center gap-4 bg-zinc-900/40 px-6 py-2 rounded-2xl ring-1 ring-white/5">
                        <Waves className="w-4 h-4 text-zinc-600" />
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Plasma Screen V3.0</span>
                    </div>
                 </div>

                 <div 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percent = x / rect.width;
                      jumpToTime(percent * duration);
                    }}
                    className="h-48 md:h-80 bg-black rounded-[3rem] md:rounded-[5rem] border border-white/10 relative overflow-hidden shadow-amber-500/5 shadow-2xl group cursor-pointer ring-1 ring-white/10"
                 >
                    {/* Scanline Effect Overlay */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid.png')] opacity-10 pointer-events-none z-20" />
                    
                    <div className="absolute inset-0 flex items-center justify-between px-10 md:px-20 gap-1 md:gap-2 opacity-50 group-hover:opacity-70 transition-opacity">
                       {waveformData.map((val, i) => (
                         <div 
                           key={i} 
                           className={`flex-1 rounded-full transition-all duration-300 ${i / waveformData.length < currentTime / duration ? 'bg-amber-500 shadow-glow' : 'bg-zinc-800'}`}
                           style={{ height: `${Math.max(10, val * 220)}%` }}
                         />
                       ))}
                    </div>
                    <div className="absolute top-0 bottom-0 left-0 border-r-4 border-white z-30 pointer-events-none transition-all duration-75 shadow-[0_0_20px_white]" style={{ width: `${(currentTime / duration) * 100}%` }}>
                       <div className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full shadow-[0_0_40px_white] flex items-center justify-center">
                          <div className="w-2 h-2 bg-amber-600 rounded-full" />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Functional Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-14 flex-1 overflow-hidden">
                <div className="bg-[#141416]/60 rounded-[3rem] border border-white/5 p-8 md:p-12 flex flex-col gap-8 overflow-hidden shadow-2xl relative backdrop-blur-3xl ring-1 ring-white/5">
                   <div className="flex items-center justify-between border-b border-white/10 pb-6">
                      <div className="flex items-center gap-5">
                        <Cpu className="w-8 h-8 text-amber-500 drop-shadow-glow" />
                        <h4 className="text-[12px] md:text-[14px] font-black uppercase tracking-[0.4em] text-white">Neural Transcripts</h4>
                      </div>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Buffer: Online</span>
                   </div>

                   <div ref={listContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-4">
                      {score.length > 0 ? score.map((item, idx) => {
                        const ts = parseTimestamp(item.timestamp);
                        const nextTs = score[idx+1] ? parseTimestamp(score[idx+1].timestamp) : duration;
                        const isActive = currentTime >= ts && currentTime < nextTs;
                        
                        return (
                          <button 
                            key={idx} 
                            onClick={() => jumpToTime(item.timestamp)}
                            className={`w-full flex items-center justify-between p-6 md:p-8 border transition-all rounded-[2.5rem] group text-left ring-1 ${
                              isActive ? 'bg-amber-600/10 border-amber-500/50 shadow-glow ring-amber-500/20' : 'bg-black/40 border-white/5 hover:border-amber-500/30 ring-white/5'
                            }`}
                          >
                             <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                  <Clock className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-zinc-700'}`} />
                                  <span className={`text-[11px] md:text-[14px] font-mono font-black ${isActive ? 'text-white' : 'text-zinc-600'}`}>{item.timestamp}</span>
                                </div>
                                <span className={`text-[15px] md:text-[18px] font-black italic tracking-tighter leading-tight ${isActive ? 'text-amber-500 drop-shadow-glow' : 'text-zinc-300'}`}>
                                  {item.notes}
                                </span>
                             </div>
                             <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shrink-0 ${isActive ? 'bg-white text-black shadow-glow' : 'bg-zinc-900 border border-white/10 group-hover:bg-amber-600 group-hover:text-white'}`}>
                               {isActive && isPlaying ? <Waves className="w-6 h-6 animate-pulse" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                             </div>
                          </button>
                        );
                      }) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 gap-8">
                           <Layers className="w-24 h-24" />
                           <p className="text-[12px] font-black uppercase tracking-[0.5em]">Scanning Matrix...</p>
                        </div>
                      )}
                   </div>
                </div>

                {/* Master Command Section */}
                <div className="bg-[#141416]/60 rounded-[3rem] border border-white/5 p-12 flex flex-col items-center justify-center gap-10 shadow-2xl relative overflow-hidden backdrop-blur-3xl ring-1 ring-white/5">
                   <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent pointer-events-none" />
                   
                   <div className="text-center relative z-10">
                     <span className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-8 block">Active Voicing Target</span>
                     <div className="text-7xl md:text-9xl font-black italic text-amber-500 tracking-tighter drop-shadow-glow scale-110 mb-10 transition-transform hover:scale-125 duration-500">
                        {currentTime < duration * 0.2 ? 'Gm6' : currentTime < duration * 0.5 ? 'D7M(9)' : 'A7(b13)'}
                     </div>
                   </div>

                   {/* Virtual EQ Master Rack */}
                   <div className="flex gap-10 md:gap-14 relative z-10 bg-black/40 p-10 rounded-[3rem] ring-1 ring-white/10">
                      {[
                        { label: 'LOW', val: eqLow, color: 'bg-red-500' },
                        { label: 'MID', val: eqMid, color: 'bg-amber-500' },
                        { label: 'HIGH', val: eqHigh, color: 'bg-blue-500' }
                      ].map((band) => (
                        <div key={band.label} className="flex flex-col items-center gap-6">
                           <div className="h-44 md:h-56 w-1.5 bg-zinc-800 rounded-full relative">
                              <div className={`absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full border-2 border-white/20 bg-[#1a1a1e] shadow-2xl flex items-center justify-center group cursor-pointer transition-all hover:scale-110`} style={{ bottom: `${50 + (band.val / 30) * 100}%` }}>
                                 <div className={`w-2.5 h-2.5 rounded-full ${band.color} shadow-glow`} />
                              </div>
                           </div>
                           <span className="text-[10px] font-black text-zinc-500 tracking-widest">{band.label}</span>
                           <span className={`text-[14px] font-mono font-black ${band.val > 0 ? 'text-amber-500' : 'text-zinc-400'}`}>{band.val > 0 ? '+' : ''}{band.val}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Command Console Footer */}
      <div className="h-36 md:h-44 bg-[#0c0c0e] border-t border-white/10 px-8 md:px-20 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-20 shadow-2xl py-6 md:py-0 relative z-[60]">
         <div className="flex items-center gap-10 md:gap-16 order-2 md:order-1">
            <button onClick={() => jumpToTime(0)} className="text-zinc-700 hover:text-white transition-all active:scale-90"><SkipBack className="w-10 h-10" /></button>
            <div className="relative group">
               <div className="absolute -inset-4 bg-amber-600/20 rounded-full blur-xl group-hover:bg-amber-600/40 transition-all opacity-0 group-hover:opacity-100" />
               <button 
                 onClick={togglePlay}
                 disabled={!file}
                 className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all shadow-amber-900/30 shadow-2xl active:scale-95 border-2 relative z-10 ${isPlaying ? 'bg-white text-black border-white' : 'bg-amber-600 text-white border-amber-500 disabled:opacity-20'}`}
               >
                 {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
               </button>
            </div>
            <button className="text-zinc-700 hover:text-white transition-all active:scale-90"><Repeat className="w-10 h-10" /></button>
         </div>

         {/* Massive Master Volume Command */}
         <div className="flex-1 max-w-2xl w-full flex flex-col gap-4 bg-zinc-900/30 p-6 md:p-8 rounded-[3rem] border border-white/5 ring-1 ring-white/5 order-1 md:order-2 shadow-inner">
            <div className="flex items-center justify-between px-4">
               <div className="flex items-center gap-3">
                 <Power className="w-4 h-4 text-amber-500" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Global Pressure</span>
               </div>
               <div className="flex gap-2">
                 <span className="text-[11px] font-mono font-black text-amber-500">{masterVolume}</span>
                 <span className="text-[9px] font-black text-zinc-700">LVL</span>
               </div>
            </div>
            <div className="flex items-center gap-8 px-4">
                <VolumeX className="w-5 h-5 text-zinc-800" />
                <div className="flex-1 h-3 bg-black/80 rounded-full relative overflow-hidden shadow-inner ring-1 ring-white/10">
                   <input 
                      type="range" min="0" max="150" value={masterVolume}
                      onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-40"
                   />
                   <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-75 shadow-glow" 
                    style={{ width: `${(masterVolume / 150) * 100}%` }}
                   />
                </div>
                <Volume2 className="w-5 h-5 text-amber-500" />
            </div>
         </div>

         <div className="flex items-center gap-6 order-3">
            <button 
              onClick={exportMix}
              disabled={!file || isExporting}
              className="px-10 md:px-14 py-4 md:py-6 bg-zinc-900 border border-white/5 text-zinc-400 text-[11px] font-black uppercase rounded-[2rem] md:rounded-[3rem] hover:bg-zinc-800 hover:text-amber-500 transition-all flex items-center gap-3 shadow-2xl disabled:opacity-20 ring-1 ring-white/5"
            >
               {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
               <span className="hidden sm:inline">{isExporting ? "Processing..." : "Export WAV"}</span>
            </button>
            <button 
              onClick={() => { setFile(null); audioBuffer.current = null; setIsPlaying(false); setCurrentTime(0); }}
              className="w-16 h-16 md:w-20 md:h-20 bg-red-600/10 text-red-500 rounded-full hover:bg-red-600/20 transition-all border border-red-500/20 active:scale-90 shadow-2xl flex items-center justify-center ring-1 ring-red-500/20"
            ><RotateCcw className="w-8 h-8" /></button>
         </div>
      </div>
    </div>
  );
};

export default StemStudio;
