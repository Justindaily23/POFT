import { CheckCircle2, Info, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImportResultProps {
  data: {
    status: "SUCCESS" | "PARTIAL" | "FAILED" | "PENDING";
    poSucceeded: number;
    poFailed: number;
    linesProcessed: number;
    errors: string[];
  } | null;
}

export function ImportResultDisplay({ data }: ImportResultProps) {
  if (!data) return null;

  const isSuccess = data.status === "SUCCESS";

  // Logic to generate a .txt file from the error array
  const downloadErrorReport = () => {
    if (!data.errors || data.errors.length === 0) return;

    const timestamp = new Date().toLocaleString();
    const reportHeader =
      `PO IMPORT ERROR REPORT\nGenerated: ${timestamp}\nStatus: ${data.status}\n` +
      `Succeeded: ${data.poSucceeded} | Failed: ${data.poFailed}\n` +
      `--------------------------------------------------\n\n`;

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
    <div
      className={cn(
        "mt-6 rounded-xl border p-5 transition-all animate-in fade-in slide-in-from-top-2",
        isSuccess ? "bg-green-50/50 border-green-100" : "bg-slate-50 border-slate-200",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "mt-1 rounded-full p-2",
            isSuccess ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700",
          )}
        >
          {isSuccess ? <CheckCircle2 size={20} /> : <Info size={20} />}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3
              className={cn(
                "font-bold tracking-tight",
                isSuccess ? "text-green-900" : "text-slate-900",
              )}
            >
              {isSuccess ? "Import Completed Successfully" : "Import Processed with Remarks"}
            </h3>
            <div className="flex items-center gap-2">
              {!isSuccess && data.errors.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadErrorReport}
                  className="h-7 text-[10px] gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                >
                  <Download size={12} />
                  Download Log
                </Button>
              )}
              <span className="text-[10px] font-mono bg-white px-2 py-1 rounded border border-slate-200 uppercase text-slate-500">
                Status: {data.status}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatBox label="POs Succeeded" value={data.poSucceeded} color="text-green-600" />
            <StatBox
              label="POs Failed"
              value={data.poFailed}
              color={data.poFailed > 0 ? "text-red-600" : "text-slate-400"}
            />
            <StatBox label="Lines Processed" value={data.linesProcessed} color="text-blue-600" />
          </div>

          {data.errors && data.errors.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Error Log ({data.errors.length})
              </p>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
                {data.errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-[11px] text-slate-600 py-1 border-b border-slate-50 last:border-0"
                  >
                    <ChevronRight size={12} className="mt-0.5 text-slate-300 shrink-0" />
                    <span className="font-mono leading-relaxed">{err}</span>
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
    <div className="bg-white/50 p-3 rounded-lg border border-slate-100 shadow-sm">
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{label}</p>
      <p className={cn("text-xl font-bold mt-1", color)}>{value.toLocaleString()}</p>
    </div>
  );
}
