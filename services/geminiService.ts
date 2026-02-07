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

export interface BaixariaAnalysis {
  timestamp: string;
  tablature: string;
  notes: string;
}

export const extractBaixariasFromTrack = async (audioBase64: string, mimeType: string): Promise<BaixariaAnalysis[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("LOCAL_MODE");

  const ai = new GoogleGenAI({ apiKey });

  const PROMPT = `
    Você é um musicólogo especialista em violão de 7 cordas. Sua tarefa é analisar este arquivo de áudio de uma música completa e extrair as linhas de baixaria (bordões).

    Siga estas instruções rigorosamente:
    1. Ouça o áudio atentamente para identificar todas as seções onde o violão de 7 cordas executa uma linha de baixo clara e proeminente. Ignore acordes e foque apenas na melodia dos graves.
    2. Para cada baixaria encontrada, crie um objeto JSON com os seguintes campos:
        - "timestamp": Uma string indicando o tempo de início da frase no formato "MM:SS".
        - "tablature": A transcrição precisa da linha de baixo em formato de tablatura ASCII. A tablatura deve incluir a 7ª corda (C).
        - "notes": Uma breve descrição das notas ou do conceito musical (ex: "Descida cromática para o acorde de G7").
    3. Retorne um único array JSON válido contendo todos os objetos que você identificou. A resposta DEVE ser apenas o array JSON, sem markdown ou texto adicional.
    4. Se nenhuma baixaria clara for encontrada, retorne um array vazio [].

    Exemplo de saída JSON:
    [{"timestamp":"00:45","tablature":"7|--3--2--1--0----|\\n6|-------------3--|\\nA|----------------|\\nD|----------------|\\nG|----------------|\\nB|----------------|\\nE|----------------|","notes":"Condução cromática preparando o V grau (G7)."}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: PROMPT }
        ]
      },
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const jsonString = response.text.trim();
    const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/```$/, '');
    return JSON.parse(cleanedJsonString);

  } catch (error) {
    console.error("Erro ao analisar a faixa:", error);
    throw new Error("O Mestre não conseguiu analisar esta faixa. O áudio pode estar muito complexo ou corrompido.");
  }
};

// FIX: Add missing analyzeBaixaria function for SmartEar component
const SMART_EAR_PROMPT = `Você é um luthier e musicólogo com um "ouvido absoluto" para o violão de 7 cordas, especializado em transcrever baixarias de Samba e Choro em tempo real.

Sua tarefa é ouvir este CURTO trecho de áudio (máximo 30 segundos) e fazer o seguinte:
1.  **Identifique a linha de baixo (baixaria)** tocada no violão de 7 cordas.
2.  **Transcreva-a em uma tablatura ASCII clara e precisa.** Inclua a 7ª corda (afinação em Dó).
3.  **Adicione uma breve descrição técnica** sobre a frase (ex: "Escala cromática descendente", "Arpejo sobre G7", "Condução em semínimas").
4.  **Formate a resposta final como um ÚNICO bloco de texto**, começando com a descrição e seguido pela tablatura. Não use JSON ou markdown.

Exemplo de Resposta:
Condução rítmica sobre o acorde de C maior, usando a tônica e a quinta.

7|--------------|
6|--------------|
5|----3---------|
4|-------5------|
3|----------5---|
2|--------------|
1|--------------|
`;

export const analyzeBaixaria = async (audioBase64: string, mimeType: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("LOCAL_MODE");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL, // Usando o Flash para respostas rápidas
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: SMART_EAR_PROMPT }
        ]
      },
    });
    
    return response.text.trim();

  } catch (error) {
    console.error("Erro ao analisar a baixaria:", error);
    throw new Error("O Mestre não conseguiu transcrever esta frase. Tente novamente com um som mais claro.");
  }
};

// FIX: Add missing identifyLivePhrase function for BaixariaRadar component
const RADAR_PROMPT = `Você é um mestre do violão de 7 cordas, um "poeta dos bordões". Sua habilidade é ouvir uma curta frase musical e, instantaneamente, descrevê-la de forma inspiradora e técnica.

Analise este CURTO trecho de áudio (máximo 10 segundos) e retorne uma ÚNICA frase que resuma a essência musical do que foi tocado.

Combine precisão técnica com uma linguagem poética.

Exemplos de Resposta:
- "Uma descida cromática clássica de Dino 7 Cordas, preparando a cadência para o V grau com peso e malícia."
- "Um arpejo virtuoso no estilo Raphael Rabello, explorando a extensão da 9ª maior sobre o acorde."
- "Condução rítmica sincopada em C, usando a tônica e a quinta para dar balanço ao samba."
- "Chamada e resposta usando a 7ª corda, uma técnica expressiva para dialogar com o solista."`;

export const identifyLivePhrase = async (audioBase64: string, mimeType: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("LOCAL_MODE");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL, // Flash para identificação instantânea
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: RADAR_PROMPT }
        ]
      },
      config: {
        temperature: 0.5, // Um pouco mais de criatividade na descrição
      }
    });
    
    return response.text.trim();

  } catch (error) {
    console.error("Erro ao identificar a frase:", error);
    throw new Error("O Mestre não conseguiu identificar esta frase. O som pode estar muito baixo ou com ruído.");
  }
};
