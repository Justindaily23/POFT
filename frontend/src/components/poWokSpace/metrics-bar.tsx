import { useMemo } from "react";
import type { FinancialMetrics, PurchaseOrderLine } from "@/types/po-workspace/types";
import { CoinsIcon, FileText, TrendingUp, CreditCard, Scale, TrendingDown } from "lucide-react";

interface MetricsBarProps {
  metrics: FinancialMetrics;
  rowCount: number;
  totalCount: number;
  isStale?: boolean;
  selectedRows?: PurchaseOrderLine[];
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

export function MetricsBar({ metrics, rowCount, totalCount, selectedRows = [] }: MetricsBarProps) {
  const displayMetrics = useMemo(() => {
    if (!selectedRows || selectedRows.length === 0) {
      return metrics;
    }

    const initialValues: FinancialMetrics = {
      totalPoAmount: 0,
      totalContractAmount: 0,
      totalAmountSpent: 0,
      totalAmountRequested: 0,
      totalAmountRejected: 0,
      balanceDue: 0,
    };

    const calculated = selectedRows.reduce((acc, row) => {
      // ✅ FIXED: Removed '?? 0' because Number() never returns null/undefined
      // Using '|| 0' handles NaN if the input string is empty or invalid
      const poAmt = Number(row.poLineAmount) || 0;
      const contractAmt = Number(row.contractAmount) || 0;
      const spent = Number(row.amountSpent) || 0;
      const requested = Number(row.amountRequested) || 0;
      const rejected = Number(row.amountRejected) || 0;

      acc.totalPoAmount += poAmt;
      acc.totalContractAmount += contractAmt;
      acc.totalAmountSpent += spent;
      acc.totalAmountRequested += requested;
      acc.totalAmountRejected += rejected;

      return acc;
    }, initialValues);

    calculated.balanceDue = calculated.totalContractAmount - calculated.totalAmountSpent;

    return calculated;
  }, [metrics, selectedRows]);

  const metricItems = [
    {
      label: "Total PO Amount",
      value: formatCurrency(displayMetrics.totalPoAmount),
      icon: FileText,
      color: "text-primary",
    },
    {
      label: "Total Contract Amount",
      value: formatCurrency(displayMetrics.totalContractAmount),
      icon: CoinsIcon,
      color: "text-chart-2",
    },
    {
      label: "Amount Requested",
      value: formatCurrency(displayMetrics.totalAmountRequested),
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-500 font-bold",
    },
    {
      label: "Amount Rejected",
      value: formatCurrency(displayMetrics.totalAmountRejected),
      icon: TrendingDown,
      color: "text-rose-600 dark:text-rose-400 font-bold",
    },
    {
      label: "Amount Approved",
      value: formatCurrency(displayMetrics.totalAmountSpent),
      icon: CreditCard,
      color: "text-green-800 dark:text-green-500 font-bold",
    },
    {
      label: "Balance Due",
      value: formatCurrency(displayMetrics.balanceDue),
      icon: Scale,
      color:
        displayMetrics.balanceDue > 0
          ? "text-red-600 dark:text-red-500 font-bold"
          : "text-green-600 dark:text-green-500 font-bold",
    },
  ];

  return (
    <div className="bg-secondary/95 border-b border-border">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-md font-medium text-muted-foreground">Financial Summary</span>
            <span className="text-lg text-fuchsia-900">•</span>
            <span className="text-xs text-blue-900">
              Showing{" "}
              <span className="text-foreground font-medium">
                {selectedRows.length > 0
                  ? selectedRows.length.toLocaleString()
                  : rowCount.toLocaleString()}
              </span>{" "}
              of <span className="text-blue-950 font-medium">{totalCount.toLocaleString()}</span>{" "}
              lines
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-md text-green-800">Live</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metricItems.map((item) => (
            <div
              key={item.label}
              className="bg-card/60 backdrop-blur-sm rounded-xl border border-border p-3 min-w-0 shadow-sm flex flex-col justify-center h-20 transition-all hover:shadow-md hover:border-slate-300"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <item.icon className={`h-4 w-4 shrink-0 opacity-80 ${item.color}`} />
                <span className="text-[12px] uppercase tracking-[0.12em] text-slate-800 font-semibold truncate leading-none">
                  {item.label}
                </span>
              </div>
              <div
                className={`text-[16px] xl:text-[18px] font-black tracking-tighter truncate ${item.color}`}
              >
                {item.value}
              </div>
              <div className="mt-2 h-0.5 w-8 rounded-full bg-slate-100">
                <div
                  className={`h-full w-1/2 rounded-full ${item.color.split(" ")[0].replace("text", "bg")}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
