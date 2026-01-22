"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { format, subDays, startOfDay, isSameDay, parseISO } from "date-fns";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RecruitmentLead } from "@/types/recruitment-lead";

export const description = "An interactive area chart showing leads vs converted clients";

const chartConfig = {
    leads: {
        label: "New Leads",
        color: "hsl(var(--chart-1))",
    },
    converted: {
        label: "Clients Converted",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig;

interface LeadsConversionChartProps {
    leads: RecruitmentLead[];
}

export function LeadsConversionChart({ leads }: LeadsConversionChartProps) {
    const [timeRange, setTimeRange] = React.useState("90d");

    // Process data based on time range
    const chartData = React.useMemo(() => {
        const now = new Date();
        let daysToSubtract = 90;
        if (timeRange === "30d") {
            daysToSubtract = 30;
        } else if (timeRange === "7d") {
            daysToSubtract = 7;
        }

        const startDate = startOfDay(subDays(now, daysToSubtract));
        const dataMap = new Map<string, { date: string; leads: number; converted: number }>();

        // Initialize map with all dates
        for (let i = 0; i <= daysToSubtract; i++) {
            const date = subDays(now, daysToSubtract - i);
            const dateStr = format(date, "yyyy-MM-dd");
            dataMap.set(dateStr, { date: dateStr, leads: 0, converted: 0 });
        }

        leads.forEach((lead) => {
            // Count new leads
            const recordDate = lead.dateOfRecording ? new Date(lead.dateOfRecording) : new Date(lead.createdAt);
            if (recordDate >= startDate) {
                const dateStr = format(recordDate, "yyyy-MM-dd");
                if (dataMap.has(dateStr)) {
                    const entry = dataMap.get(dateStr)!;
                    entry.leads += 1;
                }
            }

            // Count converted leads
            if (lead.status === 'Converted' && lead.convertedAt) {
                const convertDate = new Date(lead.convertedAt);
                if (convertDate >= startDate) {
                    const dateStr = format(convertDate, "yyyy-MM-dd");
                    if (dataMap.has(dateStr)) {
                        const entry = dataMap.get(dateStr)!;
                        entry.converted += 1;
                    }
                }
            }
        });

        return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [leads, timeRange]);

    return (
        <Card>
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1">
                    <CardTitle>Business Leads vs Clients Converted</CardTitle>
                    <CardDescription>
                        Showing trends for the last {timeRange === "90d" ? "3 months" : timeRange === "30d" ? "30 days" : "7 days"}
                    </CardDescription>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger
                        className="w-[160px] rounded-lg sm:ml-auto"
                        aria-label="Select a value"
                    >
                        <SelectValue placeholder="Last 3 months" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="90d" className="rounded-lg">
                            Last 3 months
                        </SelectItem>
                        <SelectItem value="30d" className="rounded-lg">
                            Last 30 days
                        </SelectItem>
                        <SelectItem value="7d" className="rounded-lg">
                            Last 7 days
                        </SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[250px] w-full"
                >
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-leads)"
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-leads)"
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                            <linearGradient id="fillConverted" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-converted)"
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-converted)"
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                });
                            }}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        return new Date(value).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        });
                                    }}
                                    indicator="dot"
                                />
                            }
                        />
                        <Area
                            dataKey="converted"
                            type="natural"
                            fill="url(#fillConverted)"
                            stroke="var(--color-converted)"
                            stackId="b"
                            name="Converted"
                        />
                        <Area
                            dataKey="leads"
                            type="natural"
                            fill="url(#fillLeads)"
                            stroke="var(--color-leads)"
                            stackId="a"
                            name="New Leads"
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
