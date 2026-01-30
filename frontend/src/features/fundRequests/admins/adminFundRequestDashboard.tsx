// features/fundRequests/adminFundRequestDashboard.tsx
import { useQuery } from "@tanstack/react-query";
import { fundRequestApi } from "../fundRequest.api";
import type { FundRequestResponse } from "../fundRequest.type";
import AdminFundRequestCard from "@/components/fund-request/AdminFundRequestCard";
import { Loader2, History as HistoryIcon, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminFundRequestDashboard() {
    const { data: requests, isLoading } = useQuery<FundRequestResponse[]>({
        queryKey: ["adminFundRequests"],
        queryFn: () => fundRequestApi.getAllAdminRequests(),
    });

    if (isLoading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin h-8 w-8 mb-2" />
                <p className="font-medium">Loading Fund Requests...</p>
            </div>
        );
    }

    const pendingRequests = requests?.filter((r) => r.status === "PENDING") || [];
    const processedRequests = requests?.filter((r) => r.status !== "PENDING") || [];

    return (
        <div className="p-8 bg-[#F8FAFC] min-h-screen">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Fund Management</h1>
                    <p className="text-slate-500 mt-1">Review, Approve, or Audit fund requests across all DUIDs.</p>
                </header>

                <Tabs defaultValue="pending" className="space-y-6">
                    <TabsList className="bg-white border p-1 h-12 rounded-xl shadow-sm">
                        <TabsTrigger
                            value="pending"
                            className="rounded-lg px-6 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                        >
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Pending Actions ({pendingRequests.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="history"
                            className="rounded-lg px-6 font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white"
                        >
                            <HistoryIcon className="h-4 w-4 mr-2" />
                            Audit History ({processedRequests.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending" className="mt-0">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {pendingRequests.map((req) => (
                                <AdminFundRequestCard key={req.id} request={req} />
                            ))}
                            {pendingRequests.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-white border-2 border-dashed rounded-3xl text-slate-400">
                                    No pending requests to clear.
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {processedRequests.map((req) => (
                                <AdminFundRequestCard key={req.id} request={req} isHistory />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
