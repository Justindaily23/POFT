// import { useQuery } from "@tanstack/react-query";
// import { useState, useMemo } from "react";
// import { fundRequestApi } from "../fundRequest.api";
// import type { FundRequestResponse } from "../fundRequest.type";
// import AdminFundRequestCard from "@/components/fund-request/AdminFundRequestCard";
// import { Loader2, History as HistoryIcon, LayoutDashboard, Search, XCircle } from "lucide-react";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";

// export default function AdminFundRequestDashboard() {
//   const [searchTerm, setSearchTerm] = useState("");

//   const { data: requests, isLoading } = useQuery<FundRequestResponse[]>({
//     queryKey: ["adminFundRequests"],
//     queryFn: () => fundRequestApi.getAllAdminRequests(),
//   });

//   // Enterprise-Grade Filtering Logic
//   const filteredRequests = useMemo(() => {
//     if (!requests) return [];
//     return requests.filter(
//       (req) =>
//         req.duid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         req.pm?.toLowerCase().includes(searchTerm.toLowerCase()),
//     );
//   }, [requests, searchTerm]);

//   const pendingRequests = filteredRequests.filter((r) => r.status === "PENDING");
//   const processedRequests = filteredRequests.filter((r) => r.status !== "PENDING");

//   if (isLoading) {
//     return (
//       <div className="h-screen flex flex-col items-center justify-center text-slate-400">
//         <Loader2 className="animate-spin h-8 w-8 mb-2" />
//         <p className="font-medium">Loading Fund Management System...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="p-8 bg-[#F8FAFC] min-h-screen">
//       <div className="max-w-7xl mx-auto">
//         <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Fund Management</h1>
//             <p className="text-slate-500 mt-1">
//               Global oversight for all deployment unit fund requests.
//             </p>
//           </div>

//           {/* SEARCH & FILTER BAR */}
//           <div className="relative w-full md:w-80 group">
//             <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
//             <Input
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               placeholder="Search DUID or PM Name..."
//               className="pl-10 h-12 bg-white rounded-xl border-slate-200 shadow-sm focus-visible:ring-blue-500"
//             />
//             {searchTerm && (
//               <button
//                 onClick={() => setSearchTerm("")}
//                 className="absolute right-3 top-3.5 text-slate-300 hover:text-slate-600"
//               >
//                 <XCircle className="h-4 w-4" />
//               </button>
//             )}
//           </div>
//         </header>

//         <Tabs defaultValue="pending" className="space-y-6">
//           <TabsList className="bg-white border p-1 h-12 rounded-xl shadow-sm">
//             <TabsTrigger
//               value="pending"
//               className="rounded-lg px-6 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white"
//             >
//               <LayoutDashboard className="h-4 w-4 mr-2" />
//               Pending ({pendingRequests.length})
//             </TabsTrigger>
//             <TabsTrigger
//               value="history"
//               className="rounded-lg px-6 font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white"
//             >
//               <HistoryIcon className="h-4 w-4 mr-2" />
//               Audit History ({processedRequests.length})
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value="pending">
//             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
//               {pendingRequests.map((req) => (
//                 <AdminFundRequestCard key={req.id} request={req} />
//               ))}
//               {pendingRequests.length === 0 && (
//                 <div className="col-span-full py-24 text-center bg-white border-2 border-dashed rounded-3xl text-slate-400">
//                   {searchTerm ? "No results match your search." : "Queue is clear."}
//                 </div>
//               )}
//             </div>
//           </TabsContent>

//           <TabsContent value="history">
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//               {processedRequests.map((req) => (
//                 <AdminFundRequestCard key={req.id} request={req} isHistory />
//               ))}
//             </div>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import AdminFilterBar from "./components/AdminFilterBar";
import { useAdminFundRequests } from "@/hooks/fundRequest.hooks";
import AdminFundRequestCard from "@/components/fund-request/AdminFundRequestCard";
import { Loader2, History as HistoryIcon, LayoutDashboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminFundRequestFilters } from "../fundRequest.type";

export default function AdminFundRequestDashboard() {
  const [filters, setFilters] = useState<AdminFundRequestFilters>({
    search: "",
    status: "",
    startDate: undefined,
    endDate: undefined,
  } as AdminFundRequestFilters);

  const { data: requests, isLoading } = useAdminFundRequests(filters);

  const pendingRequests = requests?.filter((r) => r.status === "PENDING") || [];
  const processedRequests = requests?.filter((r) => r.status !== "PENDING") || [];

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin h-8 w-8 mb-2" />
        <p className="font-medium">Loading Fund Management System...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Fund Management</h1>
            <p className="text-slate-500 mt-1">
              Global oversight for all deployment unit fund requests.
            </p>
          </div>
          <AdminFilterBar filters={filters} setFilters={setFilters} />
        </header>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white border p-1 h-12 rounded-xl shadow-sm">
            <TabsTrigger
              value="pending"
              className="rounded-lg px-6 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-lg px-6 font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white"
            >
              <HistoryIcon className="h-4 w-4 mr-2" />
              Audit History ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {pendingRequests.map((req) => (
                <AdminFundRequestCard key={req.id} request={req} />
              ))}
              {pendingRequests.length === 0 && (
                <div className="col-span-full py-24 text-center bg-white border-2 border-dashed rounded-3xl text-slate-400">
                  {filters.search ? "No results match your search." : "Queue is clear."}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
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
