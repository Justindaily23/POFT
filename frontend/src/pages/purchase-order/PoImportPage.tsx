import { useState } from "react";
import { useImportPO, useImportHistory } from "@/hooks/purchase-order/useImportPo";
import { ImportResultDisplay } from "@/components/poWokSpace/ImportResultDisplay";
import type { ImportResult, PoImportHistoryItem } from "@/types/po-workspace/types";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  UploadCloud,
  FileText,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

export default function PoImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const { mutate, isPending, data } = useImportPO();
  const { data: history = [] } = useImportHistory();

  const handleUpload = () => {
    if (file) mutate(file, { onSuccess: () => setFile(null) });
  };

  // Safe mapping to satisfy the Result Component status union
  const formattedResult: ImportResult | null = data
    ? {
        ...data,
        status: data.status as "SUCCESS" | "PARTIAL" | "FAILED",
        errors: data.errors ?? [],
      }
    : null;

  return (
    <div className="max-w-350 mx-auto p-8">
      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* LEFT COLUMN: UPLOADER */}
        <div className="flex-1 w-full space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Purchase Order Import
            </h1>
            <p className="text-slate-500">Sync Excel templates with your PO database.</p>
          </header>

          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-white hover:border-blue-400 transition-all">
            <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center mb-6">
              <UploadCloud className="text-blue-600 h-7 w-7" />
            </div>

            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <label htmlFor="file-upload" className="cursor-pointer text-center">
              <span className="text-blue-600 font-bold text-lg hover:underline">
                Click to upload template
              </span>
              <p className="text-slate-400 text-sm mt-1">Excel files only (Max 10MB)</p>
            </label>

            {file && (
              <div className="mt-8 flex items-center gap-4 bg-white p-4 rounded-2xl border border-blue-100 shadow-xl min-w-85">
                <FileText className="text-blue-600 h-6 w-6" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button onClick={handleUpload} disabled={isPending} className="bg-blue-600">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Process"}
                </Button>
              </div>
            )}
          </div>

          <ImportResultDisplay data={formattedResult} />
        </div>

        {/* RIGHT COLUMN: HISTORY */}
        <aside className="w-full lg:w-96 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <History className="size-4 text-slate-400" />
            <h2 className="font-bold text-xs uppercase tracking-widest text-slate-500">
              Import Log
            </h2>
          </div>

          <div className="space-y-4 max-h-150 overflow-y-auto pr-2 custom-scrollbar">
            {history.map((item: PoImportHistoryItem) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-slate-800 truncate flex-1 mr-2">
                    {item.fileName}
                  </p>
                  <StatusIcon status={item.status} />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>
                    {item.poCount} POs • {item.poLineCount} Lines
                  </span>
                  <span>{format(new Date(item.createdAt), "MMM d, HH:mm")}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "SUCCESS") return <CheckCircle2 className="size-4 text-emerald-500" />;
  if (status === "FAILED") return <XCircle className="size-4 text-red-500" />;
  return <AlertTriangle className="size-4 text-amber-500" />;
}
