"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction, FinancialSummary } from '@/types/transaction';
import { getAllTransactions, calculateFinancialSummary, subscribeToTransactions } from '@/lib/financials';
import { FinancialSummaryCards } from '@/components/financials/FinancialSummaryCards';
import { TransactionsTable } from '@/components/financials/TransactionsTable';
import { TransactionFormDialog } from '@/components/financials/TransactionFormDialog';
import { toast } from '@/hooks/use-toast';

export default function Financials() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    totalProfit: 0,
    totalGstCollected: 0,
    totalGstPayable: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const fetchedTransactions = await getAllTransactions();
      setTransactions(fetchedTransactions);
      setSummary(calculateFinancialSummary(fetchedTransactions));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Initial load
    loadTransactions();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTransactions((updatedTransactions) => {
      setTransactions(updatedTransactions);
      setSummary(calculateFinancialSummary(updatedTransactions));
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleTransactionUpdated = () => {
    loadTransactions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading financial data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-background border border-teal-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Financial Overview
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Track income, expenses, and GST for your business</p>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)} 
            className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300 border-2"
            variant="outline"
            size="lg"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <FinancialSummaryCards summary={summary} />

      {/* Main Content Card */}
      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-muted/30 border-b-2">
          <div>
            <CardTitle className="text-xl font-bold">Transactions</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">View and manage all financial transactions</p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No transactions found</p>
            </div>
          ) : (
            <TransactionsTable
              transactions={transactions}
              onTransactionUpdated={handleTransactionUpdated}
            />
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <TransactionFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false);
          handleTransactionUpdated();
        }}
      />
    </div>
  );
}
