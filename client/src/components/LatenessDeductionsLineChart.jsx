import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Clock,
  TrendingDown,
  Calendar,
  AlertCircle,
  RefreshCw,
  Award,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { getMonthlyLatenessAnalytics } from "../apis/fontApis";

// Currency formatter for Ghana Cedis
const formatGHS = (amount) => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// Custom interactive Tooltip conforming to Anti-Slop principles
const CustomLineTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload || {};
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-3.5 rounded-xl shadow-md dark:shadow-none text-xs space-y-2 min-w-[210px]">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
        <span className="font-bold text-slate-900 dark:text-white text-xs">
          {row.label || label}
        </span>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {row.date}
        </span>
      </div>

      <div className="space-y-1.5 pt-0.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {entry.name}:
              </span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {formatGHS(entry.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Late Incidents:</span>
        <span className="font-semibold text-amber-600 dark:text-amber-400">
          {row.lateCount || 0} {row.lateCount === 1 ? "clock-in" : "clock-ins"}
        </span>
      </div>

      {row.waivedDeductions > 0 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Excused / Waived:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatGHS(row.waivedDeductions)}
          </span>
        </div>
      )}
    </div>
  );
};

export const LatenessDeductionsLineChart = ({
  employeeId = null,
  title = "Monthly Lateness Deductions Trend",
  subtitle = "Daily and cumulative lateness penalty deductions over the current payroll month",
}) => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [viewMode, setViewMode] = useState("both"); // 'both' | 'cumulative' | 'daily'
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const params = { month: selectedMonth };
      if (employeeId) params.employeeId = employeeId;

      const res = await getMonthlyLatenessAnalytics(params);
      if (res?.data?.success) {
        setData(res.data.dailySeries || []);
        setSummary(res.data.summary || null);
      } else {
        setData([]);
      }
    } catch (err) {
      console.warn("Failed to fetch monthly lateness deductions analytics:", err);
      setIsError(true);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, employeeId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Navigate between months
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const prev = new Date(year, month - 2, 1);
    setSelectedMonth(
      `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const next = new Date(year, month, 1);
    setSelectedMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return selectedMonth === currentKey;
  }, [selectedMonth]);

  // Max deduction value for scaling Y-axis safely
  const maxYValue = useMemo(() => {
    if (!data.length) return 100;
    const maxVal = Math.max(
      ...data.map((d) =>
        viewMode === "daily"
          ? d.dailyDeductions
          : viewMode === "cumulative"
          ? d.cumulativeDeductions
          : Math.max(d.cumulativeDeductions, d.dailyDeductions)
      )
    );
    return Math.max(10, Math.ceil(maxVal * 1.15));
  }, [data, viewMode]);

  return (
    <motion.div
      id="lateness-deductions-line-chart-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-white dark:bg-[#111927] border border-slate-200/70 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-none space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h3>
                {isCurrentMonth && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                    Current Payroll Month
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Month Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setViewMode("both")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "both"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-none"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cumulative")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "cumulative"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-none"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Cumulative
            </button>
            <button
              type="button"
              onClick={() => setViewMode("daily")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "daily"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-none"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Daily
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-1 border border-slate-200/70 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2 min-w-[90px] text-center">
              {summary?.month || selectedMonth}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition cursor-pointer"
            >
              Today
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={isLoading}
            title="Refresh chart data"
            className="p-2 rounded-xl border border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 shadow-none"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Deductions */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Deductions
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1.5">
            {formatGHS(summary?.totalLatenessDeductions || 0)}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            For {summary?.month || "current month"}
          </span>
        </div>

        {/* Late Incidents */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Late Incidents
            </span>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1.5">
            {summary?.totalLateIncidents || 0}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {summary?.totalLateMinutes || 0} total delay mins
          </span>
        </div>

        {/* Average per Late */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Avg / Incident
            </span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1.5">
            {formatGHS(summary?.averageDeductionPerLate || 0)}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Mean penalty impact
          </span>
        </div>

        {/* Peak Deduction Day */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Highest Day
            </span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1.5">
            {formatGHS(summary?.highestDeductionDay?.amount || 0)}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {summary?.highestDeductionDay?.amount > 0
              ? summary?.highestDeductionDay?.label || `Day ${summary?.highestDeductionDay?.day}`
              : "No deductions recorded"}
          </span>
        </div>
      </div>

      {/* Recharts Line Chart Container */}
      <div className="w-full">
        {isLoading ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Loading lateness deductions timeline...</p>
          </div>
        ) : isError ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200/70 dark:border-slate-800 rounded-xl">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Unable to load lateness deductions
            </p>
            <button
              onClick={fetchAnalytics}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200/70 dark:border-slate-800 rounded-xl">
            <ShieldCheck className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Zero Lateness Deductions
            </p>
            <p className="text-xs text-slate-500">
              No lateness penalties have been applied for this payroll month.
            </p>
          </div>
        ) : (
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.15}
                  vertical={false}
                />
                <XAxis
                  dataKey="dayStr"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#475569", opacity: 0.3 }}
                  tickFormatter={(val) => `${val}`}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, maxYValue]}
                  tickFormatter={(val) => `GH₵${val}`}
                />
                <Tooltip content={<CustomLineTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: "12px",
                    paddingBottom: "12px",
                  }}
                />

                {/* Cumulative Total Line */}
                {(viewMode === "both" || viewMode === "cumulative") && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeDeductions"
                    name="Cumulative Total (GH₵)"
                    stroke="#002185"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 5,
                      stroke: "#002185",
                      strokeWidth: 2,
                      fill: "#FFFFFF",
                    }}
                  />
                )}

                {/* Daily Deductions Line */}
                {(viewMode === "both" || viewMode === "daily") && (
                  <Line
                    type="monotone"
                    dataKey="dailyDeductions"
                    name="Daily Deductions (GH₵)"
                    stroke="#D97706"
                    strokeWidth={2}
                    strokeDasharray={viewMode === "both" ? "4 4" : undefined}
                    dot={{
                      r: 3,
                      fill: "#D97706",
                      strokeWidth: 0,
                    }}
                    activeDot={{
                      r: 5,
                      stroke: "#D97706",
                      strokeWidth: 2,
                      fill: "#FFFFFF",
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom Insights Footnote */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>Cumulative Line tracks total lateness penalty deductions incurred month-to-date.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Dashed Gold Line captures specific daily check-in penalty occurrences.</span>
        </div>
      </div>
    </motion.div>
  );
};

export default LatenessDeductionsLineChart;
