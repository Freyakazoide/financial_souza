
import { GoogleGenAI, Type } from '@google/genai';
import { Transaction, SpendingPattern } from '../types';

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
