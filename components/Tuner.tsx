
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, MicOff, Volume2, Activity, PlayCircle, ArrowLeftRight } from 'lucide-react';

interface TuningNote {
  label: string;
  note: string;
  freq: number;
}

const Tuner: React.FC = () => {
  const [activeNoteIdx, setActiveNoteIdx] = useState<number | null>(null);
  const [seventhStringMode, setSeventhStringMode] = useState<'C' | 'B' | 'A'>('B');
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [detectedFreq, setDetectedFreq] = useState<number | null>(null);
  const [isTuned, setIsTuned] = useState(false);
  const [playingRef, setPlayingRef] = useState<number | null>(null);
  const [cents, setCents] = useState<number>(0);

  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const strings = useMemo(() => {
    const base = [
      { label: '1ª', note: 'E', freq: 329.63 },
      { label: '2ª', note: 'B', freq: 246.94 },
      { label: '3ª', note: 'G', freq: 196.00 },
      { label: '4ª', note: 'D', freq: 146.83 },
      { label: '5ª', note: 'A', freq: 110.00 },
      { label: '6ª', note: 'E', freq: 82.41 },
    ];
    const seventh = seventhStringMode === 'C' ? { label: '7ª', note: 'C', freq: 65.41 } :
                   seventhStringMode === 'A' ? { label: '7ª', note: 'A', freq: 55.00 } :
                   { label: '7ª', note: 'B', freq: 61.74 };
    return [...base, seventh];
  }, [seventhStringMode]);

  const playReferenceTone = (freq: number, idx: number) => {
    if (!audioContext.current) audioContext.current = new AudioContext();
    const ctx = audioContext.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (playingRef === idx) {
        setPlayingRef(null);
        return;
    }

    setPlayingRef(idx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 2.0);
    
    setTimeout(() => setPlayingRef(null), 2000);
  };

  const autoCorrelate = (buffer: Float32Array, sampleRate: number) => {
    let SIZE = buffer.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / SIZE);
    
    // Limiar RMS reduzido para captar melhor a vibração da 1ª corda
    if (rms < 0.003) return -1;

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buffer = buffer.slice(r1, r2);
    SIZE = buffer.length;

    let c = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++)
      for (let j = 0; j < SIZE - i; j++)
        c[i] = c[i] + buffer[j] * buffer[j + i];

    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    
    if (maxpos === -1) return -1;
    
    let x1 = c[maxpos - 1], x2 = c[maxpos], x3 = c[maxpos + 1];
    let a = (x1 + x3 - 2 * x2) / 2;
    let b = (x3 - x1) / 2;
    if (a) maxpos = maxpos - b / (2 * a);

    return sampleRate / maxpos;
  };

  const updatePitch = useCallback(() => {
    if (!analyser.current || !audioContext.current || !isAutoMode) return;
    
    const buffer = new Float32Array(2048);
    analyser.current.getFloatTimeDomainData(buffer);
    const ac = autoCorrelate(buffer, audioContext.current.sampleRate);

    // Range expandido para garantir captura da 1ª corda e seus harmônicos
    if (ac !== -1 && ac > 40 && ac < 1000) {
      setDetectedFreq(ac);
      let closestIdx = 0;
      let minDiff = Infinity;
      
      strings.forEach((str, idx) => {
        const diff = Math.abs(ac - str.freq);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      // Tolerância aumentada para facilitar a detecção da corda correta
      if (minDiff < 45) { 
        setActiveNoteIdx(closestIdx);
        
        const targetFreq = strings[closestIdx].freq;
        const centsValue = Math.floor(1200 * Math.log2(ac / targetFreq));
        setCents(centsValue);
        setIsTuned(Math.abs(centsValue) <= 2); 
      } else {
        setIsTuned(false);
        setCents(0);
      }
    } else {
      setDetectedFreq(null);
      setIsTuned(false);
      setCents(0);
    }
    animationRef.current = requestAnimationFrame(updatePitch);
  }, [isAutoMode, strings]);

  const toggleAutoMode = async () => {
    if (isAutoMode) {
      setIsAutoMode(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (microphone.current) microphone.current.disconnect();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!audioContext.current) audioContext.current = new AudioContext();
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 2048;
        
        microphone.current = audioContext.current.createMediaStreamSource(stream);
        microphone.current.connect(analyser.current);
        
        setIsAutoMode(true);
      } catch (err) {
        alert("Erro ao acessar microfone. Verifique as permissões.");
      }
    }
  };

  useEffect(() => {
    if (isAutoMode) updatePitch();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isAutoMode, updatePitch]);

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Afinador Digital Master</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleAutoMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${isAutoMode ? 'bg-amber-600 text-white shadow-glow' : 'bg-white/5 text-amber-500 border border-white/10'}`}
            >
              {isAutoMode ? <Mic className="w-3 h-3 animate-pulse" /> : <MicOff className="w-3 h-3" />}
              {isAutoMode ? 'Afinando...' : 'Modo Digital'}
            </button>

            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
              {(['C', 'B', 'A'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSeventhStringMode(mode)}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${seventhStringMode === mode ? 'bg-amber-800 text-white' : 'text-slate-500 hover:text-amber-200'}`}
                >
                  7ª {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visor Digital - Ajustado para exibir Mi 1ª Corda (329.63Hz) */}
        <div className="bg-black/80 border border-white/5 rounded-2xl p-6 flex flex-col items-center gap-2 backdrop-blur-md min-h-[140px] justify-center relative group shadow-inner">
          {!isAutoMode && !playingRef ? (
            <div className="text-center space-y-2 opacity-50">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Inicie o monitoramento digital</p>
                <div className="flex items-center justify-center gap-2 text-amber-600/20">
                    <Activity className="w-4 h-4" />
                    <span className="text-[8px] font-black uppercase">Frequência Master (Hz)</span>
                </div>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between w-full px-2">
                <div className="text-left">
                   <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Corda</div>
                   <div className="text-sm font-black text-white">{activeNoteIdx !== null ? `${strings[activeNoteIdx].label} (${strings[activeNoteIdx].note})` : '---'}</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className={`text-5xl md:text-7xl font-mono font-black italic tracking-tighter transition-all duration-300 ${isTuned ? 'text-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'text-amber-500'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {detectedFreq ? detectedFreq.toFixed(2) : playingRef !== null ? strings[playingRef].freq.toFixed(2) : '000.00'}
                  </div>
                  <div className="text-[10px] font-black text-slate-600 tracking-widest mt-1">HERTZ (Hz)</div>
                </div>

                <div className="text-right">
                   <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Offset</div>
                   <div className={`text-sm font-black font-mono ${cents > 0 ? 'text-red-400' : cents < 0 ? 'text-blue-400' : 'text-green-500'}`}>
                      {cents > 0 ? `+${cents}` : cents < 0 ? cents : '0'} ct
                   </div>
                </div>
              </div>
              
              <div className="w-full h-2 bg-zinc-900 rounded-full relative overflow-hidden border border-white/5">
                 <div 
                   className={`absolute top-0 bottom-0 transition-all duration-300 ${isTuned ? 'bg-green-500 w-1.5 shadow-glow' : 'bg-amber-500 w-1'}`}
                   style={{ left: `${50 + (cents / 50) * 50}%` }}
                 />
                 <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 -translate-x-1/2" />
              </div>
              <div className="flex justify-between px-2">
                 <span className="text-[7px] font-black text-blue-500/50 uppercase italic">Bemol</span>
                 <span className="text-[7px] font-black text-green-500/80 uppercase italic tracking-widest">OK</span>
                 <span className="text-[7px] font-black text-red-500/50 uppercase italic">Sustenido</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {strings.map((str, idx) => (
            <button 
              key={idx} 
              onClick={() => playReferenceTone(str.freq, idx)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${activeNoteIdx === idx || playingRef === idx ? 'bg-amber-600/20 border-amber-500 shadow-glow' : 'bg-black/40 border-white/5 opacity-40 hover:opacity-100'}`}
            >
              <span className={`text-[9px] font-black uppercase tracking-tighter mb-1 ${activeNoteIdx === idx || playingRef === idx ? 'text-amber-400' : 'text-slate-500'}`}>{str.label}</span>
              <span className={`text-sm font-bold ${activeNoteIdx === idx || playingRef === idx ? 'text-white' : 'text-amber-500/70'}`}>{str.note}</span>
              {playingRef === idx && <PlayCircle className="w-3 h-3 text-white mt-1 animate-pulse" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tuner;
