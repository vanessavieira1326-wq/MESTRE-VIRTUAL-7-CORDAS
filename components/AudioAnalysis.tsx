
import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileMusic, Loader2, ListMusic, Music, Play, Timer, BookOpen, AlertCircle } from 'lucide-react';
import { extractBaixariasFromTrack, BaixariaAnalysis } from '../services/geminiService';

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
                    const analysisResults = await extractBaixariasFromTrack(base64Audio, file.type);
                    setResults(analysisResults);
                    setStatus('success');
                } catch (err: any) {
                    setError(err.message || 'Ocorreu um erro desconhecido.');
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
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

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
            setError("Por favor, solte um arquivo de áudio válido.");
        }
    };

    return (
        <div 
            className="bg-[#1a0f0a] border border-[#3d2516] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 min-h-[400px] justify-between"
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
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Extraia Baixarias de Músicas</p>
                    </div>
                </div>

                {status === 'idle' && !file && (
                    <div 
                        className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-amber-600/20 rounded-2xl p-6 cursor-pointer hover:bg-amber-600/5 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud className="w-10 h-10 text-amber-600/40 mb-3" />
                        <p className="font-bold text-slate-300">Arraste seu áudio aqui</p>
                        <p className="text-xs text-slate-500 mt-1">ou clique para selecionar (MP3, WAV, etc)</p>
                        <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    </div>
                )}

                {file && (status === 'idle' || status === 'success' || status === 'error') && (
                    <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col gap-4">
                        <div className='flex items-center gap-3'>
                            <FileMusic className="w-6 h-6 text-amber-500 shrink-0" />
                            <div className='flex-1 min-w-0'>
                                <p className="text-xs font-bold text-white truncate">{file.name}</p>
                                <p className="text-[10px] text-slate-500">{Math.round(file.size / 1024 / 1024 * 10) / 10} MB</p>
                            </div>
                            <button onClick={() => { setFile(null); setAudioUrl(null); setResults([]); setStatus('idle'); }} className="text-xs font-bold text-slate-500 hover:text-white shrink-0">Trocar</button>
                        </div>
                        {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full h-10" />}
                        <button 
                            onClick={handleAnalyze}
                            // Fix: Cast status to string to avoid TypeScript error where comparison with 'analyzing' is deemed impossible due to narrowing
                            disabled={(status as string) === 'analyzing'}
                            className="w-full bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Music className="w-4 h-4" /> Analisar Baixarias
                        </button>
                    </div>
                )}
                
                {status === 'analyzing' && (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                        <p className="text-sm font-black uppercase tracking-widest text-amber-500 mt-4 animate-pulse">Análise profunda em andamento...</p>
                        <p className="text-xs text-slate-500 mt-1">O Mestre está ouvindo cada detalhe. Isso pode levar um momento.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2 border-b border-white/5 pb-2">
                           <BookOpen className="w-4 h-4" /> Baixarias Encontradas ({results.length})
                        </h4>
                        {results.length > 0 ? (
                            <div className="space-y-3 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                                {results.map((result, index) => (
                                    <div key={index} className="bg-black/40 p-4 rounded-xl border border-white/5 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Timer className="w-3 h-3 text-amber-500" />
                                                <span className="font-mono font-bold text-white text-sm">{result.timestamp}</span>
                                            </div>
                                            <button onClick={() => handleTimestampClick(result.timestamp)} className="flex items-center gap-1 text-amber-500 hover:text-amber-400 text-xs font-bold">
                                                <Play className="w-3 h-3 fill-current" /> Ouvir
                                            </button>
                                        </div>
                                        <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-black/40 p-3 rounded-lg border border-white/5 overflow-x-auto custom-scrollbar mb-2">
                                            {result.tablature}
                                        </div>
                                        <p className="text-[10px] text-slate-400 italic">"{result.notes}"</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-600">
                                <Music className="w-8 h-8 mb-3" />
                                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma baixaria de 7 cordas foi detectada nesta música.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Fix: Simplified error display to avoid redundant type comparison warnings from status narrowing */}
                {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20 text-[10px] font-bold uppercase tracking-wide">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}

            </div>
        </div>
    );
};

export default AudioAnalysis;
