"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface ChartData {
  monthlyData: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
}

interface CashFlowChartProps {
  monthlyData?: ChartData['monthlyData'];
  totalIncome?: number;
  totalExpenses?: number;
  netCashFlow?: number;
  isLoading?: boolean;
  hasData?: boolean;
}

export function prepareChartData(transactions: any[]): ChartData {
  const monthlyMap = new Map<string, { income: number; expenses: number; monthName: string }>();

  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { income: 0, expenses: 0, monthName });
    }

    const monthData = monthlyMap.get(monthKey)!;
    if (transaction.type === 'INFLOW') {
      monthData.income += transaction.amountGross || 0;
    } else {
      monthData.expenses += transaction.amountGross || 0;
    }
  });

  const monthlyData = Array.from(monthlyMap.entries())
    .map(([key, data]) => ({
      month: data.monthName,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
    }))
    .sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

  const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
  const netCashFlow = totalIncome - totalExpenses;

  return {
    monthlyData,
    totalIncome,
    totalExpenses,
    netCashFlow,
  };
}

export function CashFlowTrends({
  monthlyData = [],
  isLoading = false,
  hasData = false,
}: CashFlowChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxValue = Math.max(
    ...monthlyData.map((m) => Math.max(m.income, m.expenses)),
    0
  );

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Cash Flow Trends
        </CardTitle>
        <CardDescription>Monthly income vs expenses</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !hasData || monthlyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-4 opacity-20" />
            <p>No data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {monthlyData.map((data, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{data.month}</span>
                    <span className="text-muted-foreground">
                      Net: {formatCurrency(data.net)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-20 text-xs text-green-600 dark:text-green-400">
                        Income
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-green-500 h-full transition-all"
                          style={{
                            width: `${maxValue > 0 ? (data.income / maxValue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="w-24 text-xs text-right font-medium">
                        {formatCurrency(data.income)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 text-xs text-blue-600 dark:text-blue-400">
                        Expenses
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all"
                          style={{
                            width: `${maxValue > 0 ? (data.expenses / maxValue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="w-24 text-xs text-right font-medium">
                        {formatCurrency(data.expenses)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CashFlowDistribution({
  totalIncome = 0,
  totalExpenses = 0,
  isLoading = false,
  hasData = false,
}: CashFlowChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const total = totalIncome + totalExpenses;
  const incomePercentage = total > 0 ? (totalIncome / total) * 100 : 0;
  const expensesPercentage = total > 0 ? (totalExpenses / total) * 100 : 0;

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Cash Flow Distribution
        </CardTitle>
        <CardDescription>Income vs expenses breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <DollarSign className="h-12 w-12 mb-4 opacity-20" />
            <p>No data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Income
                  </span>
                  <span className="text-sm font-bold">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-green-500 h-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${incomePercentage}%` }}
                  >
                    {incomePercentage > 10 && (
                      <span className="text-xs text-white font-medium">
                        {incomePercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Expenses
                  </span>
                  <span className="text-sm font-bold">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${expensesPercentage}%` }}
                  >
                    {expensesPercentage > 10 && (
                      <span className="text-xs text-white font-medium">
                        {expensesPercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Cash Flow</span>
                <span className="text-lg font-bold">
                  {formatCurrency(totalIncome + totalExpenses)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MonthlyNetCashFlow({
  monthlyData = [],
  isLoading = false,
  hasData = false,
}: CashFlowChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxNet = Math.max(...monthlyData.map((m) => Math.abs(m.net)), 0);
  const minNet = Math.min(...monthlyData.map((m) => m.net), 0);

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-purple-500" />
          Monthly Net Cash Flow
        </CardTitle>
        <CardDescription>Net cash flow by month</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !hasData || monthlyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mb-4 opacity-20" />
            <p>No data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {monthlyData.map((data, index) => {
                const isPositive = data.net >= 0;
                const percentage = maxNet > 0 
                  ? (Math.abs(data.net) / Math.max(maxNet, Math.abs(minNet))) * 100 
                  : 0;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{data.month}</span>
                      <span
                        className={`font-bold ${
                          isPositive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {formatCurrency(data.net)}
                      </span>
                    </div>
                    <div className="relative w-full bg-muted rounded-full h-6 overflow-hidden">
                      {isPositive ? (
                        <div
                          className="bg-green-500 h-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 15 && (
                            <span className="text-xs text-white font-medium">
                              {formatCurrency(data.net)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="flex-1" />
                          <div
                            className="bg-blue-500 h-full flex items-center pl-2 transition-all"
                            style={{ width: `${percentage}%` }}
                          >
                            {percentage > 15 && (
                              <span className="text-xs text-white font-medium">
                                {formatCurrency(data.net)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
