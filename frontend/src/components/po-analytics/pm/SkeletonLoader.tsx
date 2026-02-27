export const SkeletonLoader: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-32 w-full bg-white border border-slate-100 animate-pulse rounded-xl shadow-sm"
      />
    ))}
  </div>
);
