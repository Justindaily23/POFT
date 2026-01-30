// features/fundRequests/PmRequestPage.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, ArrowLeft, Plus, Loader2 } from "lucide-react";
import { fundRequestApi } from "../fundRequest.api";
import type { FundRequestResponse } from "@/features/fundRequests/fundRequest.type";
import { createFundRequestSchema, type CreateFundRequestInput } from "@/features/fundRequests/fundRequest.schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function PmRequestPage() {
    const [selectedPo, setSelectedPo] = useState<FundRequestResponse | null>(null);
    const [isManual, setIsManual] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateFundRequestInput>({
        resolver: zodResolver(createFundRequestSchema),
    });

    const { data: searchResults, isLoading: isSearching } = useQuery({
        queryKey: ["poSearch", searchTerm],
        queryFn: () => fundRequestApi.searchByDuidOrPoNumber(searchTerm),
        enabled: searchTerm.length > 2,
    });

    const { mutate, isPending } = useMutation({
        mutationFn: fundRequestApi.submitRequest,
        onSuccess: () => {
            toast({ title: "Submitted", description: "Fund request sent to Admin." });
            reset();
            setSelectedPo(null);
            setIsManual(false);
        },
        onError: (err: any) =>
            toast({
                variant: "destructive",
                title: "Error",
                description: err.response?.data?.message || "Failed to submit.",
            }),
    });

    const handleSelect = (item: FundRequestResponse) => {
        setSelectedPo(item);
        // Use reset to update all fields safely at once
        reset({
            duid: item.duid,
            poNumber: item.poNumber || "",
            poLineNumber: item.poLineNumber || "",
            projectName: item.projectName || "",
            contractAmount: item.contractAmount || 0,
            itemDescription: item.itemDescription || "",
        });
    };

    if (!selectedPo && !isManual) {
        return (
            <div className="max-w-md mx-auto p-4 space-y-6 pt-10">
                <h1 className="text-2xl font-black text-slate-900">New Request</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                        className="pl-10 h-14 rounded-2xl bg-white shadow-sm"
                        placeholder="Search DUID or PO Number..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="space-y-3">
                    {isSearching && <Loader2 className="animate-spin mx-auto text-blue-600" />}
                    {searchResults?.map((res) => (
                        <button
                            key={res.id}
                            onClick={() => handleSelect(res)}
                            className="w-full text-left p-5 border rounded-2xl bg-white shadow-sm hover:border-blue-500 active:scale-[0.98] transition-all"
                        >
                            <p className="font-bold text-slate-800">{res.projectName || "Standard Project"}</p>
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-2">
                                <span>DUID: {res.duid}</span>
                                <span>Line: {res.poLineNumber}</span>
                            </div>
                        </button>
                    ))}
                    <Button
                        variant="ghost"
                        onClick={() => setIsManual(true)}
                        className="w-full h-16 border-2 border-dashed border-slate-200 text-blue-600 rounded-2xl"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Start Manual Entry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-4 pb-28 pt-6 space-y-6">
            <button
                onClick={() => {
                    setSelectedPo(null);
                    setIsManual(false);
                    reset();
                }}
                className="flex items-center text-sm font-bold text-slate-400 uppercase"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
            </button>

            <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-5">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">DUID Identification</label>
                        <Input
                            {...register("duid")}
                            readOnly={!!selectedPo}
                            className={`h-12 rounded-xl ${selectedPo ? "bg-slate-50 border-none font-bold" : ""}`}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested Amount (₦)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-2.5 font-bold text-xl text-slate-900">₦</span>
                            <Input
                                type="number"
                                {...register("requestedAmount", { valueAsNumber: true })}
                                className="pl-10 h-14 text-2xl font-black text-blue-700 border-none bg-slate-50 rounded-2xl"
                                placeholder="0.00"
                            />
                        </div>
                        {errors.requestedAmount && <p className="text-red-500 text-[10px] font-bold">{errors.requestedAmount.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Request Purpose</label>
                        <Textarea
                            {...register("requestPurpose")}
                            className="min-h-30 rounded-2xl bg-slate-50 border-none p-4"
                            placeholder="What is this fund for?"
                        />
                        {errors.requestPurpose && <p className="text-red-500 text-[10px] font-bold">{errors.requestPurpose.message}</p>}
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t z-50">
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full h-16 bg-blue-700 hover:bg-blue-800 text-lg font-black rounded-2xl shadow-xl transition-all"
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : "SUBMIT REQUEST"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
