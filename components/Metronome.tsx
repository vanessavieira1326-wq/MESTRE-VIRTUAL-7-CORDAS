
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
    // Frequência mais alta para o primeiro tempo (acentuação)
    osc.frequency.value = beatNumber === 0 ? 1000 : 800;
    
    // Aplica o volume definido pelo usuário
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
  }, [bpm, beatsPerMeasure, currentBeat]); // Dependências corrigidas para refletir o estado atual

  const toggleMetronome = () => {
    if (!isPlaying) {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
      }
      setIsPlaying(true);
      // Resetar batida ao iniciar
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
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
        {/* Lado Esquerdo: Display e Controle de BPM */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="block text-[10px] font-black text-amber-500/50 uppercase tracking-[0.2em] mb-1">BPM</span>
            <div className="text-4xl font-mono font-black text-white bg-black/40 px-4 py-2 rounded-xl border border-white/5 min-w-[100px]">
              {bpm}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => adjustBpm(5)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-amber-500 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => adjustBpm(-5)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-amber-500 transition-colors">
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visualizador de Batida e Volume */}
        <div className="flex-1 flex flex-col gap-4 w-full">
          <div className="flex justify-between items-center px-2">
             <div className="flex gap-2">
               {[...Array(beatsPerMeasure)].map((_, i) => (
                 <div 
                   key={i}
                   className={`h-2 w-8 rounded-full transition-all duration-100 ${
                     isPlaying && currentBeat === i 
                     ? (i === 0 ? 'bg-amber-500 shadow-[0_0_15px_#f59e0b]' : 'bg-amber-200 shadow-[0_0_10px_#fde68a]')
                     : 'bg-white/5'
                   }`}
                 />
               ))}
             </div>
             
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                 <VolumeIcon />
                 <input 
                   type="range"
                   min="0"
                   max="1"
                   step="0.01"
                   value={volume}
                   onChange={(e) => setVolume(parseFloat(e.target.value))}
                   className="w-16 md:w-20 accent-amber-600 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                   title={`Volume: ${Math.round(volume * 100)}%`}
                 />
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
          </div>

          <input 
            type="range"
            min="40"
            max="240"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full accent-amber-600 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Botão Play */}
        <button 
          onClick={toggleMetronome}
          className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${
            isPlaying 
            ? 'bg-amber-600 text-white shadow-amber-900/40' 
            : 'bg-white/5 text-amber-500 border border-amber-600/20'
          }`}
        >
          {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
        </button>
      </div>
    </div>
  );
};

export default Metronome;
