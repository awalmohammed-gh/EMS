import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  CalendarDays,
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Loader2,
  Search,
  ArrowRight,
  BarChart3,
  ListFilter,
  Check,
  Zap,
  Lock,
  Unlock,
  ShieldCheck,
  Printer,
} from "lucide-react";
import Toaster from "../../ui/Toaster";
import { useManagement } from "../../context/ManagementContextProvider";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";
import {
  attendanceClockIn,
  attendanceClockOut,
  getEmployeeAttendance,
  getNowAttendance,
  getSettings,
} from "../../apis/fontApis";
import WeeklyAttendanceChart from "../../components/WeeklyAttendanceChart";
import AttendanceIntensityHeatmap from "../../components/AttendanceIntensityHeatmap";
import AttendanceMonthlyCalendar from "../../components/AttendanceMonthlyCalendar";
import GlobalDateRangePicker from "../../components/GlobalDateRangePicker";
import AttendanceReportModal from "../../components/modal/AttendanceReportModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Cell,
} from "recharts";

const CustomWeeklyHoursTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload || {};
    const target = data.targetHours || 8;
    const actual = Number(data.hours || 0);
    const diff = Math.round((actual - target) * 10) / 10;
    const isMet = actual >= target && target > 0;

    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-[210px] z-50">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
          <div>
            <span className="font-bold text-white text-xs block">
              {data.fullDay}
            </span>
            <span className="text-[10px] text-slate-400">
              {data.dateFormatted}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              isMet
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                : actual > 0
                ? "bg-amber-950/80 text-amber-300 border-amber-700/60"
                : data.isWeekend
                ? "bg-slate-800 text-slate-300 border-slate-700"
                : "bg-rose-950/80 text-rose-300 border-rose-700/60"
            }`}
          >
            {data.status || (isMet ? "Met Target" : "Shift Target")}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Hours Logged:
            </span>
            <span className="font-bold text-white text-xs">{actual} hrs</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Shift Target:</span>
            <span className="font-medium text-slate-300">{target} hrs</span>
          </div>

          {target > 0 && (
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/80 text-[11px]">
              <span className="text-slate-400">Variance:</span>
              <span
                className={`font-semibold ${
                  diff >= 0 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {diff >= 0 ? `+${diff}h (Met Goal)` : `${diff}h (Deficit)`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const EmployeesAttendance = () => {
  const { showToast, setShowToast, user } = useManagement();

  // Today's attendance state
  const [attendanceData, setAttendanceData] = useState({
    date: null,
    clockIn: null,
    clockOut: null,
    status: null,
    workHours: 0,
    lateMinutes: 0,
    latePenalty: 0,
    penaltyTier: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isClocking, setIsClocking] = useState(false);
  const [error, setError] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [hasClockedIn, setHasClockedIn] = useState(false);
  const [hasClockedOut, setHasClockedOut] = useState(false);

  // Shift Settings & Early Override Guard State
  const [settingsEndTime, setSettingsEndTime] = useState("17:00");
  const [settingsStartTime, setSettingsStartTime] = useState("08:00");
  const [earlyOverrideActive, setEarlyOverrideActive] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Table filters & view states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState("all");
  const [activeView, setActiveView] = useState("heatmap"); // 'heatmap' | 'table' | 'chart'
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Live ticking digital clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Time Evaluation Guard: Evaluate live client/server time against workEndTime
  const shiftEvaluation = useMemo(() => {
    const now = currentTime;
    const endStr = settingsEndTime || "17:00";
    const startStr = settingsStartTime || "08:00";

    const [endHourStr, endMinStr] = endStr.split(":");
    const endHour = parseInt(endHourStr, 10) || 17;
    const endMin = parseInt(endMinStr, 10) || 0;

    const [startHourStr, startMinStr] = startStr.split(":");
    const startHour = parseInt(startHourStr, 10) || 8;
    const startMin = parseInt(startMinStr, 10) || 0;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = endHour * 60 + endMin;

    const isClosingTimeReached = currentMinutes >= endMinutes;

    // Remaining minutes calculation
    const diffMinutes = Math.max(0, endMinutes - currentMinutes);
    const hoursLeft = Math.floor(diffMinutes / 60);
    const minsLeft = diffMinutes % 60;
    const countdownText =
      hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;

    // 12-hour format strings
    const format12H = (h, m) => {
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
    };

    const formattedEndTime = format12H(endHour, endMin);
    const formattedStartTime = format12H(startHour, startMin);

    return {
      isClosingTimeReached,
      countdownText,
      formattedEndTime,
      formattedStartTime,
      hoursLeft,
      minsLeft,
    };
  }, [currentTime, settingsEndTime, settingsStartTime]);

  const isClockOutUnlocked =
    shiftEvaluation.isClosingTimeReached || earlyOverrideActive;

  // Determine current 4-state
  // State 1: Before Clock-In
  // State 2: Active Working Hours (Before Closing Time)
  // State 3: Closing Time Reached (Shift End)
  // State 4: Shift Completed (After Clock-Out)
  const currentStep = useMemo(() => {
    if (!hasClockedIn) return 1;
    if (hasClockedIn && !hasClockedOut) {
      return isClockOutUnlocked ? 3 : 2;
    }
    return 4;
  }, [hasClockedIn, hasClockedOut, isClockOutUnlocked]);

  const canOverride =
    user?.role === "admin" ||
    user?.role === "manager" ||
    user?.role === "superadmin";

  // Format today's date
  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString("en-GH", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [currentTime]);

  // Helper to format ISO time strings
  const formatTime = (timeString) => {
    if (!timeString) return "--:--";
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return timeString;
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  // Helper to format date strings
  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("en-GH", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // Live elapsed work duration if clocked in and not clocked out
  const liveElapsedDuration = useMemo(() => {
    if (!hasClockedIn || !attendanceData.clockIn || hasClockedOut) {
      return null;
    }
    try {
      const clockInDate = new Date(attendanceData.clockIn);
      const diffMs = Math.max(0, currentTime.getTime() - clockInDate.getTime());
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      return {
        formatted: `${hours}h ${minutes}m ${seconds}s`,
        hours,
        minutes,
      };
    } catch {
      return null;
    }
  }, [hasClockedIn, attendanceData.clockIn, hasClockedOut, currentTime]);

  // Fetch today's attendance status
  const fetchTodayAttendance = async () => {
    try {
      setError(null);
      const { data } = await getNowAttendance();

      if (data?.success) {
        if (data.employee) {
          setEmployee(data.employee);
        }

        if (data.attendance) {
          const att = data.attendance;
          setAttendanceData({
            date: att.date || new Date().toISOString().split("T")[0],
            clockIn: att.clockIn || att.clockInTime || null,
            clockOut: att.clockOut || att.clockOutTime || null,
            status: att.status || null,
            workHours: att.workHours || 0,
            lateMinutes: att.lateMinutes ?? att.delayMinutes ?? 0,
            latePenalty: att.latePenalty || 0,
            penaltyTier: att.penaltyTier || "",
          });
          setHasClockedIn(Boolean(att.clockIn || att.clockInTime));
          setHasClockedOut(Boolean(att.clockOut || att.clockOutTime));
        } else {
          setAttendanceData({
            date: new Date().toISOString().split("T")[0],
            clockIn: null,
            clockOut: null,
            status: null,
            workHours: 0,
            lateMinutes: 0,
            latePenalty: 0,
            penaltyTier: "",
          });
          setHasClockedIn(false);
          setHasClockedOut(false);
        }
      }
    } catch (err) {
      console.warn("Could not fetch today's attendance:", err.message);
    }
  };

  // Fetch historical attendance records
  const fetchAttendanceHistory = async () => {
    try {
      const { data } = await getEmployeeAttendance();
      if (data?.success) {
        let history = [];
        if (Array.isArray(data.attendance)) {
          history = data.attendance;
        } else if (data.attendance && typeof data.attendance === "object") {
          history = [data.attendance];
        }
        setAttendanceHistory(history);
      }
    } catch (err) {
      console.warn("Could not fetch attendance history:", err.message);
    }
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [settingsRes] = await Promise.allSettled([
          getSettings(),
          fetchTodayAttendance(),
          fetchAttendanceHistory(),
        ]);
        if (
          settingsRes.status === "fulfilled" &&
          settingsRes.value?.data?.success &&
          settingsRes.value.data.settings?.attendance
        ) {
          const { workEndTime, workStartTime } =
            settingsRes.value.data.settings.attendance;
          if (workEndTime) setSettingsEndTime(workEndTime);
          if (workStartTime) setSettingsStartTime(workStartTime);
        }
      } catch {
        // Continue with defaults
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Handle Clock In
  const handleClockIn = async () => {
    if (isClocking || hasClockedIn) return;
    try {
      setIsClocking(true);
      const { data } = await attendanceClockIn();

      if (data?.success) {
        const att = data.attendance;
        const nowIso = new Date().toISOString();
        const rawStatus = att?.status || data.status || "";
        const computedDelayMinutes = Number(att?.lateMinutes ?? data.delayMinutes ?? att?.delayMinutes ?? data.lateMinutes ?? 0);
        const computedLatePenalty = Number(att?.latePenalty ?? data.latePenalty ?? 0);
        const isLateCheck = computedDelayMinutes > 0 || String(rawStatus).toLowerCase() === "late";
        const normalizedStatus = isLateCheck ? "Late" : "On Time";

        setAttendanceData({
          date: att?.date || nowIso.split("T")[0],
          clockIn: att?.clockIn || att?.clockInTime || nowIso,
          clockOut: null,
          status: normalizedStatus,
          workHours: att?.workHours || 0,
          lateMinutes: computedDelayMinutes,
          latePenalty: computedLatePenalty,
          penaltyTier: att?.penaltyTier ?? data.penaltyTier ?? (isLateCheck ? "Late" : "On Time"),
        });
        setHasClockedIn(true);
        setHasClockedOut(false);

        setShowToast({
          show: true,
          message: data.message || "Clock In recorded successfully!",
          type: "success",
        });

        // Broadcast to real-time sync channel
        try {
          const bc = new BroadcastChannel("eyenit_attendance_sync");
          bc.postMessage({ type: "clock_in", timestamp: Date.now() });
          bc.close();
        } catch {
          // Ignore
        }

        // Re-sync history immediately
        await fetchAttendanceHistory();
      } else {
        setShowToast({
          show: true,
          message: data?.message || "Clock in failed.",
          type: "error",
        });
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Clock in failed.";
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsClocking(false);
    }
  };

  // Handle Clock Out
  const handleClockOut = async () => {
    if (isClocking || !hasClockedIn || hasClockedOut) return;
    try {
      setIsClocking(true);
      const { data } = await attendanceClockOut();

      if (data?.success) {
        const att = data.attendance;
        const nowIso = new Date().toISOString();
        setAttendanceData((prev) => ({
          ...prev,
          clockOut: att?.clockOut || att?.clockOutTime || nowIso,
          workHours: att?.workHours || prev.workHours || 8,
          status: att?.status || prev.status,
        }));
        setHasClockedOut(true);

        setShowToast({
          show: true,
          message: data.message || "Clock Out recorded successfully! Great work today.",
          type: "success",
        });

        // Broadcast to real-time sync channel
        try {
          const bc = new BroadcastChannel("eyenit_attendance_sync");
          bc.postMessage({ type: "clock_out", timestamp: Date.now() });
          bc.close();
        } catch {
          // Ignore
        }

        // Re-sync history immediately
        await fetchAttendanceHistory();
      } else {
        setShowToast({
          show: true,
          message: data?.message || "Clock out failed.",
          type: "error",
        });
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Clock out failed.";
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsClocking(false);
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status, lateMinutes = 0) => {
    const s = String(status || "").toLowerCase();
    if (s === "on time" || s === "ontime" || s === "present") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          On Time
        </span>
      );
    }
    if (s === "late" || lateMinutes > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Late Arrival
        </span>
      );
    }
    if (s === "absent") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Absent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        {status || "Recorded"}
      </span>
    );
  };

  // Calculate Metrics from history
  const metrics = useMemo(() => {
    const totalRecords = attendanceHistory.length;
    let attendedDays = 0;
    let onTimeDays = 0;
    let lateDays = 0;
    let totalLateMinutes = 0;
    let unexcusedAbsences = 0;
    let totalHours = 0;
    let totalPenaltyAmount = 0;

    attendanceHistory.forEach((log) => {
      const s = String(log?.status || "").toLowerCase();
      const lateMins = Number(log?.lateMinutes ?? log?.delayMinutes ?? 0);
      const hrs = Number(log?.workHours || 0);
      const penalty = Number(log?.latePenalty || 0);

      if (s === "absent") {
        unexcusedAbsences += 1;
      } else if (log?.clockIn || log?.clockInTime || hrs > 0 || s === "present" || s === "on time" || s === "late") {
        attendedDays += 1;
        totalHours += hrs;
        totalPenaltyAmount += penalty;

        if (s === "late" || lateMins > 0) {
          lateDays += 1;
          totalLateMinutes += lateMins;
        } else {
          onTimeDays += 1;
        }
      }
    });

    // If today is active and not yet in history
    if (hasClockedIn && !attendanceHistory.some((h) => h.date === attendanceData.date)) {
      attendedDays += 1;
      if (attendanceData.status === "Late" || attendanceData.lateMinutes > 0) {
        lateDays += 1;
        totalLateMinutes += Number(attendanceData.lateMinutes || 0);
        totalPenaltyAmount += Number(attendanceData.latePenalty || 0);
      } else {
        onTimeDays += 1;
      }
      totalHours += Number(attendanceData.workHours || 0);
    }

    return {
      totalRecords,
      attendedDays,
      onTimeDays,
      lateDays,
      totalLateMinutes,
      unexcusedAbsences,
      totalHours: Number(totalHours.toFixed(1)),
      totalPenaltyAmount: Number(totalPenaltyAmount.toFixed(2)),
      punctualityRate: attendedDays > 0 ? Math.round((onTimeDays / attendedDays) * 100) : 100,
    };
  }, [attendanceHistory, hasClockedIn, attendanceData]);

  // Current Week Work Hours Data Calculation (Monday through Sunday)
  const currentWeekWorkHours = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const fullDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const weekList = days.map((dayShort, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const isoDate = d.toISOString().split("T")[0];
      const isToday = isoDate === today.toISOString().split("T")[0];
      const isFuture = d > today && !isToday;
      const isWeekend = idx >= 5;
      const targetHours = isWeekend ? 0 : 8;

      let matchingLog = attendanceHistory.find((log) => {
        if (!log?.date) return false;
        const logIso = String(log.date).split("T")[0];
        return logIso === isoDate;
      });

      let hours = 0;
      let status = isWeekend ? "Weekend Off" : (isFuture ? "Upcoming Shift" : "Off");
      let lateMinutes = 0;

      if (isToday && hasClockedIn) {
        hours = Number(attendanceData.workHours || 8);
        status = attendanceData.status || (attendanceData.lateMinutes > 0 ? "Late" : "On Time");
        lateMinutes = Number(attendanceData.lateMinutes || 0);
      } else if (matchingLog) {
        hours = Number(matchingLog.workHours || (matchingLog.status !== "Absent" ? 8 : 0));
        status = matchingLog.status || "Present";
        lateMinutes = Number(matchingLog.lateMinutes || matchingLog.delayMinutes || 0);
      }

      return {
        day: dayShort,
        fullDay: fullDays[idx],
        date: isoDate,
        dateFormatted: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dayLabel: `${dayShort} ${d.getDate()}`,
        hours: Number(hours.toFixed(1)),
        targetHours,
        status,
        lateMinutes,
        isToday,
        isFuture,
        isWeekend,
      };
    });

    const totalLoggedHours = weekList.reduce((acc, curr) => acc + curr.hours, 0);
    const targetWeeklyHours = 40;
    const completedDays = weekList.filter((d) => !d.isFuture && !d.isWeekend && d.hours > 0);
    const dailyAverage = completedDays.length > 0 ? (totalLoggedHours / completedDays.length).toFixed(1) : "0.0";
    const percentGoal = Math.min(150, Math.round((totalLoggedHours / targetWeeklyHours) * 100));

    return {
      days: weekList,
      totalLoggedHours: Number(totalLoggedHours.toFixed(1)),
      targetWeeklyHours,
      dailyAverage,
      percentGoal,
      overtime: Number(Math.max(0, totalLoggedHours - targetWeeklyHours).toFixed(1)),
    };
  }, [attendanceHistory, hasClockedIn, attendanceData]);

  // Filtered attendance list
  const filteredHistory = useMemo(() => {
    return attendanceHistory.filter((item) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const dStr = formatDate(item.date).toLowerCase();
        const stStr = String(item.status || "").toLowerCase();
        if (!dStr.includes(query) && !stStr.includes(query)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        const s = String(item.status || "").toLowerCase();
        if (statusFilter === "ontime" && s !== "on time" && s !== "ontime" && s !== "present") {
          return false;
        }
        if (statusFilter === "late" && s !== "late" && !(Number(item.lateMinutes || 0) > 0)) {
          return false;
        }
        if (statusFilter === "absent" && s !== "absent") {
          return false;
        }
      }

      // Month filter
      if (selectedMonth !== "all") {
        try {
          const itemDate = new Date(item.date);
          const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
          if (monthKey !== selectedMonth) {
            return false;
          }
        } catch {
          // pass
        }
      }

      // Global Date Range Filter
      if (startDateFilter || endDateFilter) {
        let itemDateStr = "";
        if (item.date) {
          itemDateStr = new Date(item.date).toISOString().split("T")[0];
        }
        if (itemDateStr) {
          if (startDateFilter && itemDateStr < startDateFilter) return false;
          if (endDateFilter && itemDateStr > endDateFilter) return false;
        }
      }

      return true;
    });
  }, [attendanceHistory, searchTerm, statusFilter, selectedMonth, startDateFilter, endDateFilter]);

  // Available unique months in history
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    attendanceHistory.forEach((item) => {
      if (item.date) {
        try {
          const d = new Date(item.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthsSet.add(key);
        } catch {
          // ignore
        }
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [attendanceHistory]);

  // Summary statistics for the selected month/period (present, absent, late, total hours)
  const selectedPeriodSummary = useMemo(() => {
    let list = [...attendanceHistory];

    if (selectedMonth !== "all") {
      list = list.filter((item) => {
        try {
          const itemDate = new Date(item.date);
          const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
          return monthKey === selectedMonth;
        } catch {
          return true;
        }
      });
    }

    let present = 0;
    let late = 0;
    let absent = 0;
    let onTime = 0;
    let totalHours = 0;

    list.forEach((item) => {
      const s = String(item.status || "").toLowerCase();
      const lateMins = Number(item.lateMinutes ?? item.delayMinutes ?? 0);
      const hrs = Number(item.workHours || 0);

      totalHours += hrs;

      if (s === "absent") {
        absent += 1;
      } else if (item.clockIn || hrs > 0 || s === "present" || s === "on time" || s === "late") {
        present += 1;
        if (s === "late" || lateMins > 0) {
          late += 1;
        } else {
          onTime += 1;
        }
      }
    });

    let periodTitle = "All Months";
    if (selectedMonth !== "all") {
      try {
        const [y, m] = selectedMonth.split("-");
        const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
        periodTitle = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      } catch {
        periodTitle = selectedMonth;
      }
    }

    const punctuality = present > 0 ? Math.round((onTime / present) * 100) : 100;

    return {
      periodTitle,
      totalEntries: list.length,
      present,
      onTime,
      late,
      absent,
      totalHours: totalHours.toFixed(1),
      punctuality,
    };
  }, [attendanceHistory, selectedMonth]);

  if (isLoading && !employee) {
    return <Loading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => {
          fetchTodayAttendance();
          fetchAttendanceHistory();
        }}
        onClose={() => setError(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden relative">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E48] dark:text-blue-100">
            Employee Attendance
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Track your daily shift hours, clock-in status, and work duration.
          </p>
        </div>

        {/* Top Right: Date badge only */}
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium self-start sm:self-auto shadow-2xs">
          <CalendarDays className="w-4 h-4 text-[#002185] dark:text-blue-400" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* SECTION 1: MODERN HERO CARD & SHIFT CONTROL HEADER */}
      <div
        id="hero-attendance-clock-card"
        className="w-full bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6"
      >
        {/* Top Row (Status & Live Time Integration) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 pb-6 border-b border-slate-100 dark:border-slate-800/80">
          {/* Left Side (Status Badges) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Shift status pill */}
              {currentStep === 1 && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-[#162033] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Not Clocked In Today</span>
                </div>
              )}
              {currentStep === 2 && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Currently Working · Clocked in at {formatTime(attendanceData.clockIn)}
                  </span>
                </div>
              )}
              {currentStep === 3 && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>
                    Shift Closing Time Reached · Ready to Clock Out
                  </span>
                </div>
              )}
              {currentStep === 4 && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Shift Completed · Checked out at {formatTime(attendanceData.clockOut)}
                  </span>
                </div>
              )}

              {/* Dynamic Instant Attendance Status Badge after Clock In */}
              {hasClockedIn && (
                attendanceData.lateMinutes > 0 || (attendanceData.status || "").toLowerCase() === "late" ? (
                  <div
                    id="attendance-status-badge-late"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Late Arrival ({attendanceData.lateMinutes} min late)</span>
                    {attendanceData.latePenalty > 0 && (
                      <span className="font-bold text-rose-700 dark:text-rose-400">
                        · Fine: GH₵{Number(attendanceData.latePenalty).toFixed(2)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    id="attendance-status-badge-ontime"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>On Time Check-in</span>
                  </div>
                )
              )}

              {/* Scheduled Shift Pill */}
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-50 dark:bg-[#162033] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                <Clock className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400" />
                Scheduled: {shiftEvaluation.formattedStartTime} – {shiftEvaluation.formattedEndTime}
              </span>
            </div>
          </div>

          {/* Right Side (Action Buttons) */}
          <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              {/* Button 1: Clock In */}
              <button
                id="btn-primary-clock-in"
                type="button"
                onClick={handleClockIn}
                disabled={hasClockedIn || isClocking}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${
                  hasClockedIn
                    ? "bg-slate-100 dark:bg-[#162033] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 cursor-not-allowed"
                    : isClocking
                    ? "bg-blue-400 text-white cursor-not-allowed"
                    : "bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 dark:hover:bg-blue-700 text-white active:scale-[0.98]"
                }`}
                title={
                  hasClockedIn
                    ? `Clocked In (${formatTime(attendanceData.clockIn)})`
                    : "Click to clock in now"
                }
              >
                {hasClockedIn ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Clocked In ({formatTime(attendanceData.clockIn)})</span>
                  </>
                ) : isClocking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Clock In</span>
                  </>
                )}
              </button>

              {/* Button 2: Clock Out */}
              <button
                id="btn-primary-clock-out"
                type="button"
                onClick={handleClockOut}
                disabled={!hasClockedIn || hasClockedOut || !isClockOutUnlocked || isClocking}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shadow-xs cursor-pointer ${
                  hasClockedOut
                    ? "bg-slate-100 dark:bg-[#162033] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 cursor-not-allowed"
                    : !hasClockedIn
                    ? "bg-slate-100 dark:bg-[#162033] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/60 cursor-not-allowed"
                    : !isClockOutUnlocked
                    ? "bg-slate-100 dark:bg-[#162033] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/60 cursor-not-allowed"
                    : isClocking
                    ? "bg-amber-400 text-white cursor-not-allowed"
                    : "bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]"
                }`}
                title={
                  hasClockedOut
                    ? `Shift Completed (${formatTime(attendanceData.clockOut)})`
                    : !hasClockedIn
                    ? `Locked until ${shiftEvaluation.formattedEndTime}`
                    : !isClockOutUnlocked
                    ? `Locked until ${shiftEvaluation.formattedEndTime}`
                    : "Click to clock out and end your shift"
                }
              >
                {hasClockedOut ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Clocked Out ({formatTime(attendanceData.clockOut)})</span>
                  </>
                ) : !isClockOutUnlocked && hasClockedIn ? (
                  <>
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Locked until {shiftEvaluation.formattedEndTime}</span>
                  </>
                ) : isClocking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Clock Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3-Card Shift Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Clock In Record */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              hasClockedIn
                ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                : "bg-slate-50/70 dark:bg-[#162033] border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <LogIn className={`w-4 h-4 ${hasClockedIn ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
                Clock In
              </span>
              {hasClockedIn && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Recorded
                </span>
              )}
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {hasClockedIn ? formatTime(attendanceData.clockIn) : "--:--"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
              {hasClockedIn
                ? attendanceData.status === "Late" || attendanceData.lateMinutes > 0
                  ? `Recorded with ${attendanceData.lateMinutes || 0}m delay`
                  : "Recorded on-time"
                : `Ready to record today's check-in (Start: ${shiftEvaluation.formattedStartTime})`}
            </p>
          </div>

          {/* Card 2: Shift Duration (Active Timer) */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              hasClockedIn && !hasClockedOut
                ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                : hasClockedOut
                ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                : "bg-slate-50/70 dark:bg-[#162033] border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Clock
                  className={`w-4 h-4 ${
                    hasClockedIn && !hasClockedOut
                      ? "text-[#002185] dark:text-blue-400"
                      : hasClockedOut
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400"
                  }`}
                />
                Shift Duration
              </span>
              {hasClockedIn && !hasClockedOut && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-[#002185] dark:text-blue-300 animate-pulse">
                  Active
                </span>
              )}
              {hasClockedOut && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Total Logged
                </span>
              )}
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {hasClockedIn && !hasClockedOut
                ? liveElapsedDuration?.formatted || "0h 0m 0s"
                : hasClockedOut
                ? `${attendanceData.workHours || 0} hrs`
                : "0h 0m 0s"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
              {hasClockedIn && !hasClockedOut
                ? "Active work counter"
                : hasClockedOut
                ? "Approved work hours for payroll"
                : "Standard target: 8.0 hours"}
            </p>
          </div>

          {/* Card 3: Clock Out Record */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              hasClockedOut
                ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                : "bg-slate-50/70 dark:bg-[#162033] border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <LogOut className={`w-4 h-4 ${hasClockedOut ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
                Clock Out
              </span>
              {hasClockedOut ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Completed
                </span>
              ) : isClockOutUnlocked && hasClockedIn ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-[#162033] text-slate-500 dark:text-slate-400">
                  Locked
                </span>
              )}
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {hasClockedOut ? formatTime(attendanceData.clockOut) : "--:--"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
              {hasClockedOut
                ? "Day finalized"
                : isClockOutUnlocked && hasClockedIn
                ? "Ready to clock out now"
                : `Unlocks at ${shiftEvaluation.formattedEndTime}`}
            </p>
          </div>
        </div>

        {/* Streamlined Status Banner */}
        {currentStep === 2 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold">Shift In Progress:</span> Clock-out unlocks at scheduled closing time ({shiftEvaluation.formattedEndTime}).
              </div>
            </div>

            {canOverride && (
              <button
                type="button"
                onClick={() => setShowOverrideModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Early Clock-Out Override</span>
              </button>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold">Shift Completed for Today:</span> Total approved work hours:{" "}
              <span className="font-mono font-bold">{attendanceData.workHours || 0} hrs</span>. Day finalized.
            </div>
          </div>
        )}

        {/* Early Clock-Out Override Modal */}
        {showOverrideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Early Clock-Out Override
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manager / Admin Authorization
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Standard shift closing time is scheduled for{" "}
                <strong className="text-slate-900 dark:text-white">{shiftEvaluation.formattedEndTime}</strong>.
                Authorizing this override will unlock the Clock Out button immediately for early departure.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEarlyOverrideActive(true);
                    setShowOverrideModal(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Early Clock-Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: SUMMARY METRIC CARDS (MOVED DIRECTLY BELOW ACTION CARD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Attended Days */}
        <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#002185] dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              {metrics.punctualityRate}% Punctual
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.attendedDays} Days
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>On-time: <strong className="text-emerald-600 dark:text-emerald-400">{metrics.onTimeDays}</strong></span>
              <span>•</span>
              <span>Late: <strong className="text-amber-600 dark:text-amber-400">{metrics.lateDays}</strong></span>
            </p>
          </div>
        </div>

        {/* Metric 2: Late Check-ins */}
        <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#162033] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/60">
              MTD Total
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.lateDays} {metrics.lateDays === 1 ? "Day" : "Days"}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Total late time: <strong className="text-amber-600 dark:text-amber-400">{metrics.totalLateMinutes}m</strong>
              {metrics.totalPenaltyAmount > 0 && (
                <span className="text-rose-600 dark:text-rose-400 ml-1">
                  (GH₵ {metrics.totalPenaltyAmount})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Metric 3: Unexcused Absences */}
        <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Compliance
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.unexcusedAbsences} Days
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {metrics.unexcusedAbsences === 0
                ? "Perfect attendance record"
                : "Requires HR leave excuse"}
            </p>
          </div>
        </div>

        {/* Metric 4: Hours Logged This Month */}
        <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              Approved
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.totalHours} hrs
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Avg: {(metrics.attendedDays > 0 ? (metrics.totalHours / metrics.attendedDays).toFixed(1) : 0)} hrs/day
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: WEEKLY WORK HOURS CHART (RECHARTS) */}
      <div id="weekly-work-hours-section" className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#002185]/10 dark:bg-blue-900/30 text-[#002185] dark:text-blue-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Weekly Work Hours (Current Week)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total hours logged across daily shifts vs. standard 8.0h shift target (Mon – Sun)
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Week Total:</span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {currentWeekWorkHours.totalLoggedHours} / {currentWeekWorkHours.targetWeeklyHours}h
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {currentWeekWorkHours.percentGoal}% of 40h Target
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Avg: {currentWeekWorkHours.dailyAverage}h / day
              </span>
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="h-64 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={currentWeekWorkHours.days}
              margin={{ top: 12, right: 12, left: -20, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#94a3b8"
                strokeOpacity={0.15}
              />
              <XAxis
                dataKey="dayLabel"
                tickLine={false}
                axisLine={{ stroke: "#94a3b8", opacity: 0.2 }}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <YAxis
                domain={[0, (dataMax) => Math.max(10, Math.ceil(dataMax + 1))]}
                tickLine={false}
                axisLine={{ stroke: "#94a3b8", opacity: 0.2 }}
                tick={{ fontSize: 11, fill: "#64748b" }}
                unit="h"
              />
              <RechartsTooltip
                content={<CustomWeeklyHoursTooltip />}
                cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              />
              <ReferenceLine
                y={8}
                stroke="#002185"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "8.0h Shift Target",
                  position: "insideTopRight",
                  fill: "#002185",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              <Bar dataKey="hours" name="Work Hours" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {currentWeekWorkHours.days.map((entry, index) => {
                  const fillColor = entry.isToday
                    ? "#002185"
                    : entry.hours >= 8
                    ? "#10b981"
                    : entry.hours > 0
                    ? "#f59e0b"
                    : entry.isWeekend
                    ? "#cbd5e1"
                    : "#e2e8f0";
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day-by-Day Quick Cards Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {currentWeekWorkHours.days.map((item) => (
            <div
              key={item.day}
              className={`p-2.5 rounded-xl border transition-all ${
                item.isToday
                  ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-2xs"
                  : "bg-slate-50/60 dark:bg-[#162033] border-slate-200/70 dark:border-slate-700/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {item.day}
                </span>
                {item.isToday && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#002185] dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded">
                    Today
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {item.hours > 0 ? `${item.hours}h` : (item.isFuture ? "--" : (item.isWeekend ? "Off" : "0h"))}
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    item.hours >= 8
                      ? "text-emerald-600 dark:text-emerald-400"
                      : item.hours > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {item.hours >= 8
                    ? "Met"
                    : item.hours > 0
                    ? "Partial"
                    : item.isFuture
                    ? "Upcoming"
                    : item.isWeekend
                    ? "Weekend"
                    : "Absent"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Date Range Picker */}
      <GlobalDateRangePicker
        startDate={startDateFilter}
        endDate={endDateFilter}
        preset={dateRangePreset}
        title="Filter Attendance Period"
        onRangeChange={({ startDate, endDate, preset }) => {
          setStartDateFilter(startDate);
          setEndDateFilter(endDate);
          setDateRangePreset(preset);
          if (startDate || endDate) {
            setSelectedMonth("all");
          }
        }}
      />

      {/* SECTION 3: MONTHLY ATTENDANCE LOGS TABLE / WEEKLY CHART */}
      <div className="bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Table & View Controls Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#002185] dark:text-blue-400" />
              Monthly Attendance History & Logs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified clock-in and clock-out stamps, worked hours, and lateness penalties
            </p>
          </div>

          {/* View Toggles & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                id="btn-view-calendar"
                onClick={() => setActiveView("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeView === "calendar"
                    ? "bg-white dark:bg-[#111927] text-[#002185] dark:text-blue-400 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Monthly Calendar
              </button>
              <button
                type="button"
                id="btn-view-heatmap"
                onClick={() => setActiveView("heatmap")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeView === "heatmap"
                    ? "bg-white dark:bg-[#111927] text-[#002185] dark:text-blue-400 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Intensity Heatmap
              </button>
              <button
                type="button"
                id="btn-view-table"
                onClick={() => setActiveView("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeView === "table"
                    ? "bg-white dark:bg-[#111927] text-slate-900 dark:text-slate-100 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                Table View
              </button>
              <button
                type="button"
                id="btn-view-chart"
                onClick={() => setActiveView("chart")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeView === "chart"
                    ? "bg-white dark:bg-[#111927] text-slate-900 dark:text-slate-100 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Trends Chart
              </button>
            </div>

            {/* Month Filter */}
            {availableMonths.length > 0 && activeView === "table" && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#002185]"
              >
                <option value="all">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            {activeView === "table" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#002185]"
              >
                <option value="all">All Statuses</option>
                <option value="ontime">On Time</option>
                <option value="late">Late Arrival</option>
                <option value="absent">Absent</option>
              </select>
            )}

            {/* Search Input */}
            {activeView === "table" && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-32 sm:w-44 pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185]"
                />
              </div>
            )}

            {/* Print Official Attendance Report */}
            <button
              type="button"
              id="btn-employee-print-attendance-report"
              onClick={() => setShowPrintReport(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#002185] hover:bg-[#ff5500] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="Print official monthly attendance audit sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Sheet</span>
            </button>
          </div>
        </div>

        {/* View Mode: Monthly Calendar */}
        {activeView === "calendar" && (
          <div className="p-4 sm:p-6">
            <AttendanceMonthlyCalendar
              attendanceLogs={(startDateFilter || endDateFilter) ? filteredHistory : attendanceHistory}
              employeesList={employee ? [employee] : user ? [user] : []}
              onSelectDate={(dateKey) => {
                setSearchTerm(dateKey);
                setActiveView("table");
                setShowToast({
                  show: true,
                  message: `Filtering logs for ${dateKey}`,
                  type: "info",
                });
              }}
            />
          </div>
        )}

        {/* View Mode: Intensity Heatmap */}
        {activeView === "heatmap" && (
          <div className="p-4 sm:p-6">
            <AttendanceIntensityHeatmap
              attendanceLogs={(startDateFilter || endDateFilter) ? filteredHistory : attendanceHistory}
              title="Attendance Intensity Heatmap"
              subtitle="Daily check-in pattern matrix, worked hours density, and habit consistency throughout the month"
              onSelectDay={(dateKey) => {
                setSearchTerm(dateKey);
                setShowToast({
                  show: true,
                  message: `Filtering logs for ${dateKey}`,
                  type: "info",
                });
              }}
            />
          </div>
        )}

        {/* View Mode: Weekly Chart */}
        {activeView === "chart" && (
          <div className="p-6">
            <WeeklyAttendanceChart
              attendanceLogs={(startDateFilter || endDateFilter) ? filteredHistory : attendanceHistory}
              title="My Punctuality & Shift Hours Trends"
              subtitle="Daily work duration and arrival punctuality overview"
            />
          </div>
        )}

        {/* View Mode: Table & Mobile Cards */}
        {activeView === "table" && (
          <>
            {/* Selected Period Summary Sub-Header */}
            <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-[#162033]/60 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Period Summary:
                  </span>
                  <span className="text-xs font-bold text-[#002185] dark:text-blue-400 bg-white dark:bg-[#162033] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs">
                    {selectedPeriodSummary.periodTitle}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({selectedPeriodSummary.totalEntries} entries recorded)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <span>Punctuality: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedPeriodSummary.punctuality}%</strong></span>
                  <span>•</span>
                  <span>Worked: <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedPeriodSummary.totalHours} hrs</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Present Days */}
                <div className="bg-white dark:bg-[#162033] p-2.5 sm:p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Present Days
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {selectedPeriodSummary.present}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        ({selectedPeriodSummary.onTime} on time)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Late Check-ins */}
                <div className="bg-white dark:bg-[#162033] p-2.5 sm:p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/60 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Late Days
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {selectedPeriodSummary.late}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        delayed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Absences */}
                <div className="bg-white dark:bg-[#162033] p-2.5 sm:p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/60 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Absences
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {selectedPeriodSummary.absent}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        missed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logged Hours */}
                <div className="bg-white dark:bg-[#162033] p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Logged Hours
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {selectedPeriodSummary.totalHours}h
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        recorded
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#162033]/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Shift Date</th>
                    <th className="px-6 py-3.5">Clock In / Out Stamps</th>
                    <th className="px-6 py-3.5">Duration</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Tardiness / Penalties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => {
                      const lateMins = Number(item.lateMinutes ?? item.delayMinutes ?? 0);
                      const latePenalty = Number(item.latePenalty || 0);

                      return (
                        <tr
                          key={item._id || item.id || item.date}
                          className="hover:bg-slate-50/80 dark:hover:bg-[#162033]/60 transition-colors"
                        >
                          {/* Date */}
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatDate(item.date)}</span>
                            </div>
                          </td>

                          {/* Clock In / Out */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 font-mono text-slate-700 dark:text-slate-300">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {formatTime(item.clockIn || item.clockInTime)}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">
                                {formatTime(item.clockOut || item.clockOutTime)}
                              </span>
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                            {item.workHours || 0} hrs
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            {getStatusBadge(item.status, lateMins)}
                          </td>

                          {/* Penalties */}
                          <td className="px-6 py-4">
                            {lateMins > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  {lateMins}m late
                                </span>
                                {latePenalty > 0 && (
                                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                                    -GH₵ {latePenalty.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-500" /> None (0m)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No attendance records found
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {searchTerm || statusFilter !== "all" || selectedMonth !== "all"
                            ? "Try adjusting your search filters above."
                            : "Your daily check-in and check-out logs will be listed here."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => {
                  const lateMins = Number(item.lateMinutes ?? item.delayMinutes ?? 0);
                  const latePenalty = Number(item.latePenalty || 0);

                  return (
                    <div key={item._id || item.id || item.date} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {formatDate(item.date)}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.workHours || 0} hours worked
                          </p>
                        </div>
                        {getStatusBadge(item.status, lateMins)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#162033] p-3 rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Clock In
                          </span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {formatTime(item.clockIn || item.clockInTime)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Clock Out
                          </span>
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {formatTime(item.clockOut || item.clockOutTime)}
                          </span>
                        </div>
                      </div>

                      {lateMins > 0 && (
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                          <span className="text-amber-700 dark:text-amber-300 font-medium">
                            {lateMins} minutes late
                          </span>
                          {latePenalty > 0 && (
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              Deduction: GH₵ {latePenalty.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No attendance records found
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your daily check-in logs will appear here.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Official Attendance Report Print Modal */}
      {showPrintReport && (
        <AttendanceReportModal
          isOpen={showPrintReport}
          onClose={() => setShowPrintReport(false)}
          employee={employee || user || { fullName: "Staff Member" }}
          attendanceList={filteredHistory.length > 0 ? filteredHistory : attendanceHistory}
          period={selectedMonth !== "all" ? selectedMonth : "Current Period"}
          title="My Official Attendance Sheet"
        />
      )}

      {/* Toast feedback */}
      {showToast.show && (
        <Toaster
          onClose={() =>
            setShowToast({
              show: false,
              message: "",
              type: "success",
            })
          }
          message={showToast.message}
          type={showToast.type}
        />
      )}
    </div>
  );
};

export default EmployeesAttendance;
