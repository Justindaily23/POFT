import { CheckCircle2, AlertTriangle, ChevronRight, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ImportResult } from "@/types/po-workspace/types";

interface ImportResultProps {
  data: ImportResult | null;
}

export function ImportResultDisplay({ data }: ImportResultProps) {
  if (!data) return null;

  // 1. Render immediate background queue processing state
  if (data.status === "PENDING") {
    return (
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-5 flex items-center gap-4 animate-pulse">
        <Loader2 className="size-5 text-blue-500 animate-spin shrink-0" />
        <div>
          <p className="text-sm font-bold text-blue-900">Import Job Scheduled Successfully</p>
          <p className="text-xs text-blue-600/80 mt-0.5">Asynchronous queue workers are loading your spreadsheet segments now.</p>
        </div>
      </div>
    );
  }

  const isSuccess = data.status === "SUCCESS";
  const poSucceededCount = data.poSucceeded ?? 0;
  const linesProcessedCount = data.linesProcessed ?? 0;

  // Since it is an all-or-nothing rollback model, failures block the entire file
  const errorsCount = data.errors?.length ?? 0;

  const downloadErrorReport = () => {
    if (!data.errors || data.errors.length === 0) return;

    const timestamp = new Date().toLocaleString();
    const reportHeader = `PO IMPORT ERROR REPORT\nGenerated: ${timestamp}\nStatus: ${data.status}\n` + `Succeeded PO Headers: ${poSucceededCount} | Errors Found: ${errorsCount}\n` + `--------------------------------------------------\n\n`;

    const reportContent = data.errors.map((err, i) => `[Error ${i + 1}]: ${err}`).join("\n");
    const blob = new Blob([reportHeader + reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `po_import_errors_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("mt-6 rounded-2xl border p-5 transition-all animate-in fade-in slide-in-from-top-2", isSuccess ? "bg-green-50/50 border-green-100" : "bg-red-50/30 border-red-100")}>
      <div className="flex items-start gap-4">
        <div className={cn("mt-1 rounded-full p-2", isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{isSuccess ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={cn("font-bold tracking-tight text-sm", isSuccess ? "text-green-900" : "text-slate-900")}>{isSuccess ? "Import Completed Successfully" : "Import Rejected by System"}</h3>
            <div className="flex items-center gap-2">
              {!isSuccess && errorsCount > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrorReport} className="h-7 text-[10px] gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl px-3">
                  <Download size={12} />
                  Download Log File
                </Button>
              )}
              <span className={cn("text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider", isSuccess ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200")}>{data.status}</span>
            </div>
          </div>

          {/* COUNTERS COMPONENT BOXES */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatBox label="POs Succeeded" value={poSucceededCount} color="text-green-600" />
            <StatBox label="Validation Errors" value={errorsCount} color={errorsCount > 0 ? "text-red-600" : "text-slate-400"} />
            <StatBox label="Lines Processed" value={linesProcessedCount} color="text-blue-600" />
          </div>

          {/* INDIVIDUAL LOG ITEMS ACCORDION WRAP */}
          {errorsCount > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audit Failure Stream Logs ({errorsCount})</p>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200/60 bg-white p-3 space-y-2 custom-scrollbar">
                {data.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600 py-1.5 border-b border-slate-100 last:border-0">
                    <ChevronRight size={12} className="mt-0.5 text-slate-300 shrink-0" />
                    <span className="font-mono leading-relaxed break-all">{err}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/70 p-3 rounded-xl border border-slate-100 shadow-sm">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={cn("text-lg font-bold mt-0.5 font-mono", color)}>{value.toLocaleString()}</p>
    </div>
  );
}
