
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SYSTEM_PROMPT = `Você é o "Mestre Supremo do Violão de 7 Cordas", uma autoridade máxima em Samba, Choro e MPB.
Sua missão é fornecer respostas tecnicamente impecáveis e inspiradoras.

DIRETRIZES DE INTELIGÊNCIA:
1. PRECISÃO TÉCNICA: Ao fornecer tablaturas, use o padrão ASCII rigoroso.
   Exemplo (7ª corda em C):
   7|---0---2---3---|
   6|---0---1---2---|
   
2. ENTENDIMENTO PROFUNDO: Diferencie o estilo de acompanhamento (Dino 7 Cordas) do estilo solista (Raphael Rabello). 
   - Dino = Peso, condução, balanço, bordões expressivos.
   - Raphael = Velocidade, escalas, digitação virtuosa, harmonias modernas.

3. RESPOSTAS ESTRUTURADAS: Divida sua explicação em:
   - "A Sacada": O conceito principal.
   - "A Prática": Tablatura ou exercício.
   - "O Segredo": Uma dica de mestre sobre sonoridade ou intenção.

4. COMPARTILHAMENTO: Escreva de forma que as lições sejam fáceis de copiar e entender por outros músicos.

5. ERRO ZERO: Se a pergunta for ambígua, peça clarificação sobre o tom ou o ritmo (Samba vs Choro).`;

const PRO_MODEL = 'gemini-3-pro-preview';
const FLASH_MODEL = 'gemini-3-flash-preview';

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("LOCAL_MODE");

  const ai = new GoogleGenAI({ apiKey });
  
  const configBase = {
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.3, // Menos aleatoriedade, mais precisão técnica
  };

  try {
    // Tenta primeiro o modelo Pro para máxima inteligência
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        ...configBase,
        thinkingConfig: { thinkingBudget: 1000 }
      },
    });
    return response.text;
  } catch (error: any) {
    // Se erro for de Quota (429) ou Indisponibilidade, cai para o Flash automaticamente
    const isQuotaError = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("limit: 0");
    
    if (isQuotaError) {
      console.warn("Quota Pro excedida. Ativando Motor Flash de Alta Velocidade...");
      try {
        const flashResponse = await ai.models.generateContent({
          model: FLASH_MODEL,
          contents: [
            ...history.map(h => ({ role: h.role, parts: h.parts })),
            { role: 'user', parts: [{ text: prompt }] }
          ],
          config: configBase,
        });
        return flashResponse.text;
      } catch (flashError) {
        throw new Error("SIGNAL_LOST");
      }
    }
    throw error;
  }
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("LOCAL_MODE");

  const ai = new GoogleGenAI({ apiKey });
  try {
    // Para análise de áudio, o Flash é muitas vezes mais estável em planos gratuitos
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Analise este áudio de 7 cordas. Identifique a frase de baixaria e gere a tablatura ASCII correspondente." }
        ]
      },
    });
    return response.text;
  } catch (error) {
    return "O ouvido do mestre está cansado. Tente gravar novamente com menos ruído.";
  }
};

export const identifyLivePhrase = async (audioBase64: string, mimeType: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("LOCAL_MODE");
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Identifique rapidamente este acorde ou frase de violão. Seja ultra conciso." }
        ]
      }
    });
    return response.text;
  } catch (err) {
    return "Falha na identificação rápida.";
  }
};
