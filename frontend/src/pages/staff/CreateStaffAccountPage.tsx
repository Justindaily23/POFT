import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserPlus, ShieldCheck, MapPin, Briefcase, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner"; // Changed import to sonner

import { FormField } from "@/components/staff/FormField";
import { FormSelect } from "@/components/staff/FormSelect";
import { StaffSidebar } from "@/components/staff/StaffSidebar";
import { PasswordModal } from "@/components/staff/PasswordModal";

// Hooks & Utils
import { useStaffAccount } from "@/hooks/staff/useStaffAccount";

// 1. Define the Schema
const staffSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]),
  staffRoleId: z.string().min(1, "Job role is required"),
  stateId: z.string().min(1, "State is required"),
});

type StaffFormValues = z.infer<typeof staffSchema>;

const PERMISSION_OPTIONS = [
  { id: "USER", name: "User (Standard)" },
  { id: "ADMIN", name: "Administrator" },
  { id: "SUPER_ADMIN", name: "Super Admin" },
];

export default function CreateStaffAccountPage() {
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    staffId: string;
    pass: string;
  } | null>(null);
  const [newRoleName, setNewRoleName] = useState("");

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
          setGeneratedCredentials({
            staffId: res.staffProfile.staffId,
            pass: res.user.tempPassword,
          });
          reset();
          toast.success("Success", {
            description: `${res.message || "Staff account created successfully."}`,
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
        onSuccess: () => {
          setNewRoleName("");
          toast.success("Role added successfully.");
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-12 font-sans text-slate-900">
      {/* 
         Pro Tip: If you have <Toaster /> in your main layout, 
         you can remove it from here to avoid duplicates.
      */}
      <Toaster richColors position="top-right" />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg">
              <UserPlus size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Staff Registration</h1>
              <p className="text-slate-500 text-xs font-medium">
                Assign regional profiles and permissions.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <FormField
              label="Full Name"
              error={errors.fullName}
              register={register("fullName")}
              placeholder="Adewale Johnson"
            />
            <FormField
              label="Work Email"
              error={errors.email}
              register={register("email")}
              placeholder="name@stecam.com"
            />

            <FormSelect
              label="System Permissions"
              icon={<ShieldCheck size={14} />}
              register={register("role")}
              options={PERMISSION_OPTIONS}
            />
            <FormField
              label="Phone Number"
              register={register("phoneNumber")}
              placeholder="+234..."
            />

            <FormSelect
              label="Job Role"
              icon={<Briefcase size={14} />}
              error={errors.staffRoleId}
              register={register("staffRoleId")}
              options={roles}
            />
            <FormSelect
              label="Assigned State"
              icon={<MapPin size={14} />}
              error={errors.stateId}
              register={register("stateId")}
              options={states}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="md:col-span-2 mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3.5 rounded-xl transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Complete Registration"}
            </button>
          </form>
        </div>

        <StaffSidebar
          roles={roles}
          newRoleName={newRoleName}
          setNewRoleName={setNewRoleName}
          handleAddRole={handleAddRole}
          isCreatingRole={createRole.isPending}
          stateCount={states.length}
        />
      </div>

      {generatedCredentials && (
        <PasswordModal
          staffId={generatedCredentials.staffId}
          password={generatedCredentials.pass}
          onClose={() => setGeneratedCredentials(null)}
        />
      )}
    </div>
  );
}
