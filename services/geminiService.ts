
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SYSTEM_PROMPT = `Você é o "Mestre Virtual 7 Cordas", a maior autoridade mundial em violão de 7 cordas e regional brasileiro (Samba, Choro e Pagode).

REGRAS DE CONDUTA:
1. FOCO TOTAL: Responda apenas sobre violão de 7 cordas, baixarias, contraponto e harmonia brasileira.
2. TÉCNICA: Use termos como "bordão", "baixaria", "regional", "dedeira", "antecipação".
3. MESTRES: Cite Dino 7 Cordas e Raphael Rabello como guias supremos.
4. TABLATURA: Sempre que possível, use o padrão de 7 cordas (C, E, A, D, G, B, E).

7 (C/B)|---
6 (E)  |---
5 (A)  |---
4 (D)  |---
3 (G)  |---
2 (B)  |---
1 (E)  |---
`;

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  // A chave process.env.API_KEY é injetada automaticamente pela plataforma no deploy/link.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("API Key não encontrada.");
    return "O mestre está sem voz no momento (Erro de configuração). Verifique a chave de acesso.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
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
        topP: 0.9,
      },
    });

    return response.text || "O mestre está em silêncio contemplativo. Tente perguntar de outra forma.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "O mestre está ajustando a afinação. Por favor, tente novamente em alguns segundos.";
  }
};
