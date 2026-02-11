// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import * as z from "zod";
// import { Loader2, UserPlus, ShieldCheck, MapPin, Briefcase, Plus, Settings2, CheckCircle2, Copy, X } from "lucide-react";

// // Hooks & Components from your project
// import { useStaffAccount } from "@/hooks/useStaffAccount";
// import { useToast } from "@/hooks/use-toast";
// import { Toaster } from "@/components/ui/toaster";

// const staffSchema = z.object({
//     fullName: z.string().min(2, "Full name is required"),
//     email: z.string().email("Invalid email address"),
//     phoneNumber: z.string().optional(),
//     role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]),
//     staffRoleId: z.string().min(1, "Job role is required"),
//     stateId: z.string().min(1, "State is required"),
// });

// type StaffFormValues = z.infer<typeof staffSchema>;

// export default function CreateStaffAccountPage() {
//     const { toast } = useToast();
//     const [showPwdModal, setShowPwdModal] = useState<string | null>(null);
//     const { staffRolesQuery, statesQuery, createStaffMutation, createMetadataMutation } = useStaffAccount();

//     const {
//         register,
//         handleSubmit,
//         reset,
//         formState: { errors },
//     } = useForm<StaffFormValues>({
//         resolver: zodResolver(staffSchema),
//         defaultValues: { role: "USER" },
//     });

//     const onSubmit = (data: StaffFormValues) => {
//         createStaffMutation.mutate(
//             {
//                 user: {
//                     fullName: data.fullName,
//                     email: data.email,
//                     phoneNumber: data.phoneNumber,
//                     role: data.role,
//                 },
//                 staffRoleId: data.staffRoleId,
//                 stateId: data.stateId,
//             },
//             {
//                 onSuccess: (res) => {
//                     setShowPwdModal(res.user.tempPassword);
//                     reset();
//                     toast({
//                         title: "Success",
//                         description: "Staff account has been created successfully.",
//                     });
//                 },
//             },
//         );
//     };

//     return (
//         <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-slate-900">
//             {/* Shadcn Toaster (Positioning is handled by your ToastViewport) */}
//             <Toaster />

//             <div className="max-w-350 mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
//                 {/* LEFT: MAIN STAFF FORM */}
//                 <div className="lg:col-span-8">
//                     <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden transition-all">
//                         <div className="p-8 border-b border-slate-100 bg-linear-to-r from-white to-slate-50 flex items-center gap-4">
//                             <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
//                                 <UserPlus size={24} />
//                             </div>
//                             <div>
//                                 <h1 className="text-2xl font-black tracking-tight">Staff Registration</h1>
//                                 <p className="text-slate-500 text-sm font-medium">Create employee accounts and assign regional profiles.</p>
//                             </div>
//                         </div>

//                         <form onSubmit={handleSubmit(onSubmit)} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
//                             <FormField
//                                 label="Full Name"
//                                 error={errors.fullName}
//                                 register={register("fullName")}
//                                 placeholder="Adewale Johnson"
//                             />
//                             <FormField label="Work Email" error={errors.email} register={register("email")} placeholder="name@stecam.com" />

//                             <div className="flex flex-col gap-2">
//                                 <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
//                                     <ShieldCheck size={14} /> System Permissions
//                                 </label>
//                                 <select
//                                     {...register("role")}
//                                     className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-semibold cursor-pointer"
//                                 >
//                                     <option value="USER">User (Standard)</option>
//                                     <option value="ADMIN">Administrator</option>
//                                     <option value="SUPER_ADMIN">Super Admin</option>
//                                 </select>
//                             </div>

//                             <FormField label="Phone Number" register={register("phoneNumber")} placeholder="+234..." />

//                             <div className="flex flex-col gap-2">
//                                 <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
//                                     <Briefcase size={14} /> Job Role
//                                 </label>
//                                 <select
//                                     {...register("staffRoleId")}
//                                     className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:border-indigo-500 font-semibold cursor-pointer"
//                                 >
//                                     <option value="">Select Job Role...</option>
//                                     {staffRolesQuery.data?.map((r: any) => (
//                                         <option key={r.id} value={r.id}>
//                                             {r.name}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 {errors.staffRoleId && (
//                                     <span className="text-[10px] text-red-500 font-bold uppercase">{errors.staffRoleId.message}</span>
//                                 )}
//                             </div>

//                             <div className="flex flex-col gap-2">
//                                 <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
//                                     <MapPin size={14} /> Assigned State
//                                 </label>
//                                 <select
//                                     {...register("stateId")}
//                                     className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:border-indigo-500 font-semibold cursor-pointer"
//                                 >
//                                     <option value="">Select State...</option>
//                                     {statesQuery.data?.map((s: any) => (
//                                         <option key={s.id} value={s.id}>
//                                             {s.name}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 {errors.stateId && (
//                                     <span className="text-[10px] text-red-500 font-bold uppercase">{errors.stateId.message}</span>
//                                 )}
//                             </div>

//                             <button
//                                 disabled={createStaffMutation.isPending}
//                                 className="md:col-span-2 mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-black py-4.5 rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 uppercase tracking-widest text-sm active:scale-[0.98] cursor-pointer"
//                             >
//                                 {createStaffMutation.isPending ? (
//                                     <Loader2 className="animate-spin" size={20} />
//                                 ) : (
//                                     <>
//                                         Register Staff <CheckCircle2 size={18} />
//                                     </>
//                                 )}
//                             </button>
//                         </form>
//                     </div>
//                 </div>

//                 {/* RIGHT: QUICK MANAGEMENT */}
//                 <div className="lg:col-span-4 lg:sticky lg:top-10 space-y-6">
//                     <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
//                         <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-4">
//                             <Settings2 className="text-indigo-600" size={20} />
//                             <h2 className="font-black text-slate-900 uppercase tracking-tight text-xs">Quick Management</h2>
//                         </div>

//                         <div className="space-y-12">
//                             <QuickCreateSection
//                                 type="role"
//                                 title="Create Job Role"
//                                 desc="Code is optional; system will auto-generate if blank."
//                                 icon={<Briefcase size={16} className="text-slate-400" />}
//                                 onSubmit={(payload: any) => createMetadataMutation.mutate({ type: "role", ...payload })}
//                                 loading={createMetadataMutation.isPending}
//                             />

//                             <div className="h-px bg-slate-100" />

//                             <QuickCreateSection
//                                 type="state"
//                                 title="Register State"
//                                 desc="Provide name; system handles regional codes."
//                                 icon={<MapPin size={16} className="text-slate-400" />}
//                                 onSubmit={(payload: any) => createMetadataMutation.mutate({ type: "state", ...payload })}
//                                 loading={createMetadataMutation.isPending}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* SUCCESS MODAL */}
//             {showPwdModal && <PasswordModal password={showPwdModal} onClose={() => setShowPwdModal(null)} toast={toast} />}
//         </div>
//     );
// }

// /* --- SUB-COMPONENTS --- */

// function FormField({ label, error, register, placeholder }: any) {
//     return (
//         <div className="flex flex-col gap-2">
//             <label className="text-xs font-bold text-slate-950 uppercase tracking-widest">{label}</label>
//             <input
//                 {...register}
//                 placeholder={placeholder}
//                 className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/30 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-semibold placeholder:text-slate-300"
//             />
//             {error && <span className="text-[10px] text-red-500 font-bold uppercase">{error.message}</span>}
//         </div>
//     );
// }

// function QuickCreateSection({ type, title, desc, icon, onSubmit, loading }: any) {
//     const [name, setName] = useState("");
//     const [code, setCode] = useState("");

//     const handleAction = () => {
//         if (!name) return;
//         const payload = type === "role" ? { name, code: code || undefined } : { name };
//         onSubmit(payload);
//         setName("");
//         setCode("");
//     };

//     return (
//         <div className="space-y-5">
//             <div>
//                 <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
//                     {icon} {title}
//                 </h3>
//                 <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">{desc}</p>
//             </div>

//             <div className="space-y-3">
//                 <div className={`grid ${type === "role" ? "grid-cols-3" : "grid-cols-1"} gap-3`}>
//                     <input
//                         value={name}
//                         onChange={(e) => setName(e.target.value)}
//                         placeholder={type === "role" ? "Role Name" : "State Name"}
//                         className={`${type === "role" ? "col-span-2" : ""} px-4 py-3 text-xs rounded-xl border border-slate-100 bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold`}
//                     />
//                     {type === "role" && (
//                         <input
//                             value={code}
//                             onChange={(e) => setCode(e.target.value)}
//                             placeholder="Code"
//                             maxLength={4}
//                             className="px-2 py-3 text-xs rounded-xl border border-slate-100 bg-slate-50 outline-none focus:border-indigo-500 uppercase font-mono text-center font-bold"
//                         />
//                     )}
//                 </div>

//                 <button
//                     onClick={handleAction}
//                     disabled={loading || !name}
//                     className="w-full py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
//                 >
//                     {loading ? (
//                         <Loader2 size={14} className="animate-spin" />
//                     ) : (
//                         <>
//                             <Plus size={14} /> Save {type}
//                         </>
//                     )}
//                 </button>
//             </div>
//         </div>
//     );
// }

// function PasswordModal({ password, onClose, toast }: any) {
//     const copyToClipboard = () => {
//         navigator.clipboard.writeText(password);
//         toast({
//             title: "Copied!",
//             description: "Temporary password copied to clipboard.",
//         });
//     };

//     return (
//         <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center z-100 p-6 animate-in fade-in duration-300">
//             <div className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl relative border border-slate-100">
//                 <button
//                     onClick={onClose}
//                     className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors cursor-pointer"
//                 >
//                     <X size={24} />
//                 </button>
//                 <div className="text-center">
//                     <div className="inline-flex p-4 bg-green-50 text-green-600 rounded-2xl mb-6">
//                         <CheckCircle2 size={32} />
//                     </div>
//                     <h2 className="text-3xl font-black text-slate-900 tracking-tight">Onboarding Success</h2>
//                     <p className="text-sm text-slate-500 mt-4 font-medium leading-relaxed px-4">
//                         User created successfully. Copy this temporary password for the employee.
//                     </p>

//                     <div className="my-10 group relative cursor-pointer" onClick={copyToClipboard}>
//                         <div className="p-8 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl group-hover:border-indigo-400 transition-colors">
//                             <span className="text-4xl font-mono font-black text-indigo-600 tracking-[0.25em] uppercase leading-none">
//                                 {password}
//                             </span>
//                         </div>
//                         <div className="mt-4 flex items-center justify-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
//                             <Copy size={12} /> Click to copy password
//                         </div>
//                     </div>

//                     <button
//                         onClick={onClose}
//                         className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 cursor-pointer"
//                     >
//                         Done, Back to Dashboard
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, UserPlus, ShieldCheck, MapPin, Briefcase, Plus, CheckCircle2, Copy, Info } from "lucide-react";

import { useStaffAccount } from "@/hooks/useStaffAccount";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

const staffSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phoneNumber: z.string().optional(),
    role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]),
    staffRoleId: z.string().min(1, "Job role is required"),
    stateId: z.string().min(1, "State is required"),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export default function CreateStaffAccountPage() {
    const { toast } = useToast();
    const [showPwdModal, setShowPwdModal] = useState<string | null>(null);
    const [newRoleName, setNewRoleName] = useState("");

    // Using your updated hook data
    const { roles, states, createStaff, createRole, isSubmitting } = useStaffAccount();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<StaffFormValues>({
        resolver: zodResolver(staffSchema),
        defaultValues: { role: "USER" },
    });

    const onSubmit = (data: StaffFormValues) => {
        createStaff.mutate(
            {
                // Nest the identity fields inside 'user' to match the Payload type
                user: {
                    fullName: data.fullName,
                    email: data.email,
                    phoneNumber: data.phoneNumber,
                    role: data.role,
                },
                staffRoleId: data.staffRoleId,
                stateId: data.stateId,
            },
            {
                onSuccess: (res) => {
                    setShowPwdModal(res.user.tempPassword);
                    reset();
                    toast({ title: "Success", description: "Staff account created successfully." });
                },
                onError: (error: any) => {
                    // 1. Dig into the Axios error object
                    const responseData = error.response?.data;

                    // 2. NestJS puts the message in response.data.message
                    // It could be a string or an array of strings
                    const rawMessage = responseData?.message || "Something went wrong";

                    // 3. Flatten it so the Toast can display it
                    const displayMessage = Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage;

                    toast({
                        variant: "destructive",
                        title: "Error Creating Account",
                        description: String(displayMessage), // Force it to be a string
                    });
                },
            },
        );
    };

    const handleAddRole = () => {
        if (!newRoleName.trim()) return;
        createRole.mutate(
            { name: newRoleName },
            {
                onSuccess: () => setNewRoleName(""),
            },
        );
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 lg:p-12 font-sans text-slate-900">
            <Toaster />

            {/* Standard Desktop Max Width */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT: MAIN STAFF FORM (8/12 Columns) */}
                <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">Staff Registration</h1>
                            <p className="text-slate-500 text-xs font-medium">Assign regional profiles and permissions.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            label="Full Name"
                            error={errors.fullName}
                            register={register("fullName")}
                            placeholder="Adewale Johnson"
                        />
                        <FormField label="Work Email" error={errors.email} register={register("email")} placeholder="name@stecam.com" />

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={14} /> System Permissions
                            </label>
                            <select
                                {...register("role")}
                                className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold outline-none focus:border-indigo-500 transition-all"
                            >
                                <option value="USER">User (Standard)</option>
                                <option value="ADMIN">Administrator</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                            </select>
                        </div>

                        <FormField label="Phone Number" register={register("phoneNumber")} placeholder="+234..." />

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={14} /> Job Role
                            </label>
                            <select
                                {...register("staffRoleId")}
                                className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold outline-none focus:border-indigo-500 transition-all"
                            >
                                <option value="">Select Job Role...</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            {errors.staffRoleId && <span className="text-[10px] text-red-500 font-bold">{errors.staffRoleId.message}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} /> Assigned State
                            </label>
                            <select
                                {...register("stateId")}
                                className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold outline-none focus:border-indigo-500 transition-all"
                            >
                                <option value="">Select State...</option>
                                {states.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            {errors.stateId && <span className="text-[10px] text-red-500 font-bold">{errors.stateId.message}</span>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="md:col-span-2 mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Complete Registration"}
                        </button>
                    </form>
                </div>

                {/* RIGHT: METADATA & UTILS (4/12 Columns) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Add New Role Card */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Plus size={16} className="text-indigo-600" /> Manage Job Roles
                        </h2>
                        <div className="flex gap-2">
                            <input
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="e.g. Project Manager"
                                className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-indigo-500"
                            />
                            <button
                                onClick={handleAddRole}
                                disabled={createRole.isPending}
                                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="mt-4 max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {roles.map((role) => (
                                <div
                                    key={role.id}
                                    className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex justify-between"
                                >
                                    {role.name}
                                    <span className="text-indigo-600 opacity-60">{role.code}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Regional Info Card */}
                    <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
                        <div className="flex items-center gap-2 mb-3 opacity-80">
                            <Info size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Regional Sync</span>
                        </div>
                        <p className="text-xs leading-relaxed text-indigo-100">
                            The system is currently synced with <strong>{states.length}</strong> Nigerian states. States are managed via
                            system seeds for data integrity.
                        </p>
                    </div>
                </div>
            </div>

            {/* TEMP PASSWORD MODAL */}
            {showPwdModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Credentials Generated</h3>
                            <p className="text-xs text-slate-500 mt-2">
                                Copy this temporary password for the staff. It will expire after their first login.
                            </p>

                            <div className="mt-6 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-between group">
                                <code className="text-xl font-black text-indigo-600 tracking-widest">{showPwdModal}</code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(showPwdModal);
                                        toast({ title: "Copied", description: "Password copied to clipboard" });
                                    }}
                                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                            <button
                                onClick={() => setShowPwdModal(null)}
                                className="w-full mt-6 bg-slate-900 text-white text-xs font-bold py-3 rounded-xl"
                            >
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FormField({ label, error, register, placeholder }: any) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
            <input
                {...register}
                placeholder={placeholder}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:border-indigo-500 transition-all"
            />
            {error && <span className="text-[10px] text-red-500 font-bold">{error.message}</span>}
        </div>
    );
}
