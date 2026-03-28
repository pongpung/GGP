export interface IncomeRecord {
  id: string;
  amount: number;
  date: string; // ISO string (YYYY-MM-DD)
  notes?: string;
  createdAt: any;
}

export interface ExpenseRecord {
  id: string;
  amount: number;
  date: string; // ISO string (YYYY-MM-DD)
  notes?: string;
  category?: string;
  createdAt: any;
}

export type Transaction = (IncomeRecord & { type: 'income' }) | (ExpenseRecord & { type: 'expense' });
