import React, { useState, useRef, useEffect } from 'react';
import { Users, Play, Pause, Volume2, Sliders, Music, Drum, Zap, RefreshCw } from 'lucide-react';

interface InstrumentState {
  volume: number;
  muted: boolean;
}

const GroupSimulator: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [style, setStyle] = useState<'samba' | 'choro'>('samba');
  
  const [instruments, setInstruments] = useState<Record<string, InstrumentState>>({
    bass: { volume: 0.6, muted: false },
    cavaquinho: { volume: 0.4, muted: false },
    pandeiro: { volume: 0.5, muted: false }
  });

  const audioCtx = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  const currentBeat = useRef(0);

  const scheduleNote = (beat: number, time: number) => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;

    // --- SÍNTESE DO BAIXO (Surdo/Baixo) ---
    if (!instruments.bass.muted) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      // No Samba, acento no tempo 2
      const freq = beat % 2 === 0 ? 55 : 41; // A1 ou E1
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(instruments.bass.volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.4);
    }

    // --- SÍNTESE DO PANDEIRO (Ruído) ---
    if (!instruments.pandeiro.muted) {
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = beat % 2 === 0 ? 'lowpass' : 'highpass';
      filter.frequency.value = beat % 2 === 0 ? 1000 : 8000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(instruments.pandeiro.volume * 0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(time);
    }

    // --- SÍNTESE DO CAVAQUINHO (Estralado) ---
    if (!instruments.cavaquinho.muted && beat % 1 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 * (beat % 2 === 0 ? 1.5 : 2), time);
      gain.gain.setValueAtTime(instruments.cavaquinho.volume * 0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.1);
    }
  };

  const scheduler = () => {
    while (nextNoteTime.current < audioCtx.current!.currentTime + 0.1) {
      scheduleNote(currentBeat.current, nextNoteTime.current);
      const secondsPerBeat = 60.0 / bpm / 2; // Semicolcheias
      nextNoteTime.current += secondsPerBeat;
      currentBeat.current = (currentBeat.current + 1) % 16;
    }
    timerID.current = window.setTimeout(scheduler, 25);
  };

  const toggleGroup = () => {
    if (!isPlaying) {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
      nextNoteTime.current = audioCtx.current.currentTime;
      setIsPlaying(true);
      scheduler();
    } else {
      setIsPlaying(false);
      if (timerID.current) clearTimeout(timerID.current);
    }
  };

  const updateVol = (ins: string, vol: number) => {
    setInstruments(prev => ({ ...prev, [ins]: { ...prev[ins], volume: vol } }));
  };

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600/20 rounded-xl">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Grupo Virtual (Roda)</h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Síntese de Acompanhamento Regional</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select 
              value={style} onChange={(e) => setStyle(e.target.value as any)}
              className="bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[9px] font-black text-amber-500 uppercase outline-none"
            >
              <option value="samba">Samba</option>
              <option value="choro">Choro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Explicitly casting entries to fix the 'unknown' property error for instrument state */}
          {(Object.entries(instruments) as [string, InstrumentState][]).map(([name, state]) => (
            <div key={name} className="bg-black/40 p-4 rounded-3xl border border-white/5 flex flex-col items-center gap-3">
              <span className="text-[8px] font-black uppercase text-slate-500">{name}</span>
              <input 
                type="range" min="0" max="1" step="0.1" value={state.volume}
                onChange={(e) => updateVol(name, parseFloat(e.target.value))}
                className="w-full h-1 bg-amber-600/20 rounded-full appearance-none accent-amber-500"
              />
              <button 
                // Casting prev[name] to InstrumentState to ensure type safety in the update callback
                onClick={() => setInstruments(prev => ({ ...prev, [name]: { ...(prev[name] as InstrumentState), muted: !(prev[name] as InstrumentState).muted } }))}
                className={`p-2 rounded-lg ${state.muted ? 'bg-red-900/20 text-red-500' : 'bg-amber-600/10 text-amber-500'}`}
              >
                <Volume2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 bg-black/60 p-4 rounded-3xl border border-white/5">
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[8px] font-black text-slate-600 uppercase">Tempo: {bpm} BPM</span>
            <input type="range" min="60" max="160" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} className="w-full accent-amber-600" />
          </div>
          <button 
            onClick={toggleGroup}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 ${isPlaying ? 'bg-red-600 text-white' : 'bg-amber-600 text-white shadow-glow'}`}
          >
            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupSimulator;