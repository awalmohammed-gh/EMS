import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  Percent,
  ArrowRight,
} from "lucide-react";

/**
 * Custom Tooltip for Department Distribution Bar Chart
 */
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload || {};
  const activeCount = data.active || 0;
  const inactiveCount = data.inactive || 0;
  const suspendedCount = data.suspended || 0;
  const total = data.total || activeCount + inactiveCount + suspendedCount || 1;
  const activeRatio = Math.round((activeCount / total) * 100);

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xl text-xs space-y-2 min-w-[200px] pointer-events-none">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center gap-1.5 font-bold text-[#002185]">
          <Building2 className="w-3.5 h-3.5 text-[#ff5500]" />
          <span>{label || data.department}</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#002185]/10 text-[#002185]">
          {total} Total Staff
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[#64748B]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
            Active
          </span>
          <span className="font-bold text-[#0F172A]">
            {activeCount}{" "}
            <span className="text-[#94A3B8] font-normal text-[10px]">
              ({Math.round((activeCount / total) * 100)}%)
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[#64748B]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
            Inactive
          </span>
          <span className="font-bold text-[#0F172A]">
            {inactiveCount}{" "}
            <span className="text-[#94A3B8] font-normal text-[10px]">
              ({Math.round((inactiveCount / total) * 100)}%)
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[#64748B]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
            Suspended
          </span>
          <span className="font-bold text-[#0F172A]">
            {suspendedCount}{" "}
            <span className="text-[#94A3B8] font-normal text-[10px]">
              ({Math.round((suspendedCount / total) * 100)}%)
            </span>
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
        <span className="text-[#64748B]">Active Retention Rate</span>
        <span
          className={`font-bold ${
            activeRatio >= 80
              ? "text-[#16A34A]"
              : activeRatio >= 50
              ? "text-[#F59E0B]"
              : "text-[#DC2626]"
          }`}
        >
          {activeRatio}%
        </span>
      </div>
    </div>
  );
};

/**
 * Custom Tooltip for Overall Status Donut Chart
 */
const CustomPieTooltip = ({ active, payload, totalCount }) => {
  if (!active || !payload || !payload.length) return null;

  const entry = payload[0];
  const count = entry.value || 0;
  const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

  return (
    <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-lg text-xs space-y-1 min-w-[150px] pointer-events-none">
      <div className="flex items-center gap-1.5 font-bold">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: entry.payload.fill }}
        ></span>
        <span className="text-[#0F172A]">{entry.name} Status</span>
      </div>
      <div className="flex items-center justify-between text-[#64748B] pt-1">
        <span>Headcount:</span>
        <span className="font-bold text-[#002185]">{count} employees</span>
      </div>
      <div className="flex items-center justify-between text-[#64748B]">
        <span>Share:</span>
        <span className="font-bold text-[#16A34A]">{percentage}% of total</span>
      </div>
    </div>
  );
};

export const DepartmentStatusVisualizer = ({
  departmentDistribution = [],
  employeeStatusDistribution = [],
  totalEmployees = 0,
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("stacked"); // "stacked" | "grouped" | "percent"
  const [visibleStatuses, setVisibleStatuses] = useState({
    active: true,
    inactive: true,
    suspended: true,
  });
  const [selectedDept, setSelectedDept] = useState(null);

  // Default fallback data if empty
  const rawData = useMemo(() => {
    if (departmentDistribution && departmentDistribution.length > 0) {
      return departmentDistribution;
    }
    return [
      { department: "Engineering", active: 5, inactive: 1, suspended: 0, total: 6 },
      { department: "Sales", active: 4, inactive: 1, suspended: 1, total: 6 },
      { department: "Marketing", active: 3, inactive: 1, suspended: 0, total: 4 },
      { department: "Operations", active: 3, inactive: 0, suspended: 1, total: 4 },
      { department: "Human Resources", active: 2, inactive: 0, suspended: 0, total: 2 },
      { department: "Finance", active: 2, inactive: 0, suspended: 0, total: 2 },
    ];
  }, [departmentDistribution]);

  // Aggregate overall status totals
  const statusTotals = useMemo(() => {
    const active = rawData.reduce((acc, curr) => acc + (curr.active || 0), 0);
    const inactive = rawData.reduce((acc, curr) => acc + (curr.inactive || 0), 0);
    const suspended = rawData.reduce((acc, curr) => acc + (curr.suspended || 0), 0);
    const total = active + inactive + suspended;
    return { active, inactive, suspended, total: total || totalEmployees || 1 };
  }, [rawData, totalEmployees]);

  // Pie chart dataset with dynamic counts
  const pieData = useMemo(() => {
    if (
      employeeStatusDistribution &&
      employeeStatusDistribution.length > 0 &&
      employeeStatusDistribution.some((s) => s.value > 0)
    ) {
      return employeeStatusDistribution;
    }
    return [
      { name: "Active", value: statusTotals.active, fill: "#16A34A" },
      { name: "Inactive", value: statusTotals.inactive, fill: "#F59E0B" },
      { name: "Suspended", value: statusTotals.suspended, fill: "#DC2626" },
    ];
  }, [employeeStatusDistribution, statusTotals]);

  // Computed chart data formatted according to selected view mode
  const chartData = useMemo(() => {
    return rawData.map((d) => {
      const deptTotal = Math.max(1, (d.active || 0) + (d.inactive || 0) + (d.suspended || 0));
      return {
        ...d,
        activeVal: visibleStatuses.active ? d.active || 0 : 0,
        inactiveVal: visibleStatuses.inactive ? d.inactive || 0 : 0,
        suspendedVal: visibleStatuses.suspended ? d.suspended || 0 : 0,
        activePercent: visibleStatuses.active
          ? Math.round(((d.active || 0) / deptTotal) * 100)
          : 0,
        inactivePercent: visibleStatuses.inactive
          ? Math.round(((d.inactive || 0) / deptTotal) * 100)
          : 0,
        suspendedPercent: visibleStatuses.suspended
          ? Math.round(((d.suspended || 0) / deptTotal) * 100)
          : 0,
      };
    });
  }, [rawData, visibleStatuses]);

  // Active workforce retention rate
  const activeRate = useMemo(() => {
    if (!statusTotals.total) return 0;
    return Math.round((statusTotals.active / statusTotals.total) * 100);
  }, [statusTotals]);

  const toggleStatusSeries = (statusKey) => {
    setVisibleStatuses((prev) => ({
      ...prev,
      [statusKey]: !prev[statusKey],
    }));
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & QUICK METRICS */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#002185]/10 flex items-center justify-center text-[#002185]">
                <Building2 className="w-4 h-4 text-[#ff5500]" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#002185] tracking-tight">
                Workforce Department & Status Distribution
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Interactive visualization of active, inactive, and suspended employees across organizational departments.
            </p>
          </div>

          {/* Quick Filter & View Mode Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="inline-flex items-center p-1 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setViewMode("stacked")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "stacked"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#002185]"
                }`}
                title="Stacked Bar View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Stacked</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "grouped"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#002185]"
                }`}
                title="Side-by-side Grouped Bar View"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Grouped</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("percent")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "percent"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#002185]"
                }`}
                title="100% Normalized Percentage View"
              >
                <Percent className="w-3.5 h-3.5" />
                <span>100% Ratio</span>
              </button>
            </div>

            {/* Link to Employee Roster */}
            <button
              type="button"
              onClick={() => navigate("/admin/employees")}
              className="px-3 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#002185] hover:text-white text-[#002185] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Manage Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Mini Stat Badges for Quick Status Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Total Roster
              </span>
              <span className="text-xl font-black text-[#002185]">
                {statusTotals.total}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#002185]/10 text-[#002185] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => toggleStatusSeries("active")}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              visibleStatuses.active
                ? "bg-[#F0FDF4] border-[#BBF7D0]"
                : "bg-[#F8FAFC] border-[#E2E8F0] opacity-60"
            }`}
            title="Click to toggle Active series in chart"
          >
            <div>
              <span className="text-[11px] font-semibold text-[#16A34A] uppercase tracking-wider block">
                Active Staff
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#16A34A]">
                  {statusTotals.active}
                </span>
                <span className="text-[11px] text-[#16A34A] font-bold">
                  ({activeRate}%)
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => toggleStatusSeries("inactive")}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              visibleStatuses.inactive
                ? "bg-[#FFFBEB] border-[#FDE68A]"
                : "bg-[#F8FAFC] border-[#E2E8F0] opacity-60"
            }`}
            title="Click to toggle Inactive series in chart"
          >
            <div>
              <span className="text-[11px] font-semibold text-[#D97706] uppercase tracking-wider block">
                Inactive Staff
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#D97706]">
                  {statusTotals.inactive}
                </span>
                <span className="text-[11px] text-[#D97706] font-bold">
                  ({Math.round((statusTotals.inactive / statusTotals.total) * 100)}%)
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 text-[#D97706] flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => toggleStatusSeries("suspended")}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              visibleStatuses.suspended
                ? "bg-[#FEF2F2] border-[#FECACA]"
                : "bg-[#F8FAFC] border-[#E2E8F0] opacity-60"
            }`}
            title="Click to toggle Suspended series in chart"
          >
            <div>
              <span className="text-[11px] font-semibold text-[#DC2626] uppercase tracking-wider block">
                Suspended Staff
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#DC2626]">
                  {statusTotals.suspended}
                </span>
                <span className="text-[11px] text-[#DC2626] font-bold">
                  ({Math.round((statusTotals.suspended / statusTotals.total) * 100)}%)
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID: BAR CHART (LEFT) & DONUT STATUS SHARE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECHARTS BAR CHART: Department by Status Distribution */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-[#002185] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#ff5500]" />
                <span>Department Breakdown</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {viewMode === "stacked"
                  ? "Stacked headcount by department"
                  : viewMode === "grouped"
                  ? "Side-by-side status comparison per department"
                  : "Proportional workforce health ratio (100%)"}
              </p>
            </div>

            {/* Status legend chips with toggle click */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => toggleStatusSeries("active")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  visibleStatuses.active
                    ? "bg-[#F0FDF4] border-[#86EFAC] text-[#16A34A] font-bold"
                    : "bg-white border-[#E2E8F0] text-[#94A3B8] line-through"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                Active
              </button>
              <button
                type="button"
                onClick={() => toggleStatusSeries("inactive")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  visibleStatuses.inactive
                    ? "bg-[#FFFBEB] border-[#FDE68A] text-[#D97706] font-bold"
                    : "bg-white border-[#E2E8F0] text-[#94A3B8] line-through"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                Inactive
              </button>
              <button
                type="button"
                onClick={() => toggleStatusSeries("suspended")}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  visibleStatuses.suspended
                    ? "bg-[#FEF2F2] border-[#FECACA] text-[#DC2626] font-bold"
                    : "bg-white border-[#E2E8F0] text-[#94A3B8] line-through"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>
                Suspended
              </button>
            </div>
          </div>

          {/* Main Recharts Bar Chart Container */}
          <div className="w-full h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 15, left: -15, bottom: 25 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="department"
                  stroke="#64748B"
                  fontSize={11}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  domain={viewMode === "percent" ? [0, 100] : ["auto", "auto"]}
                  unit={viewMode === "percent" ? "%" : ""}
                />
                <Tooltip
                  content={<CustomBarTooltip viewMode={viewMode} />}
                  cursor={{ fill: "rgba(0, 33, 133, 0.04)" }}
                />

                {/* Active Bar */}
                {visibleStatuses.active && (
                  <Bar
                    dataKey={viewMode === "percent" ? "activePercent" : "activeVal"}
                    name="Active"
                    fill="#16A34A"
                    stackId={viewMode !== "grouped" ? "deptStack" : undefined}
                    radius={
                      viewMode === "grouped"
                        ? [4, 4, 0, 0]
                        : !visibleStatuses.inactive && !visibleStatuses.suspended
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    }
                    barSize={viewMode === "grouped" ? 14 : 28}
                  />
                )}

                {/* Inactive Bar */}
                {visibleStatuses.inactive && (
                  <Bar
                    dataKey={viewMode === "percent" ? "inactivePercent" : "inactiveVal"}
                    name="Inactive"
                    fill="#F59E0B"
                    stackId={viewMode !== "grouped" ? "deptStack" : undefined}
                    radius={
                      viewMode === "grouped"
                        ? [4, 4, 0, 0]
                        : !visibleStatuses.suspended
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    }
                    barSize={viewMode === "grouped" ? 14 : 28}
                  />
                )}

                {/* Suspended Bar */}
                {visibleStatuses.suspended && (
                  <Bar
                    dataKey={viewMode === "percent" ? "suspendedPercent" : "suspendedVal"}
                    name="Suspended"
                    fill="#DC2626"
                    stackId={viewMode !== "grouped" ? "deptStack" : undefined}
                    radius={[4, 4, 0, 0]}
                    barSize={viewMode === "grouped" ? 14 : 28}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECHARTS DONUT CHART: Company-wide Employee Status Share */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#002185]/10 flex items-center justify-center text-[#002185]">
                <PieChartIcon className="w-4 h-4 text-[#ff5500]" />
              </div>
              <h3 className="text-base font-bold text-[#002185]">
                Status Share
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#16A34A]/10 text-[#16A34A]">
              {activeRate}% Active
            </span>
          </div>
          <p className="text-xs text-[#64748B] mb-2">
            Organizational macro status distribution
          </p>

          {/* Donut Chart with Center KPI */}
          <div className="relative w-full h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip totalCount={statusTotals.total} />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut KPI */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[#002185]">
                {statusTotals.total}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">
                Staff Total
              </span>
            </div>
          </div>

          {/* Interactive Legend with Detail Stats */}
          <div className="space-y-2 pt-3 border-t border-[#E2E8F0]">
            {pieData.map((item, idx) => {
              const pct = statusTotals.total > 0
                ? Math.round((item.value / statusTotals.total) * 100)
                : 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#F8FAFC] text-xs hover:bg-[#F1F5F9] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.fill }}
                    ></span>
                    <span className="font-semibold text-[#0F172A]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#002185]">{item.value}</span>
                    <span className="text-[10px] text-[#64748B] font-mono bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DEPARTMENT CARDS MATRIX: Quick overview of each department's status balance */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#002185]/10 flex items-center justify-center text-[#002185]">
              <Building2 className="w-4 h-4 text-[#ff5500]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002185]">
                Department Health & Composition Matrix
              </h3>
              <p className="text-xs text-[#64748B]">
                Department-by-department status ratios and capacity metrics
              </p>
            </div>
          </div>

          <span className="text-xs font-bold px-3 py-1 bg-[#F8FAFC] text-[#002185] rounded-xl border border-[#E2E8F0]">
            {rawData.length} Active Departments
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {rawData.map((dept, idx) => {
            const deptActive = dept.active || 0;
            const deptInactive = dept.inactive || 0;
            const deptSuspended = dept.suspended || 0;
            const deptTotal = dept.total || deptActive + deptInactive + deptSuspended || 1;
            const activePercent = Math.round((deptActive / deptTotal) * 100);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDept(dept.department === selectedDept ? null : dept.department)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedDept === dept.department
                    ? "border-[#002185] bg-[#002185]/5 shadow-sm"
                    : "border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#002185]/40 hover:shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#0F172A] truncate">
                      {dept.department || "General"}
                    </h4>
                    <span className="text-[11px] text-[#64748B] font-medium">
                      {deptTotal} Staff Registered
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      activePercent >= 80
                        ? "bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]"
                        : activePercent >= 50
                        ? "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]"
                        : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                    }`}
                  >
                    {activePercent}% Active
                  </span>
                </div>

                {/* Micro Distribution Bar */}
                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden flex mb-2.5">
                  <div
                    style={{ width: `${(deptActive / deptTotal) * 100}%` }}
                    className="bg-[#16A34A] h-full"
                    title={`Active: ${deptActive}`}
                  ></div>
                  <div
                    style={{ width: `${(deptInactive / deptTotal) * 100}%` }}
                    className="bg-[#F59E0B] h-full"
                    title={`Inactive: ${deptInactive}`}
                  ></div>
                  <div
                    style={{ width: `${(deptSuspended / deptTotal) * 100}%` }}
                    className="bg-[#DC2626] h-full"
                    title={`Suspended: ${deptSuspended}`}
                  ></div>
                </div>

                {/* Sub-counts */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-[#64748B]">
                  <span className="flex items-center gap-1 font-semibold text-[#16A34A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                    {deptActive} Active
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[#D97706]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
                    {deptInactive} Inactive
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-[#DC2626]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                    {deptSuspended} Suspended
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DepartmentStatusVisualizer;
