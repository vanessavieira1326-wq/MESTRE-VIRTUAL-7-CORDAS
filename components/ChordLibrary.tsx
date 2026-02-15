
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Search, Play, Volume2, Music2, GraduationCap, Music } from 'lucide-react';
import { ChordShape, NoteEvent } from '../services/geminiService';

const GUITAR_FREQS = [61.74, 82.41, 110.00, 146.83, 196.00, 246.94, 329.63];
const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const CHORD_TYPES_INFO = {
  "MAIOR_7M": { name: "Maior (7M)", desc: "Escala Maior", intervals: [0, 2, 4, 5, 7, 9, 11, 12], color: "text-blue-400" },
  "MENOR_7": { name: "Menor (m7)", desc: "Escala Menor", intervals: [0, 2, 3, 5, 7, 8, 10, 12], color: "text-emerald-400" },
  "DOMINANTE": { name: "Dominante (7)", desc: "Mixolídio", intervals: [0, 2, 4, 5, 7, 9, 10, 12], color: "text-amber-400" },
  "MENOR_M7": { name: "Menor (m7M)", desc: "Menor Melódica", intervals: [0, 2, 3, 5, 7, 9, 11, 12], color: "text-cyan-400" },
  "DIMINUTO": { name: "Diminuto (º)", desc: "Escala Diminuta", intervals: [0, 2, 3, 5, 6, 8, 9, 11, 12], color: "text-purple-400" },
  "MEIO_DIMINUTO": { name: "Meio-Diminuto (m7b5)", desc: "Escala Locria", intervals: [0, 1, 3, 5, 6, 8, 10, 12], color: "text-indigo-400" }
};

const getFullChordData = (): Record<string, ChordShape[]> => {
  const keys = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const data: Record<string, ChordShape[]> = {};

  const baseShapes: Record<keyof typeof CHORD_TYPES_INFO, { suffix: string, type: any, frets: number[] }> = {
    "MAIOR_7M": { suffix: "7M", type: "maior", frets: [0, 0, 2, 2, 0, 1, 0] },
    "MENOR_7": { suffix: "m7", type: "menor", frets: [0, 0, 2, 0, 1, 0, 0] },
    "DOMINANTE": { suffix: "7", type: "dominante", frets: [0, 0, 2, 0, 2, 0, 0] },
    "MENOR_M7": { suffix: "m7M", type: "menor", frets: [0, 0, 2, 1, 0, 0, 0] },
    "DIMINUTO": { suffix: "dim", type: "diminuto", frets: [-1, 0, 1, 0, 1, 0, -1] },
    "MEIO_DIMINUTO": { suffix: "m7(b5)", type: "diminuto", frets: [-1, 0, 1, 0, 1, 0, -1] }
  };

  keys.forEach((root, keyIdx) => {
    data[root] = Object.entries(baseShapes).map(([typeKey, shape]) => {
      const typeInfo = CHORD_TYPES_INFO[typeKey as keyof typeof CHORD_TYPES_INFO];
      const transposedFrets = shape.frets.map(f => (f === -1 ? -1 : (f + keyIdx)));
      const t = (f: number) => (f === -1 ? 'x' : f.toString());
      
      const scaleNotesArr = typeInfo.intervals.map(interval => {
        const noteIdx = (keyIdx + interval) % 12;
        return NOTE_NAMES[noteIdx];
      });

      const scaleEvents: NoteEvent[] = typeInfo.intervals.map((interval, i) => ({
        time: i * 0.25,
        string: 5, 
        fret: interval + keyIdx,
        duration: 0.3
      }));

      return {
        name: `${root}${shape.suffix}`,
        type: shape.type,
        tab: `E|--${t(transposedFrets[6])}--|\nB|--${t(transposedFrets[5])}--|\nG|--${t(transposedFrets[4])}--|\nD|--${t(transposedFrets[3])}--|\nA|--${t(transposedFrets[2])}--|\nE|--${t(transposedFrets[1])}--|\nB|--${t(transposedFrets[0])}--|`,
        description: `${typeInfo.desc}`,
        frets: transposedFrets,
        scaleNotes: scaleNotesArr.join(" - "),
        scaleTab: `Intervalos: [${typeInfo.intervals.join(', ')}]`,
        scaleEvents: scaleEvents
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

  const playNote = (ctx: AudioContext, freq: number, startTime: number, duration: number, isBass: boolean) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(isBass ? 0.3 : 0.15, startTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const playChordAndScale = useCallback((chord: ChordShape) => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    setPlaying(chord.name);

    chord.frets.forEach((f, i) => {
      if (f !== -1) {
        const freq = GUITAR_FREQS[i] * Math.pow(2, f / 12);
        playNote(ctx, freq, ctx.currentTime + (i * 0.02), 1.5, i < 3);
      }
    });

    if (chord.scaleEvents) {
        chord.scaleEvents.forEach(e => {
            const freq = GUITAR_FREQS[2] * Math.pow(2, e.fret / 12); 
            playNote(ctx, freq, ctx.currentTime + 1.0 + e.time, 0.4, false);
        });
    }

    setTimeout(() => setPlaying(null), 4000);
  }, []);

  const chordsToShow = useMemo(() => {
    return searchTerm ? Object.values(CHORD_DATA).flat().filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : (CHORD_DATA[selectedKey] || []);
  }, [selectedKey, searchTerm]);

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-[2rem] p-4 md:p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 border-b-4">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 rounded-xl">
              <GraduationCap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white italic">Biblioteca Harmônica</h3>
              <p className="text-[8px] md:text-[9px] text-amber-500/50 font-black uppercase tracking-[0.2em] mt-0.5">Dicionário de Acordes e Notas</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
            {KEY_LIST.map(key => (
              <button 
                key={key} 
                onClick={() => setSelectedKey(key)} 
                className={`min-w-[44px] h-11 rounded-xl text-[11px] font-black border transition-all shrink-0 ${selectedKey === key ? 'bg-amber-600 border-amber-500 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-500 hover:text-amber-200'}`}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input 
              type="text" 
              placeholder="Buscar acorde..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-[11px] text-amber-500 font-bold outline-none focus:border-amber-600 transition-all placeholder:text-zinc-800" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
          {chordsToShow.map((chord, idx) => (
            <div key={idx} className="bg-black/40 border border-white/5 rounded-[1.8rem] p-4 flex flex-col gap-4 hover:border-amber-600/30 transition-all group shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-2xl font-black text-white italic tracking-tighter">{chord.name}</h4>
                <div className="text-[10px] font-black text-amber-500/40 uppercase tracking-widest">{chord.description}</div>
              </div>
              
              <div className="flex flex-col gap-2">
                 <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[8px] font-black uppercase text-zinc-700 tracking-widest block mb-1">Escala Relativa</span>
                    <div className="text-[11px] font-black tracking-tight text-amber-400">
                       {chord.scaleNotes}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2">
                    <pre className="text-[9px] font-mono text-amber-500/70 bg-black/60 p-2 rounded-lg border border-white/5 leading-tight text-center">
                      {chord.tab}
                    </pre>
                    <div className="bg-black/60 p-2 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-[7px] font-black uppercase text-zinc-700 mb-1">Especial 7C</span>
                        <span className="text-[9px] font-mono text-zinc-500 leading-tight">{chord.scaleTab}</span>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => playChordAndScale(chord)} 
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg ${playing === chord.name ? 'bg-white text-black' : 'bg-amber-600 text-white'}`}
              >
                {playing === chord.name ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4 fill-current" />}
                Ouvir Acorde & Escala
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChordLibrary;
