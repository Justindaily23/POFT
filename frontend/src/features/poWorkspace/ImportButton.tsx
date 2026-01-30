import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useImportPO } from "@/hooks/useImportPo";
import { toast } from "@/components/ui/use-toast";

export function ImportPOButton() {
    const inputRef = useRef<HTMLInputElement>(null);
    const { mutate, isPending } = useImportPO();
    const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);

    const openPicker = () => inputRef.current?.click();

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fingerprint = `${file.name}_${file.size}_${file.lastModified}`;
        if (lastUploadedFile === fingerprint) {
            toast({ title: "This file has already been uploaded." });
            e.target.value = "";
            return;
        }

        mutate(file, {
            onSuccess: () => setLastUploadedFile(fingerprint),
        });

        e.target.value = "";
    };

    return (
        <>
            <Button variant="secondary" size="lg" onClick={openPicker} disabled={isPending}>
                <Upload className="size-4" />
                {isPending ? "Importing..." : "Import POs"}
            </Button>

            <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFile} />
        </>
    );
}
