import { useEffect, useState, useCallback } from "react";
import {
  attendanceClockIn,
  attendanceClockOut,
  employeeDashboardOverview,
  getEmployeeMe,
  syncAttendance,
} from "../../apis/fontApis";
import {
  UserCheck,
  CalendarDays,
  CalendarCheck,
  Clock,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  Eye,
  Download,
  ShieldCheck,
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
import ShiftStatusCard from "../../components/ShiftStatusCard";
import WeeklyAttendanceChart from "../../components/WeeklyAttendanceChart";
import { downloadPayslipPDF } from "../../utils/payslipPdfGenerator";

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
    delayMinutes: 0,
    lateMinutes: 0,
    latePenalty: 0,
    penaltyTier: "",
  });

  // Modals State
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  const { setShowToast, user, setUser } = useManagement();
  const navigate = useNavigate();

  const fetchEmployeeDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await employeeDashboardOverview();

      if (data && data.success) {
        setDashboardData(data);
        let resolvedEmployee = data.employee;

        // If employee profile object is incomplete, fetch full profile from /employee/me
        if (!resolvedEmployee || !resolvedEmployee.fullName) {
          try {
            const meRes = await getEmployeeMe();
            if (meRes?.data?.employee || meRes?.data?.user) {
              resolvedEmployee = meRes.data.employee || meRes.data.user;
            }
          } catch {
            // ignore fallback error
          }
        }

        if (resolvedEmployee) {
          localStorage.setItem("employeeData", JSON.stringify(resolvedEmployee));
          if (typeof setUser === "function") {
            setUser(resolvedEmployee);
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
            delayMinutes:
              data.todayAttendance.delayMinutes !== undefined
                ? data.todayAttendance.delayMinutes
                : data.todayAttendance.lateMinutes || 0,
            lateMinutes:
              data.todayAttendance.lateMinutes !== undefined
                ? data.todayAttendance.lateMinutes
                : data.todayAttendance.delayMinutes || 0,
            latePenalty: data.todayAttendance.latePenalty || 0,
            penaltyTier: data.todayAttendance.penaltyTier || "",
          });
        } else {
          setAttendanceData({
            date: new Date().toISOString().split("T")[0],
            clockIn: null,
            clockOut: null,
            status: null,
            workHours: 0,
            delayMinutes: 0,
            lateMinutes: 0,
            latePenalty: 0,
            penaltyTier: "",
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
  }, [setUser, setShowToast]);

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
        const delayMins =
          clockInData?.delayMinutes !== undefined
            ? clockInData.delayMinutes
            : clockInData?.lateMinutes !== undefined
            ? clockInData.lateMinutes
            : data.delayMinutes !== undefined
            ? data.delayMinutes
            : data.lateMinutes || 0;
        const latePenalty =
          clockInData?.latePenalty !== undefined
            ? clockInData.latePenalty
            : data.latePenalty || 0;
        const penaltyTier =
          clockInData?.penaltyTier || data.penaltyTier || "";
        const status =
          clockInData?.status ||
          (data.status ? (String(data.status).toLowerCase() === "late" ? "Late" : "On Time") : delayMins > 0 ? "Late" : "On Time");

        setAttendanceData({
          date: attendanceDate,
          clockIn: clockInTime,
          clockOut: null,
          status: status,
          workHours: 0,
          delayMinutes: delayMins,
          lateMinutes: delayMins,
          latePenalty: latePenalty,
          penaltyTier: penaltyTier,
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
  }, [fetchEmployeeDashboardData]);

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
    if (!monthString) return "Current Month";
    try {
      if (monthString.includes("-")) {
        const [year, month] = monthString.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString("en-GH", {
          year: "numeric",
          month: "long",
        });
      }
      return monthString;
    } catch {
      return monthString;
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "approved":
      case "paid":
      case "published":
      case "present":
      case "on time":
      case "ontime":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60";
      case "pending":
      case "pending management review":
        return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60";
      case "rejected":
      case "absent":
        return "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60";
      case "late":
        return "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60";
      default:
        return "bg-slate-100 dark:bg-[#162033] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60";
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
        <p className="text-slate-500 dark:text-slate-400">No dashboard data available</p>
      </div>
    );
  }

  // Extract data from API response
  const employee = dashboardData.employee || {};
  const overview = dashboardData.overview || {};
  const recentLeaves = dashboardData.recentLeaves || [];

  // Get latest payslip and privacy state from overview
  const latestPayslip = overview.latestPayslip || {};
  const isPayslipReleased = Boolean(
    latestPayslip.isReleased ||
    (latestPayslip.status && ["paid", "published"].includes(String(latestPayslip.status).toLowerCase()))
  );

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
          className: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60",
          dotColor: "bg-emerald-600 dark:bg-emerald-400",
        };
      case "suspended":
        return {
          label: "Suspended",
          className: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60",
          dotColor: "bg-rose-600 dark:bg-rose-400",
        };
      case "inactive":
      default:
        return {
          label: "Inactive",
          className: "bg-slate-100 dark:bg-[#162033] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60",
          dotColor: "bg-slate-500",
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

  // Shift status label & description with indicator icon
  const getShiftStatusInfo = () => {
    if (hasClockedOut) {
      return {
        label: "Clocked Out",
        desc: `Logged ${Number(attendanceData.workHours || 0).toFixed(1)} hrs today`,
        accent: "#002185",
        statusBadge: "bg-[#F1F3F6] text-[#51606F]",
        icon: CheckCircle2,
      };
    }
    if (hasClockedIn) {
      const isLate =
        attendanceData.status === "Late" ||
        attendanceData.status === "late" ||
        Number(attendanceData.delayMinutes || attendanceData.lateMinutes || 0) > 0;
      const timeStr = new Date(attendanceData.clockIn).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        label: isLate ? "Late Shift" : "Active Shift",
        desc: `In: ${timeStr} · ${isLate ? "Delay recorded" : "On schedule"}`,
        accent: isLate ? "#C24A0A" : "#0F7A47",
        statusBadge: isLate
          ? "bg-[#FFF0E6] text-[#C24A0A]"
          : "bg-[#ECFDF5] text-[#0F7A47]",
        icon: isLate ? AlertTriangle : CheckCircle2,
      };
    }
    return {
      label: "Not Clocked In",
      desc: "Awaiting today's shift clock-in",
      accent: "#51606F",
      statusBadge: "bg-[#F1F3F6] text-[#51606F]",
      icon: Clock,
    };
  };

  const shiftInfo = getShiftStatusInfo();

  // 4 Standard Daily Metric Cards (Strictly Privacy Protected - Zero Salary Projections)
  const statsCards = [
    {
      title: "Shift Status",
      value: shiftInfo.label,
      icon: shiftInfo.icon,
      description: shiftInfo.desc,
      accent: shiftInfo.accent,
    },
    {
      title: "Hours Logged",
      value: `${Number(attendanceData.workHours || 0).toFixed(1)} hrs`,
      icon: UserCheck,
      description: `${overview.presentDays || 0} shifts recorded this cycle`,
      accent: "#002185",
    },
    {
      title: "Leave Balance",
      value: `${overview.remainingLeaveDays !== undefined ? overview.remainingLeaveDays : overview.leaveBalance || 0} days`,
      icon: CalendarDays,
      description: `${overview.usedLeaveDays || 0} used of ${overview.totalLeaveDays || 15} days`,
      accent: "#0F7A47",
    },
    {
      title: "Announcements",
      value: "Active",
      icon: Megaphone,
      description: "Company bulletins & notices",
      accent: "#C24A0A",
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

  const currentPayMonth = latestPayslip.month || `${new Date().toLocaleDateString("en-US", { month: "long" })} ${new Date().getFullYear()}`;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
      {/* Top Header Row with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E48] dark:text-white">
            Employee Dashboard
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Real-time shift clocking, attendance telemetry, and monthly balance metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-sync-attendance"
            type="button"
            onClick={handleSyncAttendance}
            disabled={isSyncingAttendance}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#002185] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
            title="Re-evaluate lateness delay and tiered penalty calculations for current pay period"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isSyncingAttendance ? "animate-spin text-[#002185] dark:text-blue-400" : "text-[#002185] dark:text-blue-400"
              }`}
            />
            <span>{isSyncingAttendance ? "Updating..." : "Refresh Attendance"}</span>
          </button>
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-medium ${accountBadge.className}`}
          >
            {accountBadge.label}
          </span>
        </div>
      </div>

      {/* Main Dashboard Overview Body */}
      <div className="space-y-6">
        {/* Real-time Dynamic Shift Attendance Status Card */}
        <ShiftStatusCard
          attendanceData={attendanceData}
          hasClockedIn={hasClockedIn}
          hasClockedOut={hasClockedOut}
          isLoading={isLoading}
          onClockIn={handleClockIn}
          onRefresh={handleSyncAttendance}
          user={employee?._id ? employee : user}
          userName={employee?.fullName || user?.fullName || employee?.name || user?.name}
        />

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

        {/* 4 Standard Daily Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <IconComponent className="w-3.5 h-3.5" />
                  <p className="text-xs font-medium">{stat.title}</p>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight truncate">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Company Announcement Board */}
        <AnnouncementBoard role="employee" />

        {/* Interactive Weekly Attendance & Shift Performance Chart (Recharts) */}
        <WeeklyAttendanceChart
          attendanceLogs={dashboardData?.attendanceRecords || dashboardData?.attendanceLogs || []}
          title="Weekly Attendance & Shift Performance"
          subtitle="Monitor weekly attendance patterns and total hours worked against shift requirements"
        />

        {/* Attendance Summary & Leave Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Attendance Summary */}
          <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-400" />
              Attendance Summary
            </h3>
            <div className="space-y-0">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Days</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {attendanceSummary.totalDays}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-sm text-slate-600 dark:text-slate-400">Present</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {attendanceSummary.present}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-sm text-slate-600 dark:text-slate-400">Late</span>
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {attendanceSummary.late}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-slate-600 dark:text-slate-400">Absent</span>
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {attendanceSummary.absent}
                </span>
              </div>
            </div>
          </div>

          {/* Leave Balance */}
          <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              Leave Balance
            </h3>
            <div className="space-y-0">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-sm text-slate-600 dark:text-slate-400">Total Leave</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {leaveBalance.total} days
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-sm text-slate-600 dark:text-slate-400">Used</span>
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {leaveBalance.used} days
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-slate-600 dark:text-slate-400">Remaining</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {leaveBalance.remaining} days
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Requests by Leave Type Chart & Recent Leave Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Dynamic Leave Type Distribution Chart */}
          <EmployeeLeaveChart
            onApplyLeave={() => {
              navigate("/employee/dashboard/leave");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />

          {/* Recent Leave Requests */}
          <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-slate-400" />
                  Recent Leave Requests
                </h3>
                <button
                  onClick={() => {
                    navigate("/employee/dashboard/leave");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-xs text-[#002185] dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="space-y-0">
                {recentLeaves && recentLeaves.length > 0 ? (
                  recentLeaves.slice(0, 4).map((request, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800/80 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {request.leaveType || "Leave Request"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatDate(request.startDate)} –{" "}
                          {formatDate(request.endDate)} ({request.days || 0} days)
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium ${getStatusColor(
                          request.status,
                        )}`}
                      >
                        {request.status || "Pending"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CalendarCheck className="w-8 h-8 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      No leave requests found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      You have not submitted any time-off requests yet.
                    </p>
                    <button
                      onClick={() => {
                        navigate("/employee/dashboard/leave");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      Apply for Leave
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payslip Status Widget: Enforcing strict privacy before official manager release */}
        <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#002185] dark:text-blue-400">
                {isPayslipReleased ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Monthly Payslip Status
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Official financial breakdown and disbursement release tracking
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isPayslipReleased ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {currentPayMonth} Payslip: Paid &amp; Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  <Lock className="w-3.5 h-3.5" />
                  {currentPayMonth} Payslip: Pending Management Review
                </span>
              )}
            </div>
          </div>

          {/* Body depending on release state */}
          {isPayslipReleased ? (
            <div className="pt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pay Month</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                    {formatMonth(latestPayslip.month || latestPayslip.payMonth)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Payment Status</p>
                  <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Paid &amp; Released
                  </p>
                </div>
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Official Payslip Status</p>
                  <p className="text-base font-bold text-emerald-800 dark:text-emerald-300 mt-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Available on Payslips
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Payslip #{latestPayslip.payslipNumber || latestPayslip.id || "OFFICIAL"} · Disbursed via {latestPayslip.paymentMethod || "Bank Transfer"}
                </p>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate("/employee/dashboard/payslips")}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Itemized Payslip on Payslips Page
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadPayslipPDF(latestPayslip);
                      setShowToast({
                        show: true,
                        message: "Official payslip PDF downloaded.",
                        type: "success",
                      });
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#162033] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-5 space-y-4">
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3.5">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                    Strict Salary Privacy Policy Enforced
                  </p>
                  <p className="text-xs text-amber-800/90 dark:text-amber-400 leading-relaxed">
                    Salary amounts, itemized allowances, attendance penalties, and final net earnings are kept strictly confidential until management officially reviews, approves, and marks the billing cycle as <strong>Paid &amp; Published</strong>.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cycle: {currentPayMonth} · Status: Locked pending administrator payment authorization
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/employee/dashboard/payslips")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-[#162033] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Historical Released Payslips
                </button>
              </div>
            </div>
          )}
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

      {showPayslipModal && latestPayslip && (
        <EmployeePayslipsModal
          payslip={latestPayslip}
          allPayslips={[latestPayslip]}
          onClose={() => setShowPayslipModal(false)}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
