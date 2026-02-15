import { GoogleGenAI, Type } from "@google/genai";

export interface BaixariaIdea {
  title: string;
  style: string;
  tab: string;
  score: string;
  analysis: string;
}

export interface BaixariaResponse {
  key: string;
  context: string;
  ideas: BaixariaIdea[];
}

export interface TablatureTranscription {
  key: string;
  bpm: number;
  tab: string;
  score: string;
  description: string;
  technicalTips: string;
  scalesUsed: string[];
}

export interface BaixariaAnalysis {
  timestamp: string;
  tablature: string;
  notes: string;
}

/**
 * Model configured as 'gemini-3-flash-preview' for high speed and efficiency.
 */
const PROJECT_MODEL = 'gemini-3-flash-preview';

const SYSTEM_CREATIVE_PROMPT = `
VOCÊ É O "MESTRE COMPOSITOR DO 7 CORDAS".
Sua missão é criar baixarias técnicas e auditivamente precisas.

REGRAS DE SINCRONIZAÇÃO ÁUDIO/TEXTO:
1. O campo "score" deve ser a FONTE DA VERDADE para o som e a visão.
2. NUNCA use nomes em português (Sol, Lá, Si) no campo "score".
3. USE APENAS notação internacional: C, C#, D, D#, E, F, F#, G, G#, A, Bb, B.
4. FORMATO OBRIGATÓRIO: "NotaOitava, NotaOitava" (Ex: "G2, A2, Bb2, C3, D3").
5. Oitavas para 7 cordas: 1 (extra grave), 2 (bordões), 3 (médias).

REGRAS DE CONTEÚDO:
- Gere 3 ideias: Tradicional (Dino), Cromática (Raphael), Moderna (Virtuosa).
- A tablatura deve refletir exatamente as notas do score.

FORMATO JSON:
{
  "key": "Tom da Frase",
  "context": "Progressão harmônica",
  "ideas": [
    {
      "title": "Nome Criativo",
      "style": "Tradicional/Cromática/Moderna",
      "tab": "Tablatura ASCII 7 cordas",
      "score": "E2, F#2, G2, A2",
      "analysis": "Por que essas notas foram escolhidas."
    }
  ]
}
`;

export const generateBaixariaIdeas = async (prompt: string): Promise<BaixariaResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: PROJECT_MODEL,
    contents: [{ role: 'user', parts: [{ text: `Crie 3 baixarias para: ${prompt}.` }] }],
    config: { 
      responseMimeType: "application/json",
      systemInstruction: SYSTEM_CREATIVE_PROMPT,
      temperature: 0.7
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    throw new Error("Erro na composição. Tente especificar um tom (Ex: Am).");
  }
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string): Promise<TablatureTranscription> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: PROJECT_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "TRANSCRIAÇÃO: Retorne JSON com campo 'score' no formato internacional 'G2, A2, B2' para tocar identicamente o que foi ouvido." }
        ]
      },
      config: { 
        responseMimeType: "application/json",
        systemInstruction: "Você é um transcritor perfeito. O campo 'score' deve conter as notas exatas em inglês (C, D, E) e oitavas (1-3).",
        temperature: 0.1 
      }
    });
    
    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      throw new Error("Nitidez insuficiente para transcrição.");
    }
};

export const getTeacherInsights = async (prompt: string, history: any[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: PROJECT_MODEL,
    contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
    config: { systemInstruction: "Você é um consultor técnico de violão 7 cordas.", temperature: 0.7 }
  });
  return response.text || "";
};

export const identifyLivePhrase = async (audioBase64: string, mimeType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: PROJECT_MODEL,
    contents: { parts: [{ inlineData: { mimeType, data: audioBase64 } }, { text: "O que foi tocado?" }] }
  });
  return response.text || "";
};

export const extractProfessionalScore = async (audioBase64: string, mimeType: string): Promise<BaixariaAnalysis[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: PROJECT_MODEL,
    contents: { parts: [{ inlineData: { mimeType, data: audioBase64 } }, { text: "Extraia frases em JSON array." }] },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "[]");
};