import * as employeeAttendance from "./employeeAttendance.js";

export {
  autoCloseUnfinishedShifts,
  autoCloseAllStaleShifts,
  autoCloseEveningPastGracePeriod,
  clockIn,
  clockOut,
  getTodayAttendance,
  getEmployeeAttendance,
  getAllAttendance,
  getAttendanceMetrics,
  syncAttendance,
} from "./employeeAttendance.js";

export * from "./employeeAttendance.js";
export default employeeAttendance;

