
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Music, Zap } from 'lucide-react';

interface TuningNote {
  label: string;
  note: string;
  freq: number;
  scale: number[];
}

const Tuner: React.FC = () => {
  const [activeNoteIdx, setActiveNoteIdx] = useState<number | null>(null);
  const [seventhStringMode, setSeventhStringMode] = useState<'C' | 'B' | 'A'>('C');
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [detectedFreq, setDetectedFreq] = useState<number | null>(null);
  const [isTuned, setIsTuned] = useState(false);

  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const microphone = useRef<MediaStreamAudioSourceNode | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const isScalingRef = useRef(false);
  const lastTunedNoteRef = useRef<number | null>(null);

  const getNoteData = (label: string, note: string, freq: number): TuningNote => {
    // Escala maior curta para feedback sonoro de sucesso
    const scale = [freq, freq * 1.25, freq * 1.5, freq * 2]; 
    return { label, note, freq, scale };
  };

  const baseStrings = [
    getNoteData('1ª', 'E (Mi)', 329.63),
    getNoteData('2ª', 'B (Si)', 246.94),
    getNoteData('3ª', 'G (Sol)', 196.00),
    getNoteData('4ª', 'D (Ré)', 146.83),
    getNoteData('5ª', 'A (Lá)', 110.00),
    getNoteData('6ª', 'E (Mi)', 82.41),
  ];

  const getSeventhString = (): TuningNote => {
    switch (seventhStringMode) {
      case 'B': return getNoteData('7ª', 'B (Si)', 61.74);
      case 'A': return getNoteData('7ª', 'A (Lá)', 55.00);
      default: return getNoteData('7ª', 'C (Dó)', 65.41);
    }
  };

  const strings = [...baseStrings, getSeventhString()];

  const stopAudio = useCallback(() => {
    if (oscillator.current) {
      oscillator.current.stop();
      oscillator.current.disconnect();
      oscillator.current = null;
    }
  }, []);

  const playSuccessScale = async (notes: number[], index: number) => {
    if (isScalingRef.current || !audioContext.current || lastTunedNoteRef.current === index) return;
    
    isScalingRef.current = true;
    lastTunedNoteRef.current = index;
    
    for (const freq of notes) {
      const osc = audioContext.current.createOscillator();
      const g = audioContext.current.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioContext.current.currentTime);
      g.gain.setValueAtTime(0, audioContext.current.currentTime);
      g.gain.linearRampToValueAtTime(0.2, audioContext.current.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + 0.4);
      
      osc.connect(g);
      g.connect(audioContext.current.destination);
      osc.start();
      osc.stop(audioContext.current.currentTime + 0.5);
      await new Promise(r => setTimeout(r, 150));
    }
    
    isScalingRef.current = false;
  };

  const playReferenceNote = (index: number, freq: number) => {
    if (activeNoteIdx === index && !isAutoMode) {
      stopAudio();
      setActiveNoteIdx(null);
      return;
    }

    stopAudio();
    if (!audioContext.current) audioContext.current = new AudioContext();
    if (audioContext.current.state === 'suspended') audioContext.current.resume();

    const g = audioContext.current.createGain();
    oscillator.current = audioContext.current.createOscillator();
    oscillator.current.type = 'triangle';
    oscillator.current.frequency.setValueAtTime(freq, audioContext.current.currentTime);
    g.gain.setValueAtTime(0, audioContext.current.currentTime);
    g.gain.linearRampToValueAtTime(0.3, audioContext.current.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + 2.0);
    
    oscillator.current.connect(g);
    g.connect(audioContext.current.destination);
    oscillator.current.start();
    setActiveNoteIdx(index);
    setIsAutoMode(false);
  };

  const autoCorrelate = (buffer: Float32Array, sampleRate: number) => {
    let SIZE = buffer.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      let val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.015) return -1; // Sensibilidade de volume

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
    let T0 = maxpos;
    return sampleRate / T0;
  };

  const updatePitch = useCallback(() => {
    if (!analyser.current || !audioContext.current || !isAutoMode) return;
    
    const buffer = new Float32Array(2048);
    analyser.current.getFloatTimeDomainData(buffer);
    const ac = autoCorrelate(buffer, audioContext.current.sampleRate);

    if (ac !== -1 && ac > 40 && ac < 500) {
      setDetectedFreq(ac);
      
      // 1. Identificação automática da corda mais próxima
      let closestIdx = 0;
      let minDiff = Infinity;
      
      strings.forEach((str, idx) => {
        const diff = Math.abs(ac - str.freq);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      // Se a frequência detectada for razoavelmente próxima de alguma corda do violão
      if (minDiff < 30) {
        setActiveNoteIdx(closestIdx);
        
        // 2 & 3. Feedback visual: Verde se afinado (margem de 1.5Hz), Vermelho se não
        const tuned = minDiff < 1.5;
        setIsTuned(tuned);

        // 4. Emite escala se estiver afinado e não estiver tocando uma escala agora
        if (tuned) {
          playSuccessScale(strings[closestIdx].scale, closestIdx);
        } else {
          // Resetar a trava da escala se a nota sair da afinação
          if (minDiff > 3) lastTunedNoteRef.current = null;
        }
      } else {
        // Se o som captado for aleatório, mantemos o estado anterior mas não afinado
        setIsTuned(false);
      }
    } else {
      // Quando não há som, mantemos a corda selecionada mas resetamos a afinação visual
      setIsTuned(false);
      setDetectedFreq(null);
    }
    
    animationRef.current = requestAnimationFrame(updatePitch);
  }, [isAutoMode, strings, isTuned]);

  const toggleAutoMode = async () => {
    if (isAutoMode) {
      setIsAutoMode(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (microphone.current) microphone.current.disconnect();
      setDetectedFreq(null);
      setActiveNoteIdx(null);
      setIsTuned(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!audioContext.current) audioContext.current = new AudioContext();
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 2048;
        microphone.current = audioContext.current.createMediaStreamSource(stream);
        microphone.current.connect(analyser.current);
        setIsAutoMode(true);
        stopAudio();
        // O requestAnimationFrame será chamado dentro de um useEffect para reagir ao isAutoMode
      } catch (err) {
        alert("Erro ao acessar microfone para o afinador.");
      }
    }
  };

  useEffect(() => {
    if (isAutoMode) {
      updatePitch();
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAutoMode, updatePitch]);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-500" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Afinador Inteligente 7C</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleAutoMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                isAutoMode 
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                : 'bg-white/5 text-amber-500 border border-white/10 hover:bg-white/10'
              }`}
            >
              {isAutoMode ? <Mic className="w-3 h-3 animate-pulse" /> : <MicOff className="w-3 h-3" />}
              {isAutoMode ? 'Ouvindo Violão...' : 'Afinar por Som'}
            </button>

            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
              {(['C', 'B', 'A'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setSeventhStringMode(mode);
                    if (activeNoteIdx === 6) stopAudio();
                    lastTunedNoteRef.current = null;
                  }}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${
                    seventhStringMode === mode 
                    ? 'bg-amber-800 text-white shadow-inner' 
                    : 'text-slate-500 hover:text-amber-200'
                  }`}
                >
                  7ª em {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isAutoMode && activeNoteIdx !== null && (
          <div className="bg-black/60 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 backdrop-blur-sm">
            <div className="flex items-center justify-between w-full px-4">
               <div className="text-right font-mono text-[10px] text-slate-500 uppercase">
                 Alvo: {strings[activeNoteIdx].freq.toFixed(1)} Hz
               </div>
               <div className={`text-3xl font-black italic tracking-tighter ${isTuned ? 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}>
                 {detectedFreq ? detectedFreq.toFixed(1) : '---'} Hz
               </div>
               <div className="text-left font-mono text-[10px] text-slate-500 uppercase">
                 {isTuned ? '✓ Afinada!' : 'Ajustando...'}
               </div>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
               <div 
                 className={`h-full transition-all duration-300 ${isTuned ? 'bg-green-500 w-full' : 'bg-red-500 w-[60%] mx-auto rounded-full shadow-[0_0_10px_red]'}`}
               />
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {strings.map((str, idx) => {
            const isActive = activeNoteIdx === idx;
            const tuningColorClass = isAutoMode && isActive 
              ? (isTuned ? 'bg-green-600/20 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-105' : 'bg-red-600/10 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]')
              : (isActive ? 'bg-amber-600/20 border-amber-500' : 'bg-black/40 border-white/5');

            return (
              <button
                key={idx}
                onClick={() => isAutoMode ? setActiveNoteIdx(idx) : playReferenceNote(idx, str.freq)}
                className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${tuningColorClass}`}
              >
                <span className={`text-[9px] font-black uppercase tracking-tighter mb-1 transition-colors ${
                  isActive ? (isAutoMode && isTuned ? 'text-green-400' : (isAutoMode ? 'text-red-400' : 'text-amber-400')) : 'text-slate-500'
                }`}>
                  {str.label}
                </span>
                <span className={`text-sm font-bold transition-colors ${
                  isActive ? 'text-white scale-110' : 'text-amber-500/70'
                }`}>
                  {str.note.split(' ')[0]}
                </span>
                <div className={`mt-2 w-full h-1 rounded-full transition-all ${
                  isActive 
                    ? (isAutoMode && isTuned ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : (isAutoMode ? 'bg-red-500 animate-pulse' : 'bg-amber-500')) 
                    : 'bg-white/5'
                }`}></div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5">
            <Zap className="w-3 h-3 text-amber-500" />
            <p className="text-[9px] text-slate-400 font-medium">
              {isAutoMode 
                ? "Toque a corda: o app identifica sozinho. Verde = OK!" 
                : "Manual: Clique para ouvir o som de referência."}
            </p>
          </div>
          {(activeNoteIdx !== null && !isAutoMode) && (
            <button 
              onClick={() => { stopAudio(); setActiveNoteIdx(null); }}
              className="flex items-center gap-1 text-[9px] font-black uppercase text-red-500 hover:text-red-400 transition-colors bg-red-500/10 px-2 py-1 rounded-lg"
            >
              <VolumeX className="w-3 h-3" /> Silenciar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tuner;
