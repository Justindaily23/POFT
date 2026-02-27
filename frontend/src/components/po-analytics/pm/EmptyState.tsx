export const EmptyState: React.FC = () => (
  <div className="py-24 text-center flex flex-col items-center gap-3 text-slate-400">
    <div className="text-2xl opacity-20">📂</div>
    <p className="text-sm font-bold">No operations found for this selection.</p>
    <p className="text-[10px] uppercase font-black tracking-tighter opacity-50">
      Try clearing filters
    </p>
  </div>
);
