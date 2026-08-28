import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminDashboardOverview,
  updateStatus,
} from "../../apis/fontApis";
import {
  Users,
  UserCheck,
  CalendarCheck,
  Building2,
  Clock,
  BanknoteIcon,
  TrendingUp,
  PieChart as PieChartIcon,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Activity,
  UserX,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import ErrorMessage from "../../ui/ErrorMessage";
import DepartmentStatusVisualizer from "../../components/DepartmentStatusVisualizer";
import AnnouncementBoard from "../../components/AnnouncementBoard";
import DashboardMetricsSkeleton from "../../components/DashboardMetricsSkeleton";
import PenaltyPayrollImpactChart from "../../components/PenaltyPayrollImpactChart";
import DashboardSummaryMetrics from "../../components/DashboardSummaryMetrics";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [actionProcessingId, setActionProcessingId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await adminDashboardOverview();
      if (data.success) {
        setDashboardData(data.overview);
      } else {
        setIsError(data.message || "Failed to fetch dashboard data.");
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to fetch dashboard data.";
      setIsError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    const val = typeof amount === "number" ? amount : parseFloat(amount) || 0;
    return `GH₵${val.toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Handle instant Approval / Rejection directly from dashboard
  const handleQuickDecision = async (leaveId, status) => {
    try {
      setActionProcessingId(leaveId);
      const res = await updateStatus(leaveId, status, `Processed directly from Admin Dashboard.`);
      if (res.data?.success) {
        // Refresh dashboard overview
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Quick decision error:", err);
    } finally {
      setActionProcessingId(null);
    }
  };

  // Daily Attendance Ratio for Today
  const todayAttendanceRatioData = useMemo(() => {
    const total = Number(dashboardData?.cards?.totalEmployees || dashboardData?.attendance?.totalEmployees || 0);
    const present = Number(dashboardData?.cards?.presentToday ?? dashboardData?.attendance?.present ?? 0);
    const onLeave = Number(dashboardData?.cards?.onLeave ?? dashboardData?.attendance?.onLeave ?? 0);
    const late = Number(dashboardData?.attendance?.late ?? 0);
    const onTime = Math.max(0, present - late);
    const absent = Math.max(0, total - (present + onLeave));

    const ratioPercent = total > 0 ? Math.round((present / total) * 100) : 0;
    const accountedPercent = total > 0 ? Math.round(((present + onLeave) / total) * 100) : 0;

    const segments = [
      { name: "On Time", value: onTime, fill: "#16A34A" },
      { name: "Late Clock-in", value: late, fill: "#F59E0B" },
      { name: "Approved Leave", value: onLeave, fill: "#3B82F6" },
      { name: "Absent", value: absent, fill: "#DC2626" },
    ].filter((item) => item.value > 0);

    return {
      total,
      present,
      onTime,
      late,
      onLeave,
      absent,
      ratioPercent,
      accountedPercent,
      segments: segments.length > 0 ? segments : [{ name: "No Attendance", value: 1, fill: "#64748B" }],
    };
  }, [dashboardData]);

  // Prepare stats cards data from API response
  const statsCards = useMemo(() => {
    if (!dashboardData) return [];
    const totalPayroll = dashboardData.payroll?.totalPayroll ?? 0;
    const pendingPayroll = dashboardData.payroll?.pending ?? dashboardData.payroll?.pendingDisbursements ?? 0;

    return [
      {
        title: "Total Employees",
        value: dashboardData.cards?.totalEmployees || 0,
        icon: Users,
        color: "bg-[#002185]",
        textColor: "text-[#002185] dark:text-blue-400",
        link: "/admin/employees",
        subtitle: "Active workforce headcount",
      },
      {
        title: "Pending Leave Requests",
        value: dashboardData.cards?.pendingLeaves || dashboardData.leave?.pending || 0,
        icon: Clock,
        color: "bg-[#ff5500]",
        textColor: "text-[#ff5500] dark:text-orange-400",
        link: "/admin/leave",
        subtitle: "Awaiting administrative review",
      },
      {
        title: "Payroll Status",
        value: formatCurrency(totalPayroll),
        icon: BanknoteIcon,
        color: "bg-[#16A34A]",
        textColor: "text-[#16A34A] dark:text-emerald-400",
        link: "/admin/payroll",
        subtitle: pendingPayroll > 0 ? `${formatCurrency(pendingPayroll)} pending` : "Disbursements up to date",
      },
      {
        title: "Present Today",
        value: dashboardData.cards?.presentToday || 0,
        icon: UserCheck,
        color: "bg-[#002185]",
        textColor: "text-[#002185] dark:text-blue-400",
        link: "/admin/attendance",
        subtitle: `${todayAttendanceRatioData?.ratioPercent || 0}% turnout rate`,
      },
      {
        title: "On Leave",
        value: dashboardData.cards?.onLeave || 0,
        icon: CalendarCheck,
        color: "bg-[#F59E0B]",
        textColor: "text-[#F59E0B] dark:text-amber-400",
        link: "/admin/leave",
        subtitle: "Excused scheduled absence",
      },
    ];
  }, [dashboardData, todayAttendanceRatioData]);

  // Attendance Trend Data
  const attendanceTrends = useMemo(() => {
    if (dashboardData?.attendanceTrends && dashboardData.attendanceTrends.length > 0) {
      return dashboardData.attendanceTrends;
    }
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return days.map((day) => ({
      day,
      present: dashboardData?.attendance?.present || 0,
      late: dashboardData?.attendance?.late || 0,
      absent: dashboardData?.attendance?.absent || 0,
      onLeave: dashboardData?.attendance?.onLeave || 0,
    }));
  }, [dashboardData]);

  // Leave Status Distribution Data for Recharts Pie
  const leaveStatusData = useMemo(() => {
    if (dashboardData?.leaveStatusData) {
      return dashboardData.leaveStatusData;
    }
    const approved = dashboardData?.leave?.approved || 0;
    const pending = dashboardData?.leave?.pending || 0;
    const rejected = dashboardData?.leave?.rejected || 0;
    return [
      { name: "Approved", value: approved, fill: "#16A34A" },
      { name: "Pending", value: pending, fill: "#ff5500" },
      { name: "Rejected", value: rejected, fill: "#DC2626" },
    ];
  }, [dashboardData]);

  // Total leave request count
  const totalLeaveRequests = useMemo(() => {
    return dashboardData?.leave?.totalRequests ||
      leaveStatusData.reduce((acc, curr) => acc + curr.value, 0);
  }, [dashboardData, leaveStatusData]);

  // Leave Type Breakdown Data for Recharts Bar Chart (Strictly database records)
  const leaveTypeDistribution = useMemo(() => {
    if (dashboardData?.leaveTypeDistribution && dashboardData.leaveTypeDistribution.length > 0) {
      return dashboardData.leaveTypeDistribution;
    }
    return [
      { name: "Annual Leave", value: 0, fill: "#002185" },
      { name: "Casual Leave", value: 0, fill: "#ff5500" },
      { name: "Sick Leave", value: 0, fill: "#16A34A" },
      { name: "Maternity/Study", value: 0, fill: "#8B5CF6" },
    ];
  }, [dashboardData]);

  // Pending Approvals List
  const pendingApprovals = useMemo(() => {
    return dashboardData?.pendingApprovalsList || [];
  }, [dashboardData]);

  if (isLoading && !dashboardData) {
    return <DashboardMetricsSkeleton />;
  }

  if (isError && !dashboardData) {
    return (
      <ErrorMessage
        message={isError}
        onRetry={fetchDashboardData}
        onClose={() => setIsError(null)}
      />
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#64748B] dark:text-slate-400">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Admin Analytics Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time workforce intelligence, attendance turnout, and pending approval workflows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 font-medium flex items-center gap-2 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {new Date().toLocaleDateString("en-GH", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metric Cards Grid: 4-column responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {statsCards.slice(0, 4).map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              onClick={() => stat.link && navigate(stat.link)}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-200 group cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1.5 truncate">
                    {stat.value}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>
              {stat.subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 truncate">
                  {stat.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* RECHARTS KEY METRICS & ACTIVE PAYROLL ALERTS SUMMARY COMPONENT */}
      <DashboardSummaryMetrics dashboardData={dashboardData} />

      {/* DEPARTMENT & WORKFORCE STATUS RECHARTS VISUALIZATION */}
      <DepartmentStatusVisualizer
        departmentDistribution={dashboardData.departmentDistribution}
        employeeStatusDistribution={dashboardData.employeeStatusDistribution}
        totalEmployees={dashboardData.cards?.totalEmployees || 0}
      />

      {/* TODAY ATTENDANCE RATIO RECHARTS SUMMARY WIDGET */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Today's Workforce Attendance Ratio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time daily presence ratio calculated against total registered workforce ({todayAttendanceRatioData.total} employees)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {todayAttendanceRatioData.ratioPercent}% Present Today
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Recharts Donut Ratio Visualizer */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl">
            <div className="relative w-full h-56 max-w-xs flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={todayAttendanceRatioData.segments}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {todayAttendanceRatioData.segments.map((entry, index) => (
                      <Cell key={`ratio-cell-${index}`} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} employees`, name]}
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#F8FAFC",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Ratio Badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {todayAttendanceRatioData.ratioPercent}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Turnout Ratio
                </span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
              <div className="text-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-400 block font-medium">Total Present</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {todayAttendanceRatioData.present} / {todayAttendanceRatioData.total}
                </span>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-400 block font-medium">Compliance Rate</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {todayAttendanceRatioData.accountedPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown KPI Tiles */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* On-Time Card */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    On-Time Clock-in
                  </span>
                </div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">
                  {todayAttendanceRatioData.onTime}
                </p>
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  {todayAttendanceRatioData.total > 0
                    ? Math.round((todayAttendanceRatioData.onTime / todayAttendanceRatioData.total) * 100)
                    : 0}
                  % of total team
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs border border-emerald-100 dark:border-slate-800">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Late Arrival Card */}
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Late Clock-ins
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-2">
                  {todayAttendanceRatioData.late}
                </p>
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  After shift start arrival
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs border border-amber-100 dark:border-slate-800">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Approved Leave Card */}
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                    Approved Leave
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">
                  {todayAttendanceRatioData.onLeave}
                </p>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Official excused absence
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs border border-blue-100 dark:border-slate-800">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Absent Card */}
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    Unexcused Absent
                  </span>
                </div>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-2">
                  {todayAttendanceRatioData.absent}
                </p>
                <span className="text-xs text-rose-600 dark:text-rose-400">
                  No clock-in or leave record
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-2xs border border-rose-100 dark:border-slate-800">
                <UserX className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Announcement Board (Admin Management) */}
      <AnnouncementBoard role="admin" />

      {/* RECHARTS SECTION 1: Attendance Trends & Leave Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Workforce Attendance Trends
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Weekly attendance breakdown (Present, Late, Absent, On Leave)
              </p>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Present
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Late
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Absent
              </span>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={attendanceTrends}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#475569" }}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#F8FAFC",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                    fontSize: "12px",
                  }}
                  itemStyle={{ padding: "2px 0" }}
                />
                <Area
                  type="monotone"
                  dataKey="present"
                  name="Present"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPresent)"
                />
                <Area
                  type="monotone"
                  dataKey="late"
                  name="Late"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLate)"
                />
                <Bar
                  dataKey="absent"
                  name="Absent"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Leave Requests & Status Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Leave Breakdown
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {totalLeaveRequests} Total
            </span>
          </div>

          {/* Donut Chart */}
          <div className="relative w-full h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} requests`, name]}
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalLeaveRequests}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Requests
              </span>
            </div>
          </div>

          {/* Legend Badges */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            {leaveStatusData.map((status, idx) => (
              <div key={idx} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.fill }}
                  ></span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{status.name}</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{status.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECHARTS SECTION 2: Pending Approvals Queue & Leave Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Management Queue */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Pending Approvals Queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Submissions awaiting administrative review and instant decision
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/admin/leave")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pending items list */}
          {pendingApprovals.length === 0 ? (
            <div className="py-10 px-4 text-center bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">All Approvals Cleared!</p>
              <p className="text-xs text-slate-400 mt-0.5">
                No leave requests currently requiring administrative sign-off.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.slice(0, 4).map((leave) => {
                const leaveId = leave._id;
                const emp = leave.employee || {};
                const isProcessing = actionProcessingId === leaveId;

                return (
                  <div
                    key={leaveId}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center shrink-0 border border-blue-500/20">
                        {emp.fullName ? emp.fullName.charAt(0) : "E"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {emp.fullName || "Employee"}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {emp.department || "General"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-orange-600 dark:text-orange-400">{leave.leaveType}</span> •{" "}
                          {leave.totalDays} day(s) ({leave.startDate} to {leave.endDate})
                        </p>
                        {leave.reason && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                            &quot;{leave.reason}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleQuickDecision(leaveId, "Approved")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleQuickDecision(leaveId, "Rejected")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leave Requests by Type */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Requests by Leave Type
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Categorized request distribution
            </p>
          </div>

          {leaveTypeDistribution.reduce((acc, curr) => acc + (curr.value || 0), 0) === 0 ? (
            <div className="w-full h-64 flex flex-col items-center justify-center p-4 text-center bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <CalendarCheck className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">No Leave Requests</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                No leave applications have been submitted across departments yet.
              </p>
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={leaveTypeDistribution}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} requests`, "Count"]}
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      color: "#F8FAFC",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                    {leaveTypeDistribution.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill || "#2563EB"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 6-Month Attendance Penalty Impact Visualizer */}
      <PenaltyPayrollImpactChart />

      {/* Summary Cards: Payroll & Department Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Summary Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                <BanknoteIcon className="w-4 h-4" />
              </div>
              <span>Payroll Overview</span>
            </h3>
            <button
              onClick={() => navigate("/admin/payslips")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              View Details
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-xs text-slate-400 block font-medium">Total Payroll</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {formatCurrency(dashboardData.payroll?.totalPayroll ?? 0)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-xs text-slate-400 block font-medium">Disbursed</span>
              <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(dashboardData.payroll?.paid ?? dashboardData.payroll?.totalPayrollDisbursed ?? 0)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-xs text-slate-400 block font-medium">Pending</span>
              <span className="text-sm sm:text-base font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(dashboardData.payroll?.pending ?? dashboardData.payroll?.pendingDisbursements ?? 0)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
              <span className="text-xs text-slate-400 block font-medium">Employees Paid</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {dashboardData.payroll?.employeesPaidCount ?? dashboardData.payroll?.totalEmployeesPaid ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Department Workforce */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Building2 className="w-4 h-4" />
              </div>
              <span>Department Workforce</span>
            </h3>
            <button
              onClick={() => navigate("/admin/employees")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              View Roster
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {dashboardData.departments && dashboardData.departments.length > 0 ? (
              dashboardData.departments.map((dept, index) => (
                <div
                  key={index}
                  className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3 text-center"
                >
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                    {dept._id || "Dept"}
                  </h4>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {dept.total || 0}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-slate-400 py-4 text-xs">
                No department data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

