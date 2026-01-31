
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

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  // Inicialização dentro da função para garantir o uso da chave configurada no ambiente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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

    // Acesso direto à propriedade .text conforme as novas diretrizes
    const text = response.text;
    
    if (!text) {
      throw new Error("O mestre não gerou uma resposta válida.");
    }

    return text;
  } catch (error: any) {
    console.error("Erro na conexão Gemini:", error);
    
    const errorMessage = error.message || "";
    
    if (
      errorMessage.includes('Requested entity was not found') || 
      errorMessage.includes('API key not valid') ||
      errorMessage.includes('403') ||
      errorMessage.includes('401')
    ) {
      throw new Error("REAUTH_REQUIRED");
    }
    
    throw new Error(error.message || "Ocorreu um erro ao consultar o mestre.");
  }
};
