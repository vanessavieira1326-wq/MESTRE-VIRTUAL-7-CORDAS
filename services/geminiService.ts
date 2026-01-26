
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

const SYSTEM_PROMPT = `Você é o "Mestre Virtual 7 Cordas", a maior autoridade mundial em violão de 7 cordas.
Sua especialidade é o Regional Brasileiro (Samba, Choro e Pagode).

DIRETRIZES DE RESPOSTA:
1. FOCO TÉCNICO: Explique baixarias, contrapontos, técnica de dedeira e harmonia.
2. LINGUAGEM: Use termos como "bordão", "baixaria", "regional", "dedeira", "antecipação".
3. MESTRES: Cite Dino 7 Cordas e Raphael Rabello como referências máximas.
4. TABLATURAS: Sempre que solicitado, forneça tablaturas ASCII precisas para 7 cordas.
5. OBJETIVIDADE: Seja direto, inspirador e tecnicamente impecável.

ESTRUTURA DE TABLATURA (7 CORDAS):
7 (C/B)|---
6 (E)  |---
5 (A)  |---
4 (D)  |---
3 (G)  |---
2 (B)  |---
1 (E)  |---
`;

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("API Key not found. Please ensure process.env.API_KEY is configured.");
    return "A configuração de acesso à IA está ausente. Por favor, verifique sua Chave de API.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const contents = [
      ...history,
      { role: 'user', parts: [{ text: prompt }] }
    ] as any;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.8,
        topP: 0.9,
      },
    });

    if (!response || !response.text) {
      throw new Error("Empty AI response");
    }

    return response.text;
  } catch (error) {
    console.error("AI Teacher Error:", error);
    return "O mestre está ajustando a afinação. Por favor, tente enviar sua pergunta novamente.";
  }
};
