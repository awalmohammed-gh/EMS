/**
 * Safe Time Conversion & Work Hours Calculation Utility
 */

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  if (typeof timeStr !== "string") {
    if (timeStr instanceof Date && !isNaN(timeStr.getTime())) {
      return timeStr.getHours() * 60 + timeStr.getMinutes();
    }
    return null;
  }

  // Handle "08:30 AM", "07:00 PM", "8:30 am", or "08:30", "17:45"
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
    return null;
  }

  let [, hours, minutes, modifier] = match;
  let h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);

  if (modifier) {
    const mod = modifier.toUpperCase();
    if (mod === "PM" && h < 12) h += 12;
    if (mod === "AM" && h === 12) h = 0;
  }

  return h * 60 + m;
}

export function calculateWorkHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) {
    return 0; // Fallback to safe 0 instead of NaN
  }

  if (
    (clockIn instanceof Date || (typeof clockIn === "string" && clockIn.includes("T"))) &&
    (clockOut instanceof Date || (typeof clockOut === "string" && clockOut.includes("T")))
  ) {
    const inDate = new Date(clockIn);
    const outDate = new Date(clockOut);
    if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) {
      let diffMs = outDate.getTime() - inDate.getTime();
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000;
      }
      const hours = diffMs / (1000 * 60 * 60);
      return Number.isFinite(hours) && !isNaN(hours) ? Number(hours.toFixed(2)) : 0;
    }
  }

  const inMinutes = parseTimeToMinutes(clockIn);
  const outMinutes = parseTimeToMinutes(clockOut);

  if (inMinutes === null || outMinutes === null) {
    const dIn = new Date(clockIn);
    const dOut = new Date(clockOut);
    if (!isNaN(dIn.getTime()) && !isNaN(dOut.getTime())) {
      const diff = Math.max(0, dOut.getTime() - dIn.getTime());
      const hours = diff / (1000 * 60 * 60);
      return Number.isFinite(hours) && !isNaN(hours) ? Number(hours.toFixed(2)) : 0;
    }
    return 0; // Fallback to safe 0 instead of NaN
  }

  let diffMinutes = outMinutes - inMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }

  const hours = diffMinutes / 60;
  return Number.isFinite(hours) && !isNaN(hours) ? Number(hours.toFixed(2)) : 0;
}

export default {
  parseTimeToMinutes,
  calculateWorkHours,
};
