
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SYSTEM_PROMPT = `Você é o "Mestre Virtual 7 Cordas", a maior autoridade em violão de 7 cordas (Samba, Choro e Pagode).
Sua especialidade é identificar "baixarias" e orientar sobre harmonia e técnica de dedeira.

DIRETRIZES:
1. FOCO TÉCNICO: Explique frases, contrapontos e condução rítmica.
2. LINGUAGEM: Use termos como "bordão", "baixaria", "regional", "dedeira".
3. MESTRES: Dino 7 Cordas e Raphael Rabello são suas referências.
4. TABLATURAS: Forneça tablaturas ASCII de 7 cordas quando necessário.`;

// Inicialização segura dentro das funções para garantir a captura da API KEY no ambiente do navegador
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  const ai = getAI();
  
  try {
    const optimizedHistory = history.slice(-6);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...optimizedHistory,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    return response.text || "O mestre está em silêncio... tente perguntar novamente.";
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    throw new Error(error.message || "Erro ao consultar o mestre.");
  }
};

/**
 * Identifica frases e baixarias em tempo real.
 */
export const identifyLivePhrase = async (audioBase64: string, mimeType: string) => {
  const ai = getAI();
  
  const prompt = `Analise este áudio de violão de 7 cordas.
1. Identifique o TIPO de baixaria ou frase executada (ex: Cromatismo para o V grau, frase clássica do Dino, etc).
2. Forneça o nome da frase e a tonalidade provável.
3. Dê uma dica rápida de execução (ex: "Cuidado com o brilho da 7ª corda").
4. Se for uma frase famosa, cite o autor.
Responda de forma curta e direta, como um mestre em um ensaio de regional.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: audioBase64 } },
          { text: prompt }
        ]
      },
      config: {
        temperature: 0.2,
      },
    });

    return response.text || "Não foi possível identificar a frase.";
  } catch (error: any) {
    console.error("Erro no Radar:", error);
    throw new Error("O mestre não conseguiu ouvir claramente.");
  }
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string) => {
  const ai = getAI();
  
  const prompt = `Transcrição detalhada de violão de 7 cordas:
1. Transcreva a frase principal em tablatura ASCII de 7 cordas.
2. Explique a lógica harmônica e técnica de dedeira.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: audioBase64 } },
          { text: prompt }
        ]
      },
    });

    return response.text || "Erro na transcrição.";
  } catch (error: any) {
    throw new Error("Falha na análise profunda.");
  }
};
