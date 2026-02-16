import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AITeacher from './components/AITeacher';
import Metronome from './components/Metronome';
import Tuner from './components/Tuner';
import StemStudio from './components/StemStudio';
import SmartEar from './components/SmartEar';
import ChordLibrary from './components/ChordLibrary';
import RhythmLibrary from './components/RhythmLibrary';
import GroupSimulator from './components/GroupSimulator';
import { 
  ShieldCheck, Music2, Star, Zap, Music, Library, Radio, Settings2, Users, Drum, // Existing
  Search, ArrowLeft, Clock, Activity, Lightbulb, AudioLines // New icons for components
} from 'lucide-react';

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

interface AppTool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  component: React.ComponentType;
  keywords: string[];
}

const ALL_COMPONENTS: AppTool[] = [
  { 
    id: 'metronome', 
    name: 'Metrônomo', 
    description: 'Marque o tempo com precisão rítmica para o seu estudo.', 
    icon: Clock, 
    component: Metronome, 
    keywords: ['metrônomo', 'tempo', 'ritmo', 'bpm', 'estudo'] 
  },
  { 
    id: 'tuner', 
    name: 'Afinador Profissional 7C', 
    description: 'Afine seu violão de 7 cordas com alta precisão e tons de referência.', 
    icon: Activity, 
    component: Tuner, 
    keywords: ['afinador', 'afinar', 'violão', '7 cordas', 'cordas', 'tuning'] 
  },
  { 
    id: 'rhythm_library', 
    name: 'Biblioteca de Levadas', 
    description: 'Explore e pratique ritmos brasileiros de samba, choro e pagode.', 
    icon: Drum, 
    component: RhythmLibrary, 
    keywords: ['levadas', 'ritmos', 'samba', 'choro', 'pagode', 'bossa nova', 'forró', 'prática'] 
  },
  { 
    id: 'smart_ear', 
    name: 'Dicas de Baixarias 7C', 
    description: 'Crie ou transcreva baixarias com a inteligência artificial do Mestre.', 
    icon: Lightbulb, 
    component: SmartEar, 
    keywords: ['baixarias', 'transcrição', 'criação', 'ai', 'partitura', 'ouvir'] 
  },
  { 
    id: 'ai_teacher', 
    name: 'Consultoria Técnica 7C', 
    description: 'Tire suas dúvidas de harmonia e técnica com um Mestre AI.', 
    icon: ShieldCheck, 
    component: AITeacher, 
    keywords: ['consultoria', 'professor', 'aula', 'harmonia', 'técnica', 'dúvidas', 'ai'] 
  },
  { 
    id: 'group_simulator', 
    name: 'Roda Virtual 7C', 
    description: 'Simule uma roda de samba com percussão regional dinâmica e variada.', 
    icon: Users, 
    component: GroupSimulator, 
    keywords: ['roda de samba', 'grupo', 'percussão', 'simulador', 'ensaiar', 'jam'] 
  },
  { 
    id: 'stem_studio', 
    name: 'V-STUDIO 7C', 
    description: 'Mixe e controle os canais (stems) de suas músicas em tempo real.', 
    icon: AudioLines, 
    component: StemStudio, 
    keywords: ['estúdio', 'mixer', 'stem', 'v-studio', 'produção', 'áudio'] 
  },
  { 
    id: 'chord_library', 
    name: 'Biblioteca Harmônica Master', 
    description: 'Descubra voicings e acordes regionais para 7 cordas.', 
    icon: Library, 
    component: ChordLibrary, 
    keywords: ['acordes', 'harmonia', 'biblioteca', 'voicing', 'cifras', 'teoria'] 
  },
];


const App: React.FC = () => {
  const [description, setDescription] = useState("");
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

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
  }, []);

  const handleConnectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const filteredComponents = useMemo(() => {
    if (!searchTerm) return ALL_COMPONENTS;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return ALL_COMPONENTS.filter(tool => 
      tool.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      tool.description.toLowerCase().includes(lowerCaseSearchTerm) ||
      tool.keywords.some(keyword => keyword.toLowerCase().includes(lowerCaseSearchTerm))
    );
  }, [searchTerm]);

  const SelectedComponent = useMemo(() => {
    return ALL_COMPONENTS.find(tool => tool.id === selectedComponentId)?.component;
  }, [selectedComponentId]);

  const handleBackToSearch = useCallback(() => {
    setSelectedComponentId(null);
    setSearchTerm(''); // Clear search term when going back to show all components
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 py-4 md:py-8 flex flex-col gap-6">
        
        {selectedComponentId && SelectedComponent ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-6">
              <button 
                onClick={handleBackToSearch}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-sm font-black uppercase tracking-widest bg-black/40 px-4 py-2 rounded-xl border border-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar às Ferramentas
              </button>
            </div>
            <SelectedComponent />
          </div>
        ) : (
          <>
            <div className="relative group mb-6">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-amber-500 transition-colors" />
              <input 
                type="text"
                placeholder="Pesquisar ferramentas (ex: metrônomo, baixaria, afinar)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/80 border border-white/10 rounded-3xl py-5 pl-14 pr-6 text-sm text-white focus:ring-2 focus:ring-amber-600/40 outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredComponents.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedComponentId(tool.id)}
                  className="group bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-amber-600/50 transition-all cursor-pointer relative overflow-hidden text-left flex flex-col gap-3 h-full animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <tool.icon className="w-16 h-16 text-amber-500/20" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="p-3 bg-amber-600/20 rounded-xl inline-flex mb-3">
                      <tool.icon className="w-6 h-6 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-amber-500 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                </button>
              ))}

              {filteredComponents.length === 0 && searchTerm && (
                <div className="col-span-full py-24 text-center opacity-20">
                  <Search className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-black uppercase tracking-widest text-xs">Nenhuma ferramenta encontrada para "{searchTerm}"</p>
                </div>
              )}
            </div>
          </>
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