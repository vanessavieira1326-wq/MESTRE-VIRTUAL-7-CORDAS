
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
  // Inicializamos a cada chamada para garantir que usamos a chave mais recente se houver mudanças no ambiente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Limitamos o histórico para evitar estourar o limite de tokens em conexões instáveis
    const limitedHistory = history.slice(-6);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...limitedHistory,
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        topP: 0.9,
        // Removido maxOutputTokens para evitar cortes abruptos em respostas longas
      },
    });

    const text = response.text;
    
    if (!text) {
      throw new Error("Resposta vazia do servidor.");
    }

    return text;
  } catch (error: any) {
    console.error("AI Teacher Error Details:", error);
    
    // Tratamento específico de erros comuns
    if (error.message?.includes('429')) return "O mestre está atendendo muitos alunos agora. Aguarde um momento e tente novamente.";
    if (error.message?.includes('network')) return "Erro de rede. Verifique sua conexão com a internet.";
    
    return "Ocorreu um erro na conexão com o Mestre. Por favor, tente enviar sua mensagem novamente.";
  }
};
