"use client";

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    CvpAnalysisChart,
    ProductProfitabilityChart,
    ContributionMarginRatioChart
} from '@/components/financials/UnitEconomicsCharts';
import { DollarSign, TrendingUp, Activity, BarChart3, Loader2 } from 'lucide-react';
import { useUnitEconomics } from '@/hooks/use-unit-economics';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 }).format(num);
};

export default function UnitEconomicsPage() {
    const {
        summary,
        cvpAnalysis,
        contributionMarginBreakdown,
        productProfitability,
        loading
    } = useUnitEconomics();

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Unit Economics</h1>
                    <p className="text-muted-foreground">
                        Analyze product profitability, break-even points, and cost structures to prioritize revenue growth.
                    </p>
                </div>

                {loading ? (
                    <div className="flex h-[400px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Avg. Contribution Margin
                                    </CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{summary.contributionMarginRatio.toFixed(1)}%</div>
                                    <p className="text-xs text-muted-foreground">
                                        Of Revenue
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Break-even Point
                                    </CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatNumber(summary.breakEvenPointUnits)} Units</div>
                                    <p className="text-xs text-muted-foreground">
                                        {formatCurrency(summary.breakEvenPointRevenue)} revenue needed
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Customer LTV
                                    </CardTitle>
                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(summary.customerLtv)}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Average revenue per client
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        CAC
                                    </CardTitle>
                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(summary.cac)}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Cost per acquisition
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* CVP Analysis Section */}
                        <div className="grid gap-4 md:grid-cols-7">
                            <div className="md:col-span-4">
                                <CvpAnalysisChart data={cvpAnalysis} />
                            </div>
                            <div className="md:col-span-3">
                                <ContributionMarginRatioChart
                                    data={contributionMarginBreakdown}
                                    ratio={summary.contributionMarginRatio}
                                />
                            </div>
                        </div>

                        {/* Product Profitability Section */}
                        <div className="grid gap-4 md:grid-cols-1">
                            <ProductProfitabilityChart data={productProfitability} />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
