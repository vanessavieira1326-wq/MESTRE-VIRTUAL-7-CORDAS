
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Search, Play, Volume2, GraduationCap, Music, Info, Filter } from 'lucide-react';
import { ChordShape } from '../services/geminiService';

// Frequências para Violão de 7 Cordas (Afinação em B: B1=61.74, E2=82.41, A2=110.00, D3=146.83, G3=196.00, B3=246.94, E4=329.63)
const GUITAR_FREQS = [61.74, 82.41, 110.00, 146.83, 196.00, 246.94, 329.63];
const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

type ChordCategory = 'Maior' | 'Menor' | 'Dominante' | 'Diminuto' | 'Alterado' | 'Sus/Inv';

const CHORD_CATEGORIES: ChordCategory[] = ['Maior', 'Menor', 'Dominante', 'Diminuto', 'Alterado', 'Sus/Inv'];

interface ExtendedChordShape extends ChordShape {
  category: ChordCategory;
}

/**
 * Biblioteca de formas (shapes) regionais para 7 cordas.
 * Frets: [7ª, 6ª, 5ª, 4ª, 3ª, 2ª, 1ª]
 * Baseado no Root 'C' na 7ª corda (casa 1) ou 5ª corda (casa 3).
 */
const generateChordLibrary = (): Record<string, ExtendedChordShape[]> => {
  const data: Record<string, ExtendedChordShape[]> = {};

  const templateShapes: Record<string, { category: ChordCategory, suffix: string, frets: number[], description: string }> = {
    // --- MAIORES ---
    "7M": { category: 'Maior', suffix: "7M", frets: [1, -1, 2, 2, 0, 1, -1], description: "Sétima Maior (Regional)" },
    "6": { category: 'Maior', suffix: "6", frets: [1, -1, 2, 2, 2, 1, -1], description: "Sexta Maior" },
    "69": { category: 'Maior', suffix: "6/9", frets: [1, 3, 2, 2, 3, 3, -1], description: "Sexta e Nona" },
    "add9": { category: 'Maior', suffix: "add9", frets: [1, 3, 3, 2, 0, 3, -1], description: "Nona Adicionada" },
    "7M9": { category: 'Maior', suffix: "7M(9)", frets: [-1, 1, 3, 2, 3, 1, -1], description: "Sétima Maior e Nona" },

    // --- MENORES ---
    "m7": { category: 'Menor', suffix: "m7", frets: [1, -1, 1, 1, 1, 1, -1], description: "Menor com Sétima" },
    "m6": { category: 'Menor', suffix: "m6", frets: [1, -1, 1, 2, 1, 1, -1], description: "Menor com Sexta" },
    "m79": { category: 'Menor', suffix: "m7(9)", frets: [1, -1, 1, 1, 1, 3, -1], description: "Menor com Nona" },
    "m711": { category: 'Menor', suffix: "m7(11)", frets: [1, -1, 1, 3, 1, 1, -1], description: "Menor com Décima Primeira" },
    "m7M": { category: 'Menor', suffix: "m(7M)", frets: [1, -1, 2, 1, 1, 1, -1], description: "Menor com Sétima Maior" },

    // --- DOMINANTES ---
    "7": { category: 'Dominante', suffix: "7", frets: [1, -1, 2, 1, 2, 1, -1], description: "Sétima Dominante" },
    "9": { category: 'Dominante', suffix: "9", frets: [1, -1, 1, 1, 2, 2, -1], description: "Nona Dominante" },
    "13": { category: 'Dominante', suffix: "13", frets: [1, -1, 1, 2, 2, 1, -1], description: "Décima Terceira" },
    "7b9": { category: 'Dominante', suffix: "7(b9)", frets: [1, -1, 1, 2, 1, 2, -1], description: "Sétima e Nona Bemol" },
    "7#9": { category: 'Dominante', suffix: "7(#9)", frets: [1, -1, 1, 1, 2, 4, -1], description: "Sétima e Nona Aumentada" },
    "7b13": { category: 'Dominante', suffix: "7(b13)", frets: [1, -1, 1, 2, 2, 0, -1], description: "Sétima e 13ª Bemol" },

    // --- DIMINUTOS ---
    "dim": { category: 'Diminuto', suffix: "º", frets: [1, -1, 2, 1, 2, 1, -1], description: "Diminuto" },
    "m7b5": { category: 'Diminuto', suffix: "m7(b5)", frets: [1, -1, 1, 1, 1, 1, -1], description: "Meio-Diminuto" },

    // --- ALTERADOS ---
    "7alt": { category: 'Alterado', suffix: "7(alt)", frets: [1, -1, 1, 2, 2, 2, -1], description: "Acorde Alterado" },
    "7#5": { category: 'Alterado', suffix: "7(#5)", frets: [1, -1, 1, 1, 1, 2, -1], description: "Sétima e 5ª Aumentada" },
    "7b5": { category: 'Alterado', suffix: "7(b5)", frets: [1, -1, 1, 1, 0, 1, -1], description: "Sétima e 5ª Bemol" },
    "aug": { category: 'Alterado', suffix: "aug", frets: [1, -1, 2, 1, 1, 1, -1], description: "Tríade Aumentada" },

    // --- SUS / INVERSÕES ---
    "sus4": { category: 'Sus/Inv', suffix: "sus4", frets: [1, 3, 3, 3, 1, 1, -1], description: "Quarta Suspensa" },
    "7sus4": { category: 'Sus/Inv', suffix: "7sus4", frets: [1, -1, 3, 1, 1, 1, -1], description: "Sétima e 4ª Suspensa" },
    "inv3": { category: 'Sus/Inv', suffix: "/E", frets: [5, -1, 3, 3, 2, 1, -1], description: "Baixo na 3ª" },
    "inv5": { category: 'Sus/Inv', suffix: "/G", frets: [8, -1, 3, 3, 2, 1, -1], description: "Baixo na 5ª" },
  };

  NOTE_NAMES.forEach((root, keyIdx) => {
    data[root] = Object.entries(templateShapes).map(([typeKey, template]) => {
      // Transposição: Se 'C' (casa 1) é Root, então 'D' é casa 3.
      // Offset de transposição = keyIdx
      const transposedFrets = template.frets.map(f => (f === -1 ? -1 : (f + keyIdx)));
      const t = (f: number) => (f === -1 ? 'x' : f.toString());
      
      return {
        name: `${root}${template.suffix}`,
        type: template.category === 'Maior' ? 'maior' : template.category === 'Menor' ? 'menor' : 'dominante',
        tab: `E|--${t(transposedFrets[6])}--|\nB|--${t(transposedFrets[5])}--|\nG|--${t(transposedFrets[4])}--|\nD|--${t(transposedFrets[3])}--|\nA|--${t(transposedFrets[2])}--|\nE|--${t(transposedFrets[1])}--|\nB|--${t(transposedFrets[0])}--|`,
        description: template.description,
        frets: transposedFrets,
        category: template.category
      };
    });
  });

  return data;
};

const CHORD_DATA = generateChordLibrary();

const ChordLibrary: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>("C");
  const [selectedCategory, setSelectedCategory] = useState<ChordCategory | 'Todos'>('Todos');
  const [searchTerm, setSearchTerm] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  /**
   * Síntese de áudio aprimorada para realismo.
   */
  const playNote = (ctx: AudioContext, freq: number, startTime: number, duration: number, isBass: boolean) => {
    const mainOsc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    mainOsc.type = 'triangle';
    subOsc.type = 'sine';

    mainOsc.frequency.setValueAtTime(freq, startTime);
    subOsc.frequency.setValueAtTime(freq, startTime);

    // Filter nylon feel
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBass ? 1200 : 3500, startTime);
    filter.frequency.exponentialRampToValueAtTime(100, startTime + duration);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(isBass ? 0.35 : 0.2, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    mainOsc.connect(gainNode);
    subOsc.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(ctx.destination);

    mainOsc.start(startTime);
    subOsc.start(startTime);
    mainOsc.stop(startTime + duration);
    subOsc.stop(startTime + duration);
  };

  const playChord = useCallback((chord: ExtendedChordShape) => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    setPlaying(chord.name);

    // Palhetada/Dedilhado regional: Polegar na 7ª corda seguido das demais
    chord.frets.forEach((f, i) => {
      if (f !== -1) {
        const freq = GUITAR_FREQS[i] * Math.pow(2, f / 12);
        // Pequeno atraso para soar como um violão real sendo tocado (strumming)
        playNote(ctx, freq, ctx.currentTime + (i * 0.04), 2.5, i < 3);
      }
    });

    setTimeout(() => setPlaying(null), 3000);
  }, []);

  const chordsToShow = useMemo(() => {
    let list = searchTerm 
      ? Object.values(CHORD_DATA).flat().filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : (CHORD_DATA[selectedKey] || []);
    
    if (selectedCategory !== 'Todos') {
      list = list.filter(c => c.category === selectedCategory);
    }
    
    return list;
  }, [selectedKey, searchTerm, selectedCategory]);

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-[2.5rem] p-4 md:p-8 shadow-2xl relative overflow-hidden flex flex-col gap-6 border-b-8">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-600/20 rounded-2xl">
              <GraduationCap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm md:text-xl font-black uppercase tracking-widest text-white italic">Biblioteca Harmônica Master</h3>
              <p className="text-[10px] text-amber-500/50 font-black uppercase tracking-[0.2em] mt-0.5">Voicings e Acordes de Regional</p>
            </div>
          </div>
        </div>

        {/* Seleção de Tonalidade */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar scroll-smooth">
            {NOTE_NAMES.map(key => (
              <button 
                key={key} 
                onClick={() => { setSelectedKey(key); setSearchTerm(""); }} 
                className={`min-w-[54px] h-14 rounded-2xl text-sm font-black border transition-all shrink-0 shadow-lg ${selectedKey === key ? 'bg-amber-600 border-amber-500 text-white scale-110' : 'bg-black/40 border-white/5 text-slate-500 hover:text-amber-200'}`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {['Todos', ...CHORD_CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as any)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border transition-all ${selectedCategory === cat ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-glow' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-amber-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome (ex: G7, Dm7, C#º)..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-black/60 border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-sm text-amber-500 font-bold outline-none focus:border-amber-600 transition-all placeholder:text-zinc-800 shadow-inner" 
            />
          </div>
        </div>

        {/* Lista de Acordes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar pb-10">
          {chordsToShow.map((chord, idx) => (
            <div key={idx} className="bg-zinc-950/60 border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-5 hover:border-amber-600/40 transition-all group shadow-3xl hover:-translate-y-1 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-1">{chord.name}</h4>
                  <div className="text-[8px] font-black text-amber-500/40 uppercase tracking-[0.1em]">{chord.description}</div>
                </div>
                <div className="p-2 bg-white/5 rounded-full">
                   <Music className="w-4 h-4 text-amber-500/20" />
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                 <pre className="text-[11px] font-mono text-amber-400/80 bg-black/90 p-4 rounded-3xl border border-white/10 leading-none text-center shadow-inner tracking-widest">
                    {chord.tab}
                 </pre>
              </div>

              <button 
                onClick={() => playChord(chord)} 
                disabled={playing === chord.name}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl active:scale-95 group/btn ${playing === chord.name ? 'bg-white text-black ring-4 ring-white/10' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
              >
                {playing === chord.name ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4 fill-current group-hover/btn:scale-110 transition-transform" />}
                Ouvir Acorde
              </button>
            </div>
          ))}
          
          {chordsToShow.length === 0 && (
            <div className="col-span-full py-24 text-center opacity-20">
              <Filter className="w-16 h-16 mx-auto mb-4" />
              <p className="font-black uppercase tracking-widest text-xs">Ajuste os filtros ou mude a tonalidade</p>
            </div>
          )}
        </div>

        {/* Dica Técnica */}
        <div className="mt-4 p-5 bg-amber-600/5 rounded-3xl border border-amber-600/10 flex items-start gap-4">
           <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
           <p className="text-[10px] text-slate-400 leading-relaxed italic">
             <span className="text-amber-500 font-black uppercase">Dica:</span> Use o botão "Ouvir Acorde" para conferir a sonoridade correta de cada voicing regional. O som foi afinado para simular o brilho do nylon em um violão de 7 cordas profissional.
           </p>
        </div>
      </div>
    </div>
  );
};

export default ChordLibrary;
