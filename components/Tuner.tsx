import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, MicOff, Volume2, Activity, PlayCircle, ArrowLeftRight, CheckCircle2, Music } from 'lucide-react';

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
  const wasTunedRef = useRef<boolean>(false);
  
  // Ref para detecção inteligente de violão (estabilidade reforçada)
  const stabilityCounter = useRef<number>(0);
  const lastFrequency = useRef<number>(0);

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

  // Toca o som da corda real com ALTO VOLUME e 5 segundos de duração
  const playStringConfirmation = useCallback((freq: number) => {
    if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioContext.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Mistura de ondas para um som mais encorpado e audível (triângulo + seno)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Volume alto (0.4 de ganho é consideravelmente alto para síntese web)
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05); 
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 5.0); 

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 5.0);
  }, []);

  const playReferenceTone = (freq: number, idx: number) => {
    if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
    
    setTimeout(() => setPlayingRef(null), 1500);
  };

  const autoCorrelate = (buffer: Float32Array, sampleRate: number) => {
    let SIZE = buffer.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / SIZE);
    
    // Sensibilidade ajustada: Ignora barulhos muito baixos, mas capta o vibrato da corda
    if (rms < 0.012) return -1;

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

    // Faixa de frequência otimizada para violão 7 cordas (50Hz a 800Hz)
    if (ac !== -1 && ac > 45 && ac < 900) {
      
      const diffFromLast = Math.abs(ac - lastFrequency.current);
      // Sensibilidade maior para notas graves (differences menores)
      const stabilityThreshold = ac < 100 ? 0.5 : 1.2;

      if (diffFromLast < stabilityThreshold) {
        stabilityCounter.current++;
      } else {
        stabilityCounter.current = 0;
      }
      lastFrequency.current = ac;

      // Filtro de estabilidade: Requer sinal constante típico de cordas
      if (stabilityCounter.current > 2) {
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

        // Tolerância de captura inteligente
        if (minDiff < 50) { 
          setActiveNoteIdx(closestIdx);
          const targetFreq = strings[closestIdx].freq;
          const centsValue = Math.floor(1200 * Math.log2(ac / targetFreq));
          setCents(centsValue);
          
          // ZONA DE PRECISÃO: ±2 cents
          const currentTuned = Math.abs(centsValue) <= 2;
          setIsTuned(currentTuned);

          // Dispara alerta sonoro 5s e feedback visual
          if (currentTuned && !wasTunedRef.current) {
            playStringConfirmation(targetFreq);
          }
          wasTunedRef.current = currentTuned;
        } else {
          setIsTuned(false);
          setCents(0);
          wasTunedRef.current = false;
        }
      }
    } else {
      setDetectedFreq(null);
      setIsTuned(false);
      setCents(0);
      wasTunedRef.current = false;
      stabilityCounter.current = 0;
    }
    animationRef.current = requestAnimationFrame(updatePitch);
  }, [isAutoMode, strings, playStringConfirmation]);

  const toggleAutoMode = async () => {
    if (isAutoMode) {
      setIsAutoMode(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (microphone.current) microphone.current.disconnect();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            } 
        });
        if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 2048;
        
        microphone.current = audioContext.current.createMediaStreamSource(stream);
        microphone.current.connect(analyser.current);
        
        setIsAutoMode(true);
      } catch (err) {
        alert("Acesso ao microfone negado ou não suportado.");
      }
    }
  };

  useEffect(() => {
    if (isAutoMode) updatePitch();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isAutoMode, updatePitch]);

  return (
    <div className={`bg-[#1a0f0a] border transition-all duration-500 rounded-3xl p-5 shadow-2xl relative overflow-hidden ${isTuned ? 'border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.3)]' : 'border-[#3d2516]'}`}>
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${isAutoMode ? 'text-amber-500 animate-pulse' : 'text-slate-600'}`} />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Digital Tuner Professional</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleAutoMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${isAutoMode ? 'bg-amber-600 text-white shadow-glow ring-2 ring-amber-500/20' : 'bg-white/5 text-amber-500 border border-white/10'}`}
            >
              {isAutoMode ? <Mic className="w-3 h-3 animate-pulse" /> : <MicOff className="w-3 h-3" />}
              {isAutoMode ? 'Lutando contra ruído' : 'Ativar Afinador'}
            </button>

            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1 shadow-inner">
              {(['C', 'B', 'A'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSeventhStringMode(mode)}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${seventhStringMode === mode ? 'bg-amber-800 text-white shadow-lg' : 'text-slate-500 hover:text-amber-200'}`}
                >
                  7ª {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visor Digital Principal - Fica verde ao afinar */}
        <div className={`bg-black/90 border-2 transition-all duration-300 rounded-2xl p-6 flex flex-col items-center gap-2 backdrop-blur-md min-h-[160px] justify-center relative group shadow-2xl ${isTuned ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.4)] bg-green-950/20' : 'border-white/5'}`}>
          
          {/* Luz de Status */}
          <div className="absolute top-3 left-4 flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${isTuned ? 'bg-green-500 shadow-glow animate-ping' : isAutoMode ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
             <span className={`text-[8px] font-black uppercase tracking-widest ${isTuned ? 'text-green-500' : 'text-slate-600'}`}>
                {isTuned ? 'PERFEITO' : isAutoMode ? 'Smart Filter v3.5' : 'DESLIGADO'}
             </span>
          </div>

          {!isAutoMode && !playingRef ? (
            <div className="text-center space-y-2 opacity-20">
                <Music className="w-10 h-10 mx-auto text-amber-600/20 mb-2" />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Toque o Bordão</p>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between w-full px-4">
                <div className="text-left w-24">
                   <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Corda</div>
                   <div className={`text-lg font-black transition-all ${isTuned ? 'text-green-400 scale-110 shadow-glow' : 'text-white'}`}>
                      {activeNoteIdx !== null ? `${strings[activeNoteIdx].label} (${strings[activeNoteIdx].note})` : '---'}
                   </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className={`text-6xl md:text-8xl font-mono font-black italic tracking-tighter transition-all duration-200 ${isTuned ? 'text-green-500 drop-shadow-[0_0_40px_rgba(34,197,94,1)] animate-pulse scale-105' : 'text-amber-500'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {detectedFreq ? detectedFreq.toFixed(2) : playingRef !== null ? strings[playingRef].freq.toFixed(2) : '000.00'}
                  </div>
                  {/* Label Hz - Fica verde Piscante */}
                  <div className={`text-[10px] font-black tracking-[0.5em] mt-2 transition-all duration-300 ${isTuned ? 'text-green-400 animate-pulse' : 'text-slate-600'}`}>HERTZ (Hz)</div>
                </div>

                <div className="text-right w-24">
                   <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Cents</div>
                   <div className={`text-lg font-black font-mono transition-all ${cents > 0 ? 'text-red-400' : cents < 0 ? 'text-blue-400' : 'text-green-500 scale-110 shadow-glow'}`}>
                      {cents > 0 ? `+${cents}` : cents < 0 ? cents : '0'}
                   </div>
                </div>
              </div>
              
              {/* Barra de Precisão */}
              <div className="w-full h-4 bg-zinc-900 rounded-full relative overflow-hidden border border-white/10 shadow-inner">
                 <div 
                   className={`absolute top-0 bottom-0 transition-all duration-150 ${isTuned ? 'bg-green-400 w-3 shadow-[0_0_20px_rgba(34,197,94,1)]' : 'bg-amber-500 w-1.5'}`}
                   style={{ left: `${50 + (cents / 50) * 50}%`, transform: 'translateX(-50%)' }}
                 />
                 {/* Centro */}
                 <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 -translate-x-1/2" />
                 
                 {/* Zonas de tolerância visíveis */}
                 <div className="absolute top-0 bottom-0 left-[48%] right-[48%] border-x border-white/5 pointer-events-none" />
              </div>
              
              <div className="flex justify-between px-3">
                 <span className="text-[8px] font-black text-blue-500/60 uppercase tracking-tighter italic">Low</span>
                 <div className="flex items-center gap-2">
                    {isTuned && <CheckCircle2 className="w-4 h-4 text-green-500 animate-bounce" />}
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isTuned ? 'text-green-400 scale-125' : 'text-slate-800'}`}>Perfect Match</span>
                 </div>
                 <span className="text-[8px] font-black text-red-500/60 uppercase tracking-tighter italic">High</span>
              </div>
            </div>
          )}
        </div>

        {/* Botões de Referência por Corda */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {strings.map((str, idx) => (
            <button 
              key={idx} 
              onClick={() => playReferenceTone(str.freq, idx)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 group ${activeNoteIdx === idx || playingRef === idx ? 'bg-amber-600/30 border-amber-500 shadow-glow ring-1 ring-amber-500/50' : 'bg-black/60 border-white/5 opacity-40 hover:opacity-100 hover:border-white/10'}`}
            >
              <span className={`text-[8px] font-black uppercase tracking-tighter mb-1 ${activeNoteIdx === idx || playingRef === idx ? 'text-amber-400' : 'text-slate-600'}`}>{str.label}</span>
              <span className={`text-sm font-bold ${activeNoteIdx === idx || playingRef === idx ? 'text-white' : 'text-amber-500/70 group-hover:text-amber-500'}`}>{str.note}</span>
              {playingRef === idx && <div className="w-2 h-2 bg-white rounded-full mt-1 animate-pulse shadow-glow" />}
            </button>
          ))}
        </div>

        <div className="bg-amber-600/5 p-4 rounded-2xl border border-amber-600/10 flex items-center gap-4">
           <div className="w-10 h-10 rounded-full bg-amber-600/10 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-amber-500/40" />
           </div>
           <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-relaxed">
             <span className="text-amber-600">Alta Precisão 7C:</span> Otimizado para Mi (1ª/6ª), Lá (5ª) e os graves profundos da 7ª corda. O sistema filtra ruídos externos para focar no timbre real do violão de nylon.
           </p>
        </div>
      </div>
    </div>
  );
};

export default Tuner;
