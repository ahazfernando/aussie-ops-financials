import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  Timestamp, 
  deleteDoc,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Transaction, 
  FirestoreTransaction, 
  TransactionType,
  PaymentMethod,
  TransactionCategory,
  FinancialSummary,
  TransactionFilters
} from '@/types/transaction';

const GST_RATE = 0.10; // 10% GST rate for Australia

/**
 * Convert Firestore transaction to app Transaction
 */
export function convertFirestoreTransaction(docData: any, docId: string): Transaction {
  return {
    id: docId,
    type: docData.type as TransactionType,
    category: docData.category as TransactionCategory,
    customCategory: docData.custom_category,
    amountNet: docData.amount_net || 0,
    gstAmount: docData.gst_amount || 0,
    amountGross: docData.amount_gross || 0,
    paymentMethod: docData.payment_method as PaymentMethod,
    gstApplied: docData.gst_applied || false,
    description: docData.description,
    clientId: docData.client_id,
    clientName: docData.client_name,
    date: docData.date?.toDate() || new Date(),
    createdAt: docData.created_at?.toDate() || new Date(),
    updatedAt: docData.updated_at?.toDate() || new Date(),
    createdBy: docData.created_by,
    createdByName: docData.created_by_name,
    updatedBy: docData.updated_by,
    updatedByName: docData.updated_by_name,
  };
}

/**
 * Convert app Transaction to Firestore transaction
 */
export function convertToFirestoreTransaction(transaction: Transaction): Omit<FirestoreTransaction, 'id'> {
  return {
    type: transaction.type,
    category: transaction.category,
    amount_net: transaction.amountNet,
    gst_amount: transaction.gstAmount,
    amount_gross: transaction.amountGross,
    payment_method: transaction.paymentMethod,
    gst_applied: transaction.gstApplied,
    description: transaction.description,
    client_id: transaction.clientId,
    client_name: transaction.clientName,
    date: Timestamp.fromDate(transaction.date),
    created_at: Timestamp.fromDate(transaction.createdAt),
    updated_at: Timestamp.fromDate(transaction.updatedAt),
    created_by: transaction.createdBy,
    created_by_name: transaction.createdByName,
    updated_by: transaction.updatedBy,
    updated_by_name: transaction.updatedByName,
    ...(transaction.customCategory && { custom_category: transaction.customCategory }),
  };
}

/**
 * Calculate GST based on payment method and user selection
 */
export function calculateGST(
  amountNet: number,
  paymentMethod: PaymentMethod,
  userSelectedGst?: boolean
): { gstAmount: number; gstApplied: boolean } {
  let gstApplied = false;

  switch (paymentMethod) {
    case 'CREDIT_DEBIT_CARD':
    case 'BANK_TRANSFER_BUSINESS':
      gstApplied = true;
      break;
    case 'CASH_IN_HAND':
      gstApplied = false;
      break;
    case 'BANK_TRANSFER_PERSONAL':
      // User must explicitly select GST for personal bank transfers
      gstApplied = userSelectedGst === true;
      break;
  }

  const gstAmount = gstApplied ? amountNet * GST_RATE : 0;

  return { gstAmount, gstApplied };
}

/**
 * Calculate gross amount (net + GST)
 */
export function calculateGrossAmount(amountNet: number, gstAmount: number): number {
  return amountNet + gstAmount;
}

/**
 * Get all transactions
 */
export async function getAllTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const transactionsRef = collection(db, 'transactions');
    const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

    if (filters?.startDate) {
      constraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters?.endDate) {
      constraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
    }

    if (filters?.type) {
      constraints.push(where('type', '==', filters.type));
    }

    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }

    if (filters?.paymentMethod) {
      constraints.push(where('payment_method', '==', filters.paymentMethod));
    }

    const q = query(transactionsRef, ...constraints);
    const querySnapshot = await getDocs(q);

    let transactions = querySnapshot.docs.map((doc) =>
      convertFirestoreTransaction(doc.data(), doc.id)
    );

    // Apply search filter if provided (client-side filtering)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      transactions = transactions.filter((t) => {
        return (
          t.description?.toLowerCase().includes(searchLower) ||
          t.clientName?.toLowerCase().includes(searchLower) ||
          t.category.toLowerCase().includes(searchLower)
        );
      });
    }

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const transactionDoc = await getDoc(doc(db, 'transactions', transactionId));
    if (!transactionDoc.exists()) {
      return null;
    }
    return convertFirestoreTransaction(transactionDoc.data(), transactionDoc.id);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
}

/**
 * Create a new transaction
 */
export async function createTransaction(
  transactionData: {
    type: TransactionType;
    category: TransactionCategory;
    customCategory?: string; // Custom category name when category is "OTHER"
    amountNet: number;
    paymentMethod: PaymentMethod;
    gstApplied?: boolean; // Optional override for user selection
    description?: string;
    clientId?: string;
    clientName?: string;
    date: Date;
    createdBy: string;
    createdByName?: string;
  }
): Promise<string> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    // Calculate GST if not explicitly provided
    let gstAmount = 0;
    let gstApplied = false;

    if (transactionData.gstApplied !== undefined) {
      // Use explicit GST setting
      gstApplied = transactionData.gstApplied;
      gstAmount = gstApplied ? transactionData.amountNet * GST_RATE : 0;
    } else {
      // Calculate based on payment method
      const gstCalc = calculateGST(transactionData.amountNet, transactionData.paymentMethod);
      gstAmount = gstCalc.gstAmount;
      gstApplied = gstCalc.gstApplied;
    }

    const amountGross = calculateGrossAmount(transactionData.amountNet, gstAmount);

    const firestoreTransaction: Omit<FirestoreTransaction, 'id'> = {
      type: transactionData.type,
      category: transactionData.category,
      amount_net: transactionData.amountNet,
      gst_amount: gstAmount,
      amount_gross: amountGross,
      payment_method: transactionData.paymentMethod,
      gst_applied: gstApplied,
      date: Timestamp.fromDate(transactionData.date),
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      created_by: transactionData.createdBy,
      ...(transactionData.description && { description: transactionData.description }),
      ...(transactionData.clientId && { client_id: transactionData.clientId }),
      ...(transactionData.clientName && { client_name: transactionData.clientName }),
      ...(transactionData.createdByName && { created_by_name: transactionData.createdByName }),
      ...(transactionData.customCategory && { custom_category: transactionData.customCategory }),
    };

    const docRef = await addDoc(collection(db, 'transactions'), firestoreTransaction);
    return docRef.id;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  transactionId: string,
  updates: {
    type?: TransactionType;
    category?: TransactionCategory;
    customCategory?: string;
    amountNet?: number;
    paymentMethod?: PaymentMethod;
    gstApplied?: boolean;
    description?: string;
    clientId?: string;
    clientName?: string;
    date?: Date;
    updatedBy: string;
    updatedByName?: string;
  }
): Promise<void> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    const existingDoc = await getDoc(transactionRef);

    if (!existingDoc.exists()) {
      throw new Error('Transaction not found');
    }

    const existingData = existingDoc.data();
    const updateData: any = {
      updated_at: Timestamp.now(),
      updated_by: updates.updatedBy,
      ...(updates.updatedByName && { updated_by_name: updates.updatedByName }),
    };

    // If amount or payment method changes, recalculate GST
    if (updates.amountNet !== undefined || updates.paymentMethod !== undefined) {
      const amountNet = updates.amountNet ?? existingData.amount_net;
      const paymentMethod = updates.paymentMethod ?? existingData.payment_method;
      const gstApplied = updates.gstApplied ?? existingData.gst_applied;

      let gstAmount = 0;
      let finalGstApplied = gstApplied;

      if (updates.gstApplied !== undefined) {
        // User explicitly set GST
        finalGstApplied = updates.gstApplied;
        gstAmount = finalGstApplied ? amountNet * GST_RATE : 0;
      } else if (updates.paymentMethod !== undefined) {
        // Payment method changed, recalculate GST
        const gstCalc = calculateGST(amountNet, paymentMethod);
        gstAmount = gstCalc.gstAmount;
        finalGstApplied = gstCalc.gstApplied;
      } else {
        // Use existing GST values
        gstAmount = existingData.gst_amount;
        finalGstApplied = existingData.gst_applied;
      }

      updateData.amount_net = amountNet;
      updateData.gst_amount = gstAmount;
      updateData.amount_gross = calculateGrossAmount(amountNet, gstAmount);
      updateData.gst_applied = finalGstApplied;
    }

    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.customCategory !== undefined) {
      updateData.custom_category = updates.customCategory || null;
    }
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
    if (updates.description !== undefined) {
      // Only include if not undefined - allow empty strings
      updateData.description = updates.description;
    }
    if (updates.clientId !== undefined) {
      // Only include if not undefined - allow empty strings
      updateData.client_id = updates.clientId || null;
    }
    if (updates.clientName !== undefined) {
      // Only include if not undefined - allow empty strings
      updateData.client_name = updates.clientName || null;
    }
    if (updates.date !== undefined) updateData.date = Timestamp.fromDate(updates.date);

    await updateDoc(transactionRef, updateData);
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
}

/**
 * Calculate financial summary from transactions
 */
export function calculateFinancialSummary(transactions: Transaction[]): FinancialSummary {
  const summary: FinancialSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    totalProfit: 0,
    totalGstCollected: 0,
    totalGstPayable: 0,
  };

  transactions.forEach((transaction) => {
    if (transaction.type === 'INFLOW') {
      summary.totalIncome += transaction.amountGross;
      if (transaction.gstApplied) {
        summary.totalGstCollected += transaction.gstAmount;
      }
    } else {
      summary.totalExpenses += transaction.amountGross;
      if (transaction.gstApplied) {
        summary.totalGstPayable += transaction.gstAmount;
      }
    }
  });

  summary.totalProfit = summary.totalIncome - summary.totalExpenses;

  return summary;
}

/**
 * Subscribe to transactions with real-time updates
 */
export function subscribeToTransactions(
  callback: (transactions: Transaction[]) => void,
  filters?: TransactionFilters
): () => void {
  if (!db) {
    throw new Error('Firebase is not initialized');
  }

  const transactionsRef = collection(db, 'transactions');
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

  if (filters?.startDate) {
    constraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
  }

  if (filters?.endDate) {
    constraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
  }

  if (filters?.type) {
    constraints.push(where('type', '==', filters.type));
  }

  if (filters?.category) {
    constraints.push(where('category', '==', filters.category));
  }

  if (filters?.paymentMethod) {
    constraints.push(where('payment_method', '==', filters.paymentMethod));
  }

  const q = query(transactionsRef, ...constraints);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      let transactions = snapshot.docs.map((doc) =>
        convertFirestoreTransaction(doc.data(), doc.id)
      );

      // Apply search filter if provided
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        transactions = transactions.filter((t) => {
          return (
            t.description?.toLowerCase().includes(searchLower) ||
            t.clientName?.toLowerCase().includes(searchLower) ||
            t.category.toLowerCase().includes(searchLower)
          );
        });
      }

      callback(transactions);
    },
    (error) => {
      console.error('Error in transactions subscription:', error);
    }
  );

  return unsubscribe;
}
