
import React, { useState, useEffect } from 'react';
import AITeacher from './components/AITeacher';
import { ShieldCheck, Music2, Star, Zap, Music, Download, Key, ExternalLink, Globe, ArrowRight, Info } from 'lucide-react';

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
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    setDescription(welcomeTexts[Math.floor(Math.random() * welcomeTexts.length)]);
    
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      } else {
        // Fallback para ambiente de desenvolvimento local ou se o seletor não estiver disponível
        setHasApiKey(true);
      }
    };
    checkKey();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Conforme as regras, assumimos sucesso imediatamente para evitar race condition
      setHasApiKey(true);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-[#0c0604] flex items-center justify-center p-4 md:p-6 font-sans">
        <div className="max-w-xl w-full bg-[#1a0f0a] border border-[#3d2516] rounded-[2.5rem] p-6 md:p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
          
          <div className="relative z-10 flex flex-col items-center gap-8">
            <AppIcon />
            
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic">Mestre Virtual 7C</h1>
              <div className="h-1 w-20 bg-amber-600 mx-auto rounded-full"></div>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed pt-2">
                O mestre está pronto para ensinar, mas precisamos sintonizar os bordões.
                Siga os passos abaixo para ativar a inteligência artificial:
              </p>
            </div>

            <div className="w-full space-y-4 text-left">
              <div className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl items-start group hover:border-amber-600/30 transition-all">
                <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-black shrink-0">1</div>
                <div>
                  <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1">Obtenha sua Chave</h3>
                  <p className="text-xs text-slate-500 mb-3">Acesse o Google AI Studio e gere uma chave de API gratuita.</p>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-amber-600/20"
                  >
                    Abrir Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl items-start group hover:border-amber-600/30 transition-all">
                <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-black shrink-0">2</div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-1">Vincule ao Aplicativo</h3>
                  <p className="text-xs text-slate-500 mb-4">Clique no botão abaixo para abrir o seletor e colar sua chave.</p>
                  <button 
                    onClick={handleSelectKey}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white py-4 rounded-xl flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95"
                  >
                    <Key className="w-5 h-5" />
                    Configurar Chave API
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-900/10 border border-amber-600/20 p-4 rounded-2xl flex items-start gap-3 text-left">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-200/60 leading-normal">
                <b>Nota Técnica:</b> Sua chave é armazenada localmente no seu navegador e é usada apenas para as consultas de áudio e texto com o Mestre. Recomenda-se o uso de um projeto com faturamento ativado para evitar limites de uso.
              </p>
            </div>

            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-slate-500 hover:text-amber-500 uppercase font-bold tracking-[0.2em] transition-colors flex items-center gap-1"
            >
              Documentação de Faturamento <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

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
        <AITeacher onResetKey={() => setHasApiKey(false)} />

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
