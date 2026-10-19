export type Money = string;
export type TxType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'wallet' | 'other';
  is_active: boolean;
  opening_balance: Money;
  income: Money;
  expenses: Money;
  transfers_in: Money;
  transfers_out: Money;
  investments: Money;
  balance: Money;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  usage_count: number;
}

export interface Project {
  id: string;
  name: string;
  client_name: string | null;
  description: string | null;
  status: 'active' | 'completed' | 'cancelled';
  start_date: string | null;
  income: Money;
  expenses: Money;
  investment: Money;
  profit: Money;
  roi: string | null;
  netReturn: Money;
  investmentRoi: string | null;
}

export interface Transaction {
  id: string;
  type: TxType;
  account_id: string;
  category_id: string;
  project_id: string | null;
  amount: Money;
  description: string | null;
  transaction_date: string;
  account_name: string;
  category_name: string;
  project_name: string | null;
}

export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  from_account_name: string;
  to_account_name: string;
  amount: Money;
  description: string | null;
  transfer_date: string;
}

export interface Investment {
  id: string;
  name: string;
  account_id: string;
  project_id: string | null;
  account_name: string;
  project_name: string | null;
  amount: Money;
  description: string | null;
  investment_date: string;
}

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Totals {
  income: Money;
  expenses: Money;
  investment: Money;
  profit: Money;
  roi: string | null;
  netReturn: Money;
  investmentRoi: string | null;
}

interface PendingItem {
  id: string;
  type: TxType;
  account_id: string | null;
  category_id: string;
  project_id: string | null;
  amount: Money;
  description: string | null;
  account_name: string | null;
  category_name: string;
  project_name: string | null;
}

export interface Due extends PendingItem {
  due_date: string;
  recurring_id: string | null;
}

export interface Recurring extends PendingItem {
  frequency: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  last_date: string | null;
  is_active: boolean;
}

export interface Outstanding {
  receivable: Money;
  payable: Money;
  overdue_receivable: Money;
  overdue_payable: Money;
}
