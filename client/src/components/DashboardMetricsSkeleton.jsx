import MetricCardSkeleton from "./MetricCardSkeleton";

/**
 * DashboardMetricsSkeleton Component
 * Full skeleton loader displayed while dashboard metrics and analytical data are fetched from the database.
 */
export const DashboardMetricsSkeleton = () => {
  return (
    <div className="space-y-8 pb-10 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/60 shadow-xs">
        <div className="space-y-2.5">
          <div className="h-7 bg-slate-300 dark:bg-slate-700 rounded-lg w-64"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded-md w-96 max-w-full"></div>
        </div>
        <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-xl w-36 self-end sm:self-auto"></div>
      </div>

      {/* 4-Column Top Metric Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Analytical Visualizers Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Skeleton */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/50">
            <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded-md w-48"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-24"></div>
          </div>
          <div className="h-64 bg-slate-100 dark:bg-slate-700/40 rounded-xl flex items-end p-4 gap-3">
            <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-t-md h-36"></div>
            <div className="flex-1 bg-slate-300 dark:bg-slate-500 rounded-t-md h-48"></div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-t-md h-28"></div>
            <div className="flex-1 bg-slate-300 dark:bg-slate-500 rounded-t-md h-52"></div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-t-md h-40"></div>
          </div>
        </div>

        {/* Side Ratio Card Skeleton */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded-md w-40"></div>
          <div className="w-40 h-40 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800"></div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-full"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-4/5"></div>
          </div>
        </div>
      </div>

      {/* Lower Dashboard Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Table Skeleton */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/50">
            <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded-md w-44"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-20"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-700/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                  <div className="space-y-1.5">
                    <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded-md w-32"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-48"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-16 h-7 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                  <div className="w-16 h-7 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Summary / Status Skeleton */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded-md w-36"></div>
          <div className="space-y-3 pt-2">
            <div className="h-12 bg-slate-100 dark:bg-slate-700/40 rounded-xl"></div>
            <div className="h-12 bg-slate-100 dark:bg-slate-700/40 rounded-xl"></div>
            <div className="h-12 bg-slate-100 dark:bg-slate-700/40 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMetricsSkeleton;
