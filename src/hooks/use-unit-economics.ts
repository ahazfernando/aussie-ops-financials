import { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '@/types/transaction';
import { Cost } from '@/types/cost';
import { Client } from '@/types/client';
import { subscribeToTransactions } from '@/lib/financials';
import { subscribeToCosts } from '@/lib/costs';
import { subscribeToClients } from '@/lib/clients';

export interface UnitEconomicsData {
    summary: {
        contributionMarginRatio: number;
        contributionMarginGrowth: number;
        breakEvenPointUnits: number;
        breakEvenPointRevenue: number; // New: BEP in currency
        customerLtv: number;
        ltvGrowth: number;
        cac: number;
        cacGrowth: number;
    };
    cvpAnalysis: {
        units: number;
        fixedCost: number;
        totalCost: number;
        revenue: number;
    }[];
    contributionMarginBreakdown: {
        name: string;
        value: number;
        color: string;
    }[];
    productProfitability: {
        name: string;
        margin: number;
        revenue: number;
    }[];
    loading: boolean;
}

export function useUnitEconomics() {
    const [data, setData] = useState<UnitEconomicsData>({
        summary: {
            contributionMarginRatio: 0,
            contributionMarginGrowth: 0,
            breakEvenPointUnits: 0,
            breakEvenPointRevenue: 0,
            customerLtv: 0,
            ltvGrowth: 0,
            cac: 0,
            cacGrowth: 0,
        },
        cvpAnalysis: [],
        contributionMarginBreakdown: [],
        productProfitability: [],
        loading: true,
    });

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [costs, setCosts] = useState<Cost[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loadingStates, setLoadingStates] = useState({
        transactions: true,
        costs: true,
        clients: true,
    });

    useEffect(() => {
        const unsubTransactions = subscribeToTransactions((data) => {
            setTransactions(data);
            setLoadingStates((prev) => ({ ...prev, transactions: false }));
        });

        const unsubCosts = subscribeToCosts(
            (data) => {
                setCosts(data);
                setLoadingStates((prev) => ({ ...prev, costs: false }));
            },
            undefined,
            (error) => {
                console.error("Failed to subscribe to costs:", error);
                setLoadingStates((prev) => ({ ...prev, costs: false }));
            }
        );

        const unsubClients = subscribeToClients((data) => {
            setClients(data);
            setLoadingStates((prev) => ({ ...prev, clients: false }));
        });

        return () => {
            unsubTransactions();
            unsubCosts();
            unsubClients();
        };
    }, []);

    useEffect(() => {
        if (loadingStates.transactions || loadingStates.costs || loadingStates.clients) return;

        // --- 1. Basic Aggregations ---

        // Revenue
        const totalRevenue = transactions
            .filter((t) => t.type === 'INFLOW')
            .reduce((sum, t) => sum + t.amountNet, 0);

        // Units Sold (Proxy: Count of Inflow Transactions)
        const totalUnitsSold = transactions.filter((t) => t.type === 'INFLOW').length || 1; // Avoid div by 0

        // Average Revenue Per Unit
        const avgRevenuePerUnit = totalRevenue / totalUnitsSold;

        // Fixed Costs
        const totalFixedCosts = costs
            .filter((c) => c.type === 'fixed')
            .reduce((sum, c) => sum + c.amount, 0);

        // Variable Costs
        // Logic: Cost * ActualVolume
        const totalVariableCosts = costs
            .filter((c) => c.type === 'variable')
            .reduce((sum, c) => sum + (c.amount * (c.actualVolume || 0)), 0);

        // Average Variable Cost Per Unit
        // If we assume the variable costs scale with the "Units Sold" defined above:
        const avgVariableCostPerUnit = totalVariableCosts / totalUnitsSold;

        // Contribution Margin
        const contributionMargin = totalRevenue - totalVariableCosts;
        const contributionMarginRatio = totalRevenue > 0 ? (contributionMargin / totalRevenue) * 100 : 0;

        // --- 2. Metric Calculations ---

        // Break Even Point
        // BEP (Units) = Fixed Costs / (Price - Variable Cost per Unit)
        // Price = avgRevenuePerUnit, VC = avgVariableCostPerUnit
        const unitContribution = avgRevenuePerUnit - avgVariableCostPerUnit;
        const breakEvenPointUnits = unitContribution > 0 ? Math.ceil(totalFixedCosts / unitContribution) : 0;
        const breakEvenPointRevenue = breakEvenPointUnits * avgRevenuePerUnit;

        // CAC (Customer Acquisition Cost)
        // Marketing Spend / New Customers
        const marketingSpend = transactions
            .filter((t) => t.category === 'MARKETING')
            .reduce((sum, t) => sum + t.amountNet, 0);

        // For now, assuming all clients in DB are "acquired" within the context of the spend
        // In a real scenario, we'd filter by date range matching the spend
        const totalCustomers = clients.length || 1;
        const cac = marketingSpend / totalCustomers;

        // LTV (Lifetime Value)
        // Simple: Total Revenue / Total Customers
        const customerLtv = totalRevenue / totalCustomers;

        // --- 3. Chart Data Preparation ---

        // CVP Analysis Data
        // Generate data points around the break-even point
        // We'll go from 0 to 2x BEP units, or 0 to 2x current units if BEP is 0/infinite
        const maxUnits = Math.max(breakEvenPointUnits * 1.5, totalUnitsSold * 1.2, 10);
        const step = Math.ceil(maxUnits / 10);
        const cvpData = [];

        for (let u = 0; u <= maxUnits; u += step) {
            cvpData.push({
                units: u,
                fixedCost: totalFixedCosts,
                totalCost: totalFixedCosts + (avgVariableCostPerUnit * u),
                revenue: avgRevenuePerUnit * u,
            });
        }

        // Contribution Margin Breakdown
        const contributionMarginBreakdown = [
            { name: 'Variable Costs', value: totalVariableCosts, color: '#ef4444' }, // Red
            { name: 'Contribution Margin', value: contributionMargin, color: '#22c55e' }, // Green
        ];

        // Product Profitability
        // We need to group revenue/margins by something. 
        // `transactions` have `description` or `category`. 
        // Since we don't have distinct "Products", we can group by `customCategory` (if 'OTHER') or `category` for INFLOW.
        const revenueByCategory: Record<string, number> = {};

        transactions
            .filter(t => t.type === 'INFLOW')
            .forEach(t => {
                const catName = t.category === 'OTHER' && t.customCategory ? t.customCategory : t.category;
                revenueByCategory[catName] = (revenueByCategory[catName] || 0) + t.amountNet;
            });

        // We can't easily attribute variable costs to specific categories without more data.
        // For now, we will show Revenue per Category as a proxy for "Product Performance".
        // Or we assume a flat margin % for all products if unknown. 
        // Let's just plot Revenue vs "Estimated Margin" (using global ratio)
        const productProfitability = Object.entries(revenueByCategory).map(([name, revenue]) => ({
            name: name.replace(/_/g, ' '),
            revenue,
            margin: revenue * (contributionMarginRatio / 100), // Estimate
        })).sort((a, b) => b.revenue - a.revenue).slice(0, 5); // Top 5

        setData({
            summary: {
                contributionMarginRatio,
                contributionMarginGrowth: 0, // Need historical data for growth, leaving 0
                breakEvenPointUnits,
                breakEvenPointRevenue,
                customerLtv,
                ltvGrowth: 0,
                cac,
                cacGrowth: 0,
            },
            cvpAnalysis: cvpData,
            contributionMarginBreakdown,
            productProfitability,
            loading: false,
        });

    }, [transactions, costs, clients, loadingStates]);

    return data;
}
