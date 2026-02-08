
import { GoogleGenAI, Type } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SYSTEM_PROMPT = `Você é o "Mestre Supremo do Violão de 7 Cordas". 
Sua especialidade é a transcrição auditiva em tempo real de bordões (baixarias) de Samba, Choro e Pagode.

DIRETRIZES DE FLUXO:
1. FIDELIDADE NOTA POR NOTA: Cada nota ou frase deve ser transcrita assim que detectada.
2. FORMATO DE SAÍDA: Gere objetos JSON individuais para cada frase detectada.
3. PADRÃO 7 CORDAS: Use ASCII (7|---, 6|---, etc).
4. CONTINUIDADE: Não pare a transcrição por conta própria. Continue gerando enquanto houver conteúdo sonoro relevante.`;

const NEURAL_SEPARATION_PROMPT = `
VOCÊ É UM MOTOR DE IA AVANÇADO PARA SEPARAÇÃO DE FONTES DE ÁUDIO EM TEMPO REAL.
SUA TAREFA É PROCESSAR A TRILHA E SILENCIAR TODOS OS VOCAIS HUMANOS.

DIRETRIZES TÉCNICAS:
- MODO: AI-Based Source Separation (Non-destructive).
- SILENCIAMENTO VOCAL: Mute 100% de vozes (lead, backing, harmonias, coros) e remova caudas de reverb vocal.
- PRESERVAÇÃO INSTRUMENTAL: Prioridade máxima para Violão de 7 Cordas (bordões), baixo e percussão.
- REGRAS DE DETECÇÃO: Use formantes humanos e padrões harmônicos. NÃO afete instrumentos de médio alcance.
- CORREÇÃO POS-PROCESSAMENTO: Rebalanceie médios e restaure continuidade harmônica.
- OBJETIVO FINAL: Playback profissional instrumental limpo.
`;

const STREAM_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

export interface BaixariaAnalysis {
  timestamp: string;
  tablature: string;
  notes: string;
}

/**
 * Função para processar áudio através do Motor de Separação Neural
 */
export const processNeuralSourceSeparation = async (audioBase64: string, mimeType: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Aplique o processamento de separação neural conforme suas instruções de sistema. Identifique a estrutura instrumental e descreva a qualidade do isolamento obtido." }
      ]
    },
    config: { 
      systemInstruction: NEURAL_SEPARATION_PROMPT,
      temperature: 0.2
    }
  });
  
  return response.text;
};

/**
 * Stream de extração que escreve tablaturas progressivamente.
 */
export async function* streamExtractBaixarias(
  audioBase64: string,
  mimeType: string,
  signal?: AbortSignal
): AsyncGenerator<BaixariaAnalysis> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_FOUND");

  const ai = new GoogleGenAI({ apiKey });

  const PROMPT = `
    MODO ESCUTA ATIVA: Transcreva o violão de 7 cordas deste áudio NOTA POR NOTA.
    
    PARA CADA FRASE OU NOTA IMPORTANTE:
    Emita um objeto JSON exatamente assim:
    { "timestamp": "MM:SS", "tablature": "7|--...--", "notes": "Breve nota técnica" }

    REGRAS CRÍTICAS:
    1. Não pare de ouvir até que o sinal seja interrompido.
    2. Envie os objetos JSON um por um.
    3. FOCO: Digitação fidedigna dos bordões (cordas 7, 6 e 5).
    4. NÃO USE blocos de Markdown. Apenas os objetos entre chaves.
  `;

  try {
    const result = await ai.models.generateContentStream({
      model: STREAM_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: PROMPT }
        ]
      },
      config: {
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    let buffer = "";
    for await (const chunk of result) {
      if (signal?.aborted) break;
      
      const chunkText = chunk.text;
      if (!chunkText) continue;
      
      buffer += chunkText;

      // Algoritmo de extração de JSON robusto para streams
      let startIndex = buffer.indexOf('{');
      while (startIndex !== -1) {
        let braceCount = 0;
        let endIndex = -1;

        for (let i = startIndex; i < buffer.length; i++) {
          if (buffer[i] === '{') braceCount++;
          if (buffer[i] === '}') braceCount--;
          
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }

        if (endIndex !== -1) {
          const jsonStr = buffer.substring(startIndex, endIndex + 1);
          try {
            const analysis: BaixariaAnalysis = JSON.parse(jsonStr);
            yield analysis;
            // Limpa o buffer até o final do objeto processado
            buffer = buffer.substring(endIndex + 1);
            startIndex = buffer.indexOf('{');
          } catch (e) {
            // Se o JSON for inválido (fragmentado ou erro da IA), tenta o próximo ponto de partida
            startIndex = buffer.indexOf('{', startIndex + 1);
          }
        } else {
          // Objeto incompleto no buffer, aguarda mais chunks
          break;
        }
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error("Erro no stream de extração:", error);
      throw error;
    }
  }
}

export const extractBaixariasFromTrack = async (audioBase64: string, mimeType: string): Promise<BaixariaAnalysis[]> => {
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Analise o áudio e extraia todas as frases de baixaria (violão de 7 cordas). Retorne um array de objetos JSON." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            timestamp: { type: Type.STRING },
            tablature: { type: Type.STRING },
            notes: { type: Type.STRING },
          },
          required: ["timestamp", "tablature", "notes"],
        }
      },
      thinkingConfig: { thinkingBudget: 4000 }
    },
  });
  
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: PRO_MODEL,
    contents: [
      ...history.map(h => ({ role: h.role, parts: h.parts })),
      { role: 'user', parts: [{ text: prompt }] }
    ],
    config: { systemInstruction: SYSTEM_PROMPT }
  });
  return response.text;
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Transcreva fielmente a baixaria deste áudio em tablatura 7 cordas." }
      ]
    },
  });
  return response.text.trim();
};

export const identifyLivePhrase = async (audioBase64: string, mimeType: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Identifique esta frase musical de violão 7 cordas." }
      ]
    },
  });
  return response.text.trim();
};
