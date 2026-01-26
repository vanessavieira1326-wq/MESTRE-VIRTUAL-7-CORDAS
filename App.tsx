
import React, { useState, useEffect } from 'react';
import AITeacher from './components/AITeacher';
import { Guitar, ShieldCheck, Music2, Star, Zap, Music } from 'lucide-react';

const musicalNotationFragments = [
  "♩=120", "♫ ♬ ♭", "♯C7M(9)", "♭9/♯11", "|--7--5--|", "𝄞 𝄢", "A/G#", "D7(b9)", "G/B", "E7/D", "|--0-h-2--|", "p.i.m.a", "7ª Corda (C)", "|--x--|", "B7(13)", "Cm7(b5)"
];

const welcomeTexts = [
  "Onde o grave conduz a harmonia e a tradição encontra o virtuosismo moderno. Mergulhe na linguagem única dos bordões brasileiros.",
  "A sétima corda é o coração do regional. Explore as baixarias de Dino com o auxílio da inteligência artificial.",
  "Do Choro ao Samba: domine a condução rítmica e a clareza técnica dos bordões com o Mestre Virtual."
];

const ThoughtTicker: React.FC = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % musicalNotationFragments.length), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-600/20 px-4 py-1.5 rounded-full backdrop-blur-sm">
      <Music className="w-3 h-3 text-amber-500" />
      <span className="text-[10px] md:text-xs font-mono font-black text-white tracking-widest uppercase">
        {musicalNotationFragments[index]}
      </span>
    </div>
  );
};

const App: React.FC = () => {
  const [description, setDescription] = useState("");

  useEffect(() => {
    setDescription(welcomeTexts[Math.floor(Math.random() * welcomeTexts.length)]);
  }, []);

  return (
    <div className="min-h-screen bg-[#020202] text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-amber-500/40">
      {/* Background FX */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-amber-600/5 rounded-full blur-[150px]" />
      </div>

      {/* Header Responsivo */}
      <header className="sticky top-0 z-50 w-full bg-black/60 backdrop-blur-2xl border-b border-white/5 p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="p-3 md:p-4 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl md:rounded-2xl shadow-lg shadow-amber-900/20 border border-amber-400/20">
              <Guitar className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <h1 className="text-xl md:text-3xl lg:text-4xl font-black tracking-tighter bg-gradient-to-r from-white via-amber-200 to-amber-500 bg-clip-text text-transparent italic">
              Mestre Virtual 7C
            </h1>
          </div>
          <ThoughtTicker />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-10">
        
        {/* IA Section - Priority Top */}
        <AITeacher />

        {/* Info Section - Secondary */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-6">
          <div className="lg:col-span-8">
            <p className="text-slate-400 text-lg md:text-2xl leading-relaxed font-medium border-l-4 border-amber-600 pl-6 italic">
              "{description}"
            </p>
          </div>
          <div className="lg:col-span-4 flex items-center justify-center lg:justify-end">
            <div className="flex flex-col items-center lg:items-end gap-3 p-6 bg-white/5 rounded-3xl border border-white/10 w-full max-w-sm">
              <Music2 className="w-8 h-8 text-amber-500 mb-2" />
              <div className="text-center lg:text-right">
                <span className="block text-[10px] font-black text-amber-500 uppercase tracking-widest">Tecnologia Musical</span>
                <span className="text-lg font-bold text-white italic">Baixarias & Contraponto</span>
              </div>
            </div>
          </div>
        </section>

        {/* Responsive Footer Grid */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 py-12 border-t border-white/5 mt-auto">
          {[
            { icon: ShieldCheck, title: "Bordão & Condução", desc: "A base rítmica sólida que sustenta o regional brasileiro." },
            { icon: Star, title: "Harmonia & Solo", desc: "Expanda seus horizontes com arranjos complexos e virtuosismo." },
            { icon: Zap, title: "IA Especialista", desc: "Processando décadas de tradição para ensinar o futuro do violão." }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center md:items-start md:text-left space-y-3 group">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-amber-500/50 transition-colors">
                <item.icon className="w-6 h-6 text-amber-500" />
              </div>
              <h4 className="font-black text-slate-100 text-xs uppercase tracking-widest">{item.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed px-4 md:px-0">{item.desc}</p>
            </div>
          ))}
        </footer>
      </main>
    </div>
  );
};

export default App;
