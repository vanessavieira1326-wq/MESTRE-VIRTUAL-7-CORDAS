
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
4. Seja direto e encorajador.
5. Se for uma escala, mostre o desenho completo.`;

/**
 * Função para obter a instância da IA de forma segura e resiliente.
 */
const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  try {
    const ai = getAIInstance();
    const contents = [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    return response.text || "O Mestre está buscando a melhor resposta na memória...";
  } catch (error: any) {
    console.error("Erro no Mestre Virtual:", error);
    if (error.message === "API_KEY_MISSING") {
      return "Salve! O sistema está sem a chave de sinal (API KEY). Para funcionar fora do Studio, configure a variável de ambiente.";
    }
    return "O sinal da roda de samba oscilou. Tente perguntar novamente!";
  }
};

export const identifyLivePhrase = async (audioBase64: string, mimeType: string) => {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Identifique esta baixaria ou frase de violão 7 cordas. Dê o nome da escala ou acorde e uma dica técnica." }
        ]
      },
    });
    return response.text;
  } catch (error) {
    return "O radar captou a frequência, mas não conseguiu processar. Toque mais perto do microfone!";
  }
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string) => {
  try {
    const ai = getAIInstance();
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
