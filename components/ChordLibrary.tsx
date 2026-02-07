
import React, { useState, useMemo, useCallback } from 'react';
import { Search, Music, Info, Play, Volume2, Bookmark, Monitor, PenTool } from 'lucide-react';

interface ChordShape {
  name: string;
  tab: string;
  description: string;
  type: 'maior' | 'menor' | 'dominante' | 'diminuto' | 'alterado' | 'especial7';
  frets: number[]; // [7ª, 6ª, 5ª, 4ª, 3ª, 2ª, 1ª]
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
const TYPE_LABELS = {
  maior: "Maiores",
  menor: "Menores",
  dominante: "Sétimas",
  alterado: "Dissonantes",
  diminuto: "Diminutos",
  especial7: "Baixos 7C"
};

const GUITAR_FREQS = [65.41, 82.41, 110.00, 146.83, 196.00, 246.94, 329.63];

const DigitalFretboard: React.FC<{ frets: number[] }> = ({ frets }) => {
  const activeFrets = frets.filter(f => f > 0);
  const startFret = activeFrets.length > 0 ? Math.max(0, Math.min(...activeFrets) - 1) : 0;
  const fretRange = 5;

  return (
    <div className="relative w-full h-48 bg-[#1a110d] rounded-2xl border border-amber-900/20 overflow-hidden shadow-2xl flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
      
      <div className="absolute inset-0 flex justify-between px-8">
        {[...Array(fretRange + 1)].map((_, i) => (
          <div key={i} className="h-full w-[2px] bg-gradient-to-b from-slate-400 to-slate-600 shadow-lg relative">
             <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-600">
               {startFret + i}
             </span>
          </div>
        ))}
      </div>

      <div className="relative w-full h-full flex flex-col justify-between py-2 z-10">
        {frets.map((fret, stringIdx) => {
          const stringNames = ['7C', '6E', '5A', '4D', '3G', '2B', '1E'];
          const isMuted = fret === -1;
          const isOpen = fret === 0;

          return (
            <div key={stringIdx} className="relative w-full h-2 flex items-center">
              <div className={`absolute w-full h-[1px] bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 opacity-60 ${stringIdx < 3 ? 'h-[2px]' : ''}`} />
              <span className="absolute -left-6 text-[8px] font-black text-amber-500/50">{stringNames[stringIdx]}</span>

              {fret !== -1 && (
                <div 
                  className={`absolute w-4 h-4 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isOpen 
                    ? 'left-[-10px] bg-white text-[#1a110d] ring-2 ring-amber-500 shadow-glow' 
                    : 'bg-amber-600 text-white shadow-xl ring-1 ring-white/20'
                  }`}
                  style={fret > 0 ? { left: `${(fret - startFret - 0.5) * (100 / fretRange)}%` } : {}}
                >
                  <span className="text-[7px] font-black">{isOpen ? 'O' : fret}</span>
                </div>
              )}

              {isMuted && (
                <div className="absolute -left-3 text-red-500 font-black text-[10px] opacity-40">X</div>
              )}
            </div>
          );
        }).reverse()} 
      </div>
    </div>
  );
};

const ChordLibrary: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>("C");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'digital' | 'analog'>('digital');
  const [playing, setPlaying] = useState<string | null>(null);

  const playChordSound = useCallback((frets: number[], chordName: string) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Compressor para "colar" as notas e evitar clipping
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
    compressor.knee.setValueAtTime(40, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(3, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    
    compressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    
    setPlaying(chordName);
    
    frets.forEach((fret, stringIdx) => {
      if (fret === -1) return;
      
      const baseFreq = GUITAR_FREQS[stringIdx];
      const freq = baseFreq * Math.pow(2, fret / 12);
      const isBass = stringIdx < 3;
      // Arpejo natural de polegar e dedos (0.12s entre cordas)
      const startTime = audioCtx.currentTime + (stringIdx * 0.12); 
      const duration = 5.0; // RESSONÂNCIA DE 5 SEGUNDOS REQUERIDA

      // 1. EXCITAÇÃO (PLUCK) - Pulso Orgânico de Ataque
      const attackSize = Math.floor(audioCtx.sampleRate * 0.012);
      const attackBuffer = audioCtx.createBuffer(1, attackSize, audioCtx.sampleRate);
      const attackData = attackBuffer.getChannelData(0);
      for (let i = 0; i < attackSize; i++) {
        // Ruído filtrado para emular o ataque metálico da corda de aço
        attackData[i] = (Math.random() * 2 - 1) * Math.cos((Math.PI * i) / attackSize);
      }
      
      const exciter = audioCtx.createBufferSource();
      exciter.buffer = attackBuffer;
      
      const exciterGain = audioCtx.createGain();
      exciterGain.gain.setValueAtTime(isBass ? 0.35 : 0.25, startTime);
      exciterGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.012);

      // 2. MODELAGEM FÍSICA (DELAY LOOP)
      const delay = audioCtx.createDelay(1/20);
      delay.delayTime.setValueAtTime(1/freq, startTime);
      
      const feedback = audioCtx.createGain();
      // Ajuste preciso para sustentar por exatamente 5 segundos
      const feedbackVal = Math.pow(0.001, (1/freq) / duration);
      feedback.gain.setValueAtTime(feedbackVal, startTime);
      
      // Amortecimento Natural de Aço (Damping)
      const dampFilter = audioCtx.createBiquadFilter();
      dampFilter.type = 'lowpass';
      dampFilter.frequency.setValueAtTime(isBass ? 1800 : 7000, startTime);
      dampFilter.Q.setValueAtTime(0.5, startTime);

      // Loop de Ressonância
      exciter.connect(exciterGain);
      exciterGain.connect(delay);
      delay.connect(dampFilter);
      dampFilter.connect(feedback);
      feedback.connect(delay); 
      
      // 3. RESSONÂNCIA DO CORPO (BODY IMPULSE RESPONSE)
      const woodResonance = audioCtx.createBiquadFilter();
      woodResonance.type = 'peaking';
      woodResonance.frequency.setValueAtTime(isBass ? 92 : 210, startTime);
      woodResonance.gain.setValueAtTime(isBass ? 12 : 5, startTime);
      woodResonance.Q.setValueAtTime(1.8, startTime);

      const filterHigh = audioCtx.createBiquadFilter();
      filterHigh.type = 'lowpass';
      filterHigh.frequency.setValueAtTime(5500, startTime);

      const voiceGain = audioCtx.createGain();
      voiceGain.gain.setValueAtTime(0, startTime);
      voiceGain.gain.linearRampToValueAtTime(isBass ? 0.8 : 0.5, startTime + 0.02);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      delay.connect(woodResonance);
      woodResonance.connect(filterHigh);
      filterHigh.connect(voiceGain);
      voiceGain.connect(compressor);
      
      exciter.start(startTime);
    });

    setTimeout(() => setPlaying(null), 5100);
  }, []);

  const chordsToShow = useMemo(() => {
    let list: ChordShape[] = [];
    if (searchTerm.length > 0) {
      list = Object.values(CHORD_DATA).flat().filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    } else {
      list = (CHORD_DATA[selectedKey] || []);
    }
    if (filterType !== "all") list = list.filter(c => c.type === filterType);
    return list;
  }, [selectedKey, filterType, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-[#0c0604] text-slate-200">
      <div className="p-4 border-b border-white/5 bg-black/40 overflow-x-auto no-scrollbar flex gap-2">
        {KEY_LIST.map(key => (
          <button
            key={key}
            onClick={() => { setSelectedKey(key); setSearchTerm(""); }}
            className={`min-w-[55px] h-12 rounded-2xl text-[11px] font-black transition-all border ${
              selectedKey === key && searchTerm === ""
              ? 'bg-amber-600 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
              : 'bg-white/5 border-white/5 text-slate-500 hover:border-amber-500/30'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input 
              type="text"
              placeholder="Ex: 7M, m7(b5), dim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-11 pr-4 text-xs outline-none focus:ring-1 focus:ring-amber-500 transition-all text-amber-500 font-bold"
            />
          </div>
          
          <div className="flex bg-black/60 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setViewMode('digital')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'digital' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}
              title="Modo Digital"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('analog')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'analog' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}
              title="Modo Analógico"
            >
              <PenTool className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['all', ...Object.keys(TYPE_LABELS)].map((type) => (
            <button 
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap border transition-all ${
                filterType === type ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-transparent border-white/5 text-slate-500'
              }`}
            >
              {type === 'all' ? 'Todos' : TYPE_LABELS[type as keyof typeof TYPE_LABELS]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-1 gap-6 pb-24">
          {chordsToShow.length > 0 ? (
            chordsToShow.map((chord, idx) => (
              <div key={idx} className="bg-[#150d0a] border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-amber-600/30 transition-all shadow-2xl relative">
                <div className="p-6 pb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-4xl font-black text-white italic tracking-tighter group-hover:text-amber-500 transition-colors">
                      {chord.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{chord.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black bg-white/5 border border-white/10 px-3 py-1 rounded-full text-amber-600 uppercase">
                      Aço Premium 7C
                    </span>
                  </div>
                </div>

                <div className="p-6 pt-0 space-y-6">
                  <div className="w-full animate-in fade-in duration-500">
                    {viewMode === 'digital' ? (
                      <DigitalFretboard frets={chord.frets} />
                    ) : (
                      <div className="bg-black/60 p-6 rounded-3xl border border-white/5 font-mono text-base text-amber-500 leading-relaxed tracking-[0.3em] flex items-center justify-center whitespace-pre shadow-inner min-h-[192px]">
                        {chord.tab}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => playChordSound(chord.frets, chord.name)}
                      className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.5rem] text-[11px] font-black uppercase transition-all shadow-xl border ${
                        playing === chord.name ? 'bg-white text-black ring-4 ring-amber-500/20 border-white' : 'bg-amber-600 border-amber-500 text-white active:scale-95'
                      }`}
                    >
                      {playing === chord.name ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5 fill-current" />}
                      {playing === chord.name ? "Ressonância 5s..." : "Ouvir Acorde (Aço)"}
                    </button>
                    
                    <button className="p-5 bg-white/5 rounded-[1.5rem] text-slate-500 hover:text-amber-500 border border-white/5 transition-all">
                      <Bookmark className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-amber-900/5 rounded-2xl border border-amber-600/10">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                      Dica: Motor de áudio modelado para cordas de aço com sustain longo e harmônicos naturais.
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest opacity-30">
              <Music className="w-10 h-10 mb-2" />
              Nenhum acorde encontrado
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-black/60 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Acoustic Engine v12.0</span>
        </div>
        <div className="text-[8px] font-black text-amber-600 uppercase tracking-widest">5s High Fidelity Steel</div>
      </div>
    </div>
  );
};

export default ChordLibrary;
