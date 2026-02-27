export const getAgingStatus = (flag: string) => {
  const map = {
    GREEN: {
      dot: "bg-emerald-500",
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    WARNING: {
      dot: "bg-amber-500",
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
    RED: { dot: "bg-rose-500", text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  };
  return (
    map[flag as keyof typeof map] || {
      dot: "bg-slate-400",
      text: "text-slate-500",
      bg: "bg-slate-50",
      border: "border-slate-100",
    }
  );
};

export const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "Pending";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
