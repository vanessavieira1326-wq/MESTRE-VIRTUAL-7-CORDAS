
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sliders, Mic2, Music2, Drum, Guitar, Layers, 
  Play, Pause, Download, Share2, Loader2, 
  Sparkles, AlertCircle, Volume2, VolumeX,
  Target, FileAudio, Save, Square, Zap, Activity,
  Maximize2
} from 'lucide-react';
import { extractBaixariasFromTrack, BaixariaAnalysis } from '../services/geminiService';

interface StemChannel {
  id: string;
  name: string;
  icon: React.ElementType;
  volume: number;
  isMuted: boolean;
  color: string;
  freqRange: [number, number]; // [Centro de freq, Fator Q]
}

const INITIAL_STEMS: StemChannel[] = [
  { id: 'vocals', name: 'Voz', icon: Mic2, volume: 80, isMuted: false, color: 'text-blue-400', freqRange: [1500, 0.7] },
  { id: 'drums', name: 'Bateria', icon: Drum, volume: 80, isMuted: false, color: 'text-purple-400', freqRange: [6000, 0.5] },
  { id: 'bass', name: 'Baixo', icon: Layers, volume: 80, isMuted: false, color: 'text-green-400', freqRange: [100, 0.8] },
  { id: 'guitar', name: 'Violão 7C', icon: Guitar, volume: 100, isMuted: false, color: 'text-amber-500', freqRange: [280, 1.5] },
  { id: 'others', name: 'Outros', icon: Music2, volume: 60, isMuted: false, color: 'text-slate-400', freqRange: [1000, 0.2] },
];

const StemStudio: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [stems, setStems] = useState<StemChannel[]>(INITIAL_STEMS);
  const [masterVolume, setMasterVolume] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [results, setResults] = useState<BaixariaAnalysis[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [rxMasterMode, setRxMasterMode] = useState(true);
  
  // Audio Web API Engine Refs
  const audioCtx = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const gainNodes = useRef<Record<string, GainNode>>({});
  const filterNodes = useRef<Record<string, BiquadFilterNode>>({});
  const masterGainNode = useRef<GainNode | null>(null);
  const masterCompressor = useRef<DynamicsCompressorNode | null>(null);
  const analyserNode = useRef<AnalyserNode | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);
  const startTime = useRef<number>(0);
  const pausedAt = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Inicializa o Motor de Áudio (Cadeia Digital RX8)
  const initAudioEngine = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 1. Analisador de Espectro
      analyserNode.current = audioCtx.current.createAnalyser();
      analyserNode.current.fftSize = 512;
      analyserNode.current.smoothingTimeConstant = 0.8;

      // 2. Master Gain (Controle de Masterização Final)
      masterGainNode.current = audioCtx.current.createGain();
      masterGainNode.current.gain.value = masterVolume / 100;

      // 3. Compressor Dinâmico (Glue Compressor estilo RX8)
      masterCompressor.current = audioCtx.current.createDynamicsCompressor();
      masterCompressor.current.threshold.setValueAtTime(-20, audioCtx.current.currentTime);
      masterCompressor.current.knee.setValueAtTime(30, audioCtx.current.currentTime);
      masterCompressor.current.ratio.setValueAtTime(4, audioCtx.current.currentTime);
      masterCompressor.current.attack.setValueAtTime(0.003, audioCtx.current.currentTime);
      masterCompressor.current.release.setValueAtTime(0.25, audioCtx.current.currentTime);

      // Conexão da Cadeia Final: Compressor -> MasterGain -> Destination
      masterCompressor.current.connect(masterGainNode.current);
      masterGainNode.current.connect(audioCtx.current.destination);

      // Criar Canais (Stems) Independentes
      INITIAL_STEMS.forEach(stem => {
        const gainNode = audioCtx.current!.createGain();
        const filter = audioCtx.current!.createBiquadFilter();
        
        // Isolação Espectral por tipo
        if (stem.id === 'bass') filter.type = 'lowpass';
        else if (stem.id === 'drums') filter.type = 'highpass';
        else filter.type = 'bandpass';

        filter.frequency.value = stem.freqRange[0];
        filter.Q.value = stem.freqRange[1];

        // Inicializa Ganho
        gainNode.gain.value = stem.isMuted ? 0 : Math.pow(stem.volume / 100, 2);
        
        gainNodes.current[stem.id] = gainNode;
        filterNodes.current[stem.id] = filter;

        // Conectar Canal ao Analisador (antes do Compressor)
        filter.connect(gainNode);
        gainNode.connect(analyserNode.current!);
      });

      // Conectar Analisador ao Compressor
      analyserNode.current.connect(masterCompressor.current);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (isPlaying) stopAudio();
      setFile(selectedFile);
      setLoadingAudio(true);
      setResults([]);
      initAudioEngine();

      const arrayBuffer = await selectedFile.arrayBuffer();
      try {
        audioBuffer.current = await audioCtx.current!.decodeAudioData(arrayBuffer);
      } catch (err) {
        console.error("Erro na decodificação do arquivo:", err);
      }
      setLoadingAudio(false);
    }
  };

  const stopAudio = () => {
    sourceNode.current?.stop();
    sourceNode.current = null;
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (!audioCtx.current || !audioBuffer.current) return;

    if (isPlaying) {
      pausedAt.current = audioCtx.current.currentTime - startTime.current;
      stopAudio();
    } else {
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume();

      sourceNode.current = audioCtx.current.createBufferSource();
      sourceNode.current.buffer = audioBuffer.current;
      
      // CRÍTICO: Conecta a fonte APENAS nos filtros. 
      // Não há conexão direta com o destino, garantindo zero leakage.
      Object.keys(filterNodes.current).forEach(id => {
        sourceNode.current!.connect(filterNodes.current[id]);
      });

      const offset = pausedAt.current % audioBuffer.current.duration;
      sourceNode.current.start(0, offset);
      startTime.current = audioCtx.current.currentTime - offset;
      setIsPlaying(true);
      requestAnimationFrame(drawWaveform);
    }
  };

  const drawWaveform = useCallback(() => {
    if (!analyserNode.current || !canvasRef.current || !isPlaying) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      const hue = 30 + (dataArray[i] / 255) * 20; // Variar entre amber e amarelo
      ctx.fillStyle = `hsla(${hue}, 90%, 50%, ${dataArray[i] / 255 + 0.2})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
    if (isPlaying) requestAnimationFrame(drawWaveform);
  }, [isPlaying]);

  // Controle de Volume Digital Preciso (Aumenta e Abaixa Realmente)
  const handleVolumeChange = (id: string, value: number) => {
    setStems(prev => prev.map(s => s.id === id ? { ...s, volume: value, isMuted: value === 0 } : s));
    
    if (gainNodes.current[id] && audioCtx.current) {
      // Curva logarítmica de áudio real: (valor/100)^2
      const gainValue = Math.pow(value / 100, 2); 
      const now = audioCtx.current.currentTime;
      
      // Cancelar automações pendentes e aplicar nova rampa linear para suavidade
      gainNodes.current[id].gain.cancelScheduledValues(now);
      gainNodes.current[id].gain.linearRampToValueAtTime(gainValue, now + 0.05);
    }
  };

  // Master Gain RX8
  const handleMasterVolumeChange = (value: number) => {
    setMasterVolume(value);
    if (masterGainNode.current && audioCtx.current) {
      const gainValue = Math.pow(value / 100, 2) * 1.5; // Multiplicador de masterização
      const now = audioCtx.current.currentTime;
      masterGainNode.current.gain.cancelScheduledValues(now);
      masterGainNode.current.gain.linearRampToValueAtTime(gainValue, now + 0.1);
    }
  };

  const toggleMute = (id: string) => {
    setStems(prev => prev.map(s => {
      if (s.id === id) {
        const newMuted = !s.isMuted;
        const targetVol = newMuted ? 0 : Math.pow(s.volume / 100, 2);
        if (gainNodes.current[id] && audioCtx.current) {
          const now = audioCtx.current.currentTime;
          gainNodes.current[id].gain.cancelScheduledValues(now);
          gainNodes.current[id].gain.linearRampToValueAtTime(targetVol, now + 0.05);
        }
        return { ...s, isMuted: newMuted };
      }
      return s;
    }));
  };

  const analyzePrecisionBaixaria = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const analysis = await extractBaixariasFromTrack(base64Audio, file.type);
        setResults(analysis);
        setIsProcessing(false);
      };
    } catch (error) {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#0f0a08] border border-amber-900/30 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden flex flex-col gap-8 min-h-[750px]">
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
      
      {/* Header RX8 Industrial */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-amber-600 rounded-3xl shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:rotate-12 transition-transform">
            <Sliders className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Estúdio Neural RX8</h3>
            <div className="flex items-center gap-2">
               <Zap className="w-3 h-3 text-amber-500" />
               <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.3em]">Isolação & Masterização Digital</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[8px] font-black text-slate-500 uppercase">Master Gain</span>
            <input 
              type="range" min="0" max="150" value={masterVolume} 
              onChange={(e) => handleMasterVolumeChange(parseInt(e.target.value))}
              className="w-32 accent-amber-500 bg-white/5 rounded-full appearance-none h-1.5"
            />
          </div>
          <button 
            onClick={() => setRxMasterMode(!rxMasterMode)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all text-[10px] font-black uppercase tracking-widest ${rxMasterMode ? 'bg-amber-600 border-amber-500 text-white shadow-glow' : 'border-white/10 text-slate-500'}`}
          >
            <Activity className="w-3 h-3" /> RX MODE
          </button>
        </div>
      </div>

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 border-2 border-dashed border-amber-600/10 rounded-[2.5rem] flex flex-col items-center justify-center p-12 cursor-pointer hover:bg-amber-600/5 transition-all group bg-black/20"
        >
          <div className="p-8 bg-amber-600/10 rounded-full mb-6 group-hover:scale-110 transition-transform ring-4 ring-amber-600/5">
            <FileAudio className="w-16 h-16 text-amber-500" />
          </div>
          <p className="font-black text-slate-100 text-xl uppercase tracking-widest">Carregar Master para Remix</p>
          <p className="text-xs text-slate-500 mt-4 max-w-[320px] text-center font-medium leading-relaxed uppercase tracking-wider">
            Aumente o Violão 7C e abaixe os outros instrumentos digitalmente com precisão de decibéis.
          </p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-10 animate-in fade-in duration-700">
          
          {/* Espectrograma em Tempo Real */}
          <div className="h-48 bg-black/60 rounded-[2rem] border border-white/5 relative flex items-center justify-center overflow-hidden shadow-inner ring-1 ring-white/10">
             <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" width={1000} height={200} />
             <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
             
             {loadingAudio ? (
               <div className="relative z-10 flex flex-col items-center gap-3">
                 <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                 <span className="text-xs font-black text-amber-500 uppercase tracking-widest">Calculando Algoritmo...</span>
               </div>
             ) : (
               <button 
                 onClick={togglePlay}
                 className="relative z-10 p-7 bg-amber-600 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-105 transition-all active:scale-95 group"
               >
                 {isPlaying ? <Square className="w-8 h-8 text-white fill-current" /> : <Play className="w-8 h-8 text-white fill-current ml-1" />}
               </button>
             )}
          </div>

          {/* Mixer de Isolação Digital */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {stems.map((stem) => (
              <div key={stem.id} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-6 group hover:border-amber-600/20 transition-all relative overflow-hidden shadow-xl">
                <div className={`p-4 rounded-2xl bg-black/40 ${stem.color} group-hover:scale-110 transition-transform shadow-inner`}>
                  <stem.icon className="w-6 h-6" />
                </div>
                
                <div className="h-44 w-3 bg-black/60 rounded-full relative flex flex-col justify-end overflow-hidden border border-white/5">
                  <div 
                    className={`w-full transition-all duration-200 ${stem.isMuted ? 'bg-red-900/40' : (stem.id === 'guitar' ? 'bg-gradient-to-t from-amber-700 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-slate-400')}`}
                    style={{ height: `${stem.isMuted ? 0 : stem.volume}%` }}
                  />
                  <input 
                    type="range" min="0" max="100" value={stem.isMuted ? 0 : stem.volume}
                    onChange={(e) => handleVolumeChange(stem.id, parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ writingMode: 'bt-lr' }}
                  />
                </div>

                <div className="flex flex-col items-center gap-2 w-full">
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{stem.name}</span>
                   <div className="flex items-center justify-between w-full px-2">
                      <button 
                        onClick={() => toggleMute(stem.id)}
                        className={`p-2 rounded-xl transition-all ${stem.isMuted ? 'text-red-500 bg-red-500/10' : 'text-slate-600 hover:text-white hover:bg-white/5'}`}
                      >
                        {stem.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <span className="text-[9px] font-mono text-amber-600/80 font-bold">
                        {stem.isMuted ? '-∞' : `${Math.round((stem.volume/100)*12 - 12)}`} dB
                      </span>
                   </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-5 pt-6">
            <button 
              onClick={analyzePrecisionBaixaria}
              disabled={isProcessing || loadingAudio}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 py-5 rounded-3xl flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-95 group"
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Target className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
              )}
              <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Detectar Bordões com IA</span>
            </button>
            
            <button 
              onClick={() => { stopAudio(); setFile(null); pausedAt.current = 0; }}
              className="px-8 py-5 bg-white/5 border border-white/10 rounded-3xl text-slate-400 hover:text-red-500 transition-all text-xs font-black uppercase"
            >
               Reset Estúdio
            </button>
          </div>
        </div>
      )}

      {/* Footer Industrial */}
      <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]' : 'bg-slate-700'}`} />
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.4em]">
            {file ? `MASTER: ${file.name.toUpperCase()}` : 'ENGINE: READY'}
          </span>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-slate-600 uppercase">Bitrate</span>
              <span className="text-[8px] font-black text-amber-600/60 uppercase">Hi-Res 32Bit</span>
           </div>
           <div className="text-[9px] font-black text-amber-600/40 uppercase tracking-[0.3em]">Spectral Precision v9.0 Pro</div>
        </div>
      </div>
    </div>
  );
};

export default StemStudio;
