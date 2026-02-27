import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// Utils & Types
import { fundRequestSchema, type CreateFundRequestInput } from "@/utils/fund-request/schema";
import {
  useSearchPOLines,
  useSubmitFundRequest,
  useFundRequestHistory,
} from "@/hooks/fund-request/fundRequest.hooks";
import type { POLineSearchResponseData } from "@/types/fund-request/fundRequest.type";
import type { EnhancedError } from "@/types/api/api.types";

// Components
import POLineSearch from "@/components/fund-request/PmPOLineSearch";
import FinancialOverview from "@/components/fund-request/PmFinancialOverview";
import FundRequestForm from "@/components/fund-request/PmFundRequestForm";
import RequestHistory from "@/components/fund-request/PmRequestHistory";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { mapPOLineToCreateFundRequest } from "@/utils/fund-request/fundRequest.mapper";

export default function PmFundRequestPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 400);
  const [selectedPOLine, setSelectedPOLine] = useState<POLineSearchResponseData | null>(null);

  const form = useForm<CreateFundRequestInput>({
    resolver: zodResolver(fundRequestSchema),
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
    },
  });

  // Performance Fix: useWatch prevents full-page re-renders when typing the amount
  const watchedAmount = useWatch({
    control: form.control,
    name: "requestedAmount",
  });

  const { data: searchResults, isFetching } = useSearchPOLines(debouncedSearchTerm);
  const { mutate: submitFundRequest, isPending } = useSubmitFundRequest();
  const { data: requestHistory } = useFundRequestHistory(selectedPOLine?.poLineId);

  const handleSubmit = (data: CreateFundRequestInput) => {
    if (!selectedPOLine) return;
    const payload = mapPOLineToCreateFundRequest(selectedPOLine, data);

    submitFundRequest(payload, {
      onSuccess: () => {
        toast.success("Success", { description: "Fund request submitted successfully!" });
        form.reset();
        setSelectedPOLine(null);
      },
      onError: (error: unknown) => {
        const err = error as EnhancedError;
        toast.error("Submission Failed", { description: err.message });
      },
    });
  };

  const handleSelectPO = (item: POLineSearchResponseData) => {
    // Type Safety Fix: Convert API nulls to "" or undefined for Zod compatibility
    form.reset({
      ...form.getValues(),
      duid: item.duid,
      poNumber: item.poNumber ?? "",
      prNumber: item.prNumber ?? "",
      poLineNumber: item.poLineNumber ?? "",
      itemDescription: item.itemDescription ?? "",
      projectName: item.projectName ?? "",
      projectCode: item.projectCode ?? "",
      itemCode: item.itemCode ?? "",
      poTypeId: item.poTypeId ?? "",
      unitPrice: item.unitPrice ?? 0,
      requestedQuantity: item.requestedQuantity ?? 0,
      poLineAmount: item.poLineAmount ?? 0,
      pm: item.pm ?? "",
      pmId: item.pmId ?? "",
      contractAmount: item.contractAmount ?? 0,
      cumulativeApprovedAmount: item.cumulativeApprovedAmount ?? 0,
      poIssuedDate: item.poIssuedDate ? new Date(item.poIssuedDate) : undefined,
    });

    setSelectedPOLine(item);
    toast.info(`Site Selected`, { description: `Active DUID: ${item.duid}` });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-50 pb-24 font-sans">
      <div className="container mx-auto py-4 px-3 sm:px-4 max-w-7xl">
        {/* Header - Preserved Stecam Identity */}
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-1 lg:gap-6">
          {/* Left Column: Search */}
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

          {/* Right Column: Financials & Form */}
          <div className="lg:col-span-8 space-y-2">
            {selectedPOLine && (
              <>
                <FinancialOverview
                  selectedPOLine={selectedPOLine}
                  requestedAmount={watchedAmount}
                />
                {requestHistory && <RequestHistory history={requestHistory} />}
              </>
            )}

            <FundRequestForm
              form={form}
              selectedPOLine={selectedPOLine}
              isPending={isPending}
              isOverLimit={false} // You can calculate this based on watchedAmount if needed
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
