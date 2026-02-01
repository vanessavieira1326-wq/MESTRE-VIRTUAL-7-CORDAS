
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Minus, Music, Volume2, VolumeX, Volume1 } from 'lucide-react';

const Metronome: React.FC = () => {
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(2);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const audioContext = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  const lookahead = 25.0;
  const scheduleAheadTime = 0.1;
  
  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpm;
    nextNoteTime.current += secondsPerBeat;
    setCurrentBeat((prev) => (prev + 1) % beatsPerMeasure);
  };

  const scheduleNote = (beatNumber: number, time: number) => {
    if (!audioContext.current) return;
    const osc = audioContext.current.createOscillator();
    const envelope = audioContext.current.createGain();
    osc.frequency.value = beatNumber === 0 ? 1000 : 800;
    envelope.gain.value = volumeRef.current;
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(envelope);
    envelope.connect(audioContext.current.destination);
    osc.start(time);
    osc.stop(time + 0.1);
  };

  const scheduler = useCallback(() => {
    while (nextNoteTime.current < (audioContext.current?.currentTime || 0) + scheduleAheadTime) {
      scheduleNote(currentBeat, nextNoteTime.current);
      nextNote();
    }
    timerID.current = window.setTimeout(scheduler, lookahead);
  }, [bpm, beatsPerMeasure, currentBeat]);

  const toggleMetronome = () => {
    if (!isPlaying) {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
      }
      setIsPlaying(true);
      setCurrentBeat(0);
      nextNoteTime.current = audioContext.current.currentTime + 0.05;
      scheduler();
    } else {
      setIsPlaying(false);
      if (timerID.current) clearTimeout(timerID.current);
    }
  };

  const adjustBpm = (val: number) => {
    setBpm((prev) => Math.min(Math.max(prev + val, 40), 240));
  };

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-4 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-3 h-3 text-amber-500" />
            <span className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest">Metrônomo</span>
          </div>
          <select 
            value={beatsPerMeasure}
            onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
            className="bg-transparent border-none text-[9px] font-black text-slate-500 uppercase focus:ring-0 outline-none cursor-pointer"
          >
            <option value={2}>2/4 Samba</option>
            <option value={3}>3/4 Valsa</option>
            <option value={4}>4/4 Choro</option>
          </select>
        </div>

        {/* Layout Compacto para Celular */}
        <div className="flex items-center justify-between gap-4 bg-black/40 p-3 rounded-2xl border border-white/5">
          <button onClick={() => adjustBpm(-5)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-amber-500 transition-all active:scale-90">
            <Minus className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="text-4xl font-mono font-black text-white tracking-tighter leading-none">
              {bpm}
            </div>
            <span className="text-[8px] font-black text-slate-500 uppercase mt-1">BPM</span>
          </div>

          <button onClick={() => adjustBpm(5)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-amber-500 transition-all active:scale-90">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Botão Play - Sempre Visível e Grande */}
        <button 
          onClick={toggleMetronome}
          className={`w-full py-4 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 border ${
            isPlaying 
            ? 'bg-amber-600 border-amber-500 text-white' 
            : 'bg-white/5 text-amber-500 border-amber-600/20'
          }`}
        >
          {isPlaying ? (
            <div className="flex items-center gap-2">
              <Pause className="w-5 h-5 fill-current" />
              <span className="font-black uppercase tracking-widest text-[10px]">Pausar</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 fill-current" />
              <span className="font-black uppercase tracking-widest text-[10px]">Ligar Metrônomo</span>
            </div>
          )}
        </button>

        {/* Indicadores de Batida Simplificados */}
        <div className="flex justify-center gap-2 pt-1">
          {[...Array(beatsPerMeasure)].map((_, i) => (
            <div 
              key={i}
              className={`h-1 flex-1 max-w-[40px] rounded-full transition-all duration-75 ${
                isPlaying && currentBeat === i ? 'bg-amber-500' : 'bg-white/5'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Metronome;
