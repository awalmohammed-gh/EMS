import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  LogIn,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { getSettings } from "../apis/fontApis";

/**
 * ShiftStatusCard Component
 *
 * Real-time dynamic shift status card that immediately reflects whether
 * the employee is "On Time" or "Late" once they clock in for their shift.
 * Default shift start threshold is 8:00 AM (configurable by admin).
 */
const ShiftStatusCard = ({
  attendanceData = {},
  hasClockedIn = false,
  isLoading = false,
  onClockIn,
  workStartTime: propWorkStartTime,
  onRefresh,
  user,
  userName: propUserName,
}) => {
  const [companyStartTime, setCompanyStartTime] = useState(
    propWorkStartTime || "08:00"
  );
  const [penaltyTiers, setPenaltyTiers] = useState([
    { tier: 1, name: "Tier 1 (1–30 mins)", minMinutes: 1, maxMinutes: 30, fine: 10 },
    { tier: 2, name: "Tier 2 (31–60 mins)", minMinutes: 31, maxMinutes: 60, fine: 30 },
    { tier: 3, name: "Tier 3 (61–120 mins)", minMinutes: 61, maxMinutes: 120, fine: 50 },
    { tier: 4, name: "Tier 4 (121–180 mins)", minMinutes: 121, maxMinutes: 180, fine: 75 },
    { tier: 5, name: "Tier 5 (181–240 mins)", minMinutes: 181, maxMinutes: 240, fine: 100 },
    { tier: 6, name: "Tier 6 (241+ mins)", minMinutes: 241, maxMinutes: 9999, fine: 150 },
  ]);

  // Fetch company settings to ensure real-time shift threshold & penalty tiers
  useEffect(() => {
    let isMounted = true;
    const loadCompanySettings = async () => {
      try {
        const res = await getSettings();
        if (isMounted && res?.data?.success && res.data.settings) {
          const { attendance, penalties } = res.data.settings;
          const startTime =
            attendance?.workStartTime ||
            penalties?.workStartTime ||
            res.data.settings?.workStartTime;
          if (startTime) {
            setCompanyStartTime(startTime);
          }
          if (res.data.settings?.latenessTiers) {
            setPenaltyTiers(res.data.settings.latenessTiers);
          }
        }
      } catch {
        // Fallback to default 08:00
      }
    };

    if (!propWorkStartTime) {
      loadCompanySettings();
    } else {
      setCompanyStartTime(propWorkStartTime);
    }

    return () => {
      isMounted = false;
    };
  }, [propWorkStartTime]);

  // Format 12-hour display string for shift threshold
  const formattedStartTime = useMemo(() => {
    const raw = companyStartTime || "08:00";
    const [hStr, mStr] = raw.split(":");
    const h = parseInt(hStr, 10) || 8;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }, [companyStartTime]);

  // Parse start threshold in minutes
  const startThresholdMinutes = useMemo(() => {
    const raw = companyStartTime || "08:00";
    const [hStr, mStr] = raw.split(":");
    const h = parseInt(hStr, 10) || 8;
    const m = parseInt(mStr, 10) || 0;
    return h * 60 + m;
  }, [companyStartTime]);

  const resolvedEmployeeName = useMemo(() => {
    if (propUserName && typeof propUserName === "string" && propUserName.trim()) {
      return propUserName.trim();
    }
    if (user?.fullName && typeof user.fullName === "string" && user.fullName.trim()) {
      return user.fullName.trim();
    }
    if (user?.name && typeof user.name === "string" && user.name.trim()) {
      return user.name.trim();
    }
    if (user?.full_name && typeof user.full_name === "string" && user.full_name.trim()) {
      return user.full_name.trim();
    }
    try {
      const storedEmp = localStorage.getItem("employeeData");
      if (storedEmp) {
        const parsed = JSON.parse(storedEmp);
        if (parsed?.fullName) return parsed.fullName;
        if (parsed?.name) return parsed.name;
      }
    } catch {
      // ignore
    }
    return "";
  }, [propUserName, user]);

  const greetingTimeOfDay = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const formatShortTime = (timeStr) => {
    if (!timeStr) return "--:--";
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return timeStr;
    }
  };

  // Evaluate Live Status
  const statusEvaluation = useMemo(() => {
    if (!hasClockedIn || !attendanceData.clockIn) {
      // State 1: Awaiting Clock-In
      return {
        type: "pending",
        isLate: false,
        title: "Today's Scheduled Shift",
        badgeText: "Scheduled",
        delayMinutes: 0,
        penaltyAmount: 0,
        tierName: "On Time",
      };
    }

    // State 2 / 3: Clocked In -> Evaluate On Time vs Late
    const clockInDate = new Date(attendanceData.clockIn);
    const clockInMinutes =
      clockInDate.getHours() * 60 + clockInDate.getMinutes();
    const delayMins = Math.max(0, clockInMinutes - startThresholdMinutes);

    // Also inspect database recorded values
    const dbStatus = String(attendanceData.status || "").toLowerCase();
    const dbDelay =
      Number(attendanceData.delayMinutes || attendanceData.lateMinutes || 0);
    const hasRecordedPenalty =
      attendanceData.latePenalty !== undefined &&
      attendanceData.latePenalty !== null &&
      attendanceData.latePenalty !== "";
    const dbPenalty = Number(attendanceData.latePenalty || 0);

    const isLate =
      dbStatus.includes("late") ||
      dbDelay > 0 ||
      delayMins > 0;

    const finalDelayMinutes = dbDelay > 0 ? dbDelay : delayMins;

    // Determine penalty fine:
    // If the database has a recorded penalty (including 0), respect it strictly!
    let calculatedFine = hasRecordedPenalty ? dbPenalty : -1;
    let matchingTier = attendanceData.penaltyTier || "";

    if (isLate && calculatedFine < 0 && finalDelayMinutes > 0) {
      const tierObj = penaltyTiers.find(
        (t) => finalDelayMinutes >= t.minMinutes && finalDelayMinutes <= t.maxMinutes
      );
      if (tierObj) {
        const fineVal = Number(tierObj.amount !== undefined ? tierObj.amount : (tierObj.fine !== undefined ? tierObj.fine : tierObj.penalty)) || 0;
        calculatedFine = fineVal;
        matchingTier = tierObj.name;
      } else {
        calculatedFine = 0;
      }
    }
    if (calculatedFine < 0) calculatedFine = 0;

    if (isLate) {
      const isZeroPenalty = calculatedFine === 0;
      return {
        type: isZeroPenalty ? "late-grace" : "late",
        isLate: true,
        isZeroPenalty,
        title: "Shift Attendance Status: Late Arrival",
        badgeText: `Late (+${finalDelayMinutes}m)`,
        delayMinutes: finalDelayMinutes,
        penaltyAmount: calculatedFine,
        tierName: matchingTier || (isZeroPenalty ? "No Deduction Applied" : `Tier (${finalDelayMinutes} min delay)`),
        clockInShort: formatShortTime(attendanceData.clockIn),
      };
    }

    return {
      type: "ontime",
      isLate: false,
      isZeroPenalty: true,
      title: "Shift Attendance Status: On Time",
      badgeText: "On Time",
      delayMinutes: 0,
      penaltyAmount: 0,
      tierName: "On Time",
      clockInShort: formatShortTime(attendanceData.clockIn),
    };
  }, [
    hasClockedIn,
    attendanceData.clockIn,
    attendanceData.status,
    attendanceData.delayMinutes,
    attendanceData.lateMinutes,
    attendanceData.latePenalty,
    attendanceData.penaltyTier,
    startThresholdMinutes,
    penaltyTiers,
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      id="shift-realtime-status-card"
      className="bg-white dark:bg-[#111927] border border-slate-200/70 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Subtle top indicator bar */}
      <div
        className={`h-1 w-full ${
          statusEvaluation.type === "ontime"
            ? "bg-emerald-500"
            : statusEvaluation.type === "late-grace"
            ? "bg-[#002185]"
            : statusEvaluation.type === "late"
            ? "bg-amber-500"
            : "bg-[#002185]"
        }`}
      />

      <div className="p-4 sm:p-5">
        {/* Main Header / Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Status Avatar Icon */}
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                statusEvaluation.type === "ontime"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/80"
                  : statusEvaluation.type === "late-grace"
                  ? "bg-blue-50 text-[#002185] dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/80"
                  : statusEvaluation.type === "late"
                  ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/80"
                  : "bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200/70 dark:border-slate-800"
              }`}
            >
              {statusEvaluation.type === "ontime" ? (
                <CheckCircle2 className="w-5 h-5 sm:w-5 sm:h-5" />
              ) : statusEvaluation.type === "late-grace" ? (
                <Clock className="w-5 h-5 sm:w-5 sm:h-5" />
              ) : statusEvaluation.type === "late" ? (
                <AlertTriangle className="w-5 h-5 sm:w-5 sm:h-5" />
              ) : (
                <Clock className="w-5 h-5 sm:w-5 sm:h-5" />
              )}
            </div>

            <div className="min-w-0">
              {resolvedEmployeeName && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#002185] dark:text-blue-300 mb-0.5">
                  <span>{greetingTimeOfDay}, <strong className="text-slate-900 dark:text-white font-bold">{resolvedEmployeeName}</strong></span>
                  {user?.employeeId && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 rounded">
                      {user.employeeId}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  {statusEvaluation.title}
                </h2>

                {/* Primary Pill Badge */}
                <span
                  id="shift-status-outcome-badge"
                  className={`inline-flex items-center gap-1.5 shadow-none font-semibold text-xs px-2.5 py-0.5 rounded-lg border ${
                    statusEvaluation.type === "ontime"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-850"
                      : statusEvaluation.type === "late-grace"
                      ? "bg-blue-50 text-[#002185] dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      : statusEvaluation.type === "late"
                      ? "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border-amber-200 dark:border-amber-800"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {statusEvaluation.type === "ontime" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : statusEvaluation.type === "late-grace" ? (
                    <Clock className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400 shrink-0" />
                  ) : statusEvaluation.type === "late" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  )}
                  {statusEvaluation.badgeText}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5 font-normal">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Shift Start:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                  {formattedStartTime}
                </strong>
                {statusEvaluation.type === "ontime" && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Clocked in at <strong>{statusEvaluation.clockInShort}</strong> (On schedule)</span>
                  </span>
                )}
                {statusEvaluation.type === "late-grace" && (
                  <span className="inline-flex items-center gap-1 text-[#002185] dark:text-blue-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400 shrink-0" />
                    <span>Clocked in at <strong>{statusEvaluation.clockInShort}</strong> · No deduction incurred</span>
                  </span>
                )}
                {statusEvaluation.type === "late" && (
                  <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Clocked in at <strong>{statusEvaluation.clockInShort}</strong> · -GH₵{Number(statusEvaluation.penaltyAmount || 0).toFixed(2)} deduction</span>
                  </span>
                )}
                {statusEvaluation.type === "pending" && (
                  <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 font-normal">
                    <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Awaiting Clock-In</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Trigger on Right */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {typeof onRefresh === "function" && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Refresh shift status"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {!hasClockedIn && typeof onClockIn === "function" && (
              <button
                type="button"
                id="btn-status-card-clock-in"
                onClick={onClockIn}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#002185] hover:bg-[#001760] text-white text-xs font-semibold transition border border-transparent shadow-none cursor-pointer active:scale-98 disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isLoading ? "Recording..." : "Clock In Now"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ShiftStatusCard;
