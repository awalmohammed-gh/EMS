/**
 * MetricCardSkeleton Component
 * Reusable pulse shimmer placeholder for individual metric cards
 */
export const MetricCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1 pr-4">
          {/* Label skeleton */}
          <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-md w-28"></div>
          {/* Number stat skeleton */}
          <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded-lg w-20"></div>
          {/* Subtext skeleton */}
          <div className="h-2.5 bg-slate-200 dark:bg-slate-700/70 rounded-md w-36"></div>
        </div>
        {/* Icon square placeholder */}
        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700/80 shrink-0"></div>
      </div>
    </div>
  );
};

export default MetricCardSkeleton;
