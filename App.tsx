
import React, { useState, useEffect } from 'react';
import AITeacher from './components/AITeacher';
import { Guitar, Music2, ShieldCheck, Star, Zap, Music } from 'lucide-react';

const musicalNotationFragments = [
  "♩=120", "♫ ♬ ♭", "♯C7M(9)", "♭9/♯11", "|--7--5--|", "A/G#", "D7(b9)", "7ª Corda (C)", "|--x--|", "B7(13)", "Cm7(b5)"
];

const ThoughtTicker: React.FC = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % musicalNotationFragments.length), 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-600/20 px-3 py-1.5 rounded-full">
      <Music className="w-3 h-3 text-amber-500" />
      <span className="text-[10px] font-mono font-black text-white tracking-widest uppercase">
        {musicalNotationFragments[index]}
      </span>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020202] text-slate-100 flex flex-col font-sans selection:bg-amber-500/40">
      {/* Background FX */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-amber-900/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-amber-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl shadow-lg">
              <Guitar className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-amber-500 bg-clip-text text-transparent italic">
              Mestre Virtual 7C
            </h1>
          </div>
          <ThoughtTicker />
        </div>
      </header>

      {/* Main Area */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-10">
        <AITeacher />
        
        <section className="py-10 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <ShieldCheck className="w-6 h-6 text-amber-500" />
              <h4 className="font-black text-xs uppercase tracking-widest">Base Sólida</h4>
              <p className="text-sm text-slate-500 leading-relaxed">Aprenda a condução rítmica que define o regional brasileiro.</p>
            </div>
            <div className="space-y-3">
              <Star className="w-6 h-6 text-amber-500" />
              <h4 className="font-black text-xs uppercase tracking-widest">Harmonia</h4>
              <p className="text-sm text-slate-500 leading-relaxed">Explore contrapontos e arranjos complexos na 7ª corda.</p>
            </div>
            <div className="space-y-3">
              <Zap className="w-6 h-6 text-amber-500" />
              <h4 className="font-black text-xs uppercase tracking-widest">Expertise</h4>
              <p className="text-sm text-slate-500 leading-relaxed">Uma IA treinada na tradição de Dino e Raphael Rabello.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="p-8 border-t border-white/5 text-center">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Mestre Virtual 7 Cordas © 2024</p>
      </footer>
    </div>
  );
};

export default App;
