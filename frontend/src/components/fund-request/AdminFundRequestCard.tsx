// features/fundRequests/adminFundRequestCard.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fundRequestApi } from "@/features/fundRequests/fundRequest.api";
import type { FundRequestResponse } from "@/features/fundRequests/fundRequest.type";
import { formatNaira } from "@/features/fundRequests/fundRequest.schema";
import { useToast } from "@/hooks/use-toast";
import { Check, X, User, FileText, Wallet, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminCardProps {
    request: FundRequestResponse;
    isHistory?: boolean;
}

export default function AdminFundRequestCard({ request, isHistory = false }: AdminCardProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const approveMutation = useMutation({
        mutationFn: () => fundRequestApi.approve(request.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminFundRequests"] });
            toast({ title: "Approved", description: "Request has been successfully processed." });
        },
        onError: (err: any) =>
            toast({
                variant: "destructive",
                title: "Approval Failed",
                description: err.response?.data?.message || "Contract balance error",
            }),
    });

    const rejectMutation = useMutation({
        mutationFn: (reason: string) => fundRequestApi.reject(request.id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminFundRequests"] });
            toast({ title: "Rejected", description: "The PM has been notified." });
        },
    });

    const handleReject = () => {
        const reason = prompt("Enter rejection reason:");
        if (reason) rejectMutation.mutate(reason);
    };

    const isProcessing = approveMutation.isPending || rejectMutation.isPending;

    return (
        <div
            className={`bg-white border rounded-2xl p-6 transition-all ${isHistory ? "opacity-85 grayscale-[0.3]" : "shadow-sm hover:shadow-md"}`}
        >
            <div className="flex justify-between items-start mb-6">
                <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Requested</span>
                    <h2 className={`text-2xl font-black ${isHistory ? "text-slate-600" : "text-blue-700"}`}>
                        {formatNaira(request.requestedAmount)}
                    </h2>
                </div>
                {!isHistory ? (
                    <div className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-1 rounded border border-blue-100 uppercase">
                        Pending
                    </div>
                ) : (
                    <div
                        className={`text-[10px] font-black px-2 py-1 rounded border uppercase ${
                            request.status === "APPROVED"
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-red-50 text-red-700 border-red-100"
                        }`}
                    >
                        {request.status}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <User className="h-3 w-3" /> PM Name
                    </label>
                    <p className="text-sm font-semibold">{request.pm || "N/A"}</p>
                </div>
                <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 justify-end">
                        <Wallet className="h-3 w-3" /> DUID Line
                    </label>
                    <p className="text-sm font-mono text-slate-600">
                        {request.duid} / {request.poLineNumber || "0"}
                    </p>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl mb-6">
                <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                    <FileText className="h-3 w-3" /> Purpose
                </label>
                <p className="text-xs text-slate-600 italic leading-relaxed">"{request.requestPurpose}"</p>
            </div>

            {/* FOOTER ACTIONS */}
            {!isHistory ? (
                <div className="flex gap-3 pt-2">
                    <Button
                        disabled={isProcessing}
                        onClick={() => approveMutation.mutate()}
                        className="flex-1 bg-green-600 hover:bg-green-700 h-10 rounded-xl font-bold"
                    >
                        {approveMutation.isPending ? (
                            "..."
                        ) : (
                            <>
                                <Check className="mr-1 h-4 w-4" /> Approve
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        disabled={isProcessing}
                        onClick={handleReject}
                        className="flex-1 h-10 rounded-xl font-bold hover:bg-red-50 hover:text-red-600"
                    >
                        <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                </div>
            ) : (
                <div className="flex justify-between items-center pt-3 border-t text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-slate-300" />
                        AUDITED BY SYSTEM
                    </div>
                    <div className="flex items-center gap-1 uppercase">
                        <Clock className="h-3 w-3" />
                        PROCESSED: {new Date().toLocaleDateString()}
                    </div>
                </div>
            )}
        </div>
    );
}
