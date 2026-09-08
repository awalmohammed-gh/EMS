import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  attendanceClockIn,
  attendanceClockOut,
  getNowAttendance,
  getEmployeeAttendance,
  getTodayAttendance,
} from "../apis/fontApis";

const AttendanceContext = createContext(null);

const STORAGE_KEY = "eyenit_today_attendance";
const SYNC_CHANNEL_NAME = "eyenit_attendance_sync";
const ALT_SYNC_CHANNEL_NAME = "attendance_sync";

const getTodayString = () => new Date().toISOString().split("T")[0];

const defaultTodayRecord = {
  date: getTodayString(),
  clockIn: null,
  clockOut: null,
  clockInTime: null,
  clockOutTime: null,
  status: null,
  workHours: 0,
  lateMinutes: 0,
  delayMinutes: 0,
  latePenalty: 0,
  penaltyTier: "",
  lateReason: "",
  notes: "",
  isExcused: false,
};

/**
 * Normalizes an attendance record from various API response shapes
 */
const normalizeAttendanceRecord = (raw, fallbackDate = getTodayString()) => {
  if (!raw) return { ...defaultTodayRecord, date: fallbackDate };

  const clockIn = raw.clockIn || raw.clockInTime || null;
  const clockOut = raw.clockOut || raw.clockOutTime || null;
  const delayMinutes =
    raw.delayMinutes !== undefined
      ? Number(raw.delayMinutes)
      : raw.lateMinutes !== undefined
      ? Number(raw.lateMinutes)
      : 0;
  const lateMinutes =
    raw.lateMinutes !== undefined
      ? Number(raw.lateMinutes)
      : raw.delayMinutes !== undefined
      ? Number(raw.delayMinutes)
      : 0;

  const latePenalty =
    raw.latePenalty !== undefined && raw.latePenalty !== null
      ? Number(raw.latePenalty)
      : 0;

  let status = raw.status || null;
  if (!status && clockIn) {
    status = lateMinutes > 0 ? "Late" : "On Time";
  }

  return {
    ...defaultTodayRecord,
    ...raw,
    date: raw.date || fallbackDate,
    clockIn,
    clockInTime: clockIn,
    clockOut,
    clockOutTime: clockOut,
    status,
    workHours: Number(raw.workHours || 0),
    delayMinutes,
    lateMinutes,
    latePenalty,
    penaltyTier: raw.penaltyTier || "",
    lateReason: raw.lateReason || raw.notes || "",
    notes: raw.notes || raw.lateReason || "",
    isExcused: Boolean(raw.isExcused),
  };
};

export const AttendanceProvider = ({ children }) => {
  // Initialize state with activeShift or cached today record if valid
  const [todayRecord, setTodayRecord] = useState(() => {
    try {
      // 1. Check for dedicated active incomplete shift cached upon login
      const activeCached = localStorage.getItem("activeShift");
      if (activeCached) {
        const parsed = JSON.parse(activeCached);
        if (parsed && (parsed.clockIn || parsed.clockInTime) && (!parsed.clockOut && !parsed.clockOutTime)) {
          return normalizeAttendanceRecord(parsed, parsed.date || getTodayString());
        }
      }

      // 2. Check standard storage key
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const todayStr = getTodayString();
        if (parsed && (parsed.date === todayStr || (!parsed.date && (parsed.clockIn || parsed.clockOut)))) {
          return normalizeAttendanceRecord(parsed, todayStr);
        }
      }
    } catch (e) {
      console.warn("Error reading cached attendance:", e);
    }
    return { ...defaultTodayRecord, date: getTodayString() };
  });

  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isClocking, setIsClocking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  const broadcastChannelRef = useRef(null);
  const altBroadcastChannelRef = useRef(null);

  // Sync state to localStorage whenever todayRecord changes
  const saveToStorage = useCallback((record) => {
    try {
      if (record) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        if (record.clockIn && !record.clockOut) {
          localStorage.setItem("activeShift", JSON.stringify(record));
        } else if (record.clockOut) {
          localStorage.removeItem("activeShift");
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("activeShift");
      }
    } catch (e) {
      console.warn("Error saving attendance to storage:", e);
    }
  }, []);

  // Broadcast update to other tabs/components
  const broadcastAttendanceChange = useCallback((action, data) => {
    const payload = { action, data, timestamp: Date.now() };

    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(payload);
      }
      if (altBroadcastChannelRef.current) {
        altBroadcastChannelRef.current.postMessage(payload);
      }
    } catch (e) {
      console.warn("BroadcastChannel error:", e);
    }

    // Also dispatch custom DOM window events for components listening locally
    window.dispatchEvent(
      new CustomEvent("attendance-updated", { detail: payload })
    );
    window.dispatchEvent(
      new CustomEvent("lateness-analytics-invalidate", { detail: payload })
    );
  }, []);

  // Fetch today's attendance status from server
  const refreshAttendance = useCallback(async (silent = false) => {
    const todayStr = getTodayString();
    if (!silent) setIsSyncing(true);
    setError(null);

    try {
      // Query /attendance/now (backed by getTodayAttendance with live memory store fallback)
      let res;
      try {
        res = await getNowAttendance();
      } catch {
        // Fallback to /attendance/today if /now fails
        res = await getTodayAttendance();
      }

      if (res?.data?.success) {
        const rawAtt = res.data.todayRecord || res.data.attendance;
        if (rawAtt) {
          const normalized = normalizeAttendanceRecord(rawAtt, todayStr);
          setTodayRecord((prev) => {
            // Keep the one with clock-in if previous has it and response is empty
            if (!normalized.clockIn && prev.clockIn && prev.date === todayStr) {
              return prev;
            }
            saveToStorage(normalized);
            return normalized;
          });
        } else {
          // If server says no attendance, only clear if we didn't clock in recently
          setTodayRecord((prev) => {
            if (prev.date === todayStr && prev.clockIn) {
              return prev;
            }
            const empty = { ...defaultTodayRecord, date: todayStr };
            saveToStorage(empty);
            return empty;
          });
        }
      }
      setLastSyncTime(Date.now());
    } catch (err) {
      console.warn("Could not refresh today's attendance:", err.message);
      setError(err.message);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [saveToStorage]);

  // Fetch full attendance history
  const fetchAttendanceHistory = useCallback(async () => {
    try {
      const res = await getEmployeeAttendance();
      if (res?.data?.success && Array.isArray(res.data.attendance)) {
        setAttendanceHistory(res.data.attendance);

        // Also check if today's record is in the history
        const todayStr = getTodayString();
        const todayInHistory = res.data.attendance.find(
          (item) => item.date === todayStr
        );
        if (todayInHistory) {
          const normalized = normalizeAttendanceRecord(todayInHistory, todayStr);
          saveToStorage(normalized);
          setTodayRecord(normalized);
        }
      }
    } catch (err) {
      console.warn("Could not fetch attendance history:", err.message);
    }
  }, [saveToStorage]);

  // Auto-populate and hydrate attendance dashboard state directly from login verification payload
  const autoPopulateFromAuth = useCallback(
    (authPayload) => {
      if (!authPayload) return null;
      const todayStr = getTodayString();
      const shiftData =
        authPayload.activeShift || authPayload.todayRecord || authPayload.attendance;
      if (!shiftData) return null;

      const normalized = normalizeAttendanceRecord(
        shiftData,
        shiftData.date || todayStr
      );
      setTodayRecord(normalized);
      saveToStorage(normalized);

      if (
        authPayload.hasActiveShift ||
        (normalized.clockIn && !normalized.clockOut)
      ) {
        try {
          localStorage.setItem("activeShift", JSON.stringify(normalized));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch (e) {
          console.warn("Error caching active shift:", e);
        }
        broadcastAttendanceChange("active_shift_hydrated", normalized);
      } else {
        try {
          localStorage.removeItem("activeShift");
        } catch {
          // ignore
        }
        broadcastAttendanceChange("attendance_hydrated", normalized);
      }

      return normalized;
    },
    [saveToStorage, broadcastAttendanceChange]
  );

  // Unified Clock-In handler
  const clockIn = useCallback(
    async (reasonParam = "") => {
      setIsClocking(true);
      setError(null);

      const todayStr = getTodayString();
      const nowIso = new Date().toISOString();
      const reasonToSend = String(reasonParam || "").trim();

      try {
        const res = await attendanceClockIn({
          lateReason: reasonToSend,
          notes: reasonToSend,
          reason: reasonToSend,
          clockInTime: nowIso,
          timestamp: nowIso,
        });

        const data = res?.data || {};
        if (!data.success && !data.alreadyClockedIn) {
          throw new Error(data.message || "Clock in failed");
        }

        // Extract attendance payload
        let rawAttendance = data.todayRecord || data.attendance;
        if (Array.isArray(rawAttendance)) {
          rawAttendance = rawAttendance[0];
        }

        const normalized = normalizeAttendanceRecord(
          rawAttendance || {
            date: todayStr,
            clockIn: nowIso,
            clockInTime: nowIso,
            status: data.status || "On Time",
            delayMinutes: data.delayMinutes || data.lateMinutes || 0,
            lateMinutes: data.lateMinutes || data.delayMinutes || 0,
            latePenalty: data.latePenalty || 0,
            penaltyTier: data.penaltyTier || "",
            lateReason: reasonToSend,
            notes: reasonToSend,
          },
          todayStr
        );

        // Ensure clockIn is explicitly set to non-null
        if (!normalized.clockIn) {
          normalized.clockIn = nowIso;
          normalized.clockInTime = nowIso;
        }

        // Update centralized state
        setTodayRecord(normalized);
        saveToStorage(normalized);

        // Notify across tabs and components
        broadcastAttendanceChange("clock_in", normalized);

        // Fetch fresh history and refresh dashboard in background
        fetchAttendanceHistory();

        return {
          success: true,
          record: normalized,
          data,
          alreadyClockedIn: Boolean(data.alreadyClockedIn),
          message: data.message || "Clock in successful",
        };
      } catch (err) {
        const errMsg =
          err?.response?.data?.message || err.message || "Clock in request failed";
        setError(errMsg);
        throw err;
      } finally {
        setIsClocking(false);
      }
    },
    [saveToStorage, broadcastAttendanceChange, fetchAttendanceHistory]
  );

  // Unified Clock-Out handler
  const clockOut = useCallback(async () => {
    setIsClocking(true);
    setError(null);

    const todayStr = getTodayString();
    const nowIso = new Date().toISOString();

    try {
      const res = await attendanceClockOut();
      const data = res?.data || {};

      if (!data.success && !data.alreadyClockedOut) {
        throw new Error(data.message || "Clock out failed");
      }

      let rawAttendance = data.todayRecord || data.attendance;
      if (Array.isArray(rawAttendance)) {
        rawAttendance = rawAttendance[0];
      }

      setTodayRecord((prev) => {
        const clockInTime = prev.clockIn || rawAttendance?.clockIn || nowIso;
        const diffMs = Math.max(0, new Date(nowIso).getTime() - new Date(clockInTime).getTime());
        const workHours = Math.max(0.01, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

        const updated = normalizeAttendanceRecord(
          {
            ...prev,
            ...(rawAttendance || {}),
            clockOut: nowIso,
            clockOutTime: nowIso,
            workHours: rawAttendance?.workHours || workHours,
          },
          todayStr
        );

        saveToStorage(updated);
        broadcastAttendanceChange("clock_out", updated);
        return updated;
      });

      fetchAttendanceHistory();

      return {
        success: true,
        data,
        message: data.message || "Clock out successful",
      };
    } catch (err) {
      const errMsg =
        err?.response?.data?.message || err.message || "Clock out request failed";
      setError(errMsg);
      throw err;
    } finally {
      setIsClocking(false);
    }
  }, [saveToStorage, broadcastAttendanceChange, fetchAttendanceHistory]);

  // Update todayRecord directly (for manual sync or optimistic updates)
  const updateTodayRecord = useCallback(
    (updater) => {
      setTodayRecord((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        const normalized = normalizeAttendanceRecord(next, getTodayString());
        saveToStorage(normalized);
        broadcastAttendanceChange("record_updated", normalized);
        return normalized;
      });
    },
    [saveToStorage, broadcastAttendanceChange]
  );

  // Initialize BroadcastChannel and window event listeners
  useEffect(() => {
    let bc = null;
    let altBc = null;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          if (event?.data?.data) {
            const normalized = normalizeAttendanceRecord(
              event.data.data,
              getTodayString()
            );
            setTodayRecord(normalized);
            saveToStorage(normalized);
          }
        };

        altBc = new BroadcastChannel(ALT_SYNC_CHANNEL_NAME);
        altBroadcastChannelRef.current = altBc;
        altBc.onmessage = (event) => {
          if (event?.data?.data) {
            const normalized = normalizeAttendanceRecord(
              event.data.data,
              getTodayString()
            );
            setTodayRecord(normalized);
            saveToStorage(normalized);
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel initialization skipped:", e);
      }
    }

    // Local custom event listener
    const handleLocalUpdate = (e) => {
      if (e?.detail?.data) {
        const normalized = normalizeAttendanceRecord(
          e.detail.data,
          getTodayString()
        );
        setTodayRecord(normalized);
        saveToStorage(normalized);
      }
    };

    // Cross-tab storage change listener
    const handleStorageChange = (e) => {
      if ((e.key === STORAGE_KEY || e.key === "activeShift") && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const normalized = normalizeAttendanceRecord(parsed, parsed.date || getTodayString());
          setTodayRecord(normalized);
        } catch {
          // ignore
        }
      }
    };

    // Tab focus listener to revalidate state
    const handleWindowFocus = () => {
      refreshAttendance(true);
    };

    window.addEventListener("attendance-updated", handleLocalUpdate);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleWindowFocus);

    // Initial server refresh
    refreshAttendance(true);
    fetchAttendanceHistory();

    return () => {
      if (bc) bc.close();
      if (altBc) altBc.close();
      window.removeEventListener("attendance-updated", handleLocalUpdate);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [refreshAttendance, fetchAttendanceHistory, saveToStorage]);

  // Derived flags
  const isClockedIn = Boolean(todayRecord?.clockIn || todayRecord?.clockInTime);
  const hasClockedIn = isClockedIn;
  const isClockedOut = Boolean(todayRecord?.clockOut || todayRecord?.clockOutTime);
  const hasClockedOut = isClockedOut;
  const isActiveShift = isClockedIn && !isClockedOut;
  const isLoading = isSyncing || isClocking;

  const isLate =
    hasClockedIn &&
    ((todayRecord?.status || "").toLowerCase().includes("late") ||
      Number(todayRecord?.lateMinutes || todayRecord?.delayMinutes || 0) > 0);

  const isOnTime = hasClockedIn && !isLate;

  // Shift status string
  const shiftStatus = useMemo(() => {
    if (hasClockedOut) return "shift_completed";
    if (hasClockedIn) return "clocked_in";
    return "not_clocked_in";
  }, [hasClockedIn, hasClockedOut]);

  // Step indicator matching 4-step shift evaluation:
  // Step 1: Not Clocked In
  // Step 2: Currently Working (clocked in, not clocked out)
  // Step 3: Shift Closing Reached
  // Step 4: Shift Completed (clocked out)
  const currentStep = useMemo(() => {
    if (hasClockedOut) return 4;
    if (hasClockedIn) return 2;
    return 1;
  }, [hasClockedIn, hasClockedOut]);

  const value = useMemo(
    () => ({
      todayRecord,
      attendanceData: todayRecord, // backward compatibility alias
      attendanceHistory,
      isLoading,
      isClocking,
      isSyncing,
      error,
      lastSyncTime,
      // Boolean status flags
      isClockedIn,
      hasClockedIn,
      isClockedOut,
      hasClockedOut,
      isActiveShift,
      isLate,
      isOnTime,
      shiftStatus,
      currentStep,
      // Action handlers & auto-population helpers
      clockIn,
      clockOut,
      refreshAttendance,
      fetchAttendanceHistory,
      updateTodayRecord,
      setTodayRecord,
      autoPopulateFromAuth,
      hydrateActiveShift: autoPopulateFromAuth,
    }),
    [
      todayRecord,
      attendanceHistory,
      isLoading,
      isClocking,
      isSyncing,
      error,
      lastSyncTime,
      isClockedIn,
      hasClockedIn,
      isClockedOut,
      hasClockedOut,
      isActiveShift,
      isLate,
      isOnTime,
      shiftStatus,
      currentStep,
      clockIn,
      clockOut,
      refreshAttendance,
      fetchAttendanceHistory,
      updateTodayRecord,
      autoPopulateFromAuth,
    ]
  );

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
};

export default AttendanceContext;
