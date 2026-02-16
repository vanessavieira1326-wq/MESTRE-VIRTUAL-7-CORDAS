import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, ChevronRight, Info, Zap, Drum, Sparkles, Minus, Plus, Gauge } from 'lucide-react';

interface RhythmPattern {
  id: string;
  name: string;
  genre: string;
  description: string;
  steps: number[]; // 1 for accent, 0.5 for ghost, 0 for silent
  score: string;
}

const RHYTHMS: RhythmPattern[] = [
  { 
    id: 'samba', 
    name: 'Samba Tradicional', 
    genre: 'Samba', 
    description: 'A base do violão brasileiro. Baixaria em tempo forte.', 
    steps: [1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0],
    score: "G2, D3, G2, B2" 
  },
  { 
    id: 'partido-alto', 
    name: 'Partido Alto', 
    genre: 'Samba', 
    description: 'Síncopa quebrada, imitando a palma da mão.', 
    steps: [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
    score: "G2, G3, G2, G3" 
  },
  { 
    id: 'pagode', 
    name: 'Pagode de Mesa', 
    genre: 'Pagode', 
    description: 'Levada de Tantã e Banjo adaptada para os baixos.', 
    steps: [1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1, 0.5, 0, 0.5, 0, 0.5, 1, 0.5],
    score: "C2, G2, C3, G2" 
  },
  { 
    id: 'choro', 
    name: 'Choro Rápido', 
    genre: 'Choro', 
    description: 'Semicolcheias constantes com acento no contratempo.', 
    steps: [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5],
    score: "C2, E2, G2, A2" 
  },
  { 
    id: 'bossa-nova', 
    name: 'Bossa Nova', 
    genre: 'Bossa', 
    description: 'A batida de violão mais famosa do mundo.', 
    steps: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    score: "E2, B2, E2, B2" 
  },
  { 
    id: 'gafieira', 
    name: 'Samba de Gafieira', 
    genre: 'Gafieira', 
    description: 'Balanço sincopado para dança de salão.', 
    steps: [1, 0, 0.5, 0, 0, 0.5, 1, 0, 1, 0, 0.5, 0, 0, 0.5, 1, 0],
    score: "G2, D3, G2, B2" 
  },
  { 
    id: 'forro', 
    name: 'Forró / Baião', 
    genre: 'Forró', 
    description: 'Imitação da Zabumba: Célula Tum-Ta-Tum.', 
    steps: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    score: "G2, D3, G2, D3" 
  },
  { 
    id: 'axe', 
    name: 'Axé Music', 
    genre: 'Axé', 
    description: 'O peso do Samba-Reggae e do surdo virado.', 
    steps: [1, 0.5, 1, 0.5, 0, 0.5, 1, 0, 1, 0.5, 1, 0.5, 0, 0.5, 1, 0],
    score: "C2, C3, C2, C3" 
  },
  { 
    id: 'fricote', 
    name: 'Fricote', 
    genre: 'Axé/Pagode', 
    description: 'Rítmica rápida e cortada, típica da Bahia.', 
    steps: [1, 0, 1, 0, 1, 0.5, 1, 0.5, 1, 0, 1, 0, 1, 0.5, 1, 0.5],
    score: "E2, B2, E2, B2" 
  },
  { 
    id: 'maxixe', 
    name: 'Maxixe', 
    genre: 'Maxixe', 
    description: 'A "Habanera Brasileira", pai do Samba.', 
    steps: [1, 0.5, 0, 1, 1, 0.5, 0, 1, 1, 0.5, 0, 1, 1, 0.5, 0, 1],
    score: "A2, E2, A2, E2" 
  },
];

const RhythmLibrary: React.FC = () => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [bpm, setBpm] = useState(100);
  
  const audioCtx = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef<number>(0);
  const timerID = useRef<number | null>(null);
  const currentStepRef = useRef<number>(0);
  const playingIdRef = useRef<string | null>(null);
  const bpmRef = useRef(bpm);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const playNote = (ctx: AudioContext, freq: number, time: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.15);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol * 0.4, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.2);
  };

  const scheduler = () => {
    if (!audioCtx.current || !playingIdRef.current) return;

    const currentRhythm = RHYTHMS.find(r => r.id === playingIdRef.current);
    if (!currentRhythm) return;
    const pattern = currentRhythm.steps;

    while (nextNoteTime.current < audioCtx.current.currentTime + 0.1) {
      const stepValue = pattern[currentStepRef.current];
      
      if (stepValue > 0) {
        const freq = currentStepRef.current % 4 === 0 ? 150 : 250; 
        playNote(audioCtx.current, freq, nextNoteTime.current, stepValue);
      }
      
      const drawStep = currentStepRef.current;
      const timeToDraw = (nextNoteTime.current - audioCtx.current.currentTime) * 1000;
      
      setTimeout(() => {
          if (playingIdRef.current) setActiveStep(drawStep);
      }, Math.max(0, timeToDraw));
      
      // Cálculo dinâmico do tempo baseado no BPM atual
      const secondsPerStep = (60.0 / bpmRef.current) / 4; 
      nextNoteTime.current += secondsPerStep;
      currentStepRef.current = (currentStepRef.current + 1) % 16;
    }
    
    timerID.current = window.setTimeout(scheduler, 25);
  };

  const toggleRhythm = (rhythm: RhythmPattern) => {
    if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') {
        audioCtx.current.resume();
    }

    if (playingIdRef.current === rhythm.id) {
      setPlayingId(null);
      playingIdRef.current = null;
      setActiveStep(-1);
      if (timerID.current) clearTimeout(timerID.current);
    } else {
      const isSwitching = playingIdRef.current !== null;
      
      setPlayingId(rhythm.id);
      playingIdRef.current = rhythm.id;
      
      if (!isSwitching) {
        currentStepRef.current = 0;
        nextNoteTime.current = audioCtx.current.currentTime + 0.05;
        scheduler();
      }
    }
  };

  const adjustBpm = (amount: number) => {
    setBpm(prev => Math.max(40, Math.min(200, prev + amount)));
  };

  useEffect(() => {
    return () => {
        if (timerID.current) clearTimeout(timerID.current);
        playingIdRef.current = null;
        if (audioCtx.current) audioCtx.current.close();
    };
  }, []);

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-6">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600/20 rounded-xl">
              <Drum className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Biblioteca de Levadas</h3>
              <p className="text-[9px] text-slate-500 font-black uppercase">O DNA do Violão Brasileiro</p>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-amber-600/20" />
        </div>

        {/* CONTROLE DE BPM */}
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tempo Master</span>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => adjustBpm(-5)} 
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-amber-500 active:scale-95 transition-all"
                >
                    <Minus className="w-4 h-4" />
                </button>
                <div className="text-center w-16">
                    <span className="text-xl font-mono font-black text-white">{bpm}</span>
                    <div className="text-[8px] text-slate-600 font-black uppercase">BPM</div>
                </div>
                <button 
                    onClick={() => adjustBpm(5)} 
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-amber-500 active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {RHYTHMS.map((r) => (
            <div key={r.id} className={`bg-black/40 border p-5 rounded-[2rem] transition-all duration-500 group ${playingId === r.id ? 'border-amber-600 shadow-glow bg-amber-600/5' : 'border-white/5 hover:border-white/10'}`}>
              <div className="flex justify-between items-center mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-600/10 px-2 py-0.5 rounded border border-amber-600/20">{r.genre}</span>
                  </div>
                  <h4 className="text-base font-black text-white italic tracking-tight">{r.name}</h4>
                </div>
                <button 
                  onClick={() => toggleRhythm(r)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 ${playingId === r.id ? 'bg-white text-black' : 'bg-amber-600 text-white'}`}
                >
                  {playingId === r.id ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                </button>
              </div>
              
              <div className="grid grid-cols-8 gap-1.5 mb-4">
                {r.steps.map((step, i) => (
                  <div 
                    key={i} 
                    className={`h-2 rounded-full transition-all duration-150 ${
                      playingId === r.id && activeStep === i 
                      ? 'bg-amber-400 scale-y-150 shadow-glow' 
                      : step === 1 
                        ? 'bg-amber-600/60' 
                        : step === 0.5 
                          ? 'bg-amber-600/20' 
                          : 'bg-zinc-800'
                    }`} 
                  />
                ))}
              </div>
              
              <p className="text-[10px] text-slate-500 italic leading-relaxed border-t border-white/5 pt-3">
                {r.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RhythmLibrary;