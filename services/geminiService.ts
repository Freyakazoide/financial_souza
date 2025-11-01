
import { GoogleGenAI, Type } from '@google/genai';
import { Transaction, SpendingPattern, UncategorizedTransaction } from '../types';

export const analyzeSpendingPatterns = async (transactions: Transaction[]): Promise<SpendingPattern[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const variableTransactions = transactions.filter(t => t.type === 'Variável');
  if (variableTransactions.length === 0) {
    return [];
  }
  
  const prompt = `Analise esta lista de transações financeiras pessoais e identifique padrões de gastos recorrentes, como assinaturas ocultas ou hábitos frequentes. Não inclua contas mensais fixas. Para cada padrão, identifique o estabelecimento, descreva a frequência, calcule o valor total e forneça uma breve análise.
  
  Transações: ${JSON.stringify(variableTransactions.map(t => ({ description: t.description, amount: t.amount, date: t.date })))}
  
  Forneça a saída em formato JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              merchant: {
                type: Type.STRING,
                description: 'O nome do estabelecimento ou provedor de serviço (ex: "Netflix", "iFood", "Uber").',
              },
              frequency: {
                type: Type.STRING,
                description: "Uma descrição legível da frequência com que o gasto ocorre (ex: '12 vezes no último mês', 'por volta do dia 10 de cada mês').",
              },
              totalSpent: {
                type: Type.NUMBER,
                description: 'O valor total gasto para este padrão nos dados fornecidos.',
              },
              insight: {
                type: Type.STRING,
                description: "Um resumo breve e acionável do padrão de gastos.",
              },
            },
            required: ["merchant", "frequency", "totalSpent", "insight"],
          },
        },
      },
    });

    const jsonString = response.text.trim();
    const patterns = JSON.parse(jsonString);
    return patterns as SpendingPattern[];
  } catch (error) {
    console.error("Error analyzing spending patterns with Gemini:", error);
    // Gracefully return an empty array or a user-friendly error pattern
    return [{
      merchant: "Erro",
      frequency: "-",
      totalSpent: 0,
      insight: "Não foi possível analisar os padrões de gastos. Verifique a chave da API e tente novamente."
    }];
  }
};


export const suggestCategoriesForTransactions = async (
  transactions: Pick<UncategorizedTransaction, 'id' | 'description' | 'amount'>[],
  categories: string[]
): Promise<Record<string, string>> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  if (transactions.length === 0) {
    return {};
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Com base na seguinte lista de descrições de transações financeiras e uma lista de categorias disponíveis, sugira a categoria mais apropriada para cada transação.
  
  Categorias Disponíveis: ${JSON.stringify(categories.filter(c => c !== 'Renda'))}
  
  Transações para categorizar: ${JSON.stringify(transactions)}
  
  Forneça a saída como um array JSON, onde cada objeto contém o 'id' da transação e a 'suggestedCategory'. Não sugira a categoria 'Renda' para despesas.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              suggestedCategory: { type: Type.STRING },
            },
            required: ["id", "suggestedCategory"],
          },
        },
      },
    });

    const jsonString = response.text.trim();
    const suggestions: { id: string; suggestedCategory: string }[] = JSON.parse(jsonString);
    
    const suggestionMap: Record<string, string> = {};
    suggestions.forEach(s => {
      if (categories.includes(s.suggestedCategory)) {
        suggestionMap[s.id] = s.suggestedCategory;
      }
    });
    return suggestionMap;
  } catch (error) {
    console.error("Error suggesting categories with Gemini:", error);
    return {}; 
  }
};

export const predictMonthlySpending = async (
    transactions: Transaction[],
    categories: string[]
): Promise<Record<string, number>> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    if (transactions.length < 10 || categories.length === 0) {
        return {};
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Use last 90 days of data for more relevant predictions
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentTransactions = transactions.filter(t => 
        new Date(t.date) >= ninetyDaysAgo && t.entryType === 'expense'
    ).map(t => ({ amount: t.amount, date: t.date, category: t.category, description: t.description }));

    if (recentTransactions.length < 10) {
        return {}; // Not enough data for a meaningful prediction
    }
    
    const prompt = `Com base no seguinte histórico de transações dos últimos 90 dias, preveja o gasto total para o **mês calendário atual** para cada uma destas categorias principais: ${JSON.stringify(categories)}. Considere tendências mensais, pagamentos variáveis recorrentes e a velocidade típica de gastos.
  
    Histórico de Transações: ${JSON.stringify(recentTransactions)}
    
    Forneça a saída como um array JSON, com cada objeto contendo a 'category' e o 'predictedAmount' para este mês.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category: { type: Type.STRING },
                            predictedAmount: { type: Type.NUMBER },
                        },
                        required: ["category", "predictedAmount"],
                    },
                },
            },
        });

        const jsonString = response.text.trim();
        const predictions: { category: string; predictedAmount: number }[] = JSON.parse(jsonString);
        
        const predictionMap: Record<string, number> = {};
        predictions.forEach(p => {
            if (categories.includes(p.category)) {
                predictionMap[p.category] = p.predictedAmount;
            }
        });
        return predictionMap;

    } catch (error) {
        console.error("Error predicting spending with Gemini:", error);
        return {};
    }
};