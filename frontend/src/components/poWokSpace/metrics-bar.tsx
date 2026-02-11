"use client";

import type { FinancialMetrics } from "@/lib/po-workspace/types";

import { CoinsIcon, FileText, TrendingUp, CreditCard, Scale } from "lucide-react";

interface MetricsBarProps {
    metrics: FinancialMetrics;
    rowCount: number;
    totalCount: number;
    isStale?: boolean;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        notation: "standard",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export function MetricsBar({ metrics, rowCount, totalCount }: MetricsBarProps) {
    const metricItems = [
        {
            label: "Total PO Amount",
            value: formatCurrency(metrics.totalPoAmount),
            icon: FileText,
            color: "text-primary",
        },
        {
            label: "Total Contract Amount",
            value: formatCurrency(metrics.totalContractAmount),
            icon: CoinsIcon,
            color: "text-chart-2",
        },
        {
            label: "Amount Requested",
            value: formatCurrency(metrics.totalAmountRequested),
            icon: TrendingUp,
            color: "text-chart-4",
        },
        {
            label: "Amount Spent",
            value: formatCurrency(metrics.totalAmountSpent),
            icon: CreditCard,
            color: "text-chart-5",
        },
        {
            label: "Balance Due",
            value: formatCurrency(metrics.balanceDue),
            icon: Scale,
            color:
                metrics.balanceDue > 0
                    ? "text-red-600 dark:text-red-500 font-bold" // Sharp red with high contrast
                    : "text-red-600 dark:text-red-500 font-bold",
        },
    ];

    return (
        <div className="bg-secondary/95 border-b border-border">
            <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-md font-medium text-muted-foreground">Financial Summary</span>
                        <span className="text-lg text-accent-foreground">•</span>
                        <span className="text-xs text-accent-foreground">
                            Showing <span className="text-foreground font-medium">{rowCount.toLocaleString()}</span> of{" "}
                            <span className="text-foreground font-medium">{totalCount.toLocaleString()}</span> lines
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Changed bg-primary to bg-green-500 */}
                        <div className="h-1.5 w-1.5 rounded-full bg-green-950 animate-pulse" />
                        {/* Changed text-muted-foreground to text-green-600 */}
                        <span className="text-md text-green-700">Live</span>
                    </div>
                </div>

                <div className="grid grid-cols-2  md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {metricItems.map((item) => (
                        <div key={item.label} className="bg-card  rounded-md border border-border px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                                <span className="text-md text-accent-foreground truncate">{item.label}</span>
                            </div>
                            <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
