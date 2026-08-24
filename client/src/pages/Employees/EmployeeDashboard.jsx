import { useEffect, useState } from "react";
import {
  attendanceClockIn,
  attendanceClockOut,
  employeeDashboardOverview,
} from "../../apis/fontApis";
import {
  UserCheck,
  CalendarDays,
  Banknote,
  CalendarCheck,
  Mail,
  Building2,
  Briefcase,
  LogIn,
  LogOut,
  AlertCircle,
  TrendingDown,
  Eye,
  Download,
  CheckCircle,
  Clock,
} from "lucide-react";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";
import { useManagement } from "../../context/ManagementContextProvider";
import { useNavigate } from "react-router-dom";

const EmployeeDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [attendanceData, setAttendanceData] = useState({
    date: null,
    clockIn: null,
    clockOut: null,
    status: null,
    workHours: 0,
  });

  const { setShowToast, user, setUser } = useManagement();
  const navigate = useNavigate();

  const fetchEmployeeDashboardData = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await employeeDashboardOverview();
      console.log("Employee Dashboard Live Data:", data);

      if (data && data.success) {
        setDashboardData(data);
        if (data.employee) {
          localStorage.setItem("employeeData", JSON.stringify(data.employee));
          if (typeof setUser === "function") {
            setUser(data.employee);
          }
        }

        if (data.todayAttendance) {
          setAttendanceData({
            date:
              data.todayAttendance.date ||
              new Date().toISOString().split("T")[0],
            clockIn: data.todayAttendance.clockIn || null,
            clockOut: data.todayAttendance.clockOut || null,
            status: data.todayAttendance.status || null,
            workHours: data.todayAttendance.workHours || 0,
          });
        } else {
          setAttendanceData({
            date: new Date().toISOString().split("T")[0],
            clockIn: null,
            clockOut: null,
            status: null,
            workHours: 0,
          });
        }
      } else {
        const errorMsg = data?.message || "Failed to fetch dashboard data.";
        setIsError(errorMsg);
        setShowToast({
          show: true,
          message: errorMsg,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching employee dashboard:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to fetch live dashboard data.";
      setIsError(errorMessage);
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clock In Function
  const handleClockIn = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await attendanceClockIn();
      console.log("Clock In API response:", data);

      if (data.success) {
        let clockInData = null;
        if (
          data.attendance &&
          Array.isArray(data.attendance) &&
          data.attendance.length > 0
        ) {
          clockInData = data.attendance[0];
        } else if (data.attendance && !Array.isArray(data.attendance)) {
          clockInData = data.attendance;
        }

        const now = new Date().toISOString();
        const today = new Date().toISOString().split("T")[0];

        const clockInTime = clockInData?.clockIn || now;
        const attendanceDate = clockInData?.date || today;

        setAttendanceData({
          date: attendanceDate,
          clockIn: clockInTime,
          clockOut: null,
          status: clockInData?.status || null,
          workHours: 0,
        });

        setShowToast({
          show: true,
          message: data.message || "Clock in successful!",
          type: "success",
        });

        try {
          const bc = new BroadcastChannel("eyenit_attendance_sync");
          bc.postMessage({ type: "clock_in", timestamp: Date.now() });
          bc.close();
        } catch {
          // Fallback
        }

        await fetchEmployeeDashboardData();
      } else {
        setIsError(data.message || "Clock in failed.");
        setShowToast({
          show: true,
          message: data.message || "Clock in failed.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Clock in error:", error);
      const errorMessage = error.response?.data?.message || "Clock in failed.";
      setIsError(errorMessage);
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clock Out Function
  const handleClockOut = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await attendanceClockOut();
      console.log("Clock Out API response:", data);

      if (data.success) {
        let clockOutData = null;
        if (
          data.attendance &&
          Array.isArray(data.attendance) &&
          data.attendance.length > 0
        ) {
          clockOutData = data.attendance[0];
        } else if (data.attendance && !Array.isArray(data.attendance)) {
          clockOutData = data.attendance;
        }

        const clockOutTime = clockOutData?.clockOut || new Date().toISOString();
        const workHours = clockOutData?.workHours || 0;

        setAttendanceData((prev) => ({
          ...prev,
          clockOut: clockOutTime,
          workHours: workHours,
          status: clockOutData?.status || prev.status,
        }));

        setShowToast({
          show: true,
          message: data.message || "Clock out successful!",
          type: "success",
        });

        try {
          const bc = new BroadcastChannel("eyenit_attendance_sync");
          bc.postMessage({ type: "clock_out", timestamp: Date.now() });
          bc.close();
        } catch {
          // Fallback
        }

        await fetchEmployeeDashboardData();
      } else {
        setIsError(data.message || "Clock out failed.");
        setShowToast({
          show: true,
          message: data.message || "Clock out failed.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Clock out error:", error);
      const errorMessage = error.response?.data?.message || "Clock out failed.";
      setIsError(errorMessage);
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDashboardData();
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

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Format month
  const formatMonth = (monthString) => {
    if (!monthString) return "N/A";
    try {
      const [year, month] = monthString.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString("en-GH", {
        year: "numeric",
        month: "long",
      });
    } catch {
      return monthString;
    }
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return "--:--";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
      case "Paid":
        return "bg-[#16A34A] text-white";
      case "Pending":
        return "bg-[#F59E0B] text-white";
      case "Rejected":
        return "bg-[#DC2626] text-white";
      case "Present":
      case "On Time":
        return "bg-[#16A34A] text-white";
      case "Late":
        return "bg-[#F97316] text-white";
      case "Absent":
        return "bg-[#DC2626] text-white";
      default:
        return "bg-[#64748B] text-white";
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "On Time":
        return "bg-[#16A34A] text-white";
      case "Late":
        return "bg-[#F97316] text-white";
      case "Absent":
        return "bg-[#DC2626] text-white";
      default:
        return "bg-[#64748B] text-white";
    }
  };


  if (isLoading && !dashboardData) {
    return <Loading />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message={isError}
        onRetry={fetchEmployeeDashboardData}
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

  // Extract data from API response
  const employee = dashboardData.employee || {};
  const overview = dashboardData.overview || {};
  const recentLeaves = dashboardData.recentLeaves || [];

  // Get latest payslip from overview
  const latestPayslip = overview.latestPayslip || {};

  // Database-bound account status ('active', 'inactive', 'suspended')
  const currentStatus = (
    employee?.status ||
    user?.status ||
    (employee?.isActive !== false ? "active" : "inactive")
  ).toLowerCase().trim();

  const getAccountStatusBadge = (status) => {
    switch (status) {
      case "active":
        return {
          label: "Active",
          className: "bg-[#16A34A] text-white",
          dotColor: "bg-[#16A34A]",
        };
      case "suspended":
        return {
          label: "Suspended",
          className: "bg-[#DC2626] text-white",
          dotColor: "bg-[#DC2626]",
        };
      case "inactive":
      default:
        return {
          label: "Inactive",
          className: "bg-[#64748B] text-white",
          dotColor: "bg-[#64748B]",
        };
    }
  };

  const accountBadge = getAccountStatusBadge(currentStatus);

  // Calculate total days
  const totalDays = (overview.presentDays || 0) + (overview.lateDays || 0);

  // Check if user has clocked in today
  const hasClockedIn = Boolean(attendanceData.clockIn);
  const hasClockedOut = Boolean(attendanceData.clockOut);

  // Stats cards data
  const statsCards = [
    {
      title: "Present Days",
      value: overview.presentDays || 0,
      icon: UserCheck,
      description: `Late: ${overview.lateDays || 0} days`,
      color: "bg-[#16A34A]",
    },
    {
      title: "Leave Balance",
      value: overview.leaveBalance || 0,
      icon: CalendarDays,
      description: "Available days",
      color: "bg-[#002185]",
    },
    {
      title: "Late Days",
      value: overview.lateDays || 0,
      icon: TrendingDown,
      description: `Out of ${totalDays} days`,
      color: "bg-[#F97316]",
    },
    {
      title: "Net Salary",
      value: formatCurrency(overview.netSalary || 0),
      icon: Banknote,
      description: latestPayslip.month
        ? formatMonth(latestPayslip.month)
        : "Current month",
      color: "bg-[#002185]",
    },
  ];

  // Attendance summary
  const attendanceSummary = {
    totalDays: totalDays || 0,
    present: overview.presentDays || 0,
    late: overview.lateDays || 0,
    absent: 0,
  };

  // Leave balance
  const leaveBalance = {
    total: overview.leaveBalance || 0,
    used: 0,
    remaining: overview.leaveBalance || 0,
  };

  return (
    <div className="space-y-8">
      {/* Header with Profile */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#002185] flex items-center justify-center shadow-md ring-4 ring-[#002185]/10 shrink-0">
              {employee.avatar || employee.profile_picture || employee.avatar_url ? (
                <img
                  src={employee.avatar || employee.profile_picture || employee.avatar_url}
                  alt={employee.fullName || "Employee"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#ff5500] text-white flex items-center justify-center font-bold text-lg select-none">
                  {employee.fullName
                    ? employee.fullName
                        .trim()
                        .split(/\s+/)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "MA"}
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${accountBadge.dotColor}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#002185]">
                Welcome back, {employee.fullName || user?.fullName || "Mohammed Awal"}!
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-[#64748B]">
                <span className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-full px-2.5 py-1">
                  <Briefcase className="w-3.5 h-3.5 text-[#002185]" />
                  {employee.position || user?.position || "Frontend Developer"}
                </span>
                <span className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-full px-2.5 py-1">
                  <Building2 className="w-3.5 h-3.5 text-[#002185]" />
                  {employee.department || user?.department || "Engineering"}
                </span>
                <span className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-full px-2.5 py-1">
                  <Mail className="w-3.5 h-3.5 text-[#002185]" />
                  {employee.email || user?.email || "awalm8043@gmail.com"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${accountBadge.className}`}
            >
              {accountBadge.label}
            </span>
            {(employee.employeeId || employee._id) && (
              <span className="text-sm text-[#64748B] bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0] font-medium font-mono">
                ID: {employee.employeeId || employee._id?.slice(-6)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Today's Attendance */}
      <div className="relative overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm hover:border-[#ff5500] transition-all duration-300">
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#002185]/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#ff5500]/5 blur-3xl" />

        <div className="relative p-6 md:p-7">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#002185] flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5 text-white" />
            </div>
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Today's Attendance
            </h3>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center gap-6">
            <div className="flex items-center gap-4 shrink-0">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  hasClockedIn ? "bg-[#F0FDF4]" : "bg-[#F8FAFC]"
                }`}
              >
                {hasClockedIn ? (
                  <CheckCircle className="w-7 h-7 text-[#16A34A]" />
                ) : (
                  <AlertCircle className="w-7 h-7 text-[#94A3B8]" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-[#002185] leading-tight">
                  {hasClockedIn
                    ? attendanceData.status || "Clocked In"
                    : "Not Clocked In"}
                </p>
                {hasClockedIn && attendanceData.status ? (
                  <span
                    className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                      attendanceData.status,
                    )}`}
                  >
                    <CheckCircle className="w-3 h-3" />
                    {attendanceData.status}
                  </span>
                ) : !hasClockedIn ? (
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#64748B] text-white">
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 flex-1 xl:max-w-md">
              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-center">
                <LogIn className="w-4 h-4 text-[#16A34A] mx-auto mb-1.5" />
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#64748B]">
                  Check In
                </p>
                <p className="text-sm font-bold text-[#002185] mt-0.5">
                  {hasClockedIn ? formatTime(attendanceData.clockIn) : "--:--"}
                </p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-center">
                <LogOut className="w-4 h-4 text-[#ff5500] mx-auto mb-1.5" />
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#64748B]">
                  Check Out
                </p>
                <p className="text-sm font-bold text-[#002185] mt-0.5">
                  {hasClockedOut
                    ? formatTime(attendanceData.clockOut)
                    : "--:--"}
                </p>
              </div>
              <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-center">
                <Clock className="w-4 h-4 text-[#002185] mx-auto mb-1.5" />
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#64748B]">
                  Hours
                </p>
                <p className="text-sm font-bold text-[#002185] mt-0.5">
                  {attendanceData.workHours || 0}h
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 xl:ml-auto">
              <button
                onClick={handleClockIn}
                disabled={hasClockedIn || isLoading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-300 ${
                  hasClockedIn || isLoading
                    ? "bg-[#E2E8F0] text-[#64748B] cursor-not-allowed"
                    : "bg-[#002185] text-white hover:bg-[#ff5500] hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                <LogIn className="w-4 h-4" />
                {isLoading ? "Processing..." : "Clock In"}
              </button>
              <button
                onClick={handleClockOut}
                disabled={!hasClockedIn || hasClockedOut || isLoading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  !hasClockedIn || hasClockedOut || isLoading
                    ? "bg-[#E2E8F0] text-[#64748B] cursor-not-allowed"
                    : "bg-[#ff5500] text-white hover:bg-[#002185] shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                <LogOut className="w-4 h-4" />
                {isLoading ? "Processing..." : "Clock Out"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#64748B]">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-[#002185] mt-2 truncate">
                    {stat.value}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">
                    {stat.description}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center shrink-0 shadow-sm`}
                >
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Summary & Leave Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300">
          <h3 className="text-lg font-semibold text-[#002185] mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#ff5500]" />
            Attendance Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Total Days</span>
              <span className="text-sm font-semibold text-[#002185]">
                {attendanceSummary.totalDays}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Present</span>
              <span className="text-sm font-semibold text-[#16A34A]">
                {attendanceSummary.present}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Late</span>
              <span className="text-sm font-semibold text-[#F97316]">
                {attendanceSummary.late}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">Absent</span>
              <span className="text-sm font-semibold text-[#DC2626]">
                {attendanceSummary.absent}
              </span>
            </div>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300">
          <h3 className="text-lg font-semibold text-[#002185] mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#ff5500]" />
            Leave Balance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Total Leave</span>
              <span className="text-sm font-semibold text-[#002185]">
                {leaveBalance.total} days
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Used</span>
              <span className="text-sm font-semibold text-[#F97316]">
                {leaveBalance.used} days
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">Remaining</span>
              <span className="text-sm font-semibold text-[#16A34A]">
                {leaveBalance.remaining} days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leave Requests & Latest Payslip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leave Requests */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#002185] flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#ff5500]" />
              Recent Leave Requests
            </h3>
            <button
              onClick={() =>{navigate("/employee/dashboard/leave");scrollTo({top:0, behavior:"smooth"})}}
              className="text-sm text-[#002185] hover:text-[#ff5500] font-medium transition-colors duration-300"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {recentLeaves && recentLeaves.length > 0 ? (
              recentLeaves.slice(0, 3).map((request, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-[#E2E8F0] last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#002185]">
                      {request.leaveType || "Leave Request"}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      {formatDate(request.startDate)} -{" "}
                      {formatDate(request.endDate)} ({request.days || 0} days)
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
                  >
                    {request.status || "Pending"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-[#64748B]">
                <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-[#94A3B8]" />
                <p className="text-sm">No leave requests found</p>
                <button
                  onClick={() =>{
                    navigate("/employee/dashboard/leave");
                    scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="mt-2 text-sm text-[#002185] hover:text-[#ff5500] font-medium"
                >
                  Apply for Leave →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Latest Payslip */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#002185] flex items-center gap-2">
              <Banknote className="w-5 h-5 text-[#ff5500]" />
              Latest Payslip
            </h3>
            <button
              onClick={() => {
                navigate("/employee/dashboard/payslips");
                scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-sm text-[#002185] hover:text-[#ff5500] font-medium transition-colors duration-300"
            >
              View All →
            </button>
          </div>
          {latestPayslip && latestPayslip.amount ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                <span className="text-sm text-[#64748B]">Month</span>
                <span className="text-sm font-semibold text-[#002185]">
                  {formatMonth(latestPayslip.month)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                <span className="text-sm text-[#64748B]">Gross Salary</span>
                <span className="text-sm font-semibold text-[#002185]">
                  {formatCurrency(latestPayslip.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                <span className="text-sm text-[#64748B]">Status</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor("Paid")}`}
                >
                  Paid
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-semibold text-[#002185]">
                  Net Salary
                </span>
                <span className="text-lg font-bold text-[#002185]">
                  {formatCurrency(
                    overview.netSalary || latestPayslip.amount || 0,
                  )}
                </span>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/employee/dashboard/payslips");
                    scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#002185] text-white rounded-lg hover:bg-[#ff5500] transition-all duration-300 text-sm font-medium cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate("/employee/dashboard/payslips");
                    scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:border-[#ff5500] hover:text-[#ff5500] transition-all duration-300 text-sm font-medium cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-[#64748B]">
              <Banknote className="w-12 h-12 mx-auto mb-3 text-[#94A3B8]" />
              <p className="text-sm">No payslip available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
