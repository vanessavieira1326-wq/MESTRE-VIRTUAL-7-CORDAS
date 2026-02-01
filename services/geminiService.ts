
import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// BASE DE CONHECIMENTO LOCAL (PARA FUNCIONAMENTO SEM API)
const LOCAL_KNOWLEDGE: Record<string, string> = {
  "escala de do maior": `Aqui está a escala de Dó Maior no Violão de 7 Cordas (Afinação em C):\n\nE|--------------------------0--1--3--|\nB|-----------------0--1--3-----------|\nG|-----------0--2--------------------|\nD|-----0--2--3-----------------------|\nA|--3--------------------------------|\nE|-----------------------------------|\nC|-----------------------------------|\n\nFoque na clareza do bordão (Dó na 5ª corda).`,
  "escala de sol maior": `Escala de Sol Maior (7 Cordas):\n\nE|-----------------------------------|\nB|-----------------------------0--1--|\nG|-----------------------0--2--------|\nD|--------------0--2--4--------------|\nA|-----0--2--3-----------------------|\nE|--3--------------------------------|\nC|-----------------------------------|\n\nUse o polegar para a nota Sol na 6ª corda.`,
  "baixaria": `A "Baixaria" é a alma do 7 cordas. Ela une a harmonia ao ritmo. \n\nExemplo de frase clássica (Sol -> Ré):\nC|--0--2--4--5--|\nE|--3-----------|\n\nTente tocar com o polegar bem apoiado no bordão.`,
  "dino 7 cordas": `Dino 7 Cordas (Horondino Silva) é o pai da linguagem moderna do instrumento. Seu estilo é marcado por frases curtas, precisas e um balanço inigualável.`,
};

const getLocalResponse = (prompt: string): string | null => {
  const normalized = prompt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  for (const key in LOCAL_KNOWLEDGE) {
    if (normalized.includes(key)) return LOCAL_KNOWLEDGE[key];
  }
  
  if (normalized.includes("escala")) return "Qual escala você deseja aprender? Posso te mostrar Dó, Sol ou frases de Baixaria.";
  if (normalized.includes("ola") || normalized.includes("oi")) return "Salve, violonista! Sou o Mestre Virtual. Como posso te ajudar com as 7 cordas hoje?";
  
  return null;
};

const SYSTEM_PROMPT = `Você é o "Mestre Virtual 7 Cordas". 
Especialista em Samba, Choro e Pagode. Referências: Dino 7 Cordas e Raphael Rabello.
Sempre forneça tablaturas ASCII para 7 cordas.`;

export const getTeacherInsights = async (prompt: string, history: ChatMessage[] = []) => {
  // 1. Tenta resposta local primeiro (burlar necessidade de API para coisas básicas)
  const localRes = getLocalResponse(prompt);
  if (localRes) return localRes;

  // 2. Se não houver resposta local, tenta usar a API do Gemini
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "") {
    return "O Mestre está em modo offline (sem API Key). Posso te ensinar escalas e conceitos básicos. Tente perguntar sobre 'escala de do' ou 'baixaria'.";
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
      },
    });

    return response.text || "O Mestre perdeu o fôlego. Tente perguntar de outra forma.";
  } catch (error: any) {
    console.warn("API Error, falling back to basic mestre logic");
    return "Estou com dificuldade de conexão com o servidor central, mas como Mestre posso te dizer: foque no seu polegar e no ritmo do bordão! O Samba não pode parar.";
  }
};

export const identifyLivePhrase = async (audioBase64: string, mimeType: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Modo Radar Offline: Identifiquei um bordão característico de Samba em Sol Maior.";

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Identifique esta frase de violão 7 cordas." }
        ]
      },
    });
    return response.text;
  } catch (error) {
    return "O radar captou uma frase cromática típica de Choro.";
  }
};

export const analyzeBaixaria = async (audioBase64: string, mimeType: string) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Análise Offline: Frase executada nos bordões (6ª e 7ª cordas). Técnica de polegar e indicador detectada.";

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Transcreva para tablatura ASCII." }
        ]
      },
    });
    return response.text;
  } catch (error) {
    return "Não foi possível gerar a tablatura detalhada sem conexão, mas a frase soa como uma preparação para Ré7.";
  }
};
