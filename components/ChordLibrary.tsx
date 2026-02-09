
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Search, Play, Volume2, Music2, Info, GraduationCap, Award, Zap, ChevronRight } from 'lucide-react';
import { getSmart7Voicing, ChordShape, NoteEvent } from '../services/geminiService';

const GUITAR_FREQS = [61.74, 82.41, 110.00, 146.83, 196.00, 246.94, 329.63];
const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const GREEK_MODES_INFO = {
  "JÔNICO": { name: "I - Jônico", desc: "Alegre (Escala Maior)", intervals: [0, 2, 4, 5, 7, 9, 11, 12], color: "text-blue-400" },
  "DÓRICO": { name: "II - Dórico", desc: "Menor com 6ª Maior", intervals: [0, 2, 3, 5, 7, 9, 10, 12], color: "text-emerald-400" },
  "FRÍGIO": { name: "III - Frígio", desc: "Tensão (2ª Menor)", intervals: [0, 1, 3, 5, 7, 8, 10, 12], color: "text-red-400" },
  "LÍDIO": { name: "IV - Lídio", desc: "Aberto (4ª Aumentada)", intervals: [0, 2, 4, 6, 7, 9, 11, 12], color: "text-cyan-400" },
  "MIXOLÍDIO": { name: "V - Mixolídio", desc: "Dominante (7ª Menor)", intervals: [0, 2, 4, 5, 7, 9, 10, 12], color: "text-amber-400" },
  "EÓLIO": { name: "VI - Eólio", desc: "Melancólico (Menor Natural)", intervals: [0, 2, 3, 5, 7, 8, 10, 12], color: "text-indigo-400" },
  "LÓCRIO": { name: "VII - Lócrio", desc: "Tenso (5ª Diminuta)", intervals: [0, 1, 3, 5, 6, 8, 10, 12], color: "text-purple-400" }
};

const getFullChordData = (): Record<string, ChordShape[]> => {
  const keys = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const data: Record<string, ChordShape[]> = {};

  const baseShapesPerMode: Record<keyof typeof GREEK_MODES_INFO, { suffix: string, type: any, frets: number[] }> = {
    "JÔNICO": { suffix: "7M", type: "maior", frets: [0, 0, 2, 2, 0, 1, 0] },
    "DÓRICO": { suffix: "m7", type: "menor", frets: [0, 0, 2, 0, 1, 0, 0] },
    "FRÍGIO": { suffix: "m7(b9)", type: "menor", frets: [0, 0, 2, 1, 1, 0, 0] },
    "LÍDIO": { suffix: "7M(#11)", type: "maior", frets: [0, 0, 2, 2, 1, 0, 0] },
    "MIXOLÍDIO": { suffix: "7", type: "dominante", frets: [0, 0, 2, 0, 2, 0, 0] },
    "EÓLIO": { suffix: "m", type: "menor", frets: [0, -1, 3, 3, 3, 4, -1] },
    "LÓCRIO": { suffix: "m7(b5)", type: "diminuto", frets: [-1, 0, 1, 0, 1, 0, -1] }
  };

  keys.forEach((root, keyIdx) => {
    data[root] = Object.entries(baseShapesPerMode).map(([modeKey, shape]) => {
      const modeInfo = GREEK_MODES_INFO[modeKey as keyof typeof GREEK_MODES_INFO];
      const transposedFrets = shape.frets.map(f => (f === -1 ? -1 : (f + keyIdx)));
      const t = (f: number) => (f === -1 ? 'x' : f.toString());
      
      // Cálculo das Notas da Escala
      const scaleNotesArr = modeInfo.intervals.map(interval => {
        const noteIdx = (keyIdx + interval) % 12;
        return NOTE_NAMES[noteIdx];
      });

      const scaleEvents: NoteEvent[] = modeInfo.intervals.map((interval, i) => ({
        time: i * 0.25,
        string: 5, 
        fret: interval + keyIdx,
        duration: 0.3
      }));

      return {
        name: `${root}${shape.suffix}`,
        type: shape.type,
        tab: `E|--${t(transposedFrets[6])}--|\nB|--${t(transposedFrets[5])}--|\nG|--${t(transposedFrets[4])}--|\nD|--${t(transposedFrets[3])}--|\nA|--${t(transposedFrets[2])}--|\nE|--${t(transposedFrets[1])}--|\nB|--${t(transposedFrets[0])}--|`,
        description: `Modo: ${modeInfo.name} - ${modeInfo.desc}`,
        frets: transposedFrets,
        scaleNotes: scaleNotesArr.join(" - "),
        scaleTab: `[${modeInfo.intervals.join(' ')}]`,
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
    osc.type = isBass ? 'triangle' : 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(isBass ? 0.35 : 0.15, startTime + 0.015);
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
        playNote(ctx, freq, ctx.currentTime + (i * 0.02), 2.0, i < 3);
      }
    });

    if (chord.scaleEvents) {
        chord.scaleEvents.forEach(e => {
            const freq = GUITAR_FREQS[2] * Math.pow(2, e.fret / 12); 
            playNote(ctx, freq, ctx.currentTime + 1.0 + e.time, 0.45, false);
        });
    }

    setTimeout(() => setPlaying(null), 4500);
  }, []);

  const chordsToShow = useMemo(() => {
    return searchTerm ? Object.values(CHORD_DATA).flat().filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) : (CHORD_DATA[selectedKey] || []);
  }, [selectedKey, searchTerm]);

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-6 border-b-8">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-600/20 rounded-2xl shadow-glow">
              <GraduationCap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Modos Gregos Regional 7C</h3>
              <p className="text-[9px] text-amber-500/50 font-black uppercase tracking-[0.2em] mt-1">Leitura de Notas e Escalas</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {KEY_LIST.map(key => (
              <button 
                key={key} 
                onClick={() => setSelectedKey(key)} 
                className={`min-w-[48px] h-12 rounded-xl text-[10px] font-black border transition-all shrink-0 ${selectedKey === key ? 'bg-amber-600 border-amber-500 text-white shadow-lg scale-110 mx-1' : 'bg-black/40 border-white/5 text-slate-500 hover:text-amber-200'}`}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input 
              type="text" 
              placeholder="Ex: Jônico, Dórico, C7M..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-xs text-amber-500 font-bold outline-none focus:border-amber-600 transition-all placeholder:text-zinc-800" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {chordsToShow.map((chord, idx) => {
            const modeKey = Object.keys(GREEK_MODES_INFO).find(k => chord.description.includes(k)) as keyof typeof GREEK_MODES_INFO;
            const modeColor = GREEK_MODES_INFO[modeKey]?.color || "text-amber-500";

            return (
              <div key={idx} className="bg-black/40 border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-5 hover:border-amber-600/30 transition-all group relative overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-3xl font-black text-white italic tracking-tighter">{chord.name}</h4>
                  <div className={`p-2 rounded-lg bg-zinc-900/50 border border-white/5 ${modeColor}`}>
                    <Music2 className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                   <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                      <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest block mb-2">Notas da Escala</span>
                      <div className={`text-sm font-black tracking-tight ${modeColor} text-center py-1`}>
                         {chord.scaleNotes}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Voicing</span>
                        <pre className="text-[9px] font-mono text-amber-500/70 bg-black/60 p-2 rounded-xl border border-white/5 leading-tight text-center">
                          {chord.tab}
                        </pre>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Intervalos</span>
                        <div className="bg-black/60 p-2 rounded-xl border border-white/5 flex items-center justify-center min-h-[70px]">
                           <span className="text-[10px] font-mono text-zinc-500">{chord.scaleTab}</span>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="bg-zinc-900/20 p-3 rounded-2xl border border-white/5">
                   <p className="text-[10px] text-zinc-400 font-medium leading-tight text-center">
                     {chord.description.split('-')[1]}
                   </p>
                </div>

                <button 
                  onClick={() => playChordAndScale(chord)} 
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl ${playing === chord.name ? 'bg-white text-black scale-95' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
                >
                  {playing === chord.name ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4 fill-current" />}
                  Ouvir Leitura Melódica
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChordLibrary;
