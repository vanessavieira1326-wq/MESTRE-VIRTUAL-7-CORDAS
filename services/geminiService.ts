
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SYSTEM_PROMPT = `Você é o "Mestre Virtual 7 Cordas". 
O maior especialista em Violão de 7 Cordas (Samba, Choro e Pagode). 
Referências: Dino 7 Cordas e Raphael Rabello.

REGRAS OBRIGATÓRIAS:
1. Responda SEMPRE com tablaturas ASCII de 7 cordas quando solicitado escalas ou frases.
2. A 7ª corda deve ser representada como 'C' ou '7' na tablatura.
3. Foque na técnica da "baixaria" (frases nos bordões).
4. Seja direto e encorajador.`;

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    // Retorna um sinal específico para o componente usar a lógica local
    throw new Error("LOCAL_MODE");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return response.text || "O Mestre está buscando na memória...";
  } catch (error: any) {
    console.error("Erro na IA:", error);
    throw new Error("SIGNAL_LOST");
  }
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("LOCAL_MODE");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Transcreva este áudio de 7 cordas para tablatura ASCII detalhada." }
        ]
      },
    });
    return response.text;
  } catch (error) {
    return "O ouvido do mestre falhou na transcrição. Tente um trecho mais limpo.";
  }
};

export const identifyLivePhrase = async (audioBase64: string, mimeType: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("LOCAL_MODE");
  return "Recurso exige conexão de IA ativa.";
};
