import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  employeeDashboardOverview,
  getEmployeeMe,
  syncAttendance,
} from "../../apis/fontApis";
import {
  UserCheck,
  CalendarDays,
  CalendarCheck,
  Clock,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  Eye,
  Download,
  ShieldCheck,
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
import DailyShiftClock from "../../components/DailyShiftClock";
import ShiftStatusCard from "../../components/ShiftStatusCard";
import WeeklyAttendanceChart from "../../components/WeeklyAttendanceChart";
import LatenessDeductionsLineChart from "../../components/LatenessDeductionsLineChart";
import MonthlyAttendanceCalendarCard from "../../components/MonthlyAttendanceCalendarCard";
import EmployeeProfileIdentityBanner from "../../components/EmployeeProfileIdentityBanner";
import { downloadPayslipPDF } from "../../utils/payslipPdfGenerator";
import { useAttendance } from "../../context/AttendanceContext";

// Stable reference fallback for zero re-render allocations
const EMPTY_ARRAY = [];

// Pure date formatting helper declared at module scope
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

// Pure month formatting helper declared at module scope
const formatMonth = (monthString) => {
  if (!monthString) return "Current Month";
  try {
    if (monthString.includes("-")) {
      const [year, month] = monthString.split("-");
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
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

// Pure status styling helper declared at module scope
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

const EmployeeDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [isSyncingAttendance, setIsSyncingAttendance] = useState(false);

  // Centralized Global Attendance State
  const {
    todayRecord,
    clockIn: contextClockIn,
    clockOut: contextClockOut,
    refreshAttendance: contextRefreshAttendance,
    updateTodayRecord,
  } = useAttendance();

  const attendanceData = todayRecord;

  // Modals State
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);
  const [latenessThresholdAlert, setLatenessThresholdAlert] = useState(null);

  const { setShowToast, user, setUser, settings } = useManagement();
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

        if (resolvedEmployee && typeof setUser === "function") {
          setUser((prevUser) => {
            const mergedEmployee = {
              ...(prevUser || {}),
              ...resolvedEmployee,
              avatar:
                resolvedEmployee.avatar ||
                resolvedEmployee.avatarUrl ||
                resolvedEmployee.profilePicture ||
                resolvedEmployee.profile_image_url ||
                prevUser?.avatar ||
                prevUser?.avatarUrl ||
                prevUser?.profilePicture ||
                "",
              profilePicture:
                resolvedEmployee.profilePicture ||
                resolvedEmployee.avatar ||
                prevUser?.profilePicture ||
                prevUser?.avatar ||
                "",
            };

            // Avoid triggering context re-render cascade if identity fields are identical
            if (
              prevUser &&
              prevUser._id === mergedEmployee._id &&
              prevUser.fullName === mergedEmployee.fullName &&
              prevUser.avatar === mergedEmployee.avatar &&
              prevUser.role === mergedEmployee.role &&
              prevUser.status === mergedEmployee.status
            ) {
              return prevUser;
            }
            return mergedEmployee;
          });
        }

        if (data.todayAttendance && typeof updateTodayRecord === "function") {
          updateTodayRecord(data.todayAttendance);
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
  }, [setUser, setShowToast, updateTodayRecord]);

  // Stable refs for background timer watchdogs
  const contextRefreshRef = useRef(contextRefreshAttendance);
  contextRefreshRef.current = contextRefreshAttendance;
  const fetchDashboardDataRef = useRef(fetchEmployeeDashboardData);
  fetchDashboardDataRef.current = fetchEmployeeDashboardData;

  // Automated 12:00 AM (Midnight) Workday Reset & Rollover Timer
  useEffect(() => {
    const now = new Date();
    const tomorrowMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      1
    );
    const msUntilMidnight = Math.max(1000, tomorrowMidnight.getTime() - now.getTime());

    const timer = setTimeout(() => {
      console.log("[EmployeeDashboard] Midnight boundary reached: refreshing attendance status...");
      if (contextRefreshRef.current) {
        contextRefreshRef.current(false);
      }
      if (fetchDashboardDataRef.current) {
        fetchDashboardDataRef.current();
      }
    }, msUntilMidnight);

    // Watchdog check for date rollover (e.g. system wake)
    let lastDate = now.toISOString().split("T")[0];
    const watchdog = setInterval(() => {
      const currentDate = new Date().toISOString().split("T")[0];
      if (currentDate !== lastDate) {
        lastDate = currentDate;
        console.log("[EmployeeDashboard] Date rollover watchdog triggered:", currentDate);
        if (contextRefreshRef.current) {
          contextRefreshRef.current(false);
        }
        if (fetchDashboardDataRef.current) {
          fetchDashboardDataRef.current();
        }
      }
    }, 20000);

    return () => {
      clearTimeout(timer);
      clearInterval(watchdog);
    };
  }, []);

  // Manual Sync Attendance & Re-evaluate lateness penalty logs
  const handleSyncAttendance = useCallback(async () => {
    try {
      setIsSyncingAttendance(true);
      const { data } = await syncAttendance();
      if (contextRefreshRef.current) {
        await contextRefreshRef.current();
      }
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
  }, [fetchEmployeeDashboardData, setShowToast]);

  // Clock In Function via centralized AttendanceContext
  const handleClockIn = useCallback(async (reasonParam = "") => {
    try {
      setIsLoading(true);
      setIsError(null);
      const reasonToSend = typeof reasonParam === "string" ? reasonParam.trim() : "";
      const result = await contextClockIn(reasonToSend);

      const delayMins = result.record?.delayMinutes || result.record?.lateMinutes || 0;
      const latePenalty = result.record?.latePenalty || 0;
      const isLate = delayMins > 0;
      const isZeroPenalty = isLate && latePenalty === 0;
      const toastType = isZeroPenalty ? "info" : isLate ? "warning" : "success";

      setShowToast({
        show: true,
        message:
          result.data?.message ||
          (isLate
            ? isZeroPenalty
              ? `Clocked in (${delayMins} mins late). Company policy applied: No salary deduction for this delay.`
              : `Clocked in (${delayMins} mins late). Lateness penalty of GH₵${Number(latePenalty).toFixed(2)} has been applied as per company policy.`
            : "Clock in successful!"),
        type: toastType,
      });

      setAnalyticsRefreshKey((prev) => prev + 1);
      await fetchEmployeeDashboardData();
    } catch (error) {
      console.error("Clock in error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Clock in failed.";
      setIsError(errorMessage);
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [contextClockIn, fetchEmployeeDashboardData, setShowToast]);

  // Clock Out Function via centralized AttendanceContext
  const handleClockOut = useCallback(async (reason = "") => {
    try {
      setIsLoading(true);
      setIsError(null);
      const result = await contextClockOut(reason);

      setShowToast({
        show: true,
        message: result?.data?.message || "Clock out successful!",
        type: "success",
      });

      setAnalyticsRefreshKey((prev) => prev + 1);
      await fetchEmployeeDashboardData();
    } catch (error) {
      console.error("Clock out error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Clock out failed.";
      setIsError(errorMessage);
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [contextClockOut, fetchEmployeeDashboardData, setShowToast]);

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

  const handleNavigateToLeave = useCallback(() => {
    navigate("/employee/dashboard/leave");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [navigate]);

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
  const recentLeaves = dashboardData.recentLeaves || EMPTY_ARRAY;

  // Get latest payslip and privacy state from overview
  const latestPayslip = overview.latestPayslip || {};
  const isPayslipReleased = Boolean(
    latestPayslip.isReleased ||
    (latestPayslip.status && ["paid", "published"].includes(String(latestPayslip.status).toLowerCase()))
  );

  // Stable attendance logs reference to avoid re-rendering heavy child charts
  const attendanceLogs = dashboardData.attendanceRecords || dashboardData.attendanceLogs || EMPTY_ARRAY;

  // Calculate total days
  const totalDays =
    overview.totalDays !== undefined
      ? overview.totalDays
      : (overview.presentDays || 0) + (overview.absentDays || 0);

  // Precompute today shift status with useMemo to maintain 60FPS
  const todayStr = new Date().toISOString().split("T")[0];
  const isTodayRecord = Boolean(!attendanceData?.date || attendanceData.date === todayStr);
  const hasClockedIn = isTodayRecord && Boolean(attendanceData?.clockIn || attendanceData?.clockInTime);
  const hasClockedOut = isTodayRecord && Boolean(attendanceData?.clockOut || attendanceData?.clockOutTime);

  const isLateShift =
    hasClockedIn &&
    (attendanceData?.status === "Late" ||
      attendanceData?.status === "late" ||
      Number(attendanceData?.delayMinutes || attendanceData?.lateMinutes || 0) > 0);

  let clockInTimeStr = "";
  if (hasClockedIn && attendanceData?.clockIn) {
    try {
      clockInTimeStr = new Date(attendanceData.clockIn).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      clockInTimeStr = "";
    }
  }

  // Shift status label & description with indicator icon
  const shiftInfo = hasClockedOut
    ? {
        label: "Clocked Out",
        desc: `Logged ${Number(attendanceData?.workHours || 0).toFixed(1)} hrs today`,
        icon: CheckCircle2,
      }
    : hasClockedIn
    ? {
        label: isLateShift ? "Late Shift" : "Active Shift",
        desc: `In: ${clockInTimeStr} · ${isLateShift ? "Delay recorded" : "On schedule"}`,
        icon: isLateShift ? AlertTriangle : CheckCircle2,
      }
    : {
        label: "Not Clocked In",
        desc: "Awaiting today's shift clock-in",
        icon: Clock,
      };

  // 4 Standard Daily Metric Cards (Strictly Privacy Protected - Zero Salary Projections)
  const statsCards = [
    {
      title: "Shift Status",
      value: shiftInfo.label,
      icon: shiftInfo.icon,
      description: shiftInfo.desc,
    },
    {
      title: "Hours Logged",
      value: `${Number(attendanceData?.workHours || 0).toFixed(1)} hrs`,
      icon: UserCheck,
      description: `${overview.presentDays || 0} shifts recorded this cycle`,
    },
    {
      title: "Leave Balance",
      value: `${overview.remainingLeaveDays !== undefined ? overview.remainingLeaveDays : overview.leaveBalance || 0} days`,
      icon: CalendarDays,
      description: `${overview.usedLeaveDays || 0} used of ${overview.totalLeaveDays || 15} days`,
    },
    {
      title: "Announcements",
      value: "Active",
      icon: Megaphone,
      description: "Company bulletins & notices",
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

      {/* Main Dashboard Overview Body */}
      <div className="space-y-6">
        {/* Employee Profile Visual Identity & Attendance Status Header Banner */}
        <EmployeeProfileIdentityBanner
          employeeData={dashboardData?.employee || user}
          todayAttendance={attendanceData}
        />

        {/* Visual Threshold Warning Banner for Employee Dashboard */}
        {latenessThresholdAlert &&
          (latenessThresholdAlert.isWarningExceeded ||
            latenessThresholdAlert.isLimitExceeded) && (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition-all shadow-none ${
                latenessThresholdAlert.isLimitExceeded
                  ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                  : "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    latenessThresholdAlert.isLimitExceeded
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold tracking-tight">
                      {latenessThresholdAlert.isLimitExceeded
                        ? "Monthly Lateness Penalty Limit Exceeded"
                        : "Monthly Lateness Penalty Threshold Warning"}
                    </h4>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        latenessThresholdAlert.isLimitExceeded
                          ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-700"
                          : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700"
                      }`}
                    >
                      {latenessThresholdAlert.usagePercent}% Of Cap
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Accumulated lateness penalties for this month have reached{" "}
                    <strong>
                      GH₵{Number(latenessThresholdAlert.currentDeductions || 0).toFixed(2)}
                    </strong>
                    , reaching the predefined company policy threshold (
                    <strong>{latenessThresholdAlert.warningThresholdPercent}%</strong> warning limit at{" "}
                    <strong>
                      GH₵{Number(latenessThresholdAlert.warningThresholdAmount || 0).toFixed(2)}
                    </strong>
                    {latenessThresholdAlert.hasBaseSalary
                      ? ` of the ${latenessThresholdAlert.maxPenaltyPercent}% basic salary cap of GH₵${Number(latenessThresholdAlert.penaltyLimit || 0).toFixed(2)}`
                      : ` of GH₵${Number(latenessThresholdAlert.penaltyLimit || 0).toFixed(2)}`}
                    ).
                  </p>
                </div>
              </div>
              <a
                href="#lateness-deductions-line-chart-card"
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border whitespace-nowrap self-end sm:self-auto transition cursor-pointer ${
                  latenessThresholdAlert.isLimitExceeded
                    ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
                    : "bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
                }`}
              >
                View Audit
              </a>
            </div>
          )}

        {/* Real-time Dynamic Shift Attendance Status Card */}
        <ShiftStatusCard
          attendanceData={attendanceData}
          hasClockedIn={hasClockedIn}
          hasClockedOut={hasClockedOut}
          isLoading={isLoading}
          isSyncing={isSyncingAttendance}
          onClockIn={handleClockIn}
          onRefresh={handleSyncAttendance}
          workStartTime={settings?.workStartTime || settings?.attendance?.workStartTime || "08:00"}
          user={employee?._id ? employee : user}
          userName={employee?.fullName || user?.fullName || employee?.name || user?.name}
        />

        {/* Daily Shift Clock with Automated Midnight Reset & 3-Case Action State Resolution */}
        <DailyShiftClock
          attendanceData={attendanceData}
          hasClockedIn={hasClockedIn}
          hasClockedOut={hasClockedOut}
          isLoading={isLoading}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          workEndTime={settings?.workEndTime || settings?.attendance?.workEndTime || "19:00"}
          workStartTime={settings?.workStartTime || settings?.attendance?.workStartTime || "08:00"}
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
          attendanceLogs={attendanceLogs}
          title="Weekly Attendance & Shift Performance"
          subtitle="Monitor weekly attendance patterns and total hours worked against shift requirements"
        />

        {/* Visual Monthly Attendance Calendar Component (Present, Late, Absent at a glance) */}
        <MonthlyAttendanceCalendarCard
          attendanceLogs={attendanceLogs}
          employeeId={user?._id || user?.id}
          role="employee"
          title="My Monthly Attendance Calendar"
          subtitle="Visual monthly attendance status (Present, Late, Absent) at a glance with daily shift details"
          refreshKey={analyticsRefreshKey}
        />

        {/* Lateness Deductions Recharts Line Chart for Current Payroll Month */}
        <LatenessDeductionsLineChart
          employeeId={user?._id || user?.id}
          title="My Monthly Lateness Deductions"
          subtitle="Visualize your daily and cumulative lateness penalty deductions over the current payroll month"
          refreshKey={analyticsRefreshKey}
          onThresholdChange={setLatenessThresholdAlert}
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
            onApplyLeave={handleNavigateToLeave}
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
