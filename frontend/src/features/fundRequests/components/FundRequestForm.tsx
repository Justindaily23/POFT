import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DollarSign, Landmark, Loader2, AlertCircle } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateFundRequestInput } from "../schema";
import type { POLineData } from "../fundRequest.type";

interface Props {
  form: UseFormReturn<CreateFundRequestInput>;
  selectedPOLine: POLineData | null;
  isOverLimit: boolean;
  isPending: boolean;
  onSubmit: (data: CreateFundRequestInput) => void;
}

export default function FundRequestForm({
  form,
  selectedPOLine,
  isOverLimit,
  isPending,
  onSubmit,
}: Props) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-linear-to-r from-slate-700 to-slate-900" />
          <CardHeader className="p-4 sm:p-6 pb-4">
            <CardTitle className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-blue-600" />
              New Fund Request
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-0 space-y-5">
            {/* Amount */}
            <FormField
              control={form.control}
              name="requestedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-black uppercase text-slate-600 tracking-widest flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    Requested Amount (₦) *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        className={`h-16 bg-slate-50 border-2 rounded-xl font-black text-2xl pl-4 pr-4 ${
                          isOverLimit
                            ? "border-red-300 text-red-600 focus-visible:ring-red-500"
                            : "border-slate-200 text-blue-600 focus-visible:ring-blue-500"
                        }`}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                        }
                      />
                      {isOverLimit && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <AlertCircle className="h-6 w-6 text-red-500" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {isOverLimit && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Amount exceeds available balance by ₦
                      {Math.abs(
                        (selectedPOLine?.remainingBalance || 0) - (field.value || 0),
                      ).toLocaleString()}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Purpose */}
            <FormField
              control={form.control}
              name="requestPurpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-black uppercase text-slate-600 tracking-widest">
                    Purpose / Justification *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe why you need these funds and how they will be used..."
                      className="min-h-30 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium p-4 resize-none focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
                      {...field}
                      ref={null} // <--- THIS SILENCES THE WARNING
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DUID for manual entry */}
            {!selectedPOLine && (
              <FormField
                control={form.control}
                name="duid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase text-slate-600 tracking-widest">
                      Site ID (DUID) *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., ABJ-5G-001"
                        className="h-12 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold focus-visible:ring-2 focus-visible:ring-blue-500"
                        {...field}
                        ref={null} // <--- THIS SILENCES THE WARNING
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={
                  isPending || (isOverLimit && !(selectedPOLine?.isNegotiationRequired ?? true))
                }
                className="w-full h-16 rounded-xl bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-black text-base shadow-xl shadow-blue-300/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    <Landmark className="h-5 w-5 mr-2" />
                    {selectedPOLine?.isNegotiationRequired
                      ? "Submit for Negotiation"
                      : "Submit Request"}
                  </>
                )}
              </Button>

              {!selectedPOLine && (
                <p className="text-xs text-slate-500 text-center mt-3">
                  💡 Search for a site above to auto-fill details, or enter DUID manually for new
                  projects
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
