
import React, { useState, useEffect } from 'react';
import AITeacher from './components/AITeacher';
import { ShieldCheck, Music2, Star, Zap, Music, Download } from 'lucide-react';

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
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % musicalNotationFragments.length), 1200);
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
      <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden flex items-center justify-center bg-[#1a0f0a]">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
        <Music2 className="relative z-20 w-6 h-6 md:w-8 h-8 text-amber-500/80 drop-shadow-glow" />
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [description, setDescription] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setDescription(welcomeTexts[Math.floor(Math.random() * welcomeTexts.length)]);
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0604] text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-amber-500/40">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0f0a] via-[#0c0604] to-[#0c0604]" />
      </div>

      <header className="sticky top-0 z-50 w-full bg-[#0c0604]/90 backdrop-blur-md border-b border-white/5 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppIcon />
            <h1 className="text-xl md:text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-amber-500 bg-clip-text text-transparent italic leading-none">
              Mestre Virtual 7C
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {deferredPrompt && (
              <button 
                onClick={handleInstall}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all"
              >
                <Download className="w-3 h-3 text-amber-500" />
                Instalar
              </button>
            )}
            <div className="hidden sm:block">
              <ThoughtTicker />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 py-4 md:py-8 flex flex-col gap-6">
        <AITeacher />

        <section className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
          <p className="text-slate-400 text-sm md:text-lg leading-relaxed italic border-l-2 border-amber-600 pl-4">
            "{description}"
          </p>
        </section>

        <footer className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6 border-t border-white/5">
          {[
            { icon: ShieldCheck, title: "Bordão", desc: "Base rítmica sólida e clara." },
            { icon: Star, title: "Harmonia", desc: "Virtuosismo e bom gosto." },
            { icon: Zap, title: "IA 7C", desc: "Tradição em formato digital." }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group">
              <item.icon className="w-5 h-5 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <h4 className="font-bold text-slate-100 text-[10px] uppercase tracking-wider">{item.title}</h4>
                <p className="text-[9px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </footer>
      </main>
    </div>
  );
};

export default App;
