import { useState } from "react";
import { useImportPO } from "@/hooks/useImportPo";
import { ImportResultDisplay } from "@/components/poWokSpace/ImportResultDisplay";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud, FileText } from "lucide-react";

export default function PoImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const { mutate, isPending, data } = useImportPO();

    const handleUpload = () => {
        if (file) mutate(file);
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Purchase Order Import</h1>
                <p className="text-muted-foreground">Upload your standardized Excel template to sync PO data.</p>
            </div>

            <div className="grid gap-6">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center bg-slate-50/50 transition-colors hover:bg-slate-50">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                        <UploadCloud className="text-blue-600 h-6 w-6" />
                    </div>

                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".xlsx, .xls"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />

                    <label htmlFor="file-upload" className="cursor-pointer text-center">
                        <span className="text-blue-600 font-semibold hover:underline">Click to upload</span>
                        <span className="text-slate-500 ml-1">or drag and drop</span>
                        <p className="text-xs text-slate-400 mt-1 uppercase font-medium">Excel files only (max 10MB)</p>
                    </label>

                    {file && (
                        <div className="mt-6 flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm animate-in zoom-in-95">
                            <FileText className="text-blue-500 h-5 w-5" />
                            <div className="text-left">
                                <p className="text-sm font-medium text-slate-900 truncate max-w-50">{file.name}</p>
                                <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <Button onClick={handleUpload} disabled={isPending} size="sm" className="ml-4 bg-blue-600 hover:bg-blue-700">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Process File"}
                            </Button>
                        </div>
                    )}
                </div>

                {/* THE RESULT SECTION */}
                <ImportResultDisplay data={data ?? null} />
            </div>
        </div>
    );
}
