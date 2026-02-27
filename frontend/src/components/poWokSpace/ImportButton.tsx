import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useImportPO } from "@/hooks/purchase-order/useImportPo";
import { toast } from "sonner";
import type { AppAxiosError } from "@/types/api/api.types";

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
      toast.warning("Duplicate File", {
        description: "This specific file has already been uploaded in this session.",
      });
      e.target.value = "";
      return;
    }

    mutate(file, {
      onSuccess: () => {
        setLastUploadedFile(fingerprint);
        toast.success("Import Successful", {
          description: "Purchase Orders have been imported to the workspace.",
        });
      },
      onError: (error: AppAxiosError) => {
        const errorData = error.response?.data;
        const errorMessage =
          (Array.isArray(errorData?.message) ? errorData?.message[0] : errorData?.message) ||
          "Could not process the file.";

        toast.error("Import Failed", {
          description: errorMessage,
        });
      },
    });

    e.target.value = "";
  };

  return (
    <>
      <Button
        variant="secondary"
        size="lg"
        onClick={openPicker}
        disabled={isPending}
        className="text-blue-700 hover:text-primary transition-colors py-3 flex items-center gap-2"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {isPending ? "Importing..." : "Import POs"}
      </Button>

      <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleFile} />
    </>
  );
}
