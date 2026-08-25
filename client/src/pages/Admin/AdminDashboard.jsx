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

  // Prepare stats cards data from API response
  const statsCards = useMemo(() => {
    if (!dashboardData) return [];
    return [
      {
        title: "Total Employees",
        value: dashboardData.cards?.totalEmployees || 0,
        icon: Users,
        color: "bg-[#002185]",
        textColor: "text-[#002185] dark:text-blue-400",
        link: "/admin/employees",
      },
      {
        title: "Present Today",
        value: dashboardData.cards?.presentToday || 0,
        icon: UserCheck,
        color: "bg-[#16A34A]",
        textColor: "text-[#16A34A] dark:text-emerald-400",
        link: "/admin/attendance",
      },
      {
        title: "On Leave",
        value: dashboardData.cards?.onLeave || 0,
        icon: CalendarCheck,
        color: "bg-[#F59E0B]",
        textColor: "text-[#F59E0B] dark:text-amber-400",
        link: "/admin/leave",
      },
      {
        title: "Pending Approvals",
        value: dashboardData.cards?.pendingLeaves || 0,
        icon: Clock,
        color: "bg-[#ff5500]",
        textColor: "text-[#ff5500] dark:text-orange-400",
        link: "/admin/leave",
      },
    ];
  }, [dashboardData]);

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
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/60 shadow-xs transition-colors duration-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#002185] dark:text-white tracking-tight">
            Admin Analytics Dashboard
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-300 mt-1">
            Real-time workforce intelligence, leave visualizations, and pending approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-xs sm:text-sm text-[#64748B] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-800/90 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700/60 font-medium flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
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

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              onClick={() => stat.link && navigate(stat.link)}
              className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-[#002185] dark:hover:border-blue-500 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#002185] dark:text-white mt-2">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl bg-[#F8FAFC] dark:bg-slate-700/50 border border-[#E2E8F0] dark:border-slate-700/60 flex items-center justify-center group-hover:bg-[#002185] dark:group-hover:bg-blue-600 transition-colors duration-300`}
                >
                  <IconComponent
                    className={`w-6 h-6 ${stat.textColor} group-hover:text-white transition-colors duration-300`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DEPARTMENT & WORKFORCE STATUS RECHARTS VISUALIZATION */}
      <DepartmentStatusVisualizer
        departmentDistribution={dashboardData.departmentDistribution}
        employeeStatusDistribution={dashboardData.employeeStatusDistribution}
        totalEmployees={dashboardData.cards?.totalEmployees || 0}
      />

      {/* TODAY ATTENDANCE RATIO RECHARTS SUMMARY WIDGET */}
      <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-slate-700/60 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A]/10 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#002185] dark:text-white">
                Today's Workforce Attendance Ratio
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-300 mt-0.5">
                Real-time daily presence ratio calculated against total registered workforce ({todayAttendanceRatioData.total} employees)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-300 border border-[#BBF7D0] dark:border-emerald-800/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
              {todayAttendanceRatioData.ratioPercent}% Present Today
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Recharts Donut Ratio Visualizer */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-[#F8FAFC] dark:bg-slate-900/60 rounded-2xl border border-[#E2E8F0] dark:border-slate-700/60">
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
                      backgroundColor: "#1E293B",
                      borderColor: "#475569",
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
                <span className="text-3xl font-black text-[#002185] dark:text-white tracking-tight">
                  {todayAttendanceRatioData.ratioPercent}%
                </span>
                <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Turnout Ratio
                </span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-700/60 text-xs">
              <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60">
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 block font-medium">Total Present</span>
                <span className="text-base font-bold text-[#16A34A] dark:text-emerald-400">
                  {todayAttendanceRatioData.present} / {todayAttendanceRatioData.total}
                </span>
              </div>
              <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60">
                <span className="text-[11px] text-[#64748B] dark:text-slate-400 block font-medium">Compliance Rate</span>
                <span className="text-base font-bold text-[#002185] dark:text-blue-400">
                  {todayAttendanceRatioData.accountedPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown KPI Tiles */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* On-Time Card */}
            <div className="p-4 rounded-xl border border-[#BBF7D0] dark:border-emerald-800/60 bg-[#F0FDF4]/60 dark:bg-emerald-950/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                  <span className="text-xs font-bold text-[#166534] dark:text-emerald-300 uppercase tracking-wider">
                    On-Time Clock-in
                  </span>
                </div>
                <p className="text-2xl font-black text-[#16A34A] dark:text-emerald-400 mt-2">
                  {todayAttendanceRatioData.onTime}
                </p>
                <span className="text-[11px] text-[#166534] dark:text-emerald-300">
                  {todayAttendanceRatioData.total > 0
                    ? Math.round((todayAttendanceRatioData.onTime / todayAttendanceRatioData.total) * 100)
                    : 0}
                  % of total team
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-[#16A34A] dark:text-emerald-400 shadow-xs border border-transparent dark:border-slate-700/60">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Late Arrival Card */}
            <div className="p-4 rounded-xl border border-[#FDE68A] dark:border-amber-800/60 bg-[#FFFBEB]/60 dark:bg-amber-950/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-xs font-bold text-[#92400E] dark:text-amber-300 uppercase tracking-wider">
                    Late Clock-ins
                  </span>
                </div>
                <p className="text-2xl font-black text-[#D97706] dark:text-amber-400 mt-2">
                  {todayAttendanceRatioData.late}
                </p>
                <span className="text-[11px] text-[#92400E] dark:text-amber-300">
                  After 8:30 AM arrival
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-[#D97706] dark:text-amber-400 shadow-xs border border-transparent dark:border-slate-700/60">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Approved Leave Card */}
            <div className="p-4 rounded-xl border border-[#BFDBFE] dark:border-blue-800/60 bg-[#EFF6FF]/60 dark:bg-blue-950/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                  <span className="text-xs font-bold text-[#1E40AF] dark:text-blue-300 uppercase tracking-wider">
                    Approved Leave
                  </span>
                </div>
                <p className="text-2xl font-black text-[#2563EB] dark:text-blue-400 mt-2">
                  {todayAttendanceRatioData.onLeave}
                </p>
                <span className="text-[11px] text-[#1E40AF] dark:text-blue-300">
                  Official excused absence
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shadow-xs border border-transparent dark:border-slate-700/60">
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Absent Card */}
            <div className="p-4 rounded-xl border border-[#FECACA] dark:border-red-800/60 bg-[#FEF2F2]/60 dark:bg-red-950/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                  <span className="text-xs font-bold text-[#991B1B] dark:text-red-300 uppercase tracking-wider">
                    Unexcused Absent
                  </span>
                </div>
                <p className="text-2xl font-black text-[#DC2626] dark:text-red-400 mt-2">
                  {todayAttendanceRatioData.absent}
                </p>
                <span className="text-[11px] text-[#991B1B] dark:text-red-300">
                  No clock-in or leave record
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-[#DC2626] dark:text-red-400 shadow-xs border border-transparent dark:border-slate-700/60">
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
        {/* Attendance Trends (Area & Bar Hybrid Visualizer) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#002185]/10 dark:bg-blue-950/50 flex items-center justify-center text-[#002185] dark:text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#002185] dark:text-white">
                  Workforce Attendance Trends
                </h3>
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-300 mt-1">
                Weekly attendance breakdown (Present, Late, Absent, On Leave)
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[#16A34A] dark:text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span> Present
              </span>
              <span className="inline-flex items-center gap-1 text-[#F59E0B] dark:text-amber-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> Late
              </span>
              <span className="inline-flex items-center gap-1 text-[#DC2626] dark:text-red-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span> Absent
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
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
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
                    backgroundColor: "#1E293B",
                    borderColor: "#475569",
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
                  stroke="#16A34A"
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
                  fill="#DC2626"
                  radius={[4, 4, 0, 0]}
                  barSize={12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Leave Requests & Status Distribution (Recharts Pie / Donut) */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ff5500]/10 dark:bg-orange-950/50 flex items-center justify-center text-[#ff5500] dark:text-orange-400">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#002185] dark:text-white">
                Leave Requests Breakdown
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#002185]/10 dark:bg-blue-950/50 text-[#002185] dark:text-blue-300">
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
                    backgroundColor: "#1E293B",
                    borderColor: "#475569",
                    borderRadius: "12px",
                    color: "#F8FAFC",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[#002185] dark:text-white">{totalLeaveRequests}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] dark:text-slate-400">
                Requests
              </span>
            </div>
          </div>

          {/* Legend Badges */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E2E8F0] dark:border-slate-700/60">
            {leaveStatusData.map((status, idx) => (
              <div key={idx} className="text-center p-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-900/60">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.fill }}
                  ></span>
                  <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">{status.name}</span>
                </div>
                <p className="text-base font-bold text-[#002185] dark:text-white">{status.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECHARTS SECTION 2: Pending Approvals Queue & Leave Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Management Queue */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ff5500]/10 dark:bg-orange-950/50 flex items-center justify-center text-[#ff5500] dark:text-orange-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#002185] dark:text-white">
                  Pending Approvals Queue
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-300">
                  Submissions awaiting administrative review and instant decision
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/admin/leave")}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#002185] dark:text-blue-400 hover:text-[#ff5500] dark:hover:text-orange-400 transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pending items list */}
          {pendingApprovals.length === 0 ? (
            <div className="py-12 px-4 text-center bg-[#F8FAFC] dark:bg-slate-900/60 rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700/60">
              <CheckCircle2 className="w-8 h-8 text-[#16A34A] dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#002185] dark:text-white">All Approvals Cleared!</p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
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
                    className="p-4 rounded-xl border border-[#E2E8F0] dark:border-slate-700/60 bg-[#FFFFFF] dark:bg-slate-800/90 hover:border-[#002185]/40 dark:hover:border-blue-500/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#002185]/10 dark:bg-blue-950/50 text-[#002185] dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                        {emp.fullName ? emp.fullName.charAt(0) : "E"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white">
                            {emp.fullName || "Employee"}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F5F9] dark:bg-slate-700/60 text-[#64748B] dark:text-slate-300 font-medium">
                            {emp.department || "General"}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] dark:text-slate-300 mt-0.5">
                          <span className="font-semibold text-[#ff5500] dark:text-orange-400">{leave.leaveType}</span> •{" "}
                          {leave.totalDays} day(s) ({leave.startDate} to {leave.endDate})
                        </p>
                        {leave.reason && (
                          <p className="text-[11px] text-[#94A3B8] dark:text-slate-400 italic mt-0.5 line-clamp-1">
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleQuickDecision(leaveId, "Rejected")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-[#DC2626] text-[#DC2626] dark:text-red-400 hover:bg-[#FEF2F2] dark:hover:bg-red-950/30 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
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

        {/* Leave Requests by Type (Recharts Bar Chart) */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#002185]/10 dark:bg-blue-950/50 flex items-center justify-center text-[#002185] dark:text-blue-400">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#002185] dark:text-white">
                Requests by Leave Type
              </h3>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-300 mb-4">
              Categorized request distribution
            </p>
          </div>

          {leaveTypeDistribution.reduce((acc, curr) => acc + (curr.value || 0), 0) === 0 ? (
            <div className="w-full h-64 flex flex-col items-center justify-center p-4 text-center bg-[#F8FAFC] dark:bg-slate-900/60 rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-700/60">
              <CalendarCheck className="w-8 h-8 text-[#94A3B8] dark:text-slate-500 mb-2" />
              <p className="text-sm font-bold text-[#002185] dark:text-white">No Leave Requests</p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-xs">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
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
                      backgroundColor: "#1E293B",
                      borderColor: "#475569",
                      borderRadius: "12px",
                      color: "#F8FAFC",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                    {leaveTypeDistribution.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill || "#002185"} />
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
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#002185] dark:text-white flex items-center gap-2">
              <BanknoteIcon className="w-5 h-5 text-[#ff5500]" />
              Payroll Overview
            </h3>
            <button
              onClick={() => navigate("/admin/payslips")}
              className="text-xs text-[#002185] dark:text-blue-400 hover:text-[#ff5500] dark:hover:text-orange-400 font-bold cursor-pointer transition-colors"
            >
              View Details
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/90 border border-[#E2E8F0] dark:border-slate-700/60">
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block font-medium">Total Payroll</span>
              <span className="text-sm sm:text-base font-bold text-[#002185] dark:text-white">
                {formatCurrency(dashboardData.payroll?.totalPayroll ?? 0)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/90 border border-[#E2E8F0] dark:border-slate-700/60">
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block font-medium">Disbursed</span>
              <span className="text-sm sm:text-base font-bold text-[#16A34A] dark:text-emerald-400">
                {formatCurrency(dashboardData.payroll?.paid ?? dashboardData.payroll?.totalPayrollDisbursed ?? 0)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/90 border border-[#E2E8F0] dark:border-slate-700/60">
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block font-medium">Pending</span>
              <span className="text-sm sm:text-base font-bold text-[#F59E0B] dark:text-amber-400">
                {formatCurrency(dashboardData.payroll?.pending ?? dashboardData.payroll?.pendingDisbursements ?? 0)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/90 border border-[#E2E8F0] dark:border-slate-700/60">
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block font-medium">Employees Paid</span>
              <span className="text-sm sm:text-base font-bold text-[#002185] dark:text-white">
                {dashboardData.payroll?.employeesPaidCount ?? dashboardData.payroll?.totalEmployeesPaid ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Department Workforce */}
        <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/60 rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#002185] dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#ff5500]" />
              Department Workforce
            </h3>
            <button
              onClick={() => navigate("/admin/employees")}
              className="text-xs text-[#002185] dark:text-blue-400 hover:text-[#ff5500] dark:hover:text-orange-400 font-bold cursor-pointer transition-colors"
            >
              View Roster
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {dashboardData.departments && dashboardData.departments.length > 0 ? (
              dashboardData.departments.map((dept, index) => (
                <div
                  key={index}
                  className="bg-[#F8FAFC] dark:bg-slate-800/90 border border-[#E2E8F0] dark:border-slate-700/60 rounded-xl p-3 text-center"
                >
                  <h4 className="text-xs font-medium text-[#64748B] dark:text-slate-300 truncate">
                    {dept._id || "Dept"}
                  </h4>
                  <p className="text-lg font-bold text-[#002185] dark:text-white mt-1">
                    {dept.total || 0}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-[#64748B] dark:text-slate-400 py-4 text-xs">
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

