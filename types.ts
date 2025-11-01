
export enum TransactionStatus {
  Pending = 'Pendente',
  Overdue = 'Atrasada',
  Paid = 'Paga',
}

export enum TransactionType {
  Fixed = 'Fixo',
  Variable = 'Variável',
}

export interface FixedBill {
  id: string;
  name: string;
  defaultValue: number;
  dueDay: number;
}

export interface MonthlyBill {
  id: string;
  fixedBillId: string;
  name: string;
  month: number;
  year: number;
  status: TransactionStatus;
  paidDate?: string;
  amount: number;
  // FIX: Add dueDay to MonthlyBill to allow sorting and display in the UI.
  dueDay: number;
}

export interface Transaction {
  id:string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  source: string;
  type: TransactionType;
  entryType: 'income' | 'expense';
  importId?: string; // from bank statement to prevent duplicates
}

export interface UncategorizedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  suggestedCategory?: string;
  importId: string;
}

export interface SpendingPattern {
  merchant: string;
  frequency: string;
  totalSpent: number;
  insight: string;
}

export type View = 'dashboard' | 'history' | 'import' | 'settings';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  entryType: 'income' | 'expense';
  importId: string;
}