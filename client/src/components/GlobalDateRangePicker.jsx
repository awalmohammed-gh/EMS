import { useState, useMemo } from "react";
import {
  CalendarDays,
  RotateCcw,
  Check,
  Filter,
} from "lucide-react";

/**
 * Reusable Global Date-Range Picker Component
 * Provides rapid preset selection (Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, All Time)
 * and custom Start / End date range inputs that strictly bind to tables, charts, and metrics.
 */
const GlobalDateRangePicker = ({
  startDate = "",
  endDate = "",
  preset = "all",
  onRangeChange = () => {},
  className = "",
  title = "Date Range Filter",
  showPresets = true,
}) => {
  const [customStart, setCustomStart] = useState(startDate || "");
  const [customEnd, setCustomEnd] = useState(endDate || "");

  // Presets definition
  const presets = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "week", label: "Last 7 Days" },
    { id: "30_days", label: "Last 30 Days" },
    { id: "month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "quarter", label: "Last 90 Days" },
    { id: "year", label: "Year to Date" },
    { id: "custom", label: "Custom Range" },
  ];

  const computePresetDates = (presetId) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    switch (presetId) {
      case "all":
        return { startDate: "", endDate: "", preset: "all" };

      case "today":
        return { startDate: todayStr, endDate: todayStr, preset: "today" };

      case "yesterday": {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        const yStr = y.toISOString().split("T")[0];
        return { startDate: yStr, endDate: yStr, preset: "yesterday" };
      }

      case "week": {
        const w = new Date(now);
        w.setDate(now.getDate() - 6);
        return {
          startDate: w.toISOString().split("T")[0],
          endDate: todayStr,
          preset: "week",
        };
      }

      case "30_days": {
        const d = new Date(now);
        d.setDate(now.getDate() - 29);
        return {
          startDate: d.toISOString().split("T")[0],
          endDate: todayStr,
          preset: "30_days",
        };
      }

      case "month": {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate: firstDay.toISOString().split("T")[0],
          endDate: lastDay.toISOString().split("T")[0],
          preset: "month",
        };
      }

      case "last_month": {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: firstDayLastMonth.toISOString().split("T")[0],
          endDate: lastDayLastMonth.toISOString().split("T")[0],
          preset: "last_month",
        };
      }

      case "quarter": {
        const q = new Date(now);
        q.setDate(now.getDate() - 89);
        return {
          startDate: q.toISOString().split("T")[0],
          endDate: todayStr,
          preset: "quarter",
        };
      }

      case "year": {
        const firstDayYear = new Date(now.getFullYear(), 0, 1);
        return {
          startDate: firstDayYear.toISOString().split("T")[0],
          endDate: todayStr,
          preset: "year",
        };
      }

      default:
        return { startDate: customStart, endDate: customEnd, preset: "custom" };
    }
  };

  const handleSelectPreset = (presetId) => {
    if (presetId === "custom") {
      onRangeChange({
        startDate: customStart,
        endDate: customEnd,
        preset: "custom",
      });
      return;
    }
    const computed = computePresetDates(presetId);
    setCustomStart(computed.startDate);
    setCustomEnd(computed.endDate);
    onRangeChange(computed);
  };

  const handleCustomStartChange = (val) => {
    setCustomStart(val);
    onRangeChange({
      startDate: val,
      endDate: customEnd || val,
      preset: "custom",
    });
  };

  const handleCustomEndChange = (val) => {
    setCustomEnd(val);
    onRangeChange({
      startDate: customStart || val,
      endDate: val,
      preset: "custom",
    });
  };

  const handleClear = () => {
    setCustomStart("");
    setCustomEnd("");
    onRangeChange({ startDate: "", endDate: "", preset: "all" });
  };

  // Human-readable active period description
  const activeLabel = useMemo(() => {
    if (!startDate && !endDate) return "All Time";
    if (startDate && endDate && startDate === endDate) {
      const nowStr = new Date().toISOString().split("T")[0];
      if (startDate === nowStr) return "Today";
      return new Date(startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (startDate && endDate) {
      const s = new Date(startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const e = new Date(endDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${s} – ${e}`;
    }
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return "Custom Range";
  }, [startDate, endDate]);

  const hasActiveFilter = Boolean(startDate || endDate || (preset && preset !== "all"));

  return (
    <div
      id="global-date-range-picker"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs transition-all ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Active Selection Summary & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#002185] dark:text-blue-400 font-semibold shadow-xs">
            <CalendarDays className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {title}
              </span>
              {hasActiveFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3" />
                  Active Filter
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-[#002185] dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
              <span>Showing:</span>
              <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                {activeLabel}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Date Inputs & Clear Action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Start Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#002185]/20 focus-within:border-[#002185]">
            <span className="text-[10px] font-bold text-slate-400 uppercase">From:</span>
            <input
              type="date"
              id="global-range-start-date"
              value={startDate || customStart}
              onChange={(e) => handleCustomStartChange(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              aria-label="Start date"
            />
          </div>

          <span className="text-slate-400 text-xs font-medium hidden sm:inline">to</span>

          {/* End Date */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#002185]/20 focus-within:border-[#002185]">
            <span className="text-[10px] font-bold text-slate-400 uppercase">To:</span>
            <input
              type="date"
              id="global-range-end-date"
              value={endDate || customEnd}
              onChange={(e) => handleCustomEndChange(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              aria-label="End date"
            />
          </div>

          {/* Reset / Clear Button */}
          {hasActiveFilter && (
            <button
              id="global-range-reset-btn"
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
              title="Reset date range filter to All Time"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Preset Badges */}
      {showPresets && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Presets:
          </span>
          {presets.map((p) => {
            const isActive = preset === p.id;
            return (
              <button
                key={p.id}
                id={`date-preset-${p.id}`}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? "bg-[#002185] dark:bg-blue-600 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GlobalDateRangePicker;
