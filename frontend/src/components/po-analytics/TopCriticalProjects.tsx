import React from "react";
import { type CriticalProject, PoAgingFlag } from "@/types/po-analytics/po-analytics.types";

interface Props {
  projects: CriticalProject[]; // 👈 Updated to match the new DTO
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  RED: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]",
  WARNING: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]",
  GREEN: "bg-emerald-500",
};

export const TopCriticalProjects: React.FC<Props> = ({ projects, isLoading }) => {
  // Use the new CriticalProject structure
  const top5 = (projects || []).slice(0, 20);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4 shadow-xs">
        <div className="h-4 w-24 bg-slate-100 animate-pulse rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-full bg-slate-50 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-800 font-bold text-[11px] uppercase tracking-widest">
          Critical Projects
        </h3>
        <span className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-black border border-red-100">
          PRIORITY
        </span>
      </div>

      <div className="space-y-5">
        {top5.length > 0 ? (
          top5.map((project) => (
            <div key={project.id} className="flex items-center justify-between group">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-700 truncate max-w-35">
                  {project.projectName}
                </span>
                <span className="text-[9px] text-slate-400 font-bold tracking-tighter uppercase">
                  {project.projectCode} • {project.pmName}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-black ${
                      project.status === "RED" ? "text-red-500" : "text-orange-500"
                    }`}
                  >
                    {project.agingCount} <span className="text-[8px] uppercase">Alerts</span>
                  </span>
                  <StatusDot flag={project.status} />
                </div>
                <span className="text-[10px] text-slate-950 font-bold uppercase">
                  Value: ${(project.totalPoValue / 1000).toFixed(1)}k
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-slate-400 italic py-4 text-center">
            No critical delays found.
          </div>
        )}
      </div>
    </div>
  );
};

const StatusDot = ({ flag }: { flag: PoAgingFlag | string }) => {
  const colorClass = STATUS_COLORS[flag as keyof typeof STATUS_COLORS] || "bg-slate-300";
  return <div className={`w-1.5 h-1.5 rounded-full ${colorClass}`} />;
};
