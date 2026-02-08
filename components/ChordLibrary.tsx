
import React, { useState, useMemo, useCallback } from 'react';
import { Search, Music, Info, Play, Volume2, Bookmark, Monitor, PenTool } from 'lucide-react';

interface ChordShape {
  name: string;
  tab: string;
  description: string;
  type: 'maior' | 'menor' | 'dominante' | 'diminuto' | 'alterado' | 'especial7';
  frets: number[]; 
}

const getFullChordData = (): Record<string, ChordShape[]> => {
  const keys = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const data: Record<string, ChordShape[]> = {};

  const baseShapes: Record<string, { type: 'maior' | 'menor' | 'dominante' | 'diminuto' | 'alterado' | 'especial7', frets: number[], desc: string }> = {
    "7M": { type: "maior", frets: [0, 0, 2, 2, 0, 1, 0], desc: "Sétima Maior brilhante." },
    "6": { type: "maior", frets: [0, 0, 2, 2, 2, 2, -1], desc: "Acorde de Sexta regional." },
    "m7": { type: "menor", frets: [0, 0, 2, 0, 1, 0, 0], desc: "Menor com Sétima clássico." },
    "m6": { type: "menor", frets: [0, 0, 2, 2, 1, 2, -1], desc: "Menor com Sexta de Choro." },
    "7": { type: "dominante", frets: [0, 0, 2, 0, 2, 0, 0], desc: "Dominante de Samba." },
    "7(9)": { type: "dominante", frets: [0, -1, 3, 2, 3, 3, -1], desc: "Sétima e Nona encorpada." },
    "7(b9)": { type: "alterado", frets: [0, -1, 3, 2, 3, 2, -1], desc: "Tensão de Nona Menor." },
    "m7(b5)": { type: "diminuto", frets: [-1, 0, 1, 0, 1, 0, -1], desc: "Meio-diminuto (Cadência)." },
    "dim7": { type: "diminuto", frets: [0, -1, 3, 4, 2, 4, -1], desc: "Diminuto de passagem." },
    "+": { type: "alterado", frets: [0, 0, 2, 1, 1, 0, 0], desc: "Aumentado dramático." },
    "/B": { type: "especial7", frets: [11, -1, 4, 3, 4, 2, -1], desc: "Inversão com Baixo 7C." }
  };

  keys.forEach((root, index) => {
    const offset = index;
    data[root] = Object.entries(baseShapes).map(([suffix, shape]) => {
      const transposed = shape.frets.map(f => (f === -1 ? -1 : (f + offset)));
      const t = (f: number) => (f === -1 ? 'x' : f.toString());
      const chordName = suffix.startsWith('/') ? `${root}${suffix.replace('/', '')}` : `${root}${suffix}`;
      return {
        name: chordName,
        type: shape.type,
        tab: `E|--${t(transposed[6])}--|\nB|--${t(transposed[5])}--|\nG|--${t(transposed[4])}--|\nD|--${t(transposed[3])}--|\nA|--${t(transposed[2])}--|\nE|--${t(transposed[1])}--|\nC|--${t(transposed[0])}--|`,
        description: shape.desc,
        frets: transposed
      };
    });
  });
  return data;
};

const CHORD_DATA = getFullChordData();
const KEY_LIST = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const GUITAR_FREQS = [65.41, 82.41, 110.00, 146.83, 196.00, 246.94, 329.63];

const ChordLibrary: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>("C");
  const [searchTerm, setSearchTerm] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);

  const playChordSound = useCallback((frets: number[], chordName: string) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
    
    // Master Output com Proteção Digital Transparente
    const masterLimiter = ctx.createDynamicsCompressor();
    masterLimiter.threshold.setValueAtTime(-15, ctx.currentTime);
    masterLimiter.ratio.setValueAtTime(4, ctx.currentTime);
    masterLimiter.connect(ctx.destination);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.5, ctx.currentTime);
    masterGain.connect(masterLimiter);
    
    setPlaying(chordName);
    
    frets.forEach((fret, strIdx) => {
      if (fret === -1) return;
      const freq = GUITAR_FREQS[strIdx] * Math.pow(2, fret / 12);
      const startTime = ctx.currentTime + (strIdx * 0.08); // Arpejo Natural
      const duration = 4.5;
      const isBass = strIdx < 3;

      // 1. ATAQUE DINÂMICO
      const attackSamples = Math.floor(ctx.sampleRate * 0.02);
      const attackBuffer = ctx.createBuffer(1, attackSamples, ctx.sampleRate);
      const attackData = attackBuffer.getChannelData(0);
      for (let i = 0; i < attackSamples; i++) {
        const env = Math.pow((attackSamples - i) / attackSamples, 2.5);
        attackData[i] = ((Math.random() * 2 - 1) * 0.15 + Math.sin(i * 0.06) * 0.5) * env;
      }
      const exciter = ctx.createBufferSource();
      exciter.buffer = attackBuffer;

      // 2. MODELAGEM FISICA (Delay Line Ressonante)
      const delay = ctx.createDelay(0.1);
      delay.delayTime.setValueAtTime(1/freq, startTime);
      
      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(Math.pow(0.001, (1/freq) / duration), startTime);
      
      const damping = ctx.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.setValueAtTime(isBass ? 1100 : 4500, startTime);
      damping.frequency.exponentialRampToValueAtTime(150, startTime + duration);

      const bodyRes = ctx.createBiquadFilter();
      bodyRes.type = 'peaking';
      bodyRes.frequency.setValueAtTime(isBass ? 92 : 210, startTime);
      bodyRes.gain.setValueAtTime(10, startTime);
      bodyRes.Q.setValueAtTime(2.0, startTime);

      // Conexões
      exciter.connect(delay);
      delay.connect(damping);
      damping.connect(bodyRes);
      bodyRes.connect(feedback);
      feedback.connect(delay); 
      
      const vGain = ctx.createGain();
      vGain.gain.setValueAtTime(0, startTime);
      vGain.gain.linearRampToValueAtTime(isBass ? 0.7 : 0.4, startTime + 0.015);
      vGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      delay.connect(vGain);
      vGain.connect(masterGain);
      exciter.start(startTime);
    });

    setTimeout(() => setPlaying(null), 5000);
  }, []);

  const chordsToShow = useMemo(() => {
    let list = searchTerm ? Object.values(CHORD_DATA).flat().filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : (CHORD_DATA[selectedKey] || []);
    return list;
  }, [selectedKey, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-[#0c0604] text-slate-200">
      <div className="p-4 border-b border-white/5 bg-black/40 overflow-x-auto no-scrollbar flex gap-2">
        {KEY_LIST.map(key => (
          <button key={key} onClick={() => { setSelectedKey(key); setSearchTerm(""); }} className={`min-w-[55px] h-12 rounded-2xl text-[11px] font-black border transition-all ${selectedKey === key && !searchTerm ? 'bg-amber-600 border-amber-500 text-white shadow-glow' : 'bg-white/5 border-white/5 text-slate-500'}`}>
            {key}
          </button>
        ))}
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input type="text" placeholder="Pesquisar cifra..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-11 pr-4 text-xs text-amber-500 font-bold outline-none focus:ring-1 focus:ring-amber-500" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-1 gap-6 pb-24">
          {chordsToShow.map((chord, idx) => (
            <div key={idx} className="bg-[#150d0a] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative group">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-4xl font-black text-white italic tracking-tighter group-hover:text-amber-500 transition-colors">{chord.name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{chord.description}</p>
                </div>
                <span className="text-[8px] font-black bg-amber-600/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-600 uppercase">Acoustic Pure v5</span>
              </div>

              <div className="bg-black/60 p-6 rounded-3xl border border-white/5 font-mono text-amber-500 whitespace-pre shadow-inner mb-6 text-center leading-relaxed tracking-widest">
                {chord.tab}
              </div>

              <button onClick={() => playChordSound(chord.frets, chord.name)} className={`w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] text-[11px] font-black uppercase transition-all border ${playing === chord.name ? 'bg-white text-black ring-4 ring-amber-500/20' : 'bg-amber-600 border-amber-500 text-white active:scale-95 shadow-xl'}`}>
                {playing === chord.name ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5 fill-current" />}
                Ouvir Acorde
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChordLibrary;
