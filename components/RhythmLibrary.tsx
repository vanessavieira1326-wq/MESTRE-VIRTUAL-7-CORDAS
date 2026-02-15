import React, { useState, useRef } from 'react';
import { Music, Play, Pause, ChevronRight, Info, Zap, Drum } from 'lucide-react';

interface RhythmPattern {
  id: string;
  name: string;
  genre: string;
  description: string;
  pattern: string; // Representação visual (ex: "X . x x . X . x")
  score: string; // Notas para o sintetizador
}

const RHYTHMS: RhythmPattern[] = [
  { id: 'samba-1', name: 'Samba Tradicional', genre: 'Samba', description: 'O balanço clássico do samba de terreiro.', pattern: "V . ^ V . V ^ .", score: "G2, G3, G3, G2, G3, G3" },
  { id: 'choro-1', name: 'Choro Quadrado', genre: 'Choro', description: 'Levada rítmica constante para acompanhamento de flauta/bandolim.', pattern: "V x ^ x V x ^ x", score: "G2, G2, G3, G2, G3, G2" },
  { id: 'partido-alto', name: 'Partido Alto', genre: 'Samba', description: 'Síncopa acentuada, ideal para rodas de samba.', pattern: ". V . ^ V . ^ V", score: "G2, G3, G2, G3, G2, G3" },
  { id: 'baiao', name: 'Baião Regional', genre: 'Nordestino', description: 'Célula rítmica marcante com foco no grave.', pattern: "V . . v V . . v", score: "G2, G2, G3, G2, G2, G3" },
];

const RhythmLibrary: React.FC = () => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const playRhythm = (rhythm: RhythmPattern) => {
    if (playingId === rhythm.id) {
      setPlayingId(null);
      return;
    }

    if (!audioCtx.current) audioCtx.current = new AudioContext();
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    setPlayingId(rhythm.id);
    const notes = rhythm.score.split(',').map(n => n.trim());
    let currentTime = ctx.currentTime;

    // Loop simples de 4 repetições
    for (let i = 0; i < 4; i++) {
      notes.forEach((n, idx) => {
        const freq = n.includes('2') ? 98 : 196; // G2 ou G3 simplificado
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, currentTime);
        gain.gain.setValueAtTime(0.2, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(currentTime);
        osc.stop(currentTime + 0.2);
        currentTime += 0.25;
      });
    }

    setTimeout(() => setPlayingId(null), notes.length * 250 * 4);
  };

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-600/20 rounded-xl">
            <Drum className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Dicionário de Levadas</h3>
            <p className="text-[9px] text-slate-500 font-black uppercase">A rítmica do violão brasileiro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RHYTHMS.map((r) => (
            <div key={r.id} className="bg-black/40 border border-white/5 p-5 rounded-3xl hover:border-amber-600/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-600/10 px-2 py-1 rounded mb-2 inline-block">{r.genre}</span>
                  <h4 className="text-sm font-black text-white italic">{r.name}</h4>
                </div>
                <button 
                  onClick={() => playRhythm(r)}
                  className={`p-3 rounded-xl transition-all ${playingId === r.id ? 'bg-amber-600 text-white' : 'bg-white/5 text-amber-500 hover:bg-white/10'}`}
                >
                  {playingId === r.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
              </div>
              
              <div className="bg-black/60 p-3 rounded-xl mb-3 border border-white/5">
                <div className="flex justify-between gap-1">
                  {r.pattern.split(' ').map((char, i) => (
                    <span key={i} className={`text-[10px] font-mono font-bold ${char === '.' ? 'text-slate-800' : 'text-amber-500'}`}>
                      {char}
                    </span>
                  ))}
                </div>
              </div>
              
              <p className="text-[10px] text-slate-500 italic leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RhythmLibrary;