
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Search, Music, Play, Volume2, Sparkles, Zap, Award } from 'lucide-react';

interface ChordShape {
  name: string;
  tab: string;
  description: string;
  type: 'maior' | 'menor' | 'dominante' | 'diminuto' | 'alterado' | 'especial7';
  frets: number[]; 
}

// Frequências base para Violão 7 Cordas (Si, Mi, Lá, Ré, Sol, Si, Mi)
const GUITAR_FREQS = [61.74, 82.41, 110.00, 146.83, 196.00, 246.94, 329.63];

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
    "m(7M)": { type: "menor", frets: [0, 0, 2, 1, 1, 0, 0], desc: "Menor com sétima maior (Dino)." }
  };

  keys.forEach((root, index) => {
    const offset = index;
    data[root] = Object.entries(baseShapes).map(([suffix, shape]) => {
      const transposed = shape.frets.map(f => (f === -1 ? -1 : (f + offset)));
      const t = (f: number) => (f === -1 ? 'x' : f.toString());
      return {
        name: `${root}${suffix}`,
        type: shape.type,
        tab: `E|--${t(transposed[6])}--|\nB|--${t(transposed[5])}--|\nG|--${t(transposed[4])}--|\nD|--${t(transposed[3])}--|\nA|--${t(transposed[2])}--|\nE|--${t(transposed[1])}--|\nB|--${t(transposed[0])}--|`,
        description: shape.desc,
        frets: transposed
      };
    });
  });
  return data;
};

const CHORD_DATA = getFullChordData();
const KEY_LIST = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const ChordLibrary: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>("C");
  const [searchTerm, setSearchTerm] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const playChordSound = useCallback((frets: number[], chordName: string) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Master Chain Profissional
    const masterGain = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    
    // Configuração de Limiter/Soft Knee para evitar distorção
    limiter.threshold.setValueAtTime(-1, ctx.currentTime);
    limiter.knee.setValueAtTime(0, ctx.currentTime);
    limiter.ratio.setValueAtTime(20, ctx.currentTime);
    limiter.attack.setValueAtTime(0, ctx.currentTime);
    limiter.release.setValueAtTime(0.1, ctx.currentTime);

    masterGain.gain.setValueAtTime(0.4, ctx.currentTime);
    masterGain.connect(limiter);
    limiter.connect(ctx.destination);
    
    setPlaying(chordName);
    
    frets.forEach((fret, strIdx) => {
      if (fret === -1) return;
      
      const freq = GUITAR_FREQS[strIdx] * Math.pow(2, fret / 12);
      const startTime = ctx.currentTime + (strIdx * 0.06); // Arpejo natural
      const duration = 4.0;

      // 1. Exciter: Ruído Rosa Filtrado para o "Ataque do Aço"
      const exciterSamples = Math.floor(ctx.sampleRate * 0.01);
      const exciterBuffer = ctx.createBuffer(1, exciterSamples, ctx.sampleRate);
      const data = exciterBuffer.getChannelData(0);
      for (let i = 0; i < exciterSamples; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (exciterSamples * 0.5));
      }
      
      const source = ctx.createBufferSource();
      source.buffer = exciterBuffer;

      // 2. Linha de Retardo (Física da Corda)
      const delay = ctx.createDelay(0.1);
      delay.delayTime.setValueAtTime(1 / freq, startTime);
      
      const feedback = ctx.createGain();
      // Decay proporcional à frequência (cordas graves duram mais)
      const decayFactor = strIdx < 2 ? 0.994 : 0.985;
      feedback.gain.setValueAtTime(decayFactor, startTime);
      
      // 3. Filtro de Amortecimento (Simula a perda de agudos na vibração)
      const damping = ctx.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.setValueAtTime(strIdx < 3 ? 1500 : 4000, startTime);
      damping.frequency.exponentialRampToValueAtTime(400, startTime + duration);

      // 4. Ressonância de Corpo (Simula o Violão de Madeira)
      const bodyRes = ctx.createBiquadFilter();
      bodyRes.type = 'peaking';
      bodyRes.frequency.setValueAtTime(strIdx < 2 ? 98 : 196, startTime);
      bodyRes.gain.setValueAtTime(8, startTime);
      bodyRes.Q.setValueAtTime(1.2, startTime);

      // Conexões do Loop Karplus-Strong
      source.connect(delay);
      delay.connect(damping);
      damping.connect(bodyRes);
      bodyRes.connect(feedback);
      feedback.connect(delay); // Loop de Feedback
      
      const outGain = ctx.createGain();
      outGain.gain.setValueAtTime(0, startTime);
      outGain.gain.linearRampToValueAtTime(strIdx < 2 ? 0.8 : 0.5, startTime + 0.005);
      outGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      delay.connect(outGain);
      outGain.connect(masterGain);
      
      source.start(startTime);
    });

    setTimeout(() => setPlaying(null), 4000);
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
          <input type="text" placeholder="Buscar acorde ou baixaria..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-11 pr-4 text-xs text-amber-500 font-bold outline-none focus:border-amber-600/50" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-1 gap-6 pb-24">
          {chordsToShow.map((chord, idx) => (
            <div key={idx} className="bg-[#150d0a] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div>
                  <h3 className="text-4xl font-black text-white italic tracking-tighter">{chord.name}</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{chord.description}</p>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-black bg-amber-600/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-500 uppercase">Physical Model v5</span>
                </div>
              </div>

              <div className="bg-black/60 p-6 rounded-3xl border border-white/5 font-mono text-amber-500/90 whitespace-pre shadow-inner mb-6 text-center leading-relaxed text-sm">
                {chord.tab}
              </div>

              <button 
                onClick={() => playChordSound(chord.frets, chord.name)} 
                className={`w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] text-[11px] font-black uppercase transition-all border ${playing === chord.name ? 'bg-white text-black border-white' : 'bg-amber-600 border-amber-500 text-white active:scale-95 hover:bg-amber-500'}`}
              >
                {playing === chord.name ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5 fill-current" />}
                Ouvir Timbre Real
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChordLibrary;
