import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Timer,
  Calendar,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useAttendanceContext } from "../context/AttendanceContext";

/**
 * Custom Hook: useMidnightRefresh
 * Calculates milliseconds remaining until 12:00:01 AM (midnight rollover),
 * automatically triggering fresh attendance status resolution and resetting action buttons.
 */
export const useMidnightRefresh = (onMidnight, dependency = null) => {
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

    // Midnight timer
    const timer = setTimeout(() => {
      console.log("[useMidnightRefresh] Midnight boundary reached! Refreshing attendance state...");
      if (typeof onMidnight === "function") {
        onMidnight();
      }
    }, msUntilMidnight);

    // Watchdog interval to detect system sleep/wake or date jumps
    const initialDateStr = now.toISOString().split("T")[0];
    const watchdog = setInterval(() => {
      const currentDateStr = new Date().toISOString().split("T")[0];
      if (currentDateStr !== initialDateStr) {
        console.log("[useMidnightRefresh] Date boundary rollover detected:", currentDateStr);
        if (typeof onMidnight === "function") {
          onMidnight();
        }
      }
    }, 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(watchdog);
    };
  }, [onMidnight, dependency]);
};

/**
 * DailyShiftClock Component
 *
 * Implements automated end-of-day shift closure and midnight reset logic:
 * - Unclosed shifts from prior days reset cleanly at 12:00 AM.
 * - Primary action button resets back to active "Clock In" button for the new workday.
 * - Live shift duration timer tracks elapsed time or resets to 0h 00m 00s.
 * - 3 discrete action button UI state resolutions.
 */
const DailyShiftClock = ({
  attendanceData: propAttendanceData,
  hasClockedIn: propHasClockedIn,
  hasClockedOut: propHasClockedOut,
  isLoading: propIsLoading,
  onClockIn: propOnClockIn,
  onClockOut: propOnClockOut,
  workStartTime = "08:00",
  workEndTime = "19:00",
  allowEarlyOverride = true,
}) => {
  // Access global attendance context
  const contextValues = useAttendanceContext();

  const {
    todayRecord = null,
    hasClockedIn: ctxHasClockedIn = false,
    hasClockedOut: ctxHasClockedOut = false,
    isClocking: ctxIsClocking = false,
    clockIn: ctxClockIn,
    clockOut: ctxClockOut,
    refreshAttendance: ctxRefreshAttendance,
  } = contextValues || {};

  // Resolve attendance data & flags: priority to props, fallback to context
  const activeRecord = propAttendanceData ?? todayRecord;
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const recordDate = activeRecord?.date || (activeRecord?.clockIn ? new Date(activeRecord.clockIn).toISOString().split("T")[0] : "");
  const isRecordForToday = Boolean(recordDate && recordDate === todayStr);
  const isClockedIn = isRecordForToday && (propHasClockedIn ?? ctxHasClockedIn ?? Boolean(activeRecord?.clockIn || activeRecord?.clockInTime));
  const isClockedOut = isRecordForToday && (propHasClockedOut ?? ctxHasClockedOut ?? Boolean(activeRecord?.clockOut || activeRecord?.clockOutTime));
  const isPending = propIsLoading ?? ctxIsClocking ?? false;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState("");

  // Live wall clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hook up automated midnight boundary timer
  const handleMidnightRefresh = useCallback(() => {
    if (ctxRefreshAttendance) {
      ctxRefreshAttendance(false);
    }
  }, [ctxRefreshAttendance]);

  useMidnightRefresh(handleMidnightRefresh, activeRecord?.clockIn);

  // Parse work start & end times
  const { startHour, startMin, endHour, endMin } = useMemo(() => {
    const [sH = "08", sM = "00"] = String(workStartTime).split(":");
    const [eH = "19", eM = "00"] = String(workEndTime).split(":");
    return {
      startHour: parseInt(sH, 10),
      startMin: parseInt(sM, 10),
      endHour: parseInt(eH, 10),
      endMin: parseInt(eM, 10),
    };
  }, [workStartTime, workEndTime]);

  // Format shift closing time display (e.g., "07:00 PM")
  const formattedEndTime = useMemo(() => {
    const period = endHour >= 12 ? "PM" : "AM";
    const displayHour = endHour % 12 === 0 ? 12 : endHour % 12;
    return `${String(displayHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")} ${period}`;
  }, [endHour, endMin]);

  const formattedStartTime = useMemo(() => {
    const period = startHour >= 12 ? "PM" : "AM";
    const displayHour = startHour % 12 === 0 ? 12 : startHour % 12;
    return `${String(displayHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")} ${period}`;
  }, [startHour, startMin]);

  // Milestone 1: Check if current wall clock has reached or exceeded shift closing time (7:00 PM / 19:00 unlock)
  const isUnlockTime = useMemo(() => {
    const nowHours = currentTime.getHours();
    const nowMinutes = currentTime.getMinutes();
    return nowHours > endHour || (nowHours === endHour && nowMinutes >= endMin);
  }, [currentTime, endHour, endMin]);

  // Backward compatibility alias
  const isShiftClosingReached = isUnlockTime;

  // Milestone 2: 7:30 PM (19:30) automatic system clock-out grace period
  const isAutoClosedTime = useMemo(() => {
    const nowHours = currentTime.getHours();
    const nowMinutes = currentTime.getMinutes();
    if (endHour === 19 && endMin === 0) {
      return nowHours > 19 || (nowHours === 19 && nowMinutes >= 30);
    }
    const totalEndMinutes = endHour * 60 + endMin + 30;
    const currentTotalMinutes = nowHours * 60 + nowMinutes;
    return currentTotalMinutes >= totalEndMinutes;
  }, [currentTime, endHour, endMin]);

  // Determine if shift is auto-closed (either flagged by database or reached 19:30 milestone with open shift)
  const isAutoClosed = useMemo(() => {
    if (activeRecord?.autoClockedOut) return true;
    const notesLower = (activeRecord?.notes || "").toLowerCase();
    if (notesLower.includes("auto clocked out") || notesLower.includes("missed manual clock-out")) return true;
    if ((activeRecord?.shiftStatus || "").toLowerCase() === "auto-closed") return true;
    if (isClockedIn && !isClockedOut && isAutoClosedTime) return true;
    return false;
  }, [activeRecord, isClockedIn, isClockedOut, isAutoClosedTime]);

  const effectiveIsClockedOut = isClockedOut || (isClockedIn && isAutoClosedTime);

  // Auto-sync status with backend when 7:30 PM grace period expires
  useEffect(() => {
    if (isClockedIn && !isClockedOut && isAutoClosedTime) {
      console.log("[DailyShiftClock] 7:30 PM auto-close milestone reached: refreshing status from backend...");
      if (ctxRefreshAttendance) {
        ctxRefreshAttendance(false);
      }
    }
  }, [isClockedIn, isClockedOut, isAutoClosedTime, ctxRefreshAttendance]);

  // Calculate live shift duration
  const shiftDuration = useMemo(() => {
    // Case 1: Not clocked in yet today -> reset to 0h 00m 00s
    if (!isClockedIn || !activeRecord?.clockIn) {
      return { hours: "0h", minutes: "00m", seconds: "00s", totalHours: "0.0" };
    }

    const clockInDate = new Date(activeRecord.clockIn || activeRecord.clockInTime);
    if (isNaN(clockInDate.getTime())) {
      return { hours: "0h", minutes: "00m", seconds: "00s", totalHours: "0.0" };
    }

    // If clocked out, freeze at clockOut timestamp; if auto-closed, freeze at 7:30 PM
    let endDate = currentTime;
    if (isClockedOut && activeRecord.clockOut) {
      endDate = new Date(activeRecord.clockOut || activeRecord.clockOutTime);
    } else if (isAutoClosed) {
      const autoDate = new Date();
      autoDate.setHours(19, 30, 0, 0);
      endDate = autoDate;
    }

    const diffMs = Math.max(0, endDate.getTime() - clockInDate.getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    return {
      hours: `${h}h`,
      minutes: `${String(m).padStart(2, "0")}m`,
      seconds: `${String(s).padStart(2, "0")}s`,
      totalHours: (diffMs / (1000 * 60 * 60)).toFixed(1),
    };
  }, [isClockedIn, isClockedOut, isAutoClosed, activeRecord, currentTime]);

  // Formatted clock-in time for badge
  const formattedClockInTime = useMemo(() => {
    if (!activeRecord?.clockIn) return "";
    try {
      const d = new Date(activeRecord.clockIn || activeRecord.clockInTime);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }, [activeRecord]);

  // Attendance Status evaluation (On-Time, Late, Absent, Pending)
  const attendanceStatus = useMemo(() => {
    const dbStatus = String(activeRecord?.status || "").trim().toLowerCase();
    const currentHour = new Date().getHours();
    const isPastShiftCutoff = currentHour >= endHour;

    if (dbStatus === "absent" || (!isClockedIn && isPastShiftCutoff)) {
      return "absent";
    }

    if (!isClockedIn) {
      return "pending";
    }

    // Has clocked in: check delay / lateness
    const dbDelay = Number(activeRecord?.delayMinutes || activeRecord?.lateMinutes || 0);
    const clockInDate = activeRecord?.clockIn ? new Date(activeRecord.clockIn) : null;
    let computedDelay = 0;
    if (clockInDate && !isNaN(clockInDate.getTime())) {
      const clockInMinutes = clockInDate.getHours() * 60 + clockInDate.getMinutes();
      const thresholdMinutes = startHour * 60 + startMin;
      computedDelay = Math.max(0, clockInMinutes - thresholdMinutes);
    }
    const finalDelay = dbDelay > 0 ? dbDelay : computedDelay;
    const isLate = dbStatus.includes("late") || finalDelay > 0;

    return isLate ? "late" : "ontime";
  }, [activeRecord, isClockedIn, endHour, startHour, startMin]);

  // Card theme classes
  const cardTheme = useMemo(() => {
    if (attendanceStatus === "ontime") {
      return {
        containerClass:
          "bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-200/70 dark:border-emerald-900/40 rounded-2xl",
        accentClass:
          "text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/30",
        badgeBorder: "border-emerald-300/60 dark:border-emerald-800/60",
      };
    }
    if (attendanceStatus === "late") {
      return {
        containerClass:
          "bg-rose-50/40 dark:bg-rose-950/10 border border-rose-200/70 dark:border-rose-900/40 rounded-2xl",
        accentClass:
          "text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-900/30",
        badgeBorder: "border-rose-300/60 dark:border-rose-800/60",
      };
    }
    if (attendanceStatus === "absent") {
      return {
        containerClass:
          "bg-rose-50/40 dark:bg-rose-950/10 border border-rose-200/70 dark:border-rose-900/40 rounded-2xl",
        accentClass:
          "text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-900/30",
        badgeBorder: "border-rose-300/60 dark:border-rose-800/60",
      };
    }
    // Pending
    return {
      containerClass:
        "bg-white dark:bg-[#111927] border border-slate-200/80 dark:border-slate-800 rounded-2xl",
      accentClass:
        "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800",
      badgeBorder: "border-slate-200 dark:border-slate-700",
    };
  }, [attendanceStatus]);

  // Clock In Action Handler
  const handleClockInClick = async () => {
    if (propOnClockIn) {
      propOnClockIn();
    } else if (ctxClockIn) {
      await ctxClockIn();
    }
  };

  // Clock Out Action Handler
  const handleClockOutClick = async (reason = "") => {
    if (propOnClockOut) {
      propOnClockOut(reason);
    } else if (ctxClockOut) {
      await ctxClockOut(reason);
    }
    setShowOverrideModal(false);
    setOverrideReason("");
  };

  const handleOverrideSubmit = (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setOverrideError("Please provide a brief reason for early clock out.");
      return;
    }
    setOverrideError("");
    handleClockOutClick(overrideReason.trim());
  };

  return (
    <div
      id="daily-shift-clock-container"
      className={`${cardTheme.containerClass} p-6 shadow-sm relative overflow-hidden transition-all duration-300`}
    >
      {/* Header section: Title, Live Digital Clock, and Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${cardTheme.accentClass}`}>
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Daily Shift Clock
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Work starts from 8:00 AM and ends at 7:00 PM
          </p>
        </div>

        {/* Live Digital Clock Badge */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60 self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight">
              {currentTime.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-sm font-bold font-mono text-slate-900 dark:text-white tracking-wider">
              {currentTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Shift Status & Duration Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Metric 1: Current Shift State */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Workday Status
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            {attendanceStatus === "absent" ? (
              <>
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="font-semibold text-rose-700 dark:text-rose-300">
                  Status: Absent
                </span>
              </>
            ) : effectiveIsClockedOut ? (
              <>
                <CheckCircle2 className={`w-5 h-5 ${isAutoClosed ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {isAutoClosed ? "Shift Completed (Auto-Closed)" : "Shift Completed"}
                </span>
              </>
            ) : isClockedIn ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${attendanceStatus === "late" ? "bg-rose-400" : "bg-emerald-400"} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${attendanceStatus === "late" ? "bg-rose-500" : "bg-emerald-500"}`} />
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  Active Shift ({attendanceStatus === "late" ? "Late Arrival" : "On-Time"})
                </span>
              </>
            ) : (
              <>
                <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Ready to Clock In
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {attendanceStatus === "absent"
              ? "No clock-in recorded for today's scheduled shift."
              : isAutoClosed
              ? "Auto clocked out by system at 7:30 PM"
              : effectiveIsClockedOut
              ? "Clock-out logged for today"
              : isClockedIn
              ? `Shift active since ${formattedClockInTime}`
              : "No shift recorded yet today"}
          </p>
        </div>

        {/* Metric 2: Live Shift Duration */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Shift Duration
            </span>
            <Timer className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-1.5">
            <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {shiftDuration.hours}{" "}
              <span className="text-slate-700 dark:text-slate-300">
                {shiftDuration.minutes}
              </span>{" "}
              <span className="text-slate-500 dark:text-slate-400 text-lg">
                {shiftDuration.seconds}
              </span>
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {effectiveIsClockedOut
              ? `Total logged: ${shiftDuration.totalHours} hrs`
              : isClockedIn
              ? "Live timer updating in real time"
              : "Timer resets to 0h 00m 00s at midnight"}
          </p>
        </div>

        {/* Metric 3: Shift Closing Lock Status */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Clock Out Access
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            {effectiveIsClockedOut ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isAutoClosed ? "Closed (Auto 7:30 PM)" : "Closed"}
                </span>
              </>
            ) : isUnlockTime ? (
              <>
                <Unlock className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Unlocked ({formattedEndTime} Reached)
                </span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Unlocks at {formattedEndTime}
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {effectiveIsClockedOut
              ? (isAutoClosed ? "Shift automatically finalized past 7:30 PM grace period." : "Shift checkout logged.")
              : isUnlockTime
              ? "Scheduled shift complete. Ready to clock out."
              : `Standard checkout opens at ${formattedEndTime}`}
          </p>
        </div>
      </div>

      {/* Auto Clock-Out Alert Notice */}
      {isAutoClosed && (
        <div className="mb-6 flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Auto Clocked Out by System (Missed manual clock-out):</span>{" "}
            <span>Your shift was automatically concluded at the 7:30 PM system grace period.</span>
          </div>
        </div>
      )}

      {/* Action Button Section: strictly resolving the 3 specified cases */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Action 1: Clock In Button */}
        {/* CASE 1: No record found for today -> Primary enabled Clock In */}
        {!isClockedIn && !effectiveIsClockedOut ? (
          <button
            id="btn-daily-clock-in"
            type="button"
            onClick={handleClockInClick}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium bg-[#0B1E48] text-white hover:bg-[#081738] transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-5 h-5" />
            <span>{isPending ? "Clocking In..." : "Clock In"}</span>
          </button>
        ) : isClockedIn && !effectiveIsClockedOut ? (
          /* CASE 2: Record exists for today with clockOut === null -> Disabled Clocked In (HH:MM) */
          <button
            id="btn-daily-clocked-in-disabled"
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-85"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Clocked In ({formattedClockInTime || "In Progress"})</span>
          </button>
        ) : (
          /* CASE 3: Record exists for today with clockOut !== null -> Shift Completed */
          <button
            id="btn-daily-shift-completed-in"
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 cursor-default"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Shift Completed</span>
          </button>
        )}

        {/* Action 2: Clock Out Button */}
        {/* CASE 1: No record found for today -> Default locked state (Unlocks at 07:00 PM) */}
        {!isClockedIn && !effectiveIsClockedOut ? (
          <button
            id="btn-daily-clock-out-locked-init"
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-700/60 cursor-not-allowed opacity-60"
          >
            <Lock className="w-4 h-4" />
            <span>Clock Out (Unlocks at {formattedEndTime})</span>
          </button>
        ) : isClockedIn && !effectiveIsClockedOut ? (
          /* CASE 2: Record exists for today with clockOut === null -> Evaluate >= 19:00 */
          isUnlockTime ? (
            <button
              id="btn-daily-clock-out-active"
              type="button"
              onClick={() => handleClockOutClick()}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              <span>{isPending ? "Clocking Out..." : "Clock Out Now"}</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                id="btn-daily-clock-out-locked"
                type="button"
                disabled
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-80"
              >
                <Lock className="w-4 h-4 text-amber-600" />
                <span className="truncate">Unlocks at {formattedEndTime}</span>
              </button>
              {allowEarlyOverride && (
                <button
                  id="btn-daily-clock-out-early-override"
                  type="button"
                  onClick={() => setShowOverrideModal(true)}
                  className="px-3.5 py-3.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="Clock out early with reason"
                >
                  Early Out
                </button>
              )}
            </div>
          )
        ) : isAutoClosed ? (
          <button
            id="btn-daily-shift-completed-out-auto"
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 cursor-default"
          >
            <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Shift Completed (Auto Clocked Out at 7:30 PM)</span>
          </button>
        ) : (
          /* CASE 3: Record exists for today with clockOut !== null -> Shift Completed */
          <button
            id="btn-daily-shift-completed-out"
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-default"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Shift Completed ({shiftDuration.totalHours} hrs)</span>
          </button>
        )}
      </div>

      {/* Early Clock Out Override Modal */}
      {showOverrideModal && (
        <div
          id="early-clockout-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
          <div
            id="early-clockout-modal"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 mb-3">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Early Shift Departure
              </h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Regular shift ends at <strong>{formattedEndTime}</strong>. Please provide a reason for clocking out early before closing time.
            </p>

            <form onSubmit={handleOverrideSubmit}>
              <textarea
                id="early-clockout-reason-input"
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="State your reason (e.g. Approved doctor appointment, personal emergency)..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                required
              />
              {overrideError && (
                <p className="text-xs text-rose-600 mt-1">{overrideError}</p>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isPending ? "Confirming..." : "Confirm Clock Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(DailyShiftClock);
