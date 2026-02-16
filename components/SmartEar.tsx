import React, { useState, useRef, useEffect } from 'react';
import { Ear, Square, Play, Loader2, Music, Sparkles, AlertCircle, X, FileText, Clipboard, Zap, Award, BookOpen, Lightbulb, Send, Hash, ChevronRight, Volume2 } from 'lucide-react';
import { analyzeBaixaria, generateBaixariaIdeas, BaixariaResponse, TablatureTranscription } from '../services/geminiService';

const NOTE_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const SmartEar: React.FC = () => {
  const [mode, setMode] = useState<'creative' | 'transcribe'>('creative');
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [creativeResult, setCreativeResult] = useState<BaixariaResponse | null>(null);
  const [transcribeResult, setTranscribeResult] = useState<TablatureTranscription | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number>(-1);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNote = (ctx: AudioContext, freq: number, startTime: number, duration: number) => {
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    sub.frequency.setValueAtTime(freq, startTime);

    // Filtro para simular violão de nylon
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, startTime);
    filter.frequency.exponentialRampToValueAtTime(150, startTime + duration);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    sub.start(startTime);
    osc.stop(startTime + duration);
    sub.stop(startTime + duration);
  };

  const playSequence = async (scoreStr: string, id: string) => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    setPlayingId(id);
    // Limpeza da string de notas
    const notes = scoreStr.split(',').map(n => n.trim()).filter(n => n.length > 0);
    let startTimeOffset = 0.1;

    notes.forEach((noteStr, index) => {
      // Regex aprimorada para capturar Notas, Acidentes e Oitavas (expandido para 0-8)
      const match = noteStr.match(/([A-G][#b]?)([0-8])/i);
      
      if (match) {
        const [_, noteName, octaveStr] = match;
        
        // Normalização correta: "Bb" -> "Bb", "C#" -> "C#", "c#" -> "C#"
        const noteKey = noteName.charAt(0).toUpperCase() + noteName.slice(1).toLowerCase();
        
        if (NOTE_MAP.hasOwnProperty(noteKey)) {
          const octave = parseInt(octaveStr);
          const semitones = NOTE_MAP[noteKey] + (octave + 1) * 12;
          const freq = 440 * Math.pow(2, (semitones - 69) / 12);
          
          const playTime = ctx.currentTime + startTimeOffset;
          playNote(ctx, freq, playTime, 0.5);
          
          // Sincronização visual
          setTimeout(() => setCurrentNoteIndex(index), startTimeOffset * 1000);
          startTimeOffset += 0.45; // Intervalo entre notas
        } else {
          console.warn(`Nota não encontrada no mapa: ${noteKey} (Original: ${noteStr})`);
        }
      } else {
         console.warn(`Formato de nota inválido: ${noteStr}`);
      }
    });

    setTimeout(() => {
      setPlayingId(null);
      setCurrentNoteIndex(-1);
    }, (notes.length * 450) + 300);
  };

  const handleGenerateIdeas = async () => {
    if (!prompt.trim()) return;
    setIsProcessing(true);
    setError(null);
    setCreativeResult(null);
    try {
      const result = await generateBaixariaIdeas(prompt);
      setCreativeResult(result);
      setTranscribeResult(null);
    } catch (err: any) { setError(err.message); }
    finally { setIsProcessing(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch { setError("Permissão de microfone negada."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const result = await analyzeBaixaria(base64, blob.type);
        setTranscribeResult(result);
        setCreativeResult(null);
      } catch (err: any) { setError(err.message); }
      finally { setIsProcessing(false); }
    };
  };

  return (
    <div className="bg-[#1a0f0a] border border-[#3d2516] rounded-[2.5rem] p-5 md:p-6 shadow-2xl relative overflow-hidden h-full flex flex-col min-h-[500px]">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col gap-5 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600/20 rounded-xl">
              <Lightbulb className={`w-5 h-5 text-amber-500 ${isProcessing ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white italic">Dicas de Baixarias 7C</h3>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Paridade Áudio-Visual 1:1</p>
            </div>
          </div>
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
             <button onClick={() => setMode('creative')} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${mode === 'creative' ? 'bg-amber-600 text-white shadow-glow' : 'text-slate-50'}`}>Ideias IA</button>
             <button onClick={() => setMode('transcribe')} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${mode === 'transcribe' ? 'bg-amber-600 text-white shadow-glow' : 'text-slate-50'}`}>Transcrição</button>
          </div>
        </div>

        <div className="bg-black/60 rounded-3xl p-4 border border-white/5 relative flex-1 min-h-[350px] flex flex-col overflow-hidden backdrop-blur-sm">
          {mode === 'creative' && !creativeResult && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 p-4">
              <Sparkles className="w-12 h-12 text-amber-600/20 mb-2" />
              <div className="space-y-3">
                <h4 className="text-white font-black italic uppercase text-lg">Crie Frases Inéditas</h4>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">O Mestre compõe a partitura e o áudio simultaneamente.</p>
              </div>
              <div className="w-full relative">
                <input 
                  type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Baixaria em G7 para C7M..."
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl py-5 px-6 text-xs text-white outline-none focus:border-amber-600/50 pr-14"
                  onKeyPress={(e) => e.key === 'Enter' && handleGenerateIdeas()}
                />
                <button 
                  onClick={handleGenerateIdeas} disabled={!prompt.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-amber-600 rounded-xl text-white hover:bg-amber-500 transition-all disabled:opacity-20 shadow-glow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
             <div className="flex-1 flex flex-col items-center justify-center gap-5">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                <p className="text-[10px] font-black uppercase text-amber-500 animate-pulse italic tracking-widest">Sincronizando Partitura e Áudio...</p>
             </div>
          )}

          {creativeResult && (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 p-2 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-2"><Award className="w-3 h-3" /> Ideias do Mestre ({creativeResult.key})</span>
                <button onClick={() => setCreativeResult(null)} className="p-1 text-slate-500 hover:text-white"><X className="w-4 h-4"/></button>
              </div>
              
              {creativeResult.ideas.map((idea, i) => (
                <div key={i} className="bg-zinc-950/40 border border-white/5 rounded-[2rem] p-5 space-y-4 hover:border-amber-600/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-amber-600/20 text-amber-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-600/10">{idea.style}</span>
                    <button 
                      onClick={() => playSequence(idea.score, `idea-${i}`)}
                      disabled={playingId !== null}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${playingId === `idea-${i}` ? 'bg-white text-black animate-pulse scale-105' : 'bg-amber-600 text-white shadow-glow active:scale-95'}`}
                    >
                      <Volume2 className="w-3 h-3" /> Ouvir Partitura
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white italic tracking-tight">{idea.title}</h4>
                      <span className="text-[8px] text-slate-600 font-mono">100% Identidade</span>
                    </div>

                    <div className="bg-black/90 p-4 rounded-2xl border border-white/5 overflow-hidden">
                       <div className="flex flex-wrap gap-2 mb-4 justify-center">
                          {idea.score.split(',').map((note, nIdx) => (
                            <span 
                              key={nIdx} 
                              className={`px-2 py-1 rounded-md text-[11px] font-mono transition-all duration-200 border ${
                                playingId === `idea-${i}` && currentNoteIndex === nIdx 
                                ? 'bg-amber-600 text-white border-amber-400 scale-125 shadow-glow z-10' 
                                : 'bg-white/5 text-amber-400/60 border-white/5'
                              }`}
                            >
                              {note.trim()}
                            </span>
                          ))}
                       </div>
                       <pre className="text-[9px] font-mono text-amber-400/40 overflow-x-auto select-all leading-tight border-t border-white/5 pt-4">
                        {idea.tab}
                       </pre>
                    </div>
                  </div>

                  <div className="bg-amber-600/5 p-4 rounded-xl border border-amber-600/10">
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">{idea.analysis}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {transcribeResult && (
            <div className="flex-1 flex flex-col gap-5 p-2 animate-in slide-in-from-bottom-4">
               <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-2"><Music className="w-4 h-4" /> Transcrição Auditiva</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => playSequence(transcribeResult.score, 'transcribe')}
                    disabled={playingId !== null}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${playingId === 'transcribe' ? 'bg-white text-black' : 'bg-amber-600 text-white shadow-glow'}`}
                  >
                    <Volume2 className="w-3 h-3" /> Tocar Notas
                  </button>
                  <button onClick={() => setTranscribeResult(null)} className="text-slate-600 hover:text-white"><X className="w-4 h-4"/></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 p-4 bg-black/40 rounded-2xl border border-white/5 justify-center">
                  {transcribeResult.score.split(',').map((note, nIdx) => (
                    <span 
                      key={nIdx}
                      className={`text-[10px] font-mono transition-all duration-150 ${
                        playingId === 'transcribe' && currentNoteIndex === nIdx 
                        ? 'text-white bg-amber-600 px-2 rounded-md shadow-glow' 
                        : 'text-amber-500/60'
                      }`}
                    >
                      {note.trim()}
                    </span>
                  ))}
              </div>
              <pre className="flex-1 bg-black/90 p-5 rounded-3xl border border-amber-600/10 text-[10px] font-mono text-amber-400 overflow-auto select-all leading-tight">
                {transcribeResult.tab}
              </pre>
            </div>
          )}

          {mode === 'transcribe' && !transcribeResult && !isRecording && !isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              <Ear className="w-14 h-14 text-amber-600/10" />
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Escuta e Tradução Digital</p>
                <p className="text-[9px] text-slate-600 uppercase tracking-tighter max-w-[200px]">O Mestre transcreverá o áudio em notas e tablatura auditável.</p>
              </div>
              <button onClick={startRecording} className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] shadow-glow flex items-center gap-3 transition-all border-b-4 border-amber-800">
                <Zap className="w-4 h-4 fill-current" /> Iniciar Escuta Digital
              </button>
            </div>
          )}

          {isRecording && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <div className="flex items-end gap-1.5 h-20">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-1.5 bg-red-500 rounded-full animate-pulse shadow-glow" style={{ height: `${20 + Math.random()*80}%`, animationDelay: `${i*0.05}s` }} />
                ))}
              </div>
              <button onClick={stopRecording} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl ring-4 ring-red-600/10">
                Processar Áudio ({recordingTime}s)
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-center justify-between text-red-500 text-[10px] font-black uppercase">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="flex items-center justify-between text-[8px] text-slate-700 font-black uppercase tracking-widest italic px-1">
          <span className="flex items-center gap-1"><Zap className="w-2 h-2" /> Sync Engine Ativo</span>
          <span>Frequência Otimizada para Nylon 7C</span>
        </div>
      </div>
    </div>
  );
};

export default SmartEar;