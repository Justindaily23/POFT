import React from "react";

export interface KPIMetrics {
  invoicedPOs: number;
  notInvoicedPOs: number;
  invoiceRate: number;
  avgPoAgingDays: number;
}

// Added 'loading' to the props interface
interface PoAgingKpisProps {
  metrics: KPIMetrics;
  loading?: boolean;
}

export const PoAgingKpis: React.FC<PoAgingKpisProps> = ({ metrics, loading }) => {
  // 1. SKELETON STATE (Prevents Layout Shift)
  if (loading) {
    return (
      <div className="p-4 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-100 p-4 h-25 animate-pulse"
          >
            <div className="flex justify-between mb-4">
              <div className="h-2 w-16 bg-slate-100 rounded" />
              <div className="w-7 h-7 bg-slate-50 rounded-lg" />
            </div>
            <div className="h-6 w-12 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // 2. ACTUAL DATA STATE
  const cards = [
    {
      label: "Invoiced",
      value: metrics.invoicedPOs,
      color: "text-emerald-600",
      dot: "bg-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Not Invoiced",
      value: metrics.notInvoicedPOs,
      color: "text-orange-600",
      dot: "bg-orange-600",
      bg: "bg-orange-100",
    },
    {
      label: "Invoice Rate",
      value: `${metrics.invoiceRate.toFixed(1)}%`,
      color: "text-blue-600",
      dot: "bg-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Avg Aging",
      value: metrics.avgPoAgingDays.toFixed(0),
      unit: "d",
      color: "text-purple-600",
      dot: "bg-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <div className="p-4 grid grid-cols-2 gap-3">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider">
              {card.label}
            </span>
            <div className={`w-7 h-7 ${card.bg} rounded-lg flex items-center justify-center`}>
              <div className={`w-1.5 h-1.5 ${card.dot} rounded-full animate-pulse`} />
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight ${card.color}`}>
            {card.value}
            {card.unit && <span className="text-xs text-slate-400 ml-0.5">{card.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};
