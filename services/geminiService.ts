
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SYSTEM_PROMPT = `Você é o "Mestre Virtual 7 Cordas", a maior autoridade mundial em violão de 7 cordas.
Sua especialidade é o Regional Brasileiro (Samba, Choro e Pagode).

DIRETRIZES DE RESPOSTA:
1. FOCO TÉCNICO: Explique baixarias, contrapontos, técnica de dedeira e harmonia.
2. LINGUAGEM: Use termos como "bordão", "baixaria", "regional", "dedeira", "antecipação".
3. MESTRES: Cite Dino 7 Cordas e Raphael Rabello como referências máximas.
4. TABLATURAS: Sempre que solicitado, forneça tablaturas ASCII precisas para 7 cordas.

ESTRUTURA DE TABLATURA (7 CORDAS):
7 (C/B)|---
6 (E)  |---
5 (A)  |---
4 (D)  |---
3 (G)  |---
2 (B)  |---
1 (E)  |---
`;

const AI_CONFIG = {
  systemInstruction: SYSTEM_PROMPT,
  temperature: 0.7,
  topP: 0.95,
};

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const optimizedHistory = history.slice(-6);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...optimizedHistory,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: AI_CONFIG,
    });

    const text = response.text;
    if (!text) throw new Error("O mestre não gerou uma resposta válida.");
    return text;
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    throw new Error(error.message || "Erro ao consultar o mestre.");
  }
};

/**
 * Função especializada para o "Ouvido Inteligente 7C"
 * Analisa áudio gravado para extrair baixarias e frases.
 */
export const analyzeBaixaria = async (audioBase64: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analise este áudio de violão de 7 cordas. 
1. Identifique as baixarias (frases de baixo) executadas.
2. Transcreva a frase principal em tablatura ASCII de 7 cordas.
3. Explique a lógica harmônica (ex: antecipação de dominante, escala usada).
4. Dê dicas de dedeira para esta frase específica.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: audioBase64 } },
          { text: prompt }
        ]
      },
      config: AI_CONFIG,
    });

    const text = response.text;
    if (!text) throw new Error("O Ouvido Inteligente não conseguiu processar este trecho.");
    return text;
  } catch (error: any) {
    console.error("Erro Ouvido Inteligente:", error);
    throw new Error("Não foi possível analisar o áudio. Certifique-se de que o som está claro.");
  }
};
