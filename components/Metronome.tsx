
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Plus, Minus, Music, Volume2, ChevronDown, VolumeX } from 'lucide-react';

const TIME_SIGNATURES = [
  { value: 2, label: '2/4 Samba/Choro' },
  { value: 3, label: '3/4 Valsa' },
  { value: 4, label: '4/4 Marcha/Pagode' },
  { value: 5, label: '5/4 Moderno' },
  { value: 6, label: '6/8 Regional' },
  { value: 7, label: '7/8 Progressivo' },
  { value: 12, label: '12/8 Blues/Samba-Canção' }
];

const Metronome: React.FC = () => {
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(2);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [volume, setVolume] = useState(0.7);

  const audioContext = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  
  // Refs para valores mutáveis acessados pelo loop de áudio sem recriar funções
  const bpmRef = useRef(bpm);
  const volumeRef = useRef(volume);
  const beatsRef = useRef(beatsPerMeasure);
  const currentBeatInternal = useRef(0);

  const lookahead = 25.0; // Frequência do scheduler (ms)
  const scheduleAheadTime = 0.1; // Quanto tempo à frente agendar (s)

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    beatsRef.current = beatsPerMeasure;
    // Resetar o beat atual se mudar o compasso para evitar confusão visual imediata
    currentBeatInternal.current = 0;
    setCurrentBeat(0);
  }, [beatsPerMeasure]);

  const scheduleNote = (beatNumber: number, time: number) => {
    if (!audioContext.current) return;
    
    const osc = audioContext.current.createOscillator();
    const envelope = audioContext.current.createGain();
    
    // Frequência: Tônica do metrônomo mais alta no tempo 1
    osc.frequency.value = beatNumber === 0 ? 1000 : 600;
    
    // Acento em compassos ímpares/longos
    if (beatsRef.current > 4 && beatNumber === Math.floor(beatsRef.current / 2)) {
      osc.frequency.value = 800;
    }

    envelope.gain.value = volumeRef.current;
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    
    osc.connect(envelope);
    envelope.connect(audioContext.current.destination);
    
    osc.start(time);
    osc.stop(time + 0.1);
  };

  const scheduler = useCallback(() => {
    if (!audioContext.current || !isPlaying) return;

    while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
      const beatToPlay = currentBeatInternal.current;
      scheduleNote(beatToPlay, nextNoteTime.current);
      
      // Atualizar estado visual
      setCurrentBeat(beatToPlay);

      // Calcular próximo tempo baseado no BPM atual (permite mudanças live)
      const secondsPerBeat = 60.0 / bpmRef.current;
      nextNoteTime.current += secondsPerBeat;
      
      // Incrementar beat interno
      currentBeatInternal.current = (currentBeatInternal.current + 1) % beatsRef.current;
    }
    
    timerID.current = window.setTimeout(scheduler, lookahead);
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      scheduler();
    } else {
      if (timerID.current) clearTimeout(timerID.current);
    }
    return () => {
      if (timerID.current) clearTimeout(timerID.current);
    };
  }, [isPlaying, scheduler]);

  const toggleMetronome = () => {
    if (!isPlaying) {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
      }
      
      nextNoteTime.current = audioContext.current.currentTime + 0.05;
      currentBeatInternal.current = 0;
      setCurrentBeat(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const adjustBpm = (val: number) => {
    setBpm((prev) => Math.min(Math.max(prev + val, 30), 300));
  };

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Metrônomo Studio</span>
          </div>
          <div className="relative group">
            <select 
              value={beatsPerMeasure}
              onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
              className="appearance-none bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-[10px] font-black text-amber-500 uppercase focus:ring-1 focus:ring-amber-500 outline-none cursor-pointer pr-8 transition-all hover:bg-black/60"
            >
              {TIME_SIGNATURES.map(sig => (
                <option key={sig.value} value={sig.value}>{sig.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-500/50 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 bg-black/50 p-4 rounded-2xl border border-white/5 shadow-inner">
          <button 
            onMouseDown={() => adjustBpm(-1)}
            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-amber-500 transition-all active:scale-90"
          >
            <Minus className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center flex-1">
            <div className="text-5xl font-mono font-black text-white tracking-tighter leading-none drop-shadow-glow mb-2">
              {bpm}
            </div>
            <input 
              type="range" min="30" max="300" value={bpm} 
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full h-1 bg-amber-600/20 rounded-full appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[8px] font-black text-slate-600 uppercase mt-3 tracking-[0.3em]">BPM</span>
          </div>

          <button 
            onMouseDown={() => adjustBpm(1)}
            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-amber-500 transition-all active:scale-90"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Controle de Volume Ativo */}
        <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="text-amber-500/50">
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </div>
          <input 
            type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-amber-500"
          />
          <span className="text-[9px] font-mono font-black text-amber-500 w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleMetronome}
            className={`flex-1 py-5 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 border-2 ${
              isPlaying 
              ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.3)]' 
              : 'bg-zinc-900 border-white/5 text-amber-500 hover:border-amber-600/40'
            }`}
          >
            {isPlaying ? (
              <div className="flex items-center gap-3">
                <Pause className="w-6 h-6 fill-current" />
                <span className="font-black uppercase tracking-widest text-[11px]">Pausar</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Play className="w-6 h-6 fill-current ml-1" />
                <span className="font-black uppercase tracking-widest text-[11px]">Estudar</span>
              </div>
            )}
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 px-2">
          {[...Array(beatsPerMeasure)].map((_, i) => (
            <div 
              key={i}
              className={`h-2 rounded-full transition-all duration-75 ${
                isPlaying && currentBeat === i 
                ? 'bg-amber-500 w-8 shadow-[0_0_15px_rgba(245,158,11,0.8)]' 
                : 'bg-zinc-800 w-2'
              } ${i === 0 ? 'ring-1 ring-amber-500/40' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Metronome;
