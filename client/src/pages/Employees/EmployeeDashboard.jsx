import { useEffect, useState } from "react";
import {
  attendanceClockIn,
  attendanceClockOut,
  employeeDashboardOverview,
  syncAttendance,
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
  TrendingDown,
  Eye,
  Download,
  Clock,
  Zap,
  X,
  RefreshCw,
} from "lucide-react";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";
import { useManagement } from "../../context/ManagementContextProvider";
import { useNavigate } from "react-router-dom";
import EmployeeLeaveChart from "../../components/EmployeeLeaveChart";
import AnnouncementBoard from "../../components/AnnouncementBoard";
import ApplyLeaveModal from "../../components/modal/ApplyLeaveModal";
import EmployeePayslipsModal from "../../components/modal/EmployeePayslipsModal";
import ClockInOutCard from "../../components/ClockInOutCard";

const EmployeeDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [isSyncingAttendance, setIsSyncingAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    date: null,
    clockIn: null,
    clockOut: null,
    status: null,
    workHours: 0,
  });

  // Quick Actions Floating Menu & Modals State
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

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

  // Manual Sync Attendance & Re-evaluate lateness penalty logs
  const handleSyncAttendance = async () => {
    try {
      setIsSyncingAttendance(true);
      const { data } = await syncAttendance();
      if (data && data.success) {
        setShowToast({
          show: true,
          message:
            data.message ||
            `Attendance & lateness penalties synced successfully (${data.recordsEvaluated || 0} logs verified).`,
          type: "success",
        });
        await fetchEmployeeDashboardData();
      } else {
        setShowToast({
          show: true,
          message: data?.message || "Attendance sync completed.",
          type: "info",
        });
        await fetchEmployeeDashboardData();
      }
    } catch (err) {
      console.error("Error syncing attendance:", err);
      setShowToast({
        show: true,
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to re-evaluate attendance logs.",
        type: "error",
      });
    } finally {
      setIsSyncingAttendance(false);
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

    let bc;
    try {
      bc = new BroadcastChannel("eyenit_attendance_sync");
      bc.onmessage = (event) => {
        if (event.data?.type === "clock_in" || event.data?.type === "clock_out" || event.data?.type === "leave_updated") {
          fetchEmployeeDashboardData();
        }
      };
    } catch {
      // BroadcastChannel fallback
    }

    return () => {
      if (bc) {
        try {
          bc.close();
        } catch {
          // ignore
        }
      }
    };
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

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "approved":
      case "paid":
      case "present":
      case "on time":
      case "ontime":
        return "bg-[#ECFDF5] text-[#0F7A47] border border-[#A7E8C7]";
      case "pending":
        return "bg-[#FFF7E6] text-[#A5620A] border border-[#F5D398]";
      case "rejected":
      case "absent":
        return "bg-[#FDECEC] text-[#B32020] border border-[#F3B9B9]";
      case "late":
        return "bg-[#FFF0E6] text-[#C24A0A] border border-[#F6C7A3]";
      default:
        return "bg-[#F1F3F6] text-[#51606F] border border-[#DCE2E8]";
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
          className: "bg-[#ECFDF5] text-[#0F7A47] border border-[#A7E8C7]",
          dotColor: "bg-[#0F7A47]",
        };
      case "suspended":
        return {
          label: "Suspended",
          className: "bg-[#FDECEC] text-[#B32020] border border-[#F3B9B9]",
          dotColor: "bg-[#B32020]",
        };
      case "inactive":
      default:
        return {
          label: "Inactive",
          className: "bg-[#F1F3F6] text-[#51606F] border border-[#DCE2E8]",
          dotColor: "bg-[#64748B]",
        };
    }
  };

  const accountBadge = getAccountStatusBadge(currentStatus);

  // Calculate total days
  const totalDays =
    overview.totalDays !== undefined
      ? overview.totalDays
      : (overview.presentDays || 0) + (overview.absentDays || 0);

  // Check if user has clocked in today
  const hasClockedIn = Boolean(attendanceData.clockIn);
  const hasClockedOut = Boolean(attendanceData.clockOut);

  // Stats cards data
  const statsCards = [
    {
      title: "Present Days",
      value: overview.presentDays !== undefined ? overview.presentDays : 0,
      icon: UserCheck,
      description: `Late ${overview.lateDays || 0} · On time ${overview.onTimeDays || 0}`,
      accent: "#0F7A47",
    },
    {
      title: "Leave Balance",
      value: `${overview.remainingLeaveDays !== undefined ? overview.remainingLeaveDays : overview.leaveBalance || 0} days`,
      icon: CalendarDays,
      description: `Used ${overview.usedLeaveDays || 0} · Pending ${overview.pendingLeaveDays || 0}`,
      accent: "#002185",
    },
    {
      title: "Late Days",
      value: overview.lateDays !== undefined ? overview.lateDays : 0,
      icon: TrendingDown,
      description: overview.totalLateMinutes
        ? `${overview.totalLateMinutes} mins total delay`
        : `Deduction GH₵${(overview.totalLatenessDeduction || 0).toFixed(2)}`,
      accent: "#C24A0A",
    },
    {
      title: "Net Salary",
      value: formatCurrency(overview.netSalary || 0),
      icon: Banknote,
      description: latestPayslip.month
        ? formatMonth(latestPayslip.month)
        : "Projected net take-home",
      accent: "#002185",
    },
  ];

  // Attendance summary (MTD Live Calculation)
  const attendanceSummary = {
    totalDays: totalDays,
    present: overview.presentDays !== undefined ? overview.presentDays : 0,
    late: overview.lateDays !== undefined ? overview.lateDays : 0,
    absent: overview.absentDays !== undefined ? overview.absentDays : 0,
  };

  // Leave balance (Live Calculation)
  const leaveBalance = {
    total: overview.totalLeaveDays || 15,
    used: overview.usedLeaveDays || 0,
    remaining: overview.remainingLeaveDays !== undefined ? overview.remainingLeaveDays : overview.leaveBalance || 15,
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
      {/* Header with Profile */}
      <div className="bg-white border border-[#E5E9EE] rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#002185] flex items-center justify-center shrink-0">
              {employee.avatar || employee.profile_picture || employee.avatar_url ? (
                <img
                  src={employee.avatar || employee.profile_picture || employee.avatar_url}
                  alt={employee.fullName || "Employee"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#002185] text-white flex items-center justify-center font-semibold text-base select-none">
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
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${accountBadge.dotColor}`} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#0F1B33] tracking-tight">
                Welcome back, {employee.fullName || user?.fullName || "Mohammed Awal"}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-[#5B6B7C]">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#8B98A6]" />
                  {employee.position || user?.position || "Frontend Developer"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#8B98A6]" />
                  {employee.department || user?.department || "Engineering"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#8B98A6]" />
                  {employee.email || user?.email || "awalm8043@gmail.com"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-sync-attendance"
              type="button"
              onClick={handleSyncAttendance}
              disabled={isSyncingAttendance}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#002185] bg-[#F0F4FE] hover:bg-[#E1EAFE] border border-[#C7D7FE] transition-colors cursor-pointer disabled:opacity-60"
              title="Re-evaluate lateness delay and tiered penalty calculations for current pay period"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSyncingAttendance ? "animate-spin text-[#002185]" : "text-[#002185]"
                }`}
              />
              <span>{isSyncingAttendance ? "Syncing..." : "Sync Attendance"}</span>
            </button>
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-medium ${accountBadge.className}`}
            >
              {accountBadge.label}
            </span>
            {(employee.employeeId || employee._id) && (
              <span className="text-xs text-[#5B6B7C] bg-[#F7F8FA] px-2.5 py-1 rounded-md border border-[#E5E9EE] font-mono">
                ID {employee.employeeId || employee._id?.slice(-6)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Dashboard Overview Body */}
      <div className="space-y-6">
        {/* User-Friendly Clock In / Clock Out Card */}
        <ClockInOutCard
          attendanceData={attendanceData}
          hasClockedIn={hasClockedIn}
          hasClockedOut={hasClockedOut}
          isLoading={isLoading}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          userRole={user?.role}
        />

        {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsCards.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white border border-[#E5E9EE] rounded-xl p-5"
                >
                  <div className="flex items-center gap-1.5 text-[#8B98A6]">
                    <IconComponent className="w-3.5 h-3.5" />
                    <p className="text-xs font-medium">{stat.title}</p>
                  </div>
                  <p className="text-2xl font-semibold text-[#0F1B33] mt-2 tracking-tight truncate">
                    {stat.value}
                  </p>
                  <p className="text-xs text-[#8B98A6] mt-1.5">
                    {stat.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Company Announcement Board */}
          <AnnouncementBoard role="employee" />

          {/* Attendance Summary & Leave Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Attendance Summary */}
            <div className="bg-white border border-[#E5E9EE] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#0F1B33] mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#8B98A6]" />
                Attendance Summary
              </h3>
              <div className="space-y-0">
                <div className="flex justify-between items-center py-2.5 border-b border-[#EEF1F4]">
                  <span className="text-sm text-[#5B6B7C]">Total Days</span>
                  <span className="text-sm font-semibold text-[#0F1B33]">
                    {attendanceSummary.totalDays}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-[#EEF1F4]">
                  <span className="text-sm text-[#5B6B7C]">Present</span>
                  <span className="text-sm font-semibold text-[#0F7A47]">
                    {attendanceSummary.present}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-[#EEF1F4]">
                  <span className="text-sm text-[#5B6B7C]">Late</span>
                  <span className="text-sm font-semibold text-[#C24A0A]">
                    {attendanceSummary.late}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-[#5B6B7C]">Absent</span>
                  <span className="text-sm font-semibold text-[#B32020]">
                    {attendanceSummary.absent}
                  </span>
                </div>
              </div>
            </div>

            {/* Leave Balance */}
            <div className="bg-white border border-[#E5E9EE] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#0F1B33] mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#8B98A6]" />
                Leave Balance
              </h3>
              <div className="space-y-0">
                <div className="flex justify-between items-center py-2.5 border-b border-[#EEF1F4]">
                  <span className="text-sm text-[#5B6B7C]">Total Leave</span>
                  <span className="text-sm font-semibold text-[#0F1B33]">
                    {leaveBalance.total} days
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-[#EEF1F4]">
                  <span className="text-sm text-[#5B6B7C]">Used</span>
                  <span className="text-sm font-semibold text-[#C24A0A]">
                    {leaveBalance.used} days
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-[#5B6B7C]">Remaining</span>
                  <span className="text-sm font-semibold text-[#0F7A47]">
                    {leaveBalance.remaining} days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Requests by Leave Type Chart (Live Database Records) & Recent Leave Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dynamic Leave Type Distribution Chart */}
            <EmployeeLeaveChart
              onApplyLeave={() => {
                navigate("/employee/dashboard/leave");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Recent Leave Requests */}
            <div className="bg-white border border-[#E5E9EE] rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#0F1B33] flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-[#8B98A6]" />
                    Recent Leave Requests
                  </h3>
                  <button
                    onClick={() => {
                      navigate("/employee/dashboard/leave");
                      scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs text-[#002185] hover:underline font-medium"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-0">
                  {recentLeaves && recentLeaves.length > 0 ? (
                    recentLeaves.slice(0, 4).map((request, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2.5 border-b border-[#EEF1F4] last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-[#0F1B33]">
                            {request.leaveType || "Leave Request"}
                          </p>
                          <p className="text-xs text-[#8B98A6] mt-0.5">
                            {formatDate(request.startDate)} –{" "}
                            {formatDate(request.endDate)} ({request.days || 0} days)
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${getStatusColor(
                            request.status,
                          )}`}
                        >
                          {request.status || "Pending"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CalendarCheck className="w-8 h-8 mx-auto mb-3 text-[#C6CDD5]" />
                      <p className="text-sm font-medium text-[#0F1B33]">
                        No leave requests found
                      </p>
                      <p className="text-xs text-[#8B98A6] mt-0.5">
                        You have not submitted any time-off requests yet.
                      </p>
                      <button
                        onClick={() => {
                          navigate("/employee/dashboard/leave");
                          scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002185] text-white rounded-lg text-xs font-medium hover:bg-[#001a6b] transition-colors"
                      >
                        Apply for Leave
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Latest Payslip */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E5E9EE] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#0F1B33] flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-[#8B98A6]" />
                  Latest Payslip
                </h3>
                <button
                  onClick={() => {
                    navigate("/employee/dashboard/payslips");
                    scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-xs text-[#002185] hover:underline font-medium"
                >
                  View all
                </button>
              </div>
              {latestPayslip && latestPayslip.amount ? (
                <div className="space-y-0">
                  <div className="flex justify-between items-center py-2.5 border-b border-[#EEF1F4]">
                    <span className="text-sm text-[#5B6B7C]">Month</span>
                    <span className="text-sm font-semibold text-[#0F1B33]">
                      {formatMonth(latestPayslip.month)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-[#EEF1F4]">
                    <span className="text-sm text-[#5B6B7C]">Gross Salary</span>
                    <span className="text-sm font-semibold text-[#0F1B33]">
                      {formatCurrency(latestPayslip.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-[#EEF1F4]">
                    <span className="text-sm text-[#5B6B7C]">Status</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${getStatusColor(
                        "Paid",
                      )}`}
                    >
                      Paid
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <span className="text-sm font-semibold text-[#0F1B33]">
                      Net Salary
                    </span>
                    <span className="text-lg font-semibold text-[#0F1B33] tracking-tight">
                      {formatCurrency(
                        overview.netSalary || latestPayslip.amount || 0,
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-[#EEF1F4]">
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/employee/dashboard/payslips");
                        scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#002185] text-white rounded-lg hover:bg-[#001a6b] transition-colors text-sm font-medium cursor-pointer"
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
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-[#E5E9EE] text-[#5B6B7C] rounded-lg hover:border-[#002185] hover:text-[#002185] transition-colors text-sm font-medium cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Banknote className="w-8 h-8 mx-auto mb-3 text-[#C6CDD5]" />
                  <p className="text-sm text-[#8B98A6]">No payslip available</p>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Quick Actions Floating Action Menu (Mobile & Desktop Accessible) */}
      <div className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8">
        {/* Backdrop overlay when open */}
        {quickActionsOpen && (
          <div
            onClick={() => setQuickActionsOpen(false)}
            className="fixed inset-0 bg-[#0F1B33]/20 z-30"
          />
        )}

        {/* Floating Menu Action Items */}
        <div
          className={`relative z-40 flex flex-col items-end gap-2 transition-all duration-200 ${
            quickActionsOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-3 pointer-events-none"
          }`}
        >
          {/* Action 0: Sync Attendance */}
          <button
            id="quick-action-sync-attendance"
            type="button"
            disabled={isSyncingAttendance}
            onClick={async () => {
              setQuickActionsOpen(false);
              await handleSyncAttendance();
            }}
            className="group flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg bg-[#0F1B33] shadow-lg hover:bg-[#1A2947] transition-colors duration-150 cursor-pointer disabled:opacity-60"
          >
            <span className="text-xs font-medium text-white whitespace-nowrap">
              {isSyncingAttendance ? "Syncing Logs..." : "Sync Attendance"}
            </span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white bg-white/10">
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSyncingAttendance ? "animate-spin text-white" : "text-white"
                }`}
              />
            </div>
          </button>

          {/* Action 1: Clock In / Clock Out */}
          <button
            id="quick-action-clock-in-out"
            type="button"
            onClick={async () => {
              setQuickActionsOpen(false);
              if (!attendanceData.clockIn) {
                await handleClockIn();
              } else if (!attendanceData.clockOut) {
                await handleClockOut();
              } else {
                navigate("/employee/dashboard/attendance");
              }
            }}
            className="group flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg bg-[#0F1B33] shadow-lg hover:bg-[#1A2947] transition-colors duration-150 cursor-pointer"
          >
            <span className="text-xs font-medium text-white whitespace-nowrap">
              {!attendanceData.clockIn
                ? "Clock In Now"
                : !attendanceData.clockOut
                ? "Clock Out Now"
                : "View Today's Attendance"}
            </span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white bg-white/10">
              {!attendanceData.clockIn ? (
                <LogIn className="w-3.5 h-3.5" />
              ) : !attendanceData.clockOut ? (
                <LogOut className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {/* Action 2: Request Leave */}
          <button
            id="quick-action-request-leave"
            type="button"
            onClick={() => {
              setQuickActionsOpen(false);
              setShowApplyLeaveModal(true);
            }}
            className="group flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg bg-[#0F1B33] shadow-lg hover:bg-[#1A2947] transition-colors duration-150 cursor-pointer"
          >
            <span className="text-xs font-medium text-white whitespace-nowrap">
              Request Leave
            </span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white bg-white/10">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Action 3: View Payslip */}
          <button
            id="quick-action-view-payslip"
            type="button"
            onClick={() => {
              setQuickActionsOpen(false);
              if (latestPayslip && (latestPayslip.amount || latestPayslip.payslipNumber)) {
                setShowPayslipModal(true);
              } else {
                navigate("/employee/dashboard/payslips");
              }
            }}
            className="group flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg bg-[#0F1B33] shadow-lg hover:bg-[#1A2947] transition-colors duration-150 cursor-pointer"
          >
            <span className="text-xs font-medium text-white whitespace-nowrap">
              View Payslip
            </span>
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-white bg-white/10">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Main Floating Trigger Button (FAB) */}
        <div className="relative z-40 mt-3 flex items-center justify-end">
          <button
            id="btn-quick-actions-fab"
            type="button"
            aria-expanded={quickActionsOpen}
            aria-label="Quick Actions Floating Menu"
            onClick={() => setQuickActionsOpen((prev) => !prev)}
            className={`flex items-center gap-2 h-11 px-4 rounded-lg text-white shadow-lg transition-colors duration-150 cursor-pointer ${
              quickActionsOpen ? "bg-[#C24A0A]" : "bg-[#002185] hover:bg-[#001a6b]"
            }`}
          >
            {quickActionsOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold tracking-wide">
              {quickActionsOpen ? "Close" : "Quick Actions"}
            </span>
          </button>
        </div>
      </div>

      {/* Direct Modals Triggered by Quick Actions */}
      {showApplyLeaveModal && (
        <ApplyLeaveModal
          onClose={() => setShowApplyLeaveModal(false)}
          onSuccess={async () => {
            await fetchEmployeeDashboardData();
            setShowToast({
              message: "Leave request submitted successfully!",
              type: "success",
              show: true,
            });
          }}
        />
      )}

      {showPayslipModal && (latestPayslip || dashboardData?.payslips?.[0]) && (
        <EmployeePayslipsModal
          payslip={latestPayslip || dashboardData?.payslips?.[0]}
          allPayslips={dashboardData?.payslips || [latestPayslip]}
          onClose={() => setShowPayslipModal(false)}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;