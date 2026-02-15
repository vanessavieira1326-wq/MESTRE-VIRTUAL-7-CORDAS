import React, { useState, useEffect } from 'react';
import AITeacher from './components/AITeacher';
import Metronome from './components/Metronome';
import Tuner from './components/Tuner';
import StemStudio from './components/StemStudio';
import SmartEar from './components/SmartEar';
import ChordLibrary from './components/ChordLibrary';
import RhythmLibrary from './components/RhythmLibrary';
import GroupSimulator from './components/GroupSimulator';
import { ShieldCheck, Music2, Star, Zap, Music, Library, Radio, Settings2, Users, Drum } from 'lucide-react';

const musicalNotationFragments = [
  "♩=120", "♫ ♬ ♭", "♯C7M(9)", "♭9/♯11", "|--7--5--|", "𝄞 𝄢", "A/G#", "D7(b9)", "G/B", "E7/D", "|--0-h-2--|", "p.i.m.a", "7ª Corda (C)", "|--x--|", "B7(13)", "Cm7(b5)"
];

const welcomeTexts = [
  "A 7ª corda é o coração do regional. Estude bordões e condução rítmica aqui.",
  "Domine a clareza técnica dos bordões brasileiros com nosso método de 7 cordas.",
  "Explore o grave que conduz a harmonia. Seja bem-vindo à roda do Mestre."
];

const ThoughtTicker: React.FC = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % musicalNotationFragments.length), 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-600/20 px-3 py-1 rounded-full backdrop-blur-sm">
      <Music className="w-3 h-3 text-amber-500" />
      <span className="text-[10px] font-mono font-black text-white tracking-widest uppercase">
        {musicalNotationFragments[index]}
      </span>
    </div>
  );
};

const AppIcon: React.FC = () => (
  <div className="relative group shrink-0">
    <div className="absolute -inset-2 bg-amber-600/10 rounded-2xl blur-lg opacity-30"></div>
    <div className="relative p-1 bg-gradient-to-b from-[#4a2e1d] to-[#0c0604] rounded-2xl shadow-xl border border-[#3d2516]">
      <div className="relative w-10 h-10 md:w-16 md:h-16 rounded-xl overflow-hidden flex items-center justify-center bg-[#1a0f0a]">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
        <Music2 className="relative z-20 w-5 h-5 md:w-8 h-8 text-amber-500/80 drop-shadow-glow" />
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [description, setDescription] = useState("");
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'practice' | 'jam' | 'studio' | 'theory'>('practice');

  useEffect(() => {
    window.scrollTo(0, 0);
    setDescription(welcomeTexts[Math.floor(Math.random() * welcomeTexts.length)]);
    
    const checkKey = async () => {
      if (window.aistudio) {
        const isSelected = await window.aistudio.hasSelectedApiKey();
        setHasKey(isSelected);
      }
    };
    checkKey();
    setActiveTab('practice');
  }, []);

  const handleConnectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0604] text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-amber-500/40 pb-safe">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0f0a] via-[#0c0604] to-[#0c0604]" />
      </div>

      <header className="sticky top-0 z-50 w-full bg-[#0c0604]/90 backdrop-blur-md border-b border-white/5 p-3 md:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <AppIcon />
            <div>
              <h1 className="text-lg md:text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-amber-500 bg-clip-text text-transparent italic leading-none">
                MESTRE 7C
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {!hasKey && (
              <button 
                onClick={handleConnectKey}
                className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/40 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border border-amber-500/30"
              >
                <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-amber-500" />
                <span className="hidden xs:inline">Ativar IA</span>
                <span className="xs:hidden">IA</span>
              </button>
            )}
            <div className="hidden sm:block">
              <ThoughtTicker />
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-[64px] md:top-[80px] z-40 w-full bg-[#0c0604]/80 backdrop-blur-md border-b border-white/5 py-1.5 md:py-2 px-4">
        <div className="max-w-6xl mx-auto flex justify-around sm:justify-center sm:gap-8">
          {[
            { id: 'practice', label: 'Estudo', icon: Radio },
            { id: 'jam', label: 'Roda', icon: Users },
            { id: 'studio', label: 'Mixer', icon: Settings2 },
            { id: 'theory', label: 'Harmonia', icon: Library }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-all ${
                activeTab === tab.id 
                ? 'text-amber-500 bg-amber-500/10' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 py-4 md:py-8 flex flex-col gap-6">
        
        {activeTab === 'studio' && (
          <div className="lg:col-span-12 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <StemStudio />
          </div>
        )}

        {activeTab === 'practice' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-4 md:space-y-6 animate-in slide-in-from-left-4 duration-500">
              <Metronome />
              <Tuner />
              <RhythmLibrary />
            </div>
            <div className="space-y-4 md:space-y-6 animate-in slide-in-from-right-4 duration-500">
              <SmartEar />
              <AITeacher />
            </div>
          </div>
        )}

        {activeTab === 'jam' && (
          <div className="lg:col-span-12 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <GroupSimulator />
          </div>
        )}

        {activeTab === 'theory' && (
          <div className="lg:col-span-12 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <ChordLibrary />
          </div>
        )}

        <section className="bg-white/5 p-4 md:p-5 rounded-[1.5rem] border border-white/5 shadow-inner mt-2 md:mt-4">
          <p className="text-slate-400 text-xs md:text-lg leading-relaxed italic border-l-2 border-amber-600 pl-4">
            "{description}"
          </p>
        </section>

        <footer className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 py-4 md:py-6 border-t border-white/5 mt-auto">
          {[
            { icon: ShieldCheck, title: "Precision", desc: "Separação neural de canais regional." },
            { icon: Star, title: "Luthieria", desc: "Análise ultra-fina de baixarias 7C." },
            { icon: Zap, title: "IA Neural", desc: "Sincronização Ativa Ativada." }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 md:p-4 bg-black/20 rounded-2xl border border-white/5 group">
              <item.icon className="w-4 h-4 md:w-5 md:h-5 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="font-bold text-slate-100 text-[9px] md:text-[10px] uppercase tracking-wider">{item.title}</h4>
                <p className="text-[8px] md:text-[9px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </footer>
      </main>
    </div>
  );
};

export default App;