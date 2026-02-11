import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { fundRequestSchema, type CreateFundRequestInput } from "../schema";
import {
  useSearchPOLines,
  useSubmitFundRequest,
  useFundRequestHistory,
} from "../../../hooks/fundRequest.hooks";
import type { POLineSearchResponseData } from "../fundRequest.type";

import POLineSearch from "../components/POLineSearch";
import FinancialOverview from "../components/FinancialOverview";
import FundRequestForm from "../components/FundRequestForm";
import RequestHistory from "../components/RequestHistory";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { mapPOLineToCreateFundRequest } from "../fundRequest.mapper";

export default function FundRequestPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 400);
  const [selectedPOLine, setSelectedPOLine] = useState<POLineSearchResponseData | null>(null);

  const form = useForm<CreateFundRequestInput>({
    resolver: zodResolver(fundRequestSchema) as any,
    defaultValues: {
      duid: "",
      requestedAmount: 0,
      requestPurpose: "",
      poNumber: "",
      prNumber: "",
      poLineNumber: "",
      itemDescription: "",
      projectName: "",
      projectCode: "",
      itemCode: "",
      poTypeId: "",
      unitPrice: 0,
      requestedQuantity: 0,
      poLineAmount: 0,
      pm: "",
      pmId: "",
      contractAmount: 0,
      poIssuedDate: undefined,
    },
  });

  // ==================== API HOOKS ====================
  const { data: searchResults, isFetching } = useSearchPOLines(debouncedSearchTerm);

  const { mutate: submitFundRequest, isPending } = useSubmitFundRequest();
  const handleSubmit = (data: CreateFundRequestInput) => {
    if (!selectedPOLine) return;
    const payload = mapPOLineToCreateFundRequest(selectedPOLine, data);

    submitFundRequest(payload, {
      onSuccess: () => {
        toast.success("Fund request submitted successfully!");
        form.reset(); // optional: reset form
        setSelectedPOLine(null); // optional: clear selected PO line
      },
      onError: (error: any) => {
        toast.error(error?.message || "Failed to submit fund request.");
      },
    });
  };

  const { data: requestHistory } = useFundRequestHistory(selectedPOLine?.poLineId);

  // ==================== HANDLERS ====================
  const handleSelectPO = (item: POLineSearchResponseData) => {
    form.reset({
      ...form.getValues(),
      duid: item.duid,
      poNumber: item.poNumber || "",
      prNumber: item.prNumber || "",
      poLineNumber: item.poLineNumber || "",
      itemDescription: item.itemDescription || "",
      projectName: item.projectName || "",
      projectCode: item.projectCode || "",
      itemCode: item.itemCode || "",
      poTypeId: "",
      unitPrice: item.unitPrice || 0,
      requestedQuantity: item.requestedQuantity || 0,
      poLineAmount: item.poLineAmount || 0,
      pm: item.pm || "",
      pmId: item.pmId || "",
      contractAmount: item.contractAmount || 0,
      cumulativeApprovedAmount: item.cumulativeApprovedAmount ?? 0,
      poIssuedDate: item.poIssuedDate ?? undefined,
      requestPurpose: form.getValues("requestPurpose"),
      requestedAmount: form.getValues("requestedAmount") || 0,
    });

    setSelectedPOLine(item as unknown as POLineSearchResponseData);
    toast.info(`Selected site: ${item.duid}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-50 pb-24">
      <div className="container mx-auto py-4 px-3 sm:px-4 max-w-7xl">
        {/* ==================== HEADER ==================== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Fund <span className="text-blue-600">Request</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Stecam Nigeria Operations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* ==================== SEARCH COLUMN ==================== */}
          <div className="lg:col-span-4">
            <POLineSearch
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchResults={searchResults || []}
              isFetching={isFetching}
              selectedPOLine={selectedPOLine}
              handleSelectPO={handleSelectPO}
            />
          </div>

          {/* ==================== MAIN FORM COLUMN ==================== */}
          <div className="lg:col-span-8 space-y-4">
            {selectedPOLine && (
              <>
                <FinancialOverview
                  selectedPOLine={selectedPOLine}
                  requestedAmount={form.watch("requestedAmount")}
                />
                {requestHistory && <RequestHistory history={requestHistory} />}
              </>
            )}

            <FundRequestForm
              form={form}
              selectedPOLine={selectedPOLine}
              isPending={isPending}
              isOverLimit={false}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
