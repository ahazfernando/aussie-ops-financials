"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, DollarSign, PieChart as PieChartIcon } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatAxisCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

interface CvpAnalysisChartProps {
  data: {
    units: number;
    fixedCost: number;
    totalCost: number;
    revenue: number;
  }[];
}

export function CvpAnalysisChart({ data }: CvpAnalysisChartProps) {
  // If no data, show a placeholder or empty state, 
  // but the hook should ensure at least some data structure is passed.

  return (
    <Card className="border-2 shadow-sm hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Cost-Volume-Profit (CVP) Analysis
        </CardTitle>
        <CardDescription>Break-even point analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="units"
                label={{ value: 'Units Sold', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis
                label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
                tickFormatter={formatAxisCurrency}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                name="Total Revenue"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="totalCost"
                stroke="#ef4444"
                name="Total Cost"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="fixedCost"
                stroke="#3b82f6"
                name="Fixed Cost"
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProductProfitabilityChartProps {
  data: {
    name: string;
    margin: number;
    revenue: number;
  }[];
}

export function ProductProfitabilityChart({ data }: ProductProfitabilityChartProps) {
  return (
    <Card className="border-2 shadow-sm hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Revenue & Estimated Margin by Category
        </CardTitle>
        <CardDescription>Top revenue categories and estimated margins</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatAxisCurrency} />
                <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: 'transparent' }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#94a3b8" name="Revenue" radius={[0, 4, 4, 0]} />
                <Bar dataKey="margin" fill="#22c55e" name="Est. Contribution Margin" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No revenue data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ContributionMarginRatioChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  ratio: number;
}

export function ContributionMarginRatioChart({ data, ratio }: ContributionMarginRatioChartProps) {
  return (
    <Card className="border-2 shadow-sm hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Unit Economics Breakdown
        </CardTitle>
        <CardDescription>Overall cost vs margin split</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full flex items-center justify-center">
          {data.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-muted-foreground">Insufficient data</div>
          )}
        </div>
        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Contribution Margin Ratio: <span className="font-bold text-foreground">{ratio.toFixed(1)}%</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
