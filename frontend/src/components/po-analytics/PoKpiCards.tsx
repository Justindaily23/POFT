import React, { useMemo } from "react";
import type { PoAgingKpiDto } from "@/types/po-analytics/po-analytics.types";

type KpiColor = "indigo" | "emerald" | "orange" | "blue" | "purple";

interface Props {
  metrics: PoAgingKpiDto;
  userRole: "ADMIN" | "USER" | "SUPER_ADMIN";
}

const COLOR_MAP: Record<KpiColor, { bg: string; dot: string; text: string }> = {
  indigo: { bg: "bg-indigo-50", dot: "bg-indigo-500", text: "text-indigo-600" },
  emerald: { bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-600" },
  orange: { bg: "bg-orange-50", dot: "bg-orange-500", text: "text-orange-600" },
  blue: { bg: "bg-blue-50", dot: "bg-blue-500", text: "text-blue-600" },
  purple: { bg: "bg-purple-50", dot: "bg-purple-500", text: "text-purple-600" },
};

export const PoKpiCards: React.FC<Props> = ({ metrics, userRole }) => {
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const kpiItems = useMemo(
    () => [
      {
        id: "total-pos",
        label: "Total POs",
        value: (metrics.totalPOLines ?? 0).toLocaleString(),
        color: "indigo" as const,
        adminOnly: true,
        subtitle: "System wide",
      },
      {
        id: "invoiced",
        label: "Invoiced",
        value: (metrics.invoicedPOs ?? 0).toLocaleString(),
        color: "emerald" as const,
        subtitle: "Completed",
      },
      {
        id: "pending",
        label: "Not Invoiced",
        value: (metrics.notInvoicedPOs ?? 0).toLocaleString(),
        color: "orange" as const,
        subtitle: "Pending Sync",
      },
      {
        id: "rate",
        label: "Invoice Rate",
        value: `${(Number(metrics.invoiceRate) || 0).toFixed(1)}%`,
        color: "blue" as const,
        subtitle: "Efficiency",
      },
      {
        id: "aging",
        label: "Avg Aging",
        value: (Number(metrics.avgPoAgingDays) || 0).toFixed(1),
        color: "purple" as const,
        subtitle: "Days avg",
      },
    ],
    [metrics],
  );

  return (
    /* 🚀 STICKY WRAPPER: Keeps the analytics locked at the top of the viewport */
    <div className="sticky top-0 z-30 w-full pt-4 pb-2 bg-white/60 backdrop-blur-xl">
      <div
        className={`grid gap-6 p-6 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 shadow-inner ${
          isAdmin
            ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-5"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {kpiItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;

          const style = COLOR_MAP[item.color];

          return (
            <div
              key={item.id}
              className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-slate-950 text-[10px] font-black uppercase tracking-[0.2em]">
                  {item.label}
                </div>
                <div
                  className={`w-9 h-9 ${style.bg} rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-sm`}
                >
                  <div className={`w-2 h-2 ${style.dot} rounded-full animate-pulse`}></div>
                </div>
              </div>

              <div className={`text-3xl font-black tracking-tighter ${style.text} mb-1.5`}>
                {item.value}
              </div>

              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                {item.subtitle}
              </div>

              <div className="mt-4 h-0.75 w-12 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full w-1/3 rounded-full ${style.dot}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
