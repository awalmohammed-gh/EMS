/**
 * Centralized Dynamic Lateness Penalty Calculator
 * Single source of truth across Attendance tracking, manual overrides, and Payroll processing.
 *
 * 6 Lateness Tiers:
 * - Tier 1: 1 – 30 mins
 * - Tier 2: 31 – 60 mins (up to 1 hr)
 * - Tier 3: 61 – 120 mins (1 – 2 hrs)
 * - Tier 4: 121 – 180 mins (2 – 3 hrs)
 * - Tier 5: 181 – 240 mins (3 – 4 hrs)
 * - Tier 6: 241 – 300+ mins (4+ hrs)
 */

export const DEFAULT_LATENESS_TIERS = [
  { tier: 1, name: "Tier 1: 1–30 mins late", minMinutes: 1, maxMinutes: 30, fine: 10, defaultFine: 10 },
  { tier: 2, name: "Tier 2: 31–60 mins late", minMinutes: 31, maxMinutes: 60, fine: 30, defaultFine: 30 },
  { tier: 3, name: "Tier 3: 61–120 mins (1–2 hrs)", minMinutes: 61, maxMinutes: 120, fine: 50, defaultFine: 50 },
  { tier: 4, name: "Tier 4: 121–180 mins (2–3 hrs)", minMinutes: 121, maxMinutes: 180, fine: 75, defaultFine: 75 },
  { tier: 5, name: "Tier 5: 181–240 mins (3–4 hrs)", minMinutes: 181, maxMinutes: 240, fine: 100, defaultFine: 100 },
  { tier: 6, name: "Tier 6: 241+ mins (4+ hrs)", minMinutes: 241, maxMinutes: 9999, fine: 150, defaultFine: 150 },
];

/**
 * Helper to safely extract numeric tier fine without treating 0 as falsy or fallbacking.
 */
export const getTierConfiguredFine = (tierNum, tierKey, settings, defaultFallback) => {
  if (!settings) return defaultFallback;

  // 1. Direct explicit key check (e.g. settings.lateTier1_amount)
  // Ensure we check !== undefined and !== null so 0 is strictly preserved.
  if (settings[tierKey] !== undefined && settings[tierKey] !== null && settings[tierKey] !== "") {
    const num = Number(settings[tierKey]);
    if (!isNaN(num) && num >= 0) {
      return num;
    }
  }

  // 2. Check latenessTiers array if present in settings
  if (Array.isArray(settings.latenessTiers) && settings.latenessTiers.length > 0) {
    const matched = settings.latenessTiers.find((t) => Number(t.tier) === Number(tierNum));
    if (matched) {
      if (matched.fine !== undefined && matched.fine !== null && matched.fine !== "") {
        const f = Number(matched.fine);
        if (!isNaN(f) && f >= 0) return f;
      }
      if (matched.penalty !== undefined && matched.penalty !== null && matched.penalty !== "") {
        const p = Number(matched.penalty);
        if (!isNaN(p) && p >= 0) return p;
      }
      if (matched.amount !== undefined && matched.amount !== null && matched.amount !== "") {
        const a = Number(matched.amount);
        if (!isNaN(a) && a >= 0) return a;
      }
    }
  }

  return defaultFallback;
};

/**
 * Builds standard 6 tiers array using active settings
 */
export const getStandardizedLatenessTiers = (settings = {}) => {
  return [
    {
      tier: 1,
      name: "Tier 1: 1–30 mins late",
      minMinutes: 1,
      maxMinutes: 30,
      fine: getTierConfiguredFine(1, "lateTier1_amount", settings, 10),
    },
    {
      tier: 2,
      name: "Tier 2: 31–60 mins late",
      minMinutes: 31,
      maxMinutes: 60,
      fine: getTierConfiguredFine(2, "lateTier2_amount", settings, 30),
    },
    {
      tier: 3,
      name: "Tier 3: 61–120 mins (1–2 hrs)",
      minMinutes: 61,
      maxMinutes: 120,
      fine: getTierConfiguredFine(3, "lateTier3_amount", settings, 50),
    },
    {
      tier: 4,
      name: "Tier 4: 121–180 mins (2–3 hrs)",
      minMinutes: 121,
      maxMinutes: 180,
      fine: getTierConfiguredFine(4, "lateTier4_amount", settings, 75),
    },
    {
      tier: 5,
      name: "Tier 5: 181–240 mins (3–4 hrs)",
      minMinutes: 181,
      maxMinutes: 240,
      fine: getTierConfiguredFine(5, "lateTier5_amount", settings, 100),
    },
    {
      tier: 6,
      name: "Tier 6: 241+ mins (4+ hrs)",
      minMinutes: 241,
      maxMinutes: 9999,
      fine: getTierConfiguredFine(6, "lateTier6_amount", settings, 150),
    },
  ];
};

/**
 * Core function: calculateLatenessPenalty(delayMinutes, settings)
 * Determines exact tier range and returns penalty amount based on configured settings.
 * If configured fine is 0, returns 0.00 without any fallback.
 */
export const calculateLatenessPenalty = (delayMinutesInput, settings = {}) => {
  const delayMinutes = Math.max(0, Number(delayMinutesInput) || 0);

  if (delayMinutes <= 0) {
    return {
      isLate: false,
      status: "on-time",
      delayMinutes: 0,
      minutesLate: 0,
      lateMinutes: 0,
      penalty: 0,
      latePenalty: 0,
      tier: "On Time",
      tierNumber: 0,
    };
  }

  const tiers = getStandardizedLatenessTiers(settings);

  let matchedTier = tiers.find(
    (t) => delayMinutes >= t.minMinutes && delayMinutes <= t.maxMinutes
  );

  // If beyond highest minMinutes, match Tier 6
  if (!matchedTier) {
    matchedTier = tiers[tiers.length - 1];
  }

  const fineAmount = Number(matchedTier.fine);
  const safeFine = isNaN(fineAmount) || fineAmount < 0 ? 0 : fineAmount;

  return {
    isLate: true,
    status: "late",
    delayMinutes,
    minutesLate: delayMinutes,
    lateMinutes: delayMinutes,
    penalty: safeFine,
    latePenalty: safeFine,
    tier: matchedTier.name,
    tierNumber: matchedTier.tier,
  };
};

/**
 * High-level evaluator: evaluateLatenessPenalty(clockInDate, workStartTime, settings)
 * Parses clock-in time and evaluates against work start time and active tier configuration.
 */
export const evaluateLatenessPenalty = (
  clockInDate,
  workStartTime = "08:00",
  settings = {}
) => {
  let startHour = 8;
  let startMinute = 0;

  if (typeof workStartTime === "string" && workStartTime.includes(":")) {
    const parts = workStartTime.trim().split(":");
    startHour = parseInt(parts[0], 10) || 8;
    startMinute = parseInt(parts[1], 10) || 0;
  }

  if (!clockInDate) {
    return {
      isLate: false,
      status: "unknown",
      minutesLate: 0,
      lateMinutes: 0,
      delayMinutes: 0,
      penalty: 0,
      latePenalty: 0,
      tier: "On Time",
      tierNumber: 0,
      clockInFormatted: "--",
    };
  }

  let clockIn = null;
  if (clockInDate instanceof Date) {
    clockIn = clockInDate;
  } else if (typeof clockInDate === "string") {
    const parsed = new Date(clockInDate);
    if (!isNaN(parsed.getTime())) {
      clockIn = parsed;
    } else {
      const timeMatch = clockInDate.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const dummy = new Date();
        let h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        if (/pm/i.test(clockInDate) && h < 12) h += 12;
        if (/am/i.test(clockInDate) && h === 12) h = 0;
        dummy.setHours(h, m, 0, 0);
        clockIn = dummy;
      }
    }
  }

  if (!clockIn || isNaN(clockIn.getTime())) {
    return {
      isLate: false,
      status: "unknown",
      minutesLate: 0,
      lateMinutes: 0,
      delayMinutes: 0,
      penalty: 0,
      latePenalty: 0,
      tier: "On Time",
      tierNumber: 0,
      clockInFormatted: "--",
    };
  }

  const clockInHour = clockIn.getHours();
  const clockInMinute = clockIn.getMinutes();

  const startTotalMinutes = startHour * 60 + startMinute;
  const clockInTotalMinutes = clockInHour * 60 + clockInMinute;
  const delayMinutes = Math.max(0, clockInTotalMinutes - startTotalMinutes);

  const penaltyObj = calculateLatenessPenalty(delayMinutes, settings);

  let formattedTime = "--";
  try {
    formattedTime = clockIn.toLocaleTimeString("en-GH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    formattedTime = `${String(clockInHour).padStart(2, "0")}:${String(clockInMinute).padStart(2, "0")}`;
  }

  return {
    ...penaltyObj,
    clockInFormatted: formattedTime,
  };
};

export default {
  DEFAULT_LATENESS_TIERS,
  getTierConfiguredFine,
  getStandardizedLatenessTiers,
  calculateLatenessPenalty,
  evaluateLatenessPenalty,
};
