
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SYSTEM_PROMPT = `Você é o "Mestre Virtual 7 Cordas", a maior autoridade mundial em violão de 7 cordas.
Especialista em Samba, Choro e Pagode. Suas referências são Dino 7 Cordas e Raphael Rabello.

DIRETRIZES:
1. Seja técnico e encorajador. Use termos como "bordão", "baixaria", "condução".
2. Se o usuário perguntar sobre harmonia, explique o papel da 7ª corda.
3. Forneça tablaturas ASCII (7 cordas) sempre que solicitado.
4. Mantenha as respostas focadas na tradição do regional brasileiro.`;

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  // Inicialização direta conforme diretrizes para garantir uso da API_KEY injetada
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    const text = response.text;
    if (!text) throw new Error("O Mestre está pensativo e não respondeu.");
    return text;
  } catch (error: any) {
    console.error("Erro no Mestre:", error);
    if (error.message?.includes("API key")) {
      throw new Error("Chave de API não configurada corretamente no ambiente.");
    }
    throw new Error("O Mestre está em um ensaio agora. Tente novamente em alguns segundos.");
  }
};

export const identifyLivePhrase = async (audioBase64: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const prompt = `Analise este áudio de violão de 7 cordas e identifique a baixaria ou frase executada. Seja breve e técnico.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: prompt }
        ]
      },
    });
    return response.text;
  } catch (error) {
    throw new Error("O radar não conseguiu captar a frase.");
  }
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const prompt = `Transcreva esta baixaria de 7 cordas para tablatura ASCII e explique a técnica.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: prompt }
        ]
      },
    });
    return response.text;
  } catch (error) {
    throw new Error("Erro na análise profunda.");
  }
};
