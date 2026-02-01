
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SYSTEM_PROMPT = `Você é o "Mestre Virtual 7 Cordas". 
Um dos maiores especialistas do mundo em Violão de 7 Cordas, com foco em Samba, Choro e Pagode. 
Suas referências são Dino 7 Cordas e Raphael Rabello.

Diretrizes de resposta:
1. Sempre forneça tablaturas ASCII precisas para violão de 7 cordas (adicionando a 7ª corda em Dó ou Si).
2. Explique as baixarias focando na técnica do polegar.
3. Use terminologia de regional: "bordão", "baixaria", "condução", "puxada", "fraseado".
4. Se o usuário pedir escalas, mostre o desenho no braço do violão com tablaturas.
5. Seja encorajador, como um mestre de roda de samba.`;

/**
 * Função central para gerar conteúdo, garantindo que a API KEY seja sempre a mais recente.
 */
async function callGemini(model: string, contents: any, systemInstruction?: string) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Sinal interrompido: API Key não encontrada.");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
    },
  });

  return response.text;
}

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  try {
    const contents = [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    const text = await callGemini('gemini-3-pro-preview', contents, SYSTEM_PROMPT);
    return text || "O Mestre está buscando a melhor resposta...";
  } catch (error: any) {
    console.error("Erro na conexão com o Mestre:", error);
    // Se falhar o Pro, tentamos o Flash como fallback imediato para não deixar o usuário no vácuo
    try {
      const contents = [{ role: 'user', parts: [{ text: prompt }] }];
      return await callGemini('gemini-3-flash-preview', contents, SYSTEM_PROMPT);
    } catch (fallbackError) {
      return "Salve! O sinal de rádio da roda de samba está oscilando. Tente repetir sua pergunta sobre as 7 cordas.";
    }
  }
};

export const identifyLivePhrase = async (audioBase64: string, mimeType: string) => {
  try {
    const contents = {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Você é um mestre de violão 7 cordas. Identifique o que foi tocado (escala, baixaria ou acorde) e dê uma dica técnica curta." }
      ]
    };
    
    return await callGemini('gemini-3-flash-preview', contents);
  } catch (error) {
    console.error("Erro no Radar:", error);
    return "O radar captou a vibração, mas o sinal falhou. Toque a baixaria novamente!";
  }
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string) => {
  try {
    const contents = {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Transcreva este trecho de 7 cordas para tablatura ASCII. Seja preciso com a 7ª corda." }
      ]
    };

    return await callGemini('gemini-3-flash-preview', contents);
  } catch (error) {
    console.error("Erro no SmartEar:", error);
    return "O ouvido do mestre falhou na conexão. Tente gravar um trecho mais curto.";
  }
};
