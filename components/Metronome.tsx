
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Minus, Music, Volume2, VolumeX, Volume1 } from 'lucide-react';

const Metronome: React.FC = () => {
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(2); // Padrão Samba/Choro
  const [currentBeat, setCurrentBeat] = useState(0);
  const [volume, setVolume] = useState(0.8); // Volume inicial em 80%

  const audioContext = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  const lookahead = 25.0; // Quão frequente o agendador roda (ms)
  const scheduleAheadTime = 0.1; // Quão longe agendamos (s)
  
  // Ref para o volume para acesso síncrono no agendador
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

    // Som de madeira/click seco
    osc.frequency.value = beatNumber === 0 ? 1000 : 800;
    
    const currentVol = volumeRef.current;
    envelope.gain.value = currentVol;
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

  useEffect(() => {
    return () => {
      if (timerID.current) clearTimeout(timerID.current);
    };
  }, []);

  const adjustBpm = (val: number) => {
    setBpm((prev) => Math.min(Math.max(prev + val, 40), 240));
  };

  const VolumeIcon = () => {
    if (volume === 0) return <VolumeX className="w-4 h-4 text-slate-500" />;
    if (volume < 0.5) return <Volume1 className="w-4 h-4 text-amber-500" />;
    return <Volume2 className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-4 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-4">
        {/* Cabeçalho do Metrônomo */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Music className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500/50 uppercase tracking-[0.2em]">Tempo & Cadência</span>
          </div>
          <select 
            value={beatsPerMeasure}
            onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
            className="bg-transparent border-none text-[10px] font-black text-slate-500 uppercase tracking-widest focus:ring-0 outline-none cursor-pointer hover:text-amber-500 transition-colors"
          >
            <option value={2}>2/4 Samba</option>
            <option value={3}>3/4 Valsa</option>
            <option value={4}>4/4 Choro</option>
          </select>
        </div>

        {/* Display Principal */}
        <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-500 uppercase mb-1">BPM</span>
            <div className="text-5xl font-mono font-black text-white tracking-tighter">
              {bpm}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => adjustBpm(5)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-amber-500 transition-all active:scale-90">
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={() => adjustBpm(-5)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-amber-500 transition-all active:scale-90">
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visualizador de Batida e Volume */}
        <div className="space-y-4">
          <div className="flex justify-center gap-3">
            {[...Array(beatsPerMeasure)].map((_, i) => (
              <div 
                key={i}
                className={`h-2 flex-1 max-w-[60px] rounded-full transition-all duration-100 ${
                  isPlaying && currentBeat === i 
                  ? (i === 0 ? 'bg-amber-500 shadow-[0_0_15px_#f59e0b]' : 'bg-amber-200 shadow-[0_0_10px_#fde68a]')
                  : 'bg-white/5'
                }`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-4 bg-black/20 px-4 py-2 rounded-xl border border-white/5">
            <VolumeIcon />
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 accent-amber-600 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Botão Play - Grande para Mobile */}
        <button 
          onClick={toggleMetronome}
          className={`w-full py-5 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 border ${
            isPlaying 
            ? 'bg-amber-600 border-amber-500 text-white shadow-amber-900/40' 
            : 'bg-white/5 text-amber-500 border-amber-600/20'
          }`}
        >
          {isPlaying ? (
            <div className="flex items-center gap-2">
              <Pause className="w-6 h-6 fill-current" />
              <span className="font-black uppercase tracking-widest text-xs">Pausar</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Play className="w-6 h-6 fill-current" />
              <span className="font-black uppercase tracking-widest text-xs">Iniciar Tempo</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default Metronome;
