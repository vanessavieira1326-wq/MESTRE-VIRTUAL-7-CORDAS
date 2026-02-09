
import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileMusic, Loader2, ListMusic, Music, Play, Timer, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { extractProfessionalScore, BaixariaAnalysis } from '../services/geminiService';

const AudioAnalysis: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
    const [results, setResults] = useState<BaixariaAnalysis[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith('audio/')) {
            setFile(selectedFile);
            setAudioUrl(URL.createObjectURL(selectedFile));
            setError(null);
            setStatus('idle');
            setResults([]);
        } else {
            setError("Por favor, selecione um arquivo de áudio válido (MP3, WAV, etc).");
        }
    };

    const handleAnalyze = useCallback(async () => {
        if (!file) return;

        setStatus('analyzing');
        setError(null);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64Audio = (reader.result as string).split(',')[1];
                try {
                    const analysisResults = await extractProfessionalScore(base64Audio, file.type);
                    setResults(analysisResults);
                    setStatus('success');
                } catch (err: any) {
                    let msg = "Erro inesperado. Tente novamente.";
                    if (err.message?.includes("503") || err.message?.includes("429")) {
                      msg = "Servidor muito ocupado. O Mestre está processando muitos arranjos simultaneamente.";
                    }
                    setError(msg);
                    setStatus('error');
                }
            };
            reader.onerror = () => {
                setError('Falha ao ler o arquivo de áudio.');
                setStatus('error');
            }
        } catch (err) {
            setError("Erro ao preparar o áudio para análise.");
            setStatus('error');
        }
    }, [file]);

    const handleTimestampClick = (timestamp: string) => {
        if (!audioRef.current) return;
        const [minutes, seconds] = timestamp.split(':').map(Number);
        const timeInSeconds = minutes * 60 + seconds;
        audioRef.current.currentTime = timeInSeconds;
        audioRef.current.play();
    };
    
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type.startsWith('audio/')) {
            setFile(droppedFile);
            setAudioUrl(URL.createObjectURL(droppedFile));
            setError(null);
            setStatus('idle');
            setResults([]);
        } else {
            setError("Arquivo inválido.");
        }
    };

    return (
        <div 
            className="bg-[#1a0f0a] border border-[#3d2516] rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 min-h-[400px]"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col gap-5 h-full">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-600/20 rounded-xl">
                        <ListMusic className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Estúdio de Análise 7C</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Extração de Baixarias Master</p>
                    </div>
                </div>

                {status === 'idle' && !file && (
                    <div 
                        className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-amber-600/20 rounded-[2rem] p-8 cursor-pointer hover:bg-amber-600/5 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud className="w-10 h-10 text-amber-600/40 mb-3" />
                        <p className="font-bold text-slate-300">Arraste seu áudio</p>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-black">MP3, WAV ou Bordão Solo</p>
                        <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    </div>
                )}

                {file && (status === 'idle' || status === 'error') && (
                    <div className="bg-black/40 p-4 rounded-3xl border border-white/5 flex flex-col gap-4">
                        <div className='flex items-center gap-4'>
                            <FileMusic className="w-8 h-8 text-amber-500 shrink-0" />
                            <div className='flex-1 min-w-0'>
                                <p className="text-xs font-black text-white truncate italic">{file.name}</p>
                                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{Math.round(file.size / 1024 / 1024 * 10) / 10} MB</p>
                            </div>
                        </div>
                        {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full h-10 opacity-60" />}
                        <button 
                            onClick={handleAnalyze}
                            className="w-full bg-amber-600 hover:bg-amber-500 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Music className="w-4 h-4" /> Iniciar Análise Profunda
                        </button>
                    </div>
                )}
                
                {status === 'analyzing' && (
                     <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-500 mt-6 animate-pulse italic">Ouvindo cada harmonia...</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mt-2">Neural Engine Multi-Thread v3.1</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                             <BookOpen className="w-4 h-4" /> Partitura Extraída ({results.length})
                           </h4>
                           <button onClick={() => setStatus('idle')} className="text-[9px] font-black uppercase text-slate-600 hover:text-white">Trocar Master</button>
                        </div>
                        <div className="space-y-4 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                            {results.map((result, index) => (
                                <div key={index} className="bg-black/40 p-5 rounded-3xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Timer className="w-3 h-3 text-amber-500" />
                                            <span className="font-mono font-black text-white text-xs bg-amber-600/10 px-3 py-1 rounded-full">{result.timestamp}</span>
                                        </div>
                                        <button onClick={() => handleTimestampClick(result.timestamp)} className="flex items-center gap-1 text-amber-500 hover:text-white text-[9px] font-black uppercase">
                                            <Play className="w-3 h-3 fill-current" /> Sincronizar
                                        </button>
                                    </div>
                                    <pre className="text-[10px] font-mono text-amber-200/60 leading-tight bg-black/60 p-4 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar mb-3">
                                        {result.tablature}
                                    </pre>
                                    <p className="text-[9px] text-slate-500 italic font-bold uppercase tracking-wider">"{result.notes}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-[2rem] flex flex-col items-center text-center gap-4">
                        <AlertCircle className="w-10 h-10 text-red-500/40" />
                        <p className="text-xs font-black uppercase text-red-200 tracking-wide leading-relaxed">{error}</p>
                        <button 
                          onClick={handleAnalyze}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg"
                        >
                          <RefreshCw className="w-3 h-3" /> Re-tentar Análise
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioAnalysis;
