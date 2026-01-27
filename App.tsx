
import React, { useState, useEffect } from 'react';
import AITeacher from './components/AITeacher';
import { ShieldCheck, Music2, Star, Zap, Music } from 'lucide-react';

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

const AppIcon: React.FC = () => (
  <div className="relative group shrink-0">
    {/* Aura de profundidade - Brilho ambiente suave */}
    <div className="absolute -inset-4 bg-amber-600/10 rounded-[1.5rem] md:rounded-[2rem] blur-xl opacity-30 group-hover:opacity-60 transition duration-1000"></div>
    
    {/* Container Principal do Ícone - Estilo Squircle Minimalista */}
    <div className="relative p-1 bg-gradient-to-b from-[#4a2e1d] via-[#1a0f0a] to-[#0c0604] rounded-[1.5rem] md:rounded-[2.2rem] shadow-[0_15px_40px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(255,255,255,0.1)] border border-[#3d2516]">
      
      <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-[1.2rem] md:rounded-[1.8rem] overflow-hidden flex items-center justify-center bg-[#1a0f0a]">
        {/* Fundo de Luthieria Abstrato */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/40 via-transparent to-amber-500/10"></div>
        
        {/* Ícone Musical Minimalista em Destaque */}
        <Music2 className="relative z-20 w-10 h-10 md:w-14 md:h-14 text-amber-500/80 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] group-hover:scale-110 transition-transform duration-500" />
        
        {/* Vinheta de bordas para profundidade */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 z-10"></div>

        {/* Efeito de Reflexo Superior (Glossy Finish) */}
        <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-30 opacity-40"></div>
        <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.6)] pointer-events-none z-30"></div>
        
        {/* Brilho de verniz no centro ao passar o mouse */}
        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none z-20"></div>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [description, setDescription] = useState("");

  useEffect(() => {
    setDescription(welcomeTexts[Math.floor(Math.random() * welcomeTexts.length)]);
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0604] text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-amber-500/40">
      {/* Background FX - Atmosfera imersiva de Luthieria */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0f0a] via-[#0c0604] to-[#120a07]" />
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-overlay" />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[120%] h-[70%] bg-orange-950/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-radial-gradient from-amber-900/5 via-transparent to-transparent opacity-30" />
      </div>

      {/* Header com o Ícone Limpo */}
      <header className="sticky top-0 z-50 w-full bg-[#0c0604]/90 backdrop-blur-2xl border-b border-white/5 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-8">
            
            <AppIcon />
            
            <div className="flex flex-col text-center sm:text-left">
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-black tracking-tighter bg-gradient-to-r from-white via-amber-50 to-amber-500 bg-clip-text text-transparent italic leading-none drop-shadow-2xl">
                Mestre Virtual 7C
              </h1>
            </div>
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
            <p className="text-slate-400 text-lg md:text-2xl leading-relaxed font-medium border-l-4 border-amber-900 pl-6 italic shadow-sm">
              "{description}"
            </p>
          </div>
          <div className="lg:col-span-4 flex items-center justify-center lg:justify-end">
            <div className="flex flex-col items-center lg:items-end gap-3 p-6 bg-black/50 backdrop-blur-xl rounded-[2rem] border border-white/5 w-full max-w-sm shadow-2xl">
              <Music2 className="w-8 h-8 text-amber-500 mb-2" />
              <div className="text-center lg:text-right">
                <span className="block text-[10px] font-black text-amber-600 uppercase tracking-widest">Escola de Regional</span>
                <span className="text-xl font-bold text-white italic">Baixarias & Harmonia</span>
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
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-amber-500/50 transition-all group-hover:scale-110 shadow-lg">
                <item.icon className="w-8 h-8 text-amber-500" />
              </div>
              <h4 className="font-black text-slate-100 text-sm uppercase tracking-widest">{item.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed px-4 md:px-0">{item.desc}</p>
            </div>
          ))}
        </footer>
      </main>
    </div>
  );
};

export default App;
