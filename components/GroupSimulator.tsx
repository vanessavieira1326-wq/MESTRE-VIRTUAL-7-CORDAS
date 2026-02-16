import React, { useState, useRef, useEffect } from 'react';
import { Users, Play, Pause, Volume2, Music, Zap, AudioLines, Guitar, Disc, Layers, Drum, Mic2, Grid } from 'lucide-react';

interface InstrumentState {
  volume: number;
  muted: boolean;
  pan: number;
}

// === 1. DEFINIÇÃO DOS 20 RITMOS E SEUS INSTRUMENTOS ===
type RhythmStyle = 
  | 'samba' | 'pagode' | 'partido' | 'choro' | 'bossa' 
  | 'forro' | 'baiao' | 'xaxado' | 'coco' | 'carimbo'
  | 'axe' | 'fricote' | 'timbalada' | 'lambada' | 'gafieira'
  | 'maxixe' | 'lundu' | 'caterete' | 'ciranda' | 'boi';

const RHYTHM_INFO: Record<RhythmStyle, { label: string; instruments: [string, string, string] }> = {
  // SUDESTE / RIO
  samba:    { label: 'Samba Raiz',   instruments: ['Surdo', 'Pandeiro', 'Tamborim'] },
  pagode:   { label: 'Pagode',       instruments: ['Tantã', 'Pandeiro', 'Reco-reco'] },
  partido:  { label: 'Partido Alto', instruments: ['Surdo', 'Palmas/Caixa', 'Cuíca'] },
  choro:    { label: 'Choro',        instruments: ['Pandeiro Grave', 'Pandeiro Agudo', 'Ganzá'] },
  bossa:    { label: 'Bossa Nova',   instruments: ['Surdo Suave', 'Vassourinha', 'Tamborim'] },
  gafieira: { label: 'Gafieira',     instruments: ['Surdo Sincopado', 'Caixa', 'Pratos'] },
  maxixe:   { label: 'Maxixe',       instruments: ['Tuba/Surdo', 'Pandeiro', 'Platinelas'] },
  lundu:    { label: 'Lundu',        instruments: ['Atabaque Grave', 'Palmas', 'Castanholas'] },
  calango:  { label: 'Calango',      instruments: ['Zabumba', 'Sanfona (Base)', 'Triângulo'] }, // Fallback logic handled in patterns
  
  // NORDESTE
  forro:    { label: 'Forró Pé-de-Serra', instruments: ['Zabumba', 'Triângulo', 'Agogô'] },
  baiao:    { label: 'Baião',        instruments: ['Zabumba', 'Pandeiro', 'Triângulo'] },
  xaxado:   { label: 'Xaxado',       instruments: ['Zabumba Seca', 'Caixa', 'Agogô'] },
  coco:     { label: 'Coco de Roda', instruments: ['Surdo/Ganzá', 'Palmas', 'Tamancos'] },
  ciranda:  { label: 'Ciranda',      instruments: ['Surdo Grave', 'Caixa/Tarol', 'Ganzá'] },
  caterete: { label: 'Cateretê',     instruments: ['Palmas Graves', 'Violas', 'Chocalho'] },
  
  // NORTE / BAHIA
  axe:      { label: 'Axé Music',    instruments: ['Surdo Virado', 'Caixa', 'Timbal'] },
  fricote:  { label: 'Fricote',      instruments: ['Surdo Rápido', 'Timbal', 'Repique'] },
  timbalada:{ label: 'Samba Reggae', instruments: ['Surdo Fundo', 'Tarol', 'Timbal'] }, // Mapped to valid style if needed or merged
  carimbo:  { label: 'Carimbó',      instruments: ['Curimbó', 'Maracá', 'Banjo'] },
  lambada:  { label: 'Lambada',      instruments: ['Surdo/Kick', 'Caixa', 'Chimbal'] },
  boi:      { label: 'Dança do Boi', instruments: ['Surdo Maracanã', 'Matracas', 'Pandeirão'] },
  
  // Extra mapping fixes for logic consistency
} as any; 

// === 2. PADRÕES RÍTMICOS (Matrizes de 16 passos) ===
// 1 = Forte, 0.X = Fraco/Médio, 0 = Silêncio
const RHYTHM_PATTERNS: Record<RhythmStyle, { marcacao: number[], conducao: number[], efeitos: number[] }> = {
  samba: {
    marcacao: [0.3, 0, 0, 0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 0, 0, 0], // Surdo no 2
    conducao: [1, 0.2, 0.4, 0.2, 0.9, 0.2, 0.4, 0.2, 1, 0.2, 0.4, 0.2, 0.9, 0.2, 0.4, 0.2], // Pandeiro
    efeitos:  [0, 0, 1, 0, 0.9, 0, 0, 1, 0, 0, 1, 0, 0.9, 0, 0, 0] // Tamborim 3x1
  },
  pagode: {
    marcacao: [0.8, 0, 0, 0.4, 0, 0, 0, 0, 0.9, 0, 0, 0.4, 0, 0, 0, 0], // Tantã
    conducao: [1, 0, 0.5, 0, 0.8, 0, 0.5, 0, 1, 0, 0.5, 0, 0.8, 0, 0.5, 0], // Pandeiro Partido
    efeitos:  [0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0, 0.8, 0] // Reco-reco
  },
  partido: {
    marcacao: [1, 0, 0, 0.5, 0, 0, 0, 0, 1, 0, 0, 0.5, 0, 0, 0, 0],
    conducao: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // Palmas no contratempo
    efeitos:  [0, 0.5, 0, 0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0, 0.8, 0, 0.5, 0, 0.8] // Cuíca
  },
  choro: {
    marcacao: [0.8, 0, 0, 0, 0.4, 0, 0, 0, 0.7, 0, 0, 0, 0.4, 0, 0, 0],
    conducao: [0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4],
    efeitos:  [0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2] // Ganzá
  },
  bossa: {
    marcacao: [0.7, 0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0, 0, 0],
    conducao: [0.4, 0.2, 0.3, 0.2, 0.4, 0.2, 0.3, 0.2, 0.4, 0.2, 0.3, 0.2, 0.4, 0.2, 0.3, 0.2],
    efeitos:  [0, 0, 0, 0.8, 0, 0, 0.6, 0, 0, 0, 0, 0.8, 0, 0, 0, 0] // Tamborim Clave
  },
  baiao: {
    marcacao: [1.0, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0.8, 0, 0, 0, 0, 0], // Zabumba
    conducao: [0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 0], // Pandeiro
    efeitos:  [0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 1.0, 0.5] // Triângulo
  },
  forro: {
    marcacao: [1.0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0.9, 0, 0, 0, 0, 0],
    conducao: [0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8], // Triângulo Fechado/Aberto
    efeitos:  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] // Agogô
  },
  xaxado: {
    marcacao: [1, 0, 0.4, 0, 0.8, 0, 0, 0, 1, 0, 0.4, 0, 0.8, 0, 0, 0],
    conducao: [0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5],
    efeitos:  [0, 0, 1, 0, 0, 0, 0.8, 0, 0, 0, 1, 0, 0, 0, 0.8, 0]
  },
  coco: {
    marcacao: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    conducao: [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1], // Palmas
    efeitos:  [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
  },
  carimbo: {
    marcacao: [1, 0, 0, 0, 0.8, 0, 0, 0, 1, 0, 0, 0, 0.8, 0, 0, 0], // Curimbó
    conducao: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], // Maracá
    efeitos:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]
  },
  axe: {
    marcacao: [1, 0, 0, 0.5, 1, 0, 0, 0.5, 1, 0, 0, 0.5, 1, 0, 0, 0.5], // Surdo Virado
    conducao: [0, 0.6, 0.6, 0, 0, 0.6, 0.6, 0, 0, 0.6, 0.6, 0, 0, 0.6, 0.6, 0], // Caixa
    efeitos:  [1, 0.2, 0.5, 0.2, 1, 0.2, 0.5, 0.2, 1, 0.2, 0.5, 0.2, 1, 0.2, 0.5, 0.2] // Timbal
  },
  fricote: {
    marcacao: [1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0],
    conducao: [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5], // Timbal
    efeitos:  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] // Repique
  },
  timbalada: { // Mapped internally as Samba Reggae
    marcacao: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    conducao: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    efeitos:  [0.8, 0.5, 0.8, 0.5, 1, 0.5, 0.8, 0.5, 0.8, 0.5, 0.8, 0.5, 1, 0.5, 0.8, 0.5]
  },
  lambada: {
    marcacao: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Kick
    conducao: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // Snare
    efeitos:  [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] // Hihat
  },
  gafieira: {
    marcacao: [0.7, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0.5, 0, 0, 0],
    conducao: [0, 0.3, 0.3, 0.3, 0.8, 0.3, 0.3, 0.3, 0, 0.3, 0.3, 0.3, 0.8, 0.3, 0.3, 0.3], // Caixa Vassourinha
    efeitos:  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // Prato
  },
  maxixe: {
    marcacao: [1, 0, 0, 0, 0.8, 0, 0, 0, 1, 0, 0, 0, 0.8, 0, 0, 0],
    conducao: [0, 0.5, 1, 0.5, 0, 0.5, 1, 0.5, 0, 0.5, 1, 0.5, 0, 0.5, 1, 0.5],
    efeitos:  [1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0]
  },
  lundu: {
    marcacao: [1, 0, 0, 0.5, 1, 0, 0, 0.5, 1, 0, 0, 0.5, 1, 0, 0, 0.5],
    conducao: [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0], // Palmas
    efeitos:  [0.8, 0, 0, 0.8, 0, 0, 0.8, 0, 0, 0.8, 0, 0, 0.8, 0, 0, 0]
  },
  caterete: {
    marcacao: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Batida de pé/mão
    conducao: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    efeitos:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
  },
  ciranda: {
    marcacao: [1, 0, 0, 0, 0.6, 0, 0, 0, 0.9, 0, 0, 0, 0.6, 0, 0, 0],
    conducao: [0, 0, 0.5, 0, 0.8, 0, 0.5, 0, 0, 0, 0.5, 0, 0.8, 0, 0.5, 0], // Tarol
    efeitos:  [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4]
  },
  boi: {
    marcacao: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // Surdo pesado
    conducao: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Matracas (rápido)
    efeitos:  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]
  }
};

const GroupSimulator: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(95);
  const [style, setStyle] = useState<RhythmStyle>('samba');
  
  // Estado Visual
  const [instruments, setInstruments] = useState<Record<string, InstrumentState>>({
    marcacao: { volume: 0.8, muted: false, pan: 0 },
    conducao: { volume: 0.6, muted: false, pan: -0.2 },
    efeitos:  { volume: 0.5, muted: false, pan: 0.2 }
  });

  const styleRef = useRef(style);
  const instrumentsRef = useRef(instruments);
  const bpmRef = useRef(bpm);

  useEffect(() => { styleRef.current = style; }, [style]);
  useEffect(() => { instrumentsRef.current = instruments; }, [instruments]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const audioCtx = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  const currentStep = useRef(0);
  const [visualStep, setVisualStep] = useState(0);

  const [vLevels, setVLevels] = useState<Record<string, number>>({ marcacao: 0, conducao: 0, efeitos: 0 });

  // === MOTOR DE SÍNTESE DE ÁUDIO ===
  const playSound = (layer: 'marcacao' | 'conducao' | 'efeitos', time: number, velocity: number) => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    
    // Obter o nome do instrumento baseado no ritmo atual
    const instName = RHYTHM_INFO[styleRef.current].instruments[
      layer === 'marcacao' ? 0 : layer === 'conducao' ? 1 : 2
    ];
    
    const config = instrumentsRef.current[layer];
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    
    gain.connect(panner);
    panner.connect(ctx.destination);
    panner.pan.value = config.pan;
    
    // Volume base calculado
    const masterVol = velocity * config.volume;

    // --- SÍNTESE ESPECÍFICA POR INSTRUMENTO ---

    // 1. SURDOS / ZABUMBAS / GRAVES
    if (instName.includes('Surdo') || instName.includes('Zabumba') || instName.includes('Tantã') || instName.includes('Curimbó') || instName.includes('Kick')) {
       const osc = ctx.createOscillator();
       const isZabumba = instName.includes('Zabumba');
       
       osc.type = isZabumba ? 'sine' : 'triangle';
       // Frequência base: Surdos 50-60Hz, Zabumbas 45Hz
       const freq = isZabumba ? 45 : 55;
       
       osc.frequency.setValueAtTime(freq, time);
       if (velocity > 0.7) {
         // Pitch decay para batidas fortes
         osc.frequency.exponentialRampToValueAtTime(freq * 0.8, time + 0.15);
       }
       
       // Filtro para tirar o brilho artificial do oscilador
       const filter = ctx.createBiquadFilter();
       filter.type = 'lowpass';
       filter.frequency.value = 150;
       
       gain.gain.setValueAtTime(0, time);
       gain.gain.linearRampToValueAtTime(masterVol, time + 0.005);
       gain.gain.exponentialRampToValueAtTime(0.001, time + (isZabumba ? 0.5 : 0.3));

       osc.connect(filter);
       filter.connect(gain);
       osc.start(time);
       osc.stop(time + 0.6);
       return;
    }

    // 2. CUÍCA
    if (instName.includes('Cuíca')) {
       const osc = ctx.createOscillator();
       osc.type = 'sawtooth'; // Som rasgado
       
       // Pitch sweep característico (uuu-iii ou iii-uuu)
       const startFreq = velocity > 0.6 ? 300 : 600;
       const endFreq = velocity > 0.6 ? 600 : 300;
       osc.frequency.setValueAtTime(startFreq, time);
       osc.frequency.linearRampToValueAtTime(endFreq, time + 0.1);

       const filter = ctx.createBiquadFilter();
       filter.type = 'bandpass';
       filter.frequency.value = 500;
       filter.Q.value = 5;

       gain.gain.setValueAtTime(0, time);
       gain.gain.linearRampToValueAtTime(masterVol * 0.5, time + 0.02);
       gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

       osc.connect(filter);
       filter.connect(gain);
       osc.start(time);
       osc.stop(time + 0.2);
       return;
    }

    // 3. AGOGÔ
    if (instName.includes('Agogô')) {
       const osc = ctx.createOscillator();
       osc.type = 'square'; // Som metálico
       // Dois sinos: Alta (High Velocity) e Baixa (Low Velocity)
       const freq = velocity > 0.8 ? 1000 : 700;
       osc.frequency.setValueAtTime(freq, time);

       gain.gain.setValueAtTime(0, time);
       gain.gain.linearRampToValueAtTime(masterVol * 0.2, time + 0.002);
       gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1); // Decay muito curto

       osc.connect(gain);
       osc.start(time);
       osc.stop(time + 0.15);
       return;
    }

    // 4. RECO-RECO / GANZÁ / CHOCALHO / MARACÁ / CAIXA (Noise-based)
    if (['Reco-reco', 'Ganzá', 'Chocalho', 'Caixa', 'Maracá', 'Vassourinha', 'Tarol', 'Chimbal'].some(s => instName.includes(s))) {
       const bufferSize = ctx.sampleRate * 0.2;
       const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
       const data = buffer.getChannelData(0);
       for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

       const noise = ctx.createBufferSource();
       noise.buffer = buffer;

       const filter = ctx.createBiquadFilter();
       
       if (instName.includes('Reco-reco')) {
          filter.type = 'bandpass';
          filter.frequency.value = 2000;
          filter.frequency.linearRampToValueAtTime(3000, time + 0.1); // Simula raspagem
       } else if (instName.includes('Caixa') || instName.includes('Tarol')) {
          filter.type = 'highpass';
          filter.frequency.value = 800;
       } else {
          // Ganzá/Shaker
          filter.type = 'highpass';
          filter.frequency.value = 4000;
       }

       gain.gain.setValueAtTime(masterVol * (instName.includes('Ganzá') ? 0.4 : 0.8), time);
       gain.gain.exponentialRampToValueAtTime(0.001, time + (instName.includes('Reco-reco') ? 0.15 : 0.05));

       noise.connect(filter);
       filter.connect(gain);
       noise.start(time);
       return;
    }

    // 5. TIMBAL / CONGA / ATABAQUE
    if (['Timbal', 'Conga', 'Atabaque', 'Bongô'].some(s => instName.includes(s))) {
       const osc = ctx.createOscillator();
       osc.type = 'triangle';
       const freq = 250; 
       osc.frequency.setValueAtTime(freq, time);
       osc.frequency.exponentialRampToValueAtTime(freq * 0.8, time + 0.1); // Slap pitch drop

       // Adiciona estalo (noise)
       const bufferSize = ctx.sampleRate * 0.05;
       const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
       const data = buffer.getChannelData(0);
       for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
       const noise = ctx.createBufferSource();
       noise.buffer = buffer;
       const noiseGain = ctx.createGain();
       noiseGain.gain.value = masterVol * 0.5;
       noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
       noise.connect(noiseGain);
       noiseGain.connect(gain);
       noise.start(time);

       gain.gain.setValueAtTime(0, time);
       gain.gain.linearRampToValueAtTime(masterVol, time + 0.005);
       gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

       osc.connect(gain);
       osc.start(time);
       osc.stop(time + 0.2);
       return;
    }

    // 6. TRIÂNGULO
    if (instName.includes('Triângulo')) {
       const osc = ctx.createOscillator();
       osc.type = 'triangle';
       // Aberto (High Velocity) vs Fechado (Low Velocity)
       const isOpen = velocity > 0.8;
       osc.frequency.setValueAtTime(isOpen ? 6000 : 3000, time);

       const osc2 = ctx.createOscillator();
       osc2.type = 'square';
       osc2.frequency.setValueAtTime(isOpen ? 8500 : 4500, time);
       const gain2 = ctx.createGain();
       gain2.gain.value = 0.2;
       osc2.connect(gain2);
       gain2.connect(gain);
       osc2.start(time);
       osc2.stop(time + 0.1);

       gain.gain.setValueAtTime(0, time);
       gain.gain.linearRampToValueAtTime(masterVol * 0.6, time + 0.005);
       gain.gain.exponentialRampToValueAtTime(0.001, time + (isOpen ? 0.3 : 0.05));

       osc.connect(gain);
       osc.start(time);
       osc.stop(time + 0.4);
       return;
    }

    // 7. GENÉRICO (Pandeiro, Tamborim padrão - fallback)
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    // Tamborim (Bandpass high), Pandeiro (Lowpass for slap, Highpass for jingle)
    if (instName.includes('Tamborim')) {
       filter.type = 'bandpass';
       filter.frequency.value = 2500;
       filter.Q.value = 5;
       gain.gain.setValueAtTime(masterVol * 1.2, time);
    } else {
       filter.type = velocity > 0.8 ? 'lowpass' : 'highpass';
       filter.frequency.value = velocity > 0.8 ? 1500 : 5000;
       gain.gain.setValueAtTime(masterVol, time);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(time);
  };

  const scheduleNote = (step: number, time: number) => {
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    
    // Ler do REF
    const currentStyle = styleRef.current;
    const currentInstruments = instrumentsRef.current;
    
    // Fallback seguro se o pattern não existir
    const pattern = RHYTHM_PATTERNS[currentStyle] || RHYTHM_PATTERNS['samba'];

    const drawStep = step;
    setTimeout(() => setVisualStep(drawStep), (time - ctx.currentTime) * 1000);

    // Disparar instrumentos
    if (!currentInstruments.marcacao.muted && pattern.marcacao[step] > 0) {
        playSound('marcacao', time, pattern.marcacao[step]);
        setTimeout(() => setVLevels(p => ({ ...p, marcacao: pattern.marcacao[step] * 100 })), (time - ctx.currentTime) * 1000);
    }
    if (!currentInstruments.conducao.muted && pattern.conducao[step] > 0) {
        playSound('conducao', time, pattern.conducao[step]);
        setTimeout(() => setVLevels(p => ({ ...p, conducao: pattern.conducao[step] * 100 })), (time - ctx.currentTime) * 1000);
    }
    if (!currentInstruments.efeitos.muted && pattern.efeitos[step] > 0) {
        playSound('efeitos', time, pattern.efeitos[step]);
        setTimeout(() => setVLevels(p => ({ ...p, efeitos: pattern.efeitos[step] * 100 })), (time - ctx.currentTime) * 1000);
    }
  };

  const scheduler = () => {
    if (!audioCtx.current) return;

    while (nextNoteTime.current < audioCtx.current.currentTime + 0.1) {
      scheduleNote(currentStep.current, nextNoteTime.current);
      const secondsPerStep = 60.0 / bpmRef.current / 4; 
      nextNoteTime.current += secondsPerStep;
      currentStep.current = (currentStep.current + 1) % 16;
    }
    timerID.current = window.setTimeout(scheduler, 25);
  };

  const toggleGroup = () => {
    if (!isPlaying) {
      if (!audioCtx.current) audioCtx.current = new AudioContext();
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
      
      nextNoteTime.current = audioCtx.current.currentTime + 0.1;
      currentStep.current = 0;
      setIsPlaying(true);
      scheduler();
    } else {
      setIsPlaying(false);
      if (timerID.current) clearTimeout(timerID.current);
      setVLevels({ marcacao: 0, conducao: 0, efeitos: 0 });
    }
  };

  const setTrainingMode = (mode: 'baixaria' | 'suingue' | 'metronomo' | 'full') => {
    setInstruments(prev => {
        const next = { ...prev };
        if (mode === 'baixaria') {
            next.marcacao.muted = true;
            next.conducao.muted = false;
            next.efeitos.muted = false;
        } else if (mode === 'suingue') {
            next.marcacao.muted = false;
            next.conducao.muted = false;
            next.efeitos.muted = true;
        } else if (mode === 'metronomo') {
            next.marcacao.muted = true;
            next.conducao.muted = false;
            next.efeitos.muted = true;
            next.conducao.volume = 0.8;
        } else {
            next.marcacao.muted = false;
            next.conducao.muted = false;
            next.efeitos.muted = false;
        }
        return next;
    });
    
    if (!isPlaying) toggleGroup();
  };

  useEffect(() => {
    return () => {
       if (timerID.current) clearTimeout(timerID.current);
       if (audioCtx.current) audioCtx.current.close();
    }
  }, []);

  useEffect(() => {
    const decay = setInterval(() => {
      setVLevels(p => ({
        marcacao: Math.max(0, p.marcacao - 8),
        conducao: Math.max(0, p.conducao - 8),
        efeitos: Math.max(0, p.efeitos - 8),
      }));
    }, 50);
    return () => clearInterval(decay);
  }, []);

  return (
    <div className="bg-[#120a07] border border-[#3d2516] rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col gap-6">
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
      
      <div className="relative z-10 space-y-6">
        
        {/* Header Roda Virtual */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-600/20 rounded-2xl shadow-glow">
              <Disc className={`w-6 h-6 text-amber-500 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-white italic leading-none">RODA VIRTUAL 7C</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter mt-1">Percussão Regional & Efeitos</p>
            </div>
          </div>
        </div>

        {/* Seletor de Ritmos (GRID) */}
        <div className="bg-black/40 rounded-3xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3 px-2">
                <Grid className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecione o Ritmo ({Object.keys(RHYTHM_INFO).length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {(Object.keys(RHYTHM_INFO) as RhythmStyle[]).map(s => (
                <button 
                    key={s} onClick={() => setStyle(s)} 
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center text-center gap-1 border ${style === s ? 'bg-amber-600 text-white shadow-glow border-amber-500' : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10 hover:text-amber-500'}`}
                >
                    <span>{RHYTHM_INFO[s].label}</span>
                </button>
                ))}
            </div>
        </div>

        {/* Visualizador de Compassos */}
        <div className="w-full flex gap-1 h-2 bg-black/40 rounded-full overflow-hidden">
            {[...Array(16)].map((_, i) => (
                <div 
                    key={i} 
                    className={`flex-1 transition-all duration-75 ${isPlaying && visualStep === i ? 'bg-amber-500 shadow-[0_0_10px_orange]' : (i % 4 === 0 ? 'bg-white/10' : 'bg-transparent')}`}
                />
            ))}
        </div>

        {/* Botões de Modo de Treino */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             <button onClick={() => setTrainingMode('baixaria')} className="bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 group">
                 <Guitar className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                 <span className="text-[9px] font-black uppercase text-amber-500">Modo Baixaria</span>
                 <span className="text-[7px] text-slate-500 uppercase">(Sem Grave)</span>
             </button>
             <button onClick={() => setTrainingMode('suingue')} className="bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 group">
                 <Layers className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                 <span className="text-[9px] font-black uppercase text-amber-500">Base Sólida</span>
                 <span className="text-[7px] text-slate-500 uppercase">(Sem Efeitos)</span>
             </button>
             <button onClick={() => setTrainingMode('metronomo')} className="bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 group">
                 <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                 <span className="text-[9px] font-black uppercase text-amber-500">Metrônomo Org.</span>
                 <span className="text-[7px] text-slate-500 uppercase">(Só Condução)</span>
             </button>
             <button onClick={() => setTrainingMode('full')} className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 group">
                 <Users className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                 <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-white">Roda Cheia</span>
                 <span className="text-[7px] text-slate-600 uppercase">(Tudo Ativo)</span>
             </button>
        </div>

        {/* Mixer - 3 Canais Dinâmicos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['marcacao', 'conducao', 'efeitos'] as const).map((layer) => {
            const currentInstName = RHYTHM_INFO[style].instruments[layer === 'marcacao' ? 0 : layer === 'conducao' ? 1 : 2];
            const state = instruments[layer];
            
            return (
              <div key={layer} className={`bg-black/40 p-6 rounded-[2.5rem] border transition-all flex flex-col items-center gap-6 relative group ${state.muted ? 'border-red-900/30 opacity-60' : 'border-white/5 hover:border-amber-600/20'}`}>
                
                {/* VU Meter Visual */}
                <div className="absolute top-4 left-4">
                  <div className="w-1.5 h-16 bg-zinc-900 rounded-full overflow-hidden flex flex-col justify-end border border-white/5">
                    <div 
                      className={`w-full transition-all duration-75 ${vLevels[layer] > 80 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-amber-500 shadow-glow'}`} 
                      style={{ height: `${state.muted ? 0 : vLevels[layer]}%` }} 
                    />
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                     {layer === 'marcacao' ? <Drum className="w-3 h-3 text-slate-500"/> : layer === 'conducao' ? <Disc className="w-3 h-3 text-slate-500"/> : <Zap className="w-3 h-3 text-slate-500"/>}
                     <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{layer}</span>
                  </div>
                  <div className={`text-sm font-black uppercase tracking-wide truncate max-w-[120px] transition-colors ${state.muted ? 'text-red-500 line-through decoration-2' : 'text-amber-500'}`}>
                    {currentInstName}
                  </div>
                </div>

                <div className="relative w-full flex flex-col items-center gap-6">
                  <div className="flex flex-col items-center w-full gap-2">
                    <input 
                      type="range" min="0" max="1" step="0.01" value={state.volume}
                      onChange={(e) => setInstruments(p => ({ ...p, [layer]: { ...p[layer], volume: parseFloat(e.target.value) } }))}
                      disabled={state.muted}
                      className="w-full h-1 bg-zinc-800 rounded-full appearance-none accent-amber-600 cursor-pointer disabled:opacity-50"
                    />
                  </div>

                  <div className="flex items-center justify-between w-full">
                    <button 
                      onClick={() => setInstruments(p => ({ ...p, [layer]: { ...p[layer], muted: !p[layer].muted } }))}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${state.muted ? 'bg-red-950 border-red-900 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-white/5 border-white/5 text-amber-500 hover:bg-white/10'}`}
                    >
                      <Volume2 className={`w-4 h-4 ${state.muted ? 'opacity-50' : ''}`} />
                    </button>
                    <span className="text-[8px] font-mono text-slate-600 uppercase">{state.muted ? 'OFF' : `${Math.round(state.volume * 100)}%`}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controle Master */}
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-black/60 p-5 rounded-[2.5rem] border border-white/5 shadow-inner">
          <div className="flex-1 flex flex-col gap-3 w-full">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Tempo</span>
              <span className="text-3xl font-mono font-black text-white italic leading-none">{bpm} <span className="text-[10px] uppercase not-italic text-amber-600/40">bpm</span></span>
            </div>
            <input 
              type="range" min="50" max="140" value={bpm} 
              onChange={(e) => setBpm(parseInt(e.target.value))} 
              className="w-full h-2 bg-zinc-900 rounded-full appearance-none accent-amber-600 cursor-pointer shadow-inner" 
            />
          </div>
          <button 
            onClick={toggleGroup}
            className={`w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all shadow-3xl active:scale-90 border-[6px] border-black/40 ${isPlaying ? 'bg-red-600 text-white shadow-[0_0_40px_rgba(220,38,38,0.3)]' : 'bg-amber-600 text-white shadow-glow hover:scale-105'}`}
          >
            {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
          </button>
        </div>

        <div className="bg-amber-600/5 p-4 rounded-2xl border border-amber-600/10 flex items-center gap-4">
           <AudioLines className="w-6 h-6 text-amber-500/30" />
           <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-relaxed">
             <span className="text-amber-500 italic">Estilo Atual ({RHYTHM_INFO[style].label}):</span> Camada grave ({RHYTHM_INFO[style].instruments[0]}), levada média ({RHYTHM_INFO[style].instruments[1]}) e brilho ({RHYTHM_INFO[style].instruments[2]}).
           </p>
        </div>
      </div>
    </div>
  );
};

export default GroupSimulator;