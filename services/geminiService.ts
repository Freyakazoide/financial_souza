
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
  
  const prompt = `Analyze this list of personal financial transactions and identify recurring spending patterns, like hidden subscriptions or frequent habits. Do not include fixed monthly bills. For each pattern, identify the merchant, describe the frequency, calculate the total amount, and provide a brief insight.
  
  Transactions: ${JSON.stringify(variableTransactions.map(t => ({ description: t.description, amount: t.amount, date: t.date })))}
  
  Provide the output in JSON format.`;

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
                description: 'The name of the merchant or service provider (e.g., "Netflix", "iFood", "Uber").',
              },
              frequency: {
                type: Type.STRING,
                description: "A human-readable description of how often the spending occurs (e.g., '12 times last month', 'around the 10th of each month').",
              },
              totalSpent: {
                type: Type.NUMBER,
                description: 'The total amount spent for this pattern in the provided data.',
              },
              insight: {
                type: Type.STRING,
                description: "A brief, actionable summary of the spending pattern.",
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
      merchant: "Error",
      frequency: "-",
      totalSpent: 0,
      insight: "Could not analyze spending patterns. Please check the API key and try again."
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

  const prompt = `Based on the following list of financial transaction descriptions and a list of available categories, suggest the most appropriate category for each transaction.
  
  Available Categories: ${JSON.stringify(categories.filter(c => c !== 'Renda'))}
  
  Transactions to categorize: ${JSON.stringify(transactions)}
  
  Provide the output as a JSON array, where each object contains the transaction 'id' and the 'suggestedCategory'. Do not suggest the 'Renda' category for expenses.`;

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
    
    const prompt = `Based on the following 90 days of transaction history, predict the total spending for the **current calendar month** for each of these key categories: ${JSON.stringify(categories)}. Consider monthly trends, recurring variable payments, and typical spending velocity.
  
    Transaction History: ${JSON.stringify(recentTransactions)}
    
    Provide the output as a JSON array, with each object containing the 'category' and the 'predictedAmount' for this month.`;

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
