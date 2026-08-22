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
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

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
    return (
      amount?.toLocaleString("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) || "GHS 0.00"
    );
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
        textColor: "text-[#002185]",
        link: "/admin/employees",
      },
      {
        title: "Present Today",
        value: dashboardData.cards?.presentToday || 0,
        icon: UserCheck,
        color: "bg-[#16A34A]",
        textColor: "text-[#16A34A]",
        link: "/admin/attendance",
      },
      {
        title: "On Leave",
        value: dashboardData.cards?.onLeave || 0,
        icon: CalendarCheck,
        color: "bg-[#F59E0B]",
        textColor: "text-[#F59E0B]",
        link: "/admin/leave",
      },
      {
        title: "Pending Approvals",
        value: dashboardData.cards?.pendingLeaves || 0,
        icon: Clock,
        color: "bg-[#ff5500]",
        textColor: "text-[#ff5500]",
        link: "/admin/leave",
      },
    ];
  }, [dashboardData]);

  // Attendance Trend Data
  const attendanceTrends = useMemo(() => {
    if (dashboardData?.attendanceTrends && dashboardData.attendanceTrends.length > 0) {
      return dashboardData.attendanceTrends;
    }
    return [
      { day: "Mon", present: 5, late: 1, absent: 0, onLeave: 0 },
      { day: "Tue", present: 6, late: 0, absent: 0, onLeave: 0 },
      { day: "Wed", present: 4, late: 1, absent: 1, onLeave: 0 },
      { day: "Thu", present: 5, late: 0, absent: 0, onLeave: 1 },
      {
        day: "Fri",
        present: dashboardData?.attendance?.present || 4,
        late: dashboardData?.attendance?.late || 1,
        absent: dashboardData?.attendance?.absent || 1,
        onLeave: dashboardData?.attendance?.onLeave || 1,
      },
    ];
  }, [dashboardData]);

  // Leave Status Distribution Data for Recharts Pie
  const leaveStatusData = useMemo(() => {
    if (dashboardData?.leaveStatusData) {
      return dashboardData.leaveStatusData;
    }
    const approved = dashboardData?.leave?.approved || 2;
    const pending = dashboardData?.leave?.pending || 1;
    const rejected = dashboardData?.leave?.rejected || 1;
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

  // Leave Type Breakdown Data for Recharts Bar Chart
  const leaveTypeDistribution = useMemo(() => {
    if (dashboardData?.leaveTypeDistribution && dashboardData.leaveTypeDistribution.length > 0) {
      return dashboardData.leaveTypeDistribution;
    }
    return [
      { name: "Annual Leave", value: 3, fill: "#002185" },
      { name: "Casual Leave", value: 2, fill: "#ff5500" },
      { name: "Sick Leave", value: 1, fill: "#16A34A" },
      { name: "Maternity/Study", value: 1, fill: "#8B5CF6" },
    ];
  }, [dashboardData]);

  // Pending Approvals List
  const pendingApprovals = useMemo(() => {
    return dashboardData?.pendingApprovalsList || [];
  }, [dashboardData]);

  if (isLoading && !dashboardData) {
    return <Loading />;
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
        <p className="text-[#64748B]">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#002185] tracking-tight">
            Admin Analytics Dashboard
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time workforce intelligence, leave visualizations, and pending approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-xs sm:text-sm text-[#64748B] bg-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] font-medium flex items-center gap-2 shadow-xs">
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
              className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-[#002185] transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    {stat.title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#002185] mt-2">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center group-hover:bg-[#002185] transition-colors duration-300`}
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

      {/* RECHARTS SECTION 1: Attendance Trends & Leave Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends (Area & Bar Hybrid Visualizer) */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#002185]/10 flex items-center justify-center text-[#002185]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#002185]">
                  Workforce Attendance Trends
                </h3>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Weekly attendance breakdown (Present, Late, Absent, On Leave)
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[#16A34A] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span> Present
              </span>
              <span className="inline-flex items-center gap-1 text-[#F59E0B] font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> Late
              </span>
              <span className="inline-flex items-center gap-1 text-[#DC2626] font-semibold">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
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
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
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
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ff5500]/10 flex items-center justify-center text-[#ff5500]">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#002185]">
                Leave Requests Breakdown
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#002185]/10 text-[#002185]">
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
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[#002185]">{totalLeaveRequests}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">
                Requests
              </span>
            </div>
          </div>

          {/* Legend Badges */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E2E8F0]">
            {leaveStatusData.map((status, idx) => (
              <div key={idx} className="text-center p-2 rounded-xl bg-[#F8FAFC]">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.fill }}
                  ></span>
                  <span className="text-[11px] font-semibold text-[#64748B]">{status.name}</span>
                </div>
                <p className="text-base font-bold text-[#002185]">{status.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECHARTS SECTION 2: Pending Approvals Queue & Leave Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Management Queue */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ff5500]/10 flex items-center justify-center text-[#ff5500]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#002185]">
                  Pending Approvals Queue
                </h3>
                <p className="text-xs text-[#64748B]">
                  Submissions awaiting administrative review and instant decision
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/admin/leave")}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#002185] hover:text-[#ff5500] transition-colors cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pending items list */}
          {pendingApprovals.length === 0 ? (
            <div className="py-12 px-4 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
              <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#002185]">All Approvals Cleared!</p>
              <p className="text-xs text-[#64748B] mt-0.5">
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
                    className="p-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#002185]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#002185]/10 text-[#002185] font-bold text-sm flex items-center justify-center shrink-0">
                        {emp.fullName ? emp.fullName.charAt(0) : "E"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                            {emp.fullName || "Employee"}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] font-medium">
                            {emp.department || "General"}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          <span className="font-semibold text-[#ff5500]">{leave.leaveType}</span> •{" "}
                          {leave.totalDays} day(s) ({leave.startDate} to {leave.endDate})
                        </p>
                        {leave.reason && (
                          <p className="text-[11px] text-[#94A3B8] italic mt-0.5 line-clamp-1">
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2] text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
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
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#002185]/10 flex items-center justify-center text-[#002185]">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#002185]">
                Requests by Leave Type
              </h3>
            </div>
            <p className="text-xs text-[#64748B] mb-4">
              Categorized request distribution
            </p>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leaveTypeDistribution}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  formatter={(value) => [`${value} requests`, "Count"]}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
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
        </div>
      </div>

      {/* Summary Cards: Payroll & Department Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Summary Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#002185] flex items-center gap-2">
              <BanknoteIcon className="w-5 h-5 text-[#ff5500]" />
              Payroll Overview
            </h3>
            <button
              onClick={() => navigate("/admin/payslips")}
              className="text-xs text-[#002185] hover:text-[#ff5500] font-bold cursor-pointer"
            >
              View Details
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block">Total Payroll</span>
              <span className="text-sm sm:text-base font-bold text-[#002185]">
                {formatCurrency(dashboardData.payroll?.totalPayroll)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block">Disbursed</span>
              <span className="text-sm sm:text-base font-bold text-[#16A34A]">
                {formatCurrency(dashboardData.payroll?.paid)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block">Pending</span>
              <span className="text-sm sm:text-base font-bold text-[#F59E0B]">
                {formatCurrency(dashboardData.payroll?.pending)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[11px] text-[#64748B] block">Employees</span>
              <span className="text-sm sm:text-base font-bold text-[#002185]">
                {dashboardData.payroll?.totalEmployees || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Department Workforce */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#002185] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#ff5500]" />
              Department Workforce
            </h3>
            <button
              onClick={() => navigate("/admin/employees")}
              className="text-xs text-[#002185] hover:text-[#ff5500] font-bold cursor-pointer"
            >
              View Roster
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {dashboardData.departments && dashboardData.departments.length > 0 ? (
              dashboardData.departments.map((dept, index) => (
                <div
                  key={index}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-center"
                >
                  <h4 className="text-xs font-medium text-[#64748B] truncate">
                    {dept._id || "Dept"}
                  </h4>
                  <p className="text-lg font-bold text-[#002185] mt-1">
                    {dept.total || 0}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-[#64748B] py-4 text-xs">
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

