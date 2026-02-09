
import { GoogleGenAI, Type } from "@google/genai";

export interface NoteEvent {
  time: number;
  string: number;
  fret: number;
  duration: number;
}

export interface BaixariaAnalysis {
  timestamp: string;
  tablature: string;
  notes: string;
  events: NoteEvent[]; 
}

export interface InstrumentDetection {
  vocals: boolean;
  guitar7c: boolean;
  cavaco: boolean;
  bass: boolean;
  pandeiro: boolean;
  drums: boolean;
}

export interface ChordShape {
  name: string;
  tab: string;
  description: string;
  type: 'maior' | 'menor' | 'dominante' | 'diminuto' | 'alterado' | 'especial7';
  frets: number[]; 
  scaleTab?: string;
  scaleNotes?: string;
  scaleEvents?: NoteEvent[];
}

const FLASH_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

const SYSTEM_CONSULTANCY_PROMPT = `
VOCÊ É O "MESTRE SUPREMO DO 7 CORDAS", UM CONSULTOR TÉCNICO DE ELITE.
SUA MISSÃO É FORNECER CONSULTORIA TÉCNICA AVANÇADA PARA VIOLONISTAS DE 7 CORDAS.
Analise baixarias, harmonia regional e técnica rítmica.
`;

export const getTeacherInsights = async (prompt: string, history: any[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
    config: { systemInstruction: SYSTEM_CONSULTANCY_PROMPT, temperature: 0.7 }
  });
  return response.text || "";
};

export const detectInstrumentsInAudio = async (audioBase64: string, mimeType: string): Promise<InstrumentDetection> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Identifique os instrumentos em JSON. Retorne apenas o JSON: {vocals, guitar7c, cavaco, bass, pandeiro, drums}" }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};

export const extractProfessionalScore = async (audioBase64: string, mimeType: string): Promise<BaixariaAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Transcreva baixarias 7C em JSON. Retorne uma array de objetos com timestamp, tablature, notes." }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "[]");
};

export const getSmart7Voicing = async (request: string): Promise<ChordShape[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: `Sugira 3 voicings de 7 cordas e as escalas correspondentes para: "${request}". Retorne array JSON com name, tab, description, type, frets, scaleTab, scaleNotes, scaleEvents.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "[]");
};

export const identifyLivePhrase = async (audioBase64: string, mimeType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: { parts: [{ inlineData: { mimeType, data: audioBase64 } }, { text: "Identifique a frase ou baixaria de 7 cordas presente neste áudio curto." }] }
  });
  return response.text || "";
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Analise detalhadamente as baixarias de 7 cordas neste áudio. Descreva a condução harmônica e rítmica." }
        ]
      }
    });
    return response.text || "";
};
