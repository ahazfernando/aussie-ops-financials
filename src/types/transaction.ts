export type TransactionType = 'INFLOW' | 'OUTFLOW';

export type PaymentMethod = 
  | 'CREDIT_DEBIT_CARD'
  | 'CASH_IN_HAND'
  | 'BANK_TRANSFER_BUSINESS'
  | 'BANK_TRANSFER_PERSONAL';

export type InflowCategory = 
  | 'CLIENT_PAYMENT'
  | 'INVESTMENT'
  | 'OTHER';

export type OutflowCategory = 
  | 'GST'
  | 'TAX'
  | 'MARKETING'
  | 'FRANCHISE_FEE'
  | 'OTHER';

export type TransactionCategory = InflowCategory | OutflowCategory;

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  customCategory?: string; // Custom category name when category is "OTHER"
  amountNet: number; // Amount excluding GST
  gstAmount: number; // GST amount (stored, never recalculated)
  amountGross: number; // Total amount including GST
  paymentMethod: PaymentMethod;
  gstApplied: boolean; // Whether GST was applied
  description?: string;
  clientId?: string; // Optional link to client
  clientName?: string; // For display purposes
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface FirestoreTransaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  custom_category?: string; // Custom category name when category is "OTHER"
  amount_net: number;
  gst_amount: number;
  amount_gross: number;
  payment_method: PaymentMethod;
  gst_applied: boolean;
  description?: string;
  client_id?: string;
  client_name?: string;
  date: any; // Firestore Timestamp
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp
  created_by: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalProfit: number;
  totalGstCollected: number;
  totalGstPayable: number;
}

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  category?: TransactionCategory;
  type?: TransactionType;
  paymentMethod?: PaymentMethod;
  search?: string;
}
