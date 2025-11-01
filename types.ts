
export enum TransactionStatus {
  Pending = 'Pendente',
  Overdue = 'Atrasada',
  Paid = 'Paga',
}

export enum IncomeStatus {
  Pending = 'Pendente',
  Received = 'Recebido',
}

export enum TransactionType {
  Fixed = 'Fixo',
  Variable = 'Variável',
}

export interface RecurringIncome {
  id: string;
  name: string;
  defaultValue: number;
  incomeDay: number;
}

export interface FixedBill {
  id: string;
  name: string;
  defaultValue: number;
  dueDay: number;
}

export interface MonthlyIncome {
  id: string;
  recurringIncomeId: string;
  name: string;
  month: number;
  year: number;
  status: IncomeStatus;
  receivedDate?: string;
  amount: number;
  incomeDay: number;
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

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  source: string;
  entryType: 'income' | 'expense';
  day: number; // Day of the month
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
  recurringTransactionId?: string;
  goalId?: string;
}

export interface UncategorizedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  suggestedCategory?: string;
  importId: string;
}

export interface Budget {
  category: string;
  amount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
}

// FIX: Add SpendingPattern type, which is used in geminiService.ts.
export interface SpendingPattern {
  merchant: string;
  frequency: string;
  totalSpent: number;
  insight: string;
}

export type View = 'dashboard' | 'history' | 'import' | 'settings' | 'savings' | 'cashflow';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  entryType: 'income' | 'expense';
  importId: string;
}