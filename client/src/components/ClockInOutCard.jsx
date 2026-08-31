import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  Timer,
  CalendarDays,
  Lock,
  Unlock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { getSettings } from "../apis/fontApis";

/**
 * ClockInOutCard Component
 *
 * Strict shift-time attendance card with 4 discrete states:
 * State 1: Before Clock-In (During Start Hours) -> Clock In ACTIVE, Clock Out DISABLED
 * State 2: Active Working Hours (Before workEndTime) -> Clock In DISABLED, Clock Out DISABLED (with live countdown & closing time unlock notice)
 * State 3: Closing Time Reached (Shift End >= workEndTime) -> Clock Out ACTIVE, Clock In DISABLED
 * State 4: Shift Completed (After Clock Out) -> Both DISABLED with completed summary
 */
const ClockInOutCard = ({
  attendanceData = {},
  hasClockedIn = false,
  hasClockedOut = false,
  isLoading = false,
  onClockIn,
  onClockOut,
  workEndTime: propWorkEndTime,
  workStartTime: propWorkStartTime,
  allowEarlyOverride: propAllowEarlyOverride = false,
  userRole = "employee",
}) => {
  // Live current time state updating every second
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settingsEndTime, setSettingsEndTime] = useState(propWorkEndTime || "17:00");
  const [settingsStartTime, setSettingsStartTime] = useState(propWorkStartTime || "08:00");
  const [earlyOverrideActive, setEarlyOverrideActive] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Sync prop changes or fetch company settings
  useEffect(() => {
    if (propWorkEndTime) setSettingsEndTime(propWorkEndTime);
    if (propWorkStartTime) setSettingsStartTime(propWorkStartTime);
  }, [propWorkEndTime, propWorkStartTime]);

  useEffect(() => {
    let isMounted = true;
    const fetchCompanyRules = async () => {
      try {
        const res = await getSettings();
        if (isMounted && res?.data?.success && res.data.settings?.attendance) {
          const { workEndTime, workStartTime } = res.data.settings.attendance;
          if (workEndTime) setSettingsEndTime(workEndTime);
          if (workStartTime) setSettingsStartTime(workStartTime);
        }
      } catch {
        // Fallback to default 08:00 - 17:00
      }
    };
    if (!propWorkEndTime || !propWorkStartTime) {
      fetchCompanyRules();
    }
    return () => {
      isMounted = false;
    };
  }, [propWorkEndTime, propWorkStartTime]);

  // Live second ticker
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

  // Format digital clock string (HH:MM:SS AM/PM)
  const formattedDigitalTime = useMemo(() => {
    return currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }, [currentTime]);

  // Format today's full date
  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString("en-GH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [currentTime]);

  // Helper to format ISO time strings
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

  // Calculate live elapsed work duration if clocked in and not clocked out
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
      const seconds = Math.floor((diffMs / 1000) % 60);
      return `${hours}h ${minutes}m ${seconds}s`;
    } catch {
      return null;
    }
  }, [hasClockedIn, attendanceData.clockIn, hasClockedOut, currentTime]);

  // Check whether early clock-out is unlocked (by time, prop, or manager override)
  const isClockOutUnlocked =
    shiftEvaluation.isClosingTimeReached ||
    earlyOverrideActive ||
    propAllowEarlyOverride;

  // Determine current active 4-state
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

  // Can user use manager/admin override?
  const canOverride =
    userRole === "admin" ||
    userRole === "manager" ||
    propAllowEarlyOverride;

  return (
    <div
      id="user-friendly-clock-in-out-card"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20 transition-all duration-200"
    >
      {/* Top Bar: Title, Status Badge, Action Buttons & Live Digital Clock */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#002185] dark:bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Daily Attendance & Shift Clock
              </h2>

              {/* State-specific Status Badge */}
              {currentStep === 1 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Ready to Clock In
                </span>
              )}

              {currentStep === 2 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Active Shift (In Progress)
                </span>
              )}

              {currentStep === 3 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Closing Time Reached · Ready to Clock Out
                </span>
              )}

              {currentStep === 4 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Shift Completed
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedDate}</span>
              <span>•</span>
              <span>
                Shift Schedule: {shiftEvaluation.formattedStartTime} – {shiftEvaluation.formattedEndTime}
              </span>
            </p>
          </div>
        </div>

        {/* Top Right: Clock In / Clock Out Buttons + Live Clock */}
        <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
          <div className="flex items-center gap-2.5">
            {/* 1. CLOCK IN BUTTON */}
            <button
              type="button"
              id="btn-shift-clock-in"
              onClick={onClockIn}
              disabled={hasClockedIn || isLoading}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer ${
                hasClockedIn
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                  : isLoading
                  ? "bg-blue-400 text-white cursor-not-allowed"
                  : "bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 dark:hover:bg-blue-700 text-white active:scale-[0.98]"
              }`}
              title={
                hasClockedIn
                  ? `Clocked In (${formatTime(attendanceData.clockIn)})`
                  : "Click to clock in and begin your shift"
              }
            >
              {hasClockedIn ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Clocked In ({formatTime(attendanceData.clockIn)})</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? "Recording..." : "Clock In"}</span>
                </>
              )}
            </button>

            {/* 2. CLOCK OUT BUTTON */}
            <button
              type="button"
              id="btn-shift-clock-out"
              onClick={onClockOut}
              disabled={!hasClockedIn || hasClockedOut || !isClockOutUnlocked || isLoading}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-xs cursor-pointer ${
                hasClockedOut
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                  : !hasClockedIn
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                  : !isClockOutUnlocked
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-700 text-white active:scale-[0.98]"
              }`}
              title={
                hasClockedOut
                  ? `Shift Completed (${formatTime(attendanceData.clockOut)})`
                  : !hasClockedIn
                  ? `Clock out unlocks at scheduled closing time (${shiftEvaluation.formattedEndTime})`
                  : !isClockOutUnlocked
                  ? `Clock out unlocks at scheduled closing time (${shiftEvaluation.formattedEndTime})`
                  : "Click to clock out and finalize your shift"
              }
            >
              {hasClockedOut ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Shift Completed ({formatTime(attendanceData.clockOut)})</span>
                </>
              ) : !isClockOutUnlocked && hasClockedIn ? (
                <>
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Locked until {shiftEvaluation.formattedEndTime}</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>{isLoading ? "Recording..." : "Clock Out"}</span>
                </>
              )}
            </button>
          </div>

          {/* Live Digital Clock Widget */}
          <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-4 py-2 self-start sm:self-auto shadow-2xs">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                Official Live Time
              </span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-slate-900 dark:text-white tracking-tight">
                {formattedDigitalTime}
              </span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          </div>
        </div>
      </div>

      {/* Middle Grid: Check In, Shift Duration, Check Out */}
      <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800/80">
        {/* Check In Box */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            hasClockedIn
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
              : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <LogIn className={`w-3.5 h-3.5 ${hasClockedIn ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
              Clock In Record
            </span>
            {hasClockedIn && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                Recorded
              </span>
            )}
          </div>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {hasClockedIn ? formatTime(attendanceData.clockIn) : "--:--"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {hasClockedIn
              ? attendanceData.status === "Late" || attendanceData.lateMinutes > 0
                ? `Clocked in with ${attendanceData.lateMinutes || 0}m delay`
                : "Clocked in on schedule"
              : `Standard start: ${shiftEvaluation.formattedStartTime}`}
          </p>
        </div>

        {/* Live Elapsed Shift Duration Box */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            hasClockedIn && !hasClockedOut
              ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60"
              : hasClockedOut
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
              : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <Timer
                className={`w-3.5 h-3.5 ${
                  hasClockedIn && !hasClockedOut
                    ? "text-blue-600 dark:text-blue-400"
                    : hasClockedOut
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400"
                }`}
              />
              Shift Duration
            </span>
            {hasClockedIn && !hasClockedOut && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 animate-pulse">
                Live
              </span>
            )}
            {hasClockedOut && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                Logged
              </span>
            )}
          </div>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {hasClockedIn && !hasClockedOut
              ? liveElapsedDuration || "0h 0m 0s"
              : hasClockedOut
              ? `${attendanceData.workHours || 0} hrs`
              : "0h 0m 0s"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {hasClockedIn && !hasClockedOut
              ? "Actively counting working hours"
              : hasClockedOut
              ? "Approved work hours recorded"
              : "Target standard: 8.0 hours"}
          </p>
        </div>

        {/* Check Out Box */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            hasClockedOut
              ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
              : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <LogOut className={`w-3.5 h-3.5 ${hasClockedOut ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
              Clock Out Record
            </span>
            {hasClockedOut ? (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                Completed
              </span>
            ) : isClockOutUnlocked && hasClockedIn ? (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                Unlocked
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                Locked
              </span>
            )}
          </div>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {hasClockedOut ? formatTime(attendanceData.clockOut) : "--:--"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {hasClockedOut
              ? "Shift finalized and synced"
              : isClockOutUnlocked && hasClockedIn
              ? "Ready to clock out now"
              : `Unlocks at ${shiftEvaluation.formattedEndTime}`}
          </p>
        </div>
      </div>

      {/* Countdown Notification Banner for State 2 (Active Working Hours before closing) */}
      {currentStep === 2 && (
        <div className="my-4 p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Shift In Progress:</span> Clock out unlocks at scheduled closing time (
              <span className="font-mono font-semibold">{shiftEvaluation.formattedEndTime}</span>).
              <span className="ml-1 opacity-90">
                (Unlocks automatically in <span className="font-mono font-semibold">{shiftEvaluation.countdownText}</span>)
              </span>
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

      {/* State 4 Completed Banner */}
      {currentStep === 4 && (
        <div className="my-4 p-3.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold">Shift Completed for Today:</span> Total approved work hours:{" "}
            <span className="font-mono font-bold">{attendanceData.workHours || 0} hrs</span>.
          </div>
        </div>
      )}

      {/* Bottom Informational Strip */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div>
          {currentStep === 1 && (
            <span>Please clock in to begin your shift and timestamp your attendance.</span>
          )}
          {currentStep === 2 && (
            <span>
              Clocked in at <span className="font-semibold text-slate-700 dark:text-slate-300">{formatTime(attendanceData.clockIn)}</span>. Active working session.
            </span>
          )}
          {currentStep === 3 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Closing time reached! You may now clock out to finalize your shift hours.
            </span>
          )}
          {currentStep === 4 && (
            <span>Shift finalized for today. Both action buttons are complete and locked.</span>
          )}
        </div>

        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <span>Standard Target: 8.0 hrs</span>
        </div>
      </div>

      {/* Early Clock-Out Override Confirmation Modal (Manager/Admin Override) */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
              Authorizing this override will unlock the Clock Out button immediately for an early departure.
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
  );
};

export default ClockInOutCard;
