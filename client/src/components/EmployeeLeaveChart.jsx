import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  CalendarCheck,
  CalendarPlus,
  RefreshCw,
  AlertCircle,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getEmployeeLeaveStats, myLeave } from "../apis/fontApis";

// Custom Chart Tooltip declared at module scope
const CustomChartTooltip = ({ active, payload, totalRequests = 0 }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const percentage =
    totalRequests > 0 ? Math.round((item.value / totalRequests) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-3 rounded-xl shadow-lg text-xs space-y-1">
      <div className="font-bold text-[#002185] dark:text-blue-400 flex items-center justify-between gap-2">
        <span>{item.payload.name}</span>
        <span className="text-[10px] text-[#ff5500] font-normal">Click bar to view</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
        <span>Submitted Requests:</span>
        <span className="font-bold text-slate-900 dark:text-white">
          {item.value} {item.value === 1 ? "request" : "requests"}
        </span>
      </div>
      {totalRequests > 0 && (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
          {percentage}% of your total leave requests
        </div>
      )}
    </div>
  );
};

export const EmployeeLeaveChart = ({
  onApplyLeave,
  className = "",
  refreshTrigger = 0,
}) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Modal State for viewing individual category requests
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryLeaves, setCategoryLeaves] = useState([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const [leaveFetchError, setLeaveFetchError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getEmployeeLeaveStats();
      const data = response?.data || {};

      setStats({
        "Annual Leave": Number(data["Annual Leave"]) || 0,
        "Casual Leave": Number(data["Casual Leave"]) || 0,
        "Sick Leave": Number(data["Sick Leave"]) || 0,
        "Maternity/Study": Number(data["Maternity/Study"]) || 0,
        total: Number(data.total) || 0,
      });
    } catch (err) {
      console.error("Error fetching live employee leave stats:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load leave statistics");
      // Default to 0 counts strictly on error - zero mock fallback
      setStats({
        "Annual Leave": 0,
        "Casual Leave": 0,
        "Sick Leave": 0,
        "Maternity/Study": 0,
        total: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshTrigger]);

  // Fetch individual leave records when a category is clicked
  const handleCategoryClick = async (categoryName) => {
    if (!categoryName) return;
    setSelectedCategory(categoryName);
    setIsLoadingLeaves(true);
    setLeaveFetchError(null);

    try {
      const response = await myLeave();
      const list = response?.data?.leaves || [];

      // Filter leaves matching the clicked category
      const filtered = list.filter((leave) => {
        const type = (leave?.leaveType || "").toLowerCase();
        const cat = categoryName.toLowerCase();

        if (cat.includes("annual") && type.includes("annual")) return true;
        if (cat.includes("casual") && type.includes("casual")) return true;
        if (cat.includes("sick") && type.includes("sick")) return true;
        if (
          (cat.includes("maternity") || cat.includes("study")) &&
          (type.includes("maternity") || type.includes("study"))
        ) {
          return true;
        }
        return type === cat;
      });

      setCategoryLeaves(filtered);
    } catch (err) {
      console.error("Error fetching leaves for category modal:", err);
      setLeaveFetchError("Failed to load requests for this category.");
      setCategoryLeaves([]);
    } finally {
      setIsLoadingLeaves(false);
    }
  };

  const closeModal = () => {
    setSelectedCategory(null);
    setCategoryLeaves([]);
    setLeaveFetchError(null);
  };

  const handleApplyClick = () => {
    closeModal();
    if (typeof onApplyLeave === "function") {
      onApplyLeave();
    } else {
      navigate("/employee/dashboard/leave");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const totalRequests = stats?.total || 0;
  const hasRequests =
    totalRequests > 0 ||
    (stats &&
      (stats["Annual Leave"] > 0 ||
        stats["Casual Leave"] > 0 ||
        stats["Sick Leave"] > 0 ||
        stats["Maternity/Study"] > 0));

  // Dynamic Chart Dataset strictly derived from live DB response
  const chartData = stats
    ? [
        {
          name: "Annual Leave",
          count: stats["Annual Leave"] || 0,
          fill: "#002185",
          colorClass: "text-[#002185] bg-[#002185]/10",
        },
        {
          name: "Casual Leave",
          count: stats["Casual Leave"] || 0,
          fill: "#ff5500",
          colorClass: "text-[#ff5500] bg-[#ff5500]/10",
        },
        {
          name: "Sick Leave",
          count: stats["Sick Leave"] || 0,
          fill: "#16A34A",
          colorClass: "text-[#16A34A] bg-[#16A34A]/10",
        },
        {
          name: "Maternity/Study",
          count: stats["Maternity/Study"] || 0,
          fill: "#8B5CF6",
          colorClass: "text-[#8B5CF6] bg-[#8B5CF6]/10",
        },
      ]
    : [];

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case "Pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFFBEB] text-[#F59E0B] border border-[#FDE68A]">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div
        id="employee-requests-by-leave-type-card"
        className={`bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300 flex flex-col justify-between ${className}`}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#002185]/10 dark:bg-blue-500/10 flex items-center justify-center text-[#002185] dark:text-blue-400">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#002185] dark:text-slate-100">
                  Requests by Leave Type
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasRequests && (
                <span className="text-xs bg-[#002185]/10 dark:bg-blue-500/20 text-[#002185] dark:text-blue-300 font-semibold px-2.5 py-1 rounded-full">
                  {totalRequests} Total
                </span>
              )}
              <button
                type="button"
                onClick={fetchStats}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#002185] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                title="Refresh leave statistics"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#ff5500]" : ""}`} />
              </button>
            </div>
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mb-4">
            Breakdown of your submitted time-off requests categorized by policy. <span className="font-medium text-[#002185] dark:text-blue-400">Click any bar to view individual requests.</span>
          </p>
        </div>

        {/* Content Body */}
        {isLoading && !stats ? (
          <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#002185] dark:text-blue-400" />
            <span className="text-xs font-medium">Loading leave statistics...</span>
          </div>
        ) : error && !hasRequests ? (
          <div className="w-full py-8 text-center bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 p-4">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
            <p className="text-xs text-rose-700 dark:text-rose-300 mb-3">{error}</p>
            <button
              type="button"
              onClick={fetchStats}
              className="text-xs font-semibold px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              Retry Sync
            </button>
          </div>
        ) : !hasRequests ? (
          /* Empty State Card: Strictly rendered when 0 leave requests exist in database */
          <div
            id="leave-type-chart-empty-state"
            className="w-full py-8 px-4 text-center rounded-xl bg-[#F8FAFC] dark:bg-slate-800/50 border border-dashed border-[#E2E8F0] dark:border-slate-800 flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center shadow-xs">
              <CalendarPlus className="w-6 h-6 text-[#ff5500]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#002185] dark:text-slate-200">
                No leave requests submitted yet
              </h4>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Your leave request distribution chart will automatically generate once you submit your first time-off application.
              </p>
            </div>
            <button
              type="button"
              onClick={handleApplyClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#002185] hover:bg-[#ff5500] text-white text-xs font-semibold rounded-lg shadow-xs transition-all duration-200 cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Apply for Leave
            </button>
          </div>
        ) : (
          /* Live Recharts Bar Chart */
          <div className="space-y-4">
            <div className="w-full h-56 cursor-pointer">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#94A3B8"
                    fontSize={11}
                    allowDecimals={false}
                    domain={[0, "dataMax + 1"]}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={95}
                  />
                  <Tooltip content={<CustomChartTooltip totalRequests={totalRequests} />} />
                  <Bar
                    dataKey="count"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                    className="cursor-pointer"
                    onClick={(entry) => {
                      if (entry && entry.name) {
                        handleCategoryClick(entry.name);
                      }
                    }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={entry.fill}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleCategoryClick(entry.name)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Metrics Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
              {chartData.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCategoryClick(item.name)}
                  className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-800/80 text-center hover:border-[#002185] dark:hover:border-blue-400 hover:bg-[#002185]/5 transition-all duration-200 cursor-pointer group"
                  title={`View ${item.name} requests`}
                >
                  <div className="flex items-center justify-between text-[10px] text-[#64748B] dark:text-slate-400 group-hover:text-[#002185] transition-colors">
                    <span className="truncate">{item.name}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <span className="text-sm font-bold text-[#002185] dark:text-white block mt-0.5">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Requests Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between bg-[#F8FAFC] dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#002185] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#002185] dark:text-slate-100">
                    {selectedCategory} Requests
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    {categoryLeaves.length} {categoryLeaves.length === 1 ? "record" : "records"} found in database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
              {isLoadingLeaves ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#002185] dark:text-blue-400" />
                  <span className="text-xs font-medium">Loading {selectedCategory} requests...</span>
                </div>
              ) : leaveFetchError ? (
                <div className="py-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 p-4">
                  <AlertCircle className="w-6 h-6 mx-auto text-rose-500 mb-2" />
                  <p className="text-xs text-rose-700 dark:text-rose-300 mb-2">{leaveFetchError}</p>
                  <button
                    type="button"
                    onClick={() => handleCategoryClick(selectedCategory)}
                    className="text-xs font-semibold px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : categoryLeaves.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-dashed border-[#E2E8F0] dark:border-slate-800 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center shadow-xs">
                    <FileText className="w-6 h-6 text-[#94A3B8]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#002185] dark:text-slate-200">
                      No {selectedCategory} requests submitted yet
                    </h4>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      You haven't submitted any time-off applications under this policy category.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyClick}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#002185] hover:bg-[#ff5500] text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    Apply for {selectedCategory}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryLeaves.map((leave, idx) => (
                    <div
                      key={leave._id || idx}
                      className="p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-xs hover:border-[#002185]/30 dark:hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#002185] dark:text-blue-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#ff5500]" />
                            {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F1F5F9] dark:bg-slate-700 text-[#475569] dark:text-slate-300">
                            {leave.totalDays || 1} {Number(leave.totalDays) === 1 ? "day" : "days"}
                          </span>
                        </div>
                        <div>{getStatusBadge(leave.status || "Pending")}</div>
                      </div>

                      {/* Reason */}
                      <div className="text-xs text-[#334155] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-900/60 p-2.5 rounded-lg border border-[#F1F5F9] dark:border-slate-800/80">
                        <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 block mb-0.5 uppercase tracking-wider">
                          Reason for Request:
                        </span>
                        <p className="italic">{leave.reason || "No detailed reason provided"}</p>
                      </div>

                      {/* Admin Remark if present */}
                      {leave.adminRemark && (
                        <div className="mt-2 text-xs text-[#0F172A] dark:text-slate-200 bg-[#FFFBEB] dark:bg-amber-950/20 p-2.5 rounded-lg border border-[#FDE68A] dark:border-amber-900/40">
                          <span className="text-[10px] font-bold text-[#92400E] dark:text-amber-400 block mb-0.5 uppercase tracking-wider">
                            Management Remark:
                          </span>
                          <p>{leave.adminRemark}</p>
                        </div>
                      )}

                      {/* Submission timestamp */}
                      <div className="mt-2 pt-2 border-t border-[#F1F5F9] dark:border-slate-800 text-[10px] text-[#94A3B8] flex items-center justify-between">
                        <span>Submitted: {formatDate(leave.createdAt)}</span>
                        {leave.approvedAt && <span>Processed: {formatDate(leave.approvedAt)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleApplyClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#002185] hover:bg-[#ff5500] text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Apply for New Leave
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-slate-200 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeLeaveChart;

