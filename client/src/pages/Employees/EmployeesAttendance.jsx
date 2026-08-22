import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  User,
  Briefcase,
  Building2,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Clock as ClockIcon,
  ArrowRight,
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
} from "../../apis/fontApis";
import WeeklyAttendanceChart from "../../components/WeeklyAttendanceChart";

const EmployeesAttendance = () => {
  // Today's attendance
  const [attendanceData, setAttendanceData] = useState({
    date: null,
    clockIn: null,
    clockOut: null,
    status: null,
    workHours: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [hasClockedIn, setHasClockedIn] = useState(false);
  const [hasClockedOut, setHasClockedOut] = useState(false);

  const { showToast, setShowToast } = useManagement();

  // Fetch today's attendance status
  const fetchTodayAttendance = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await getNowAttendance();
      console.log(
        "Today's attendance API response:",
        JSON.stringify(data, null, 2),
      );

      if (data.success) {
        setEmployee(data.employee);

        // Update attendance data
        if (data.attendance) {
          setAttendanceData({
            date:
              data.attendance.date || new Date().toISOString().split("T")[0],
            clockIn: data.attendance.clockIn || null,
            clockOut: data.attendance.clockOut || null,
            status: data.attendance.status || null,
            workHours: data.attendance.workHours || 0,
          });
        } else {
          setAttendanceData({
            date: new Date().toISOString().split("T")[0],
            clockIn: null,
            clockOut: null,
            status: null,
            workHours: 0,
          });
        }

        // Update clock in/out status
        setHasClockedIn(Boolean(data.hasClockedIn || data.attendance?.clockIn));
        setHasClockedOut(Boolean(data.hasClockedOut || data.attendance?.clockOut));
      } else {
        setError(data.message || "Failed to fetch attendance.");
        setShowToast({
          show: true,
          message: data.message || "Failed to fetch attendance.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to fetch attendance.";
      setError(errorMessage);
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEmployeeAttendanceHistory = async () => {
    try {
      setError(null);
      const { data } = await getEmployeeAttendance();
      console.log(
        "Attendance history API response:",
        JSON.stringify(data, null, 2),
      );

      if (data.success) {
        let history = [];

        if (Array.isArray(data.attendance)) {
          history = data.attendance;
        } else if (data.attendance && typeof data.attendance === "object") {
          history = [data.attendance];
        } else {
          history = [];
        }

        console.log("History array length:", history.length);
        setAttendanceHistory(history);
      } else {
        setError(data.message || "Failed to fetch attendance history.");
      }
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to fetch attendance history.";
      setError(errorMessage);
    }
  };

  // Clock In Function
  const handleClockIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await attendanceClockIn();
      console.log("Clock In API response:", JSON.stringify(data, null, 2));

      if (data.success) {
        // Get attendance from response
        let attendance = data.attendance || null;

        if (attendance) {
          // Update attendance data
          setAttendanceData({
            date: attendance.date || new Date().toISOString().split("T")[0],
            clockIn: attendance.clockIn,
            clockOut: attendance.clockOut || null,
            status: attendance.status || null,
            workHours: attendance.workHours || 0,
          });

          // Update clock in status
          setHasClockedIn(true);
          setHasClockedOut(false);
        }

        setShowToast({
          show: true,
          message: data.message || "Clock in successful!",
          type: "success",
        });

        // Refresh data from server
        await fetchTodayAttendance();
        await getEmployeeAttendanceHistory();
      } else {
        setError(data.message || "Clock in failed.");
        setShowToast({
          show: true,
          message: data.message || "Clock in failed.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Clock in error:", error);
      const errorMessage = error.response?.data?.message || "Clock in failed.";
      setError(errorMessage);
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
      setError(null);
      const { data } = await attendanceClockOut();
      console.log("Clock Out API response:", JSON.stringify(data, null, 2));

      if (data.success) {
        let clockOutData = data.attendance || null;

        if (clockOutData) {
          setAttendanceData((prev) => ({
            ...prev,
            clockOut: clockOutData.clockOut || new Date().toISOString(),
            workHours: clockOutData.workHours || 0,
            status: clockOutData.status || prev.status,
          }));

          // Update clock out status
          setHasClockedOut(true);
        }

        setShowToast({
          show: true,
          message: data.message || "Clock out successful!",
          type: "success",
        });

        // Refresh data from server
        await fetchTodayAttendance();
        await getEmployeeAttendanceHistory();
      } else {
        setError(data.message || "Clock out failed.");
        setShowToast({
          show: true,
          message: data.message || "Clock out failed.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Clock out error:", error);
      const errorMessage = error.response?.data?.message || "Clock out failed.";
      setError(errorMessage);
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
    fetchTodayAttendance();
    getEmployeeAttendanceHistory();
  }, []);

  // Format date
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

  // Format time with AM/PM
  const formatTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "-";
    }
  };

  // Status styles
  const getStatusStyle = (status) => {
    switch (status) {
      case "On Time":
        return "bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20";
      case "Late":
        return "bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/20";
      case "Absent":
        return "bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20";
      default:
        return "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]";
    }
  };

  // Calculate summary stats
  const totalDays = attendanceHistory.length;
  const onTimeDays = attendanceHistory.filter(
    (item) => item?.status === "On Time",
  ).length;
  const lateDays = attendanceHistory.filter(
    (item) => item?.status === "Late",
  ).length;
  const avgWorkHours =
    totalDays > 0
      ? (
          attendanceHistory.reduce(
            (sum, item) => sum + (item?.workHours || 0),
            0,
          ) / totalDays
        ).toFixed(2)
      : 0;

  console.log("🔄 Current attendanceData state:", attendanceData);
  console.log("✅ hasClockedIn:", hasClockedIn);
  console.log("✅ hasClockedOut:", hasClockedOut);

  if (isLoading && !employee) {
    return <Loading />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#002185] shrink-0">
              <ClockIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
                My Attendance
              </h1>
              <p className="text-sm text-[#64748B] mt-0.5">
                Track your daily attendance and working hours
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#64748B] bg-[#FFFFFF] px-4 py-2 rounded-lg border border-[#E2E8F0] hover:border-[#ff5500] transition-all duration-300 shadow-sm">
            <CalendarDays className="h-4 w-4 text-[#ff5500]" />
            {new Date().toLocaleDateString("en-GH", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => {
              fetchTodayAttendance();
              getEmployeeAttendanceHistory();
            }}
            onClose={() => setError(null)}
          />
        )}

        {!error && (
          <>
            {/* Employee Profile Card */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#002185] flex items-center justify-center shadow-md ring-4 ring-[#002185]/10 shrink-0">
                    {employee?.avatar || employee?.profile_picture ? (
                      <img
                        src={employee.avatar || employee.profile_picture}
                        alt={employee.fullName || "Employee"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          employee?.fullName || "Employee",
                        )}&background=002185&color=fff&bold=true`}
                        alt={employee?.fullName || "Employee"}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#16A34A] border-2 border-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#002185]">
                      Welcome back, {employee?.fullName || "Employee"}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-[#64748B]">
                      <span className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-full px-2.5 py-1">
                        <Briefcase className="w-3.5 h-3.5 text-[#002185]" />
                        {employee?.position || "N/A"}
                      </span>
                      <span className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-full px-2.5 py-1">
                        <Building2 className="w-3.5 h-3.5 text-[#002185]" />
                        {employee?.department || "N/A"}
                      </span>
                      <span className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-full px-2.5 py-1">
                        <User className="w-3.5 h-3.5 text-[#002185]" />
                        ID:{" "}
                        {employee?.employeeId ||
                          employee?._id?.slice(-6) ||
                          "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-3 py-1.5 text-xs font-medium text-[#16A34A] border border-[#16A34A]/20">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                      Total Days
                    </p>
                    <p className="mt-1.5 text-2xl font-bold text-[#002185]">
                      {totalDays}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#002185] p-2.5 text-white shadow-sm">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                      On Time
                    </p>
                    <p className="mt-1.5 text-2xl font-bold text-[#16A34A]">
                      {onTimeDays}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F0FDF4] p-2.5 text-[#16A34A] shadow-sm">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                      Late
                    </p>
                    <p className="mt-1.5 text-2xl font-bold text-[#D97706]">
                      {lateDays}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#FFFBEB] p-2.5 text-[#D97706] shadow-sm">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                      Avg. Hours
                    </p>
                    <p className="mt-1.5 text-2xl font-bold text-[#002185]">
                      {avgWorkHours}h
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F8FAFC] p-2.5 text-[#64748B] shadow-sm">
                    <ClockIcon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Attendance */}
            <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-sm hover:border-[#ff5500] transition-all duration-300">
              {/* Decorative accents using existing brand colors at low opacity */}
              <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#002185]/5 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#ff5500]/5 blur-3xl" />

              <div className="relative p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  {/* Today's Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#002185] flex items-center justify-center shrink-0">
                        <ClockIcon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                        Today's Attendance
                      </p>
                    </div>

                    <h2 className="mt-2 text-xl font-bold text-[#002185]">
                      {new Date().toLocaleDateString("en-GH", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h2>

                    {hasClockedIn ? (
                      <>
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
                          <div className="rounded-xl bg-[#F8FAFC] p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center shrink-0">
                                <LogIn className="h-4 w-4 text-[#16A34A]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">
                                  Clock In
                                </p>
                                <p className="text-sm font-bold text-[#002185] truncate">
                                  {formatTime(attendanceData.clockIn)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#F8FAFC] p-3.5">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hasClockedOut ? "bg-[#FEF2F2]" : "bg-[#FFFFFF]"}`}
                              >
                                <LogOut
                                  className={`h-4 w-4 ${hasClockedOut ? "text-[#DC2626]" : "text-[#94A3B8]"}`}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">
                                  Clock Out
                                </p>
                                <p className="text-sm font-bold text-[#002185] truncate">
                                  {hasClockedOut
                                    ? formatTime(attendanceData.clockOut)
                                    : "--:--"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {hasClockedOut && (
                            <div className="rounded-xl bg-[#F8FAFC] p-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] flex items-center justify-center shrink-0">
                                  <Clock className="h-4 w-4 text-[#ff5500]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">
                                    Work Hours
                                  </p>
                                  <p className="text-sm font-bold text-[#002185] truncate">
                                    {attendanceData.workHours || 0} hrs
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {attendanceData.status && (
                          <div className="mt-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${getStatusStyle(attendanceData.status)}`}
                            >
                              {attendanceData.status === "On Time" ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <AlertCircle className="h-4 w-4" />
                              )}
                              Status: {attendanceData.status}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mt-4 flex items-center gap-3 p-4 bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0] max-w-xl">
                        <div className="w-9 h-9 rounded-full bg-[#FFFBEB] flex items-center justify-center shrink-0">
                          <AlertCircle className="h-4 w-4 text-[#F59E0B]" />
                        </div>
                        <p className="text-sm text-[#64748B]">
                          You have not clocked in today.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Clock Buttons */}
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={handleClockIn}
                      disabled={hasClockedIn || isLoading}
                      className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 shadow-sm ${
                        hasClockedIn || isLoading
                          ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                          : "bg-[#002185] text-white hover:bg-[#ff5500] hover:shadow-lg transform hover:-translate-y-0.5"
                      }`}
                    >
                      <LogIn className="h-4 w-4" />
                      {hasClockedIn
                        ? "Clocked In"
                        : isLoading
                          ? "Processing..."
                          : "Clock In"}
                    </button>

                    <button
                      onClick={handleClockOut}
                      disabled={!hasClockedIn || hasClockedOut || isLoading}
                      className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                        !hasClockedIn || hasClockedOut || isLoading
                          ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                          : "bg-[#ff5500] text-white hover:bg-[#002185] shadow-sm hover:shadow-lg transform hover:-translate-y-0.5"
                      }`}
                    >
                      <LogOut className="h-4 w-4" />
                      {isLoading ? "Processing..." : "Clock Out"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Attendance Trends Visualizer */}
            <WeeklyAttendanceChart
              attendanceLogs={attendanceHistory}
              title="My Weekly Attendance & Punctuality Trends"
              subtitle="Recharts bar chart analyzing your on-time check-ins, tardiness, and total logged hours"
            />

            {/* Attendance History */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#002185] shrink-0">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#002185]">
                    Attendance History
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    View your previous attendance records
                  </p>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-sm hover:border-[#ff5500] transition-all duration-300 md:block">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <div>Date</div>
                  <div>Clock In / Out</div>
                  <div>Work Hours</div>
                  <div>Status</div>
                  <div></div>
                </div>

                {/* Table Rows */}
                {attendanceHistory.length > 0 ? (
                  attendanceHistory.map((attendance) => (
                    <div
                      key={attendance._id || attendance.id || Math.random()}
                      className="grid grid-cols-5 items-center gap-4 border-b border-[#E2E8F0] px-6 py-3.5 last:border-b-0 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-[#002185]">
                        <Calendar className="h-4 w-4 text-[#64748B] shrink-0" />
                        {formatDate(attendance.date)}
                      </div>
                      <div className="text-sm text-[#334155] flex items-center gap-1.5 whitespace-nowrap">
                        {formatTime(attendance.clockIn)}
                        <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                        {formatTime(attendance.clockOut)}
                      </div>
                      <div className="text-sm font-medium">
                        <span className="inline-flex items-center justify-center min-w-[3rem] text-[#002185] tabular-nums bg-[#F8FAFC] rounded-md px-2 py-1">
                          {attendance.workHours || 0} hrs
                        </span>
                      </div>
                      <div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                            attendance.status || "Absent",
                          )}`}
                        >
                          {attendance.status || "Absent"}
                        </span>
                      </div>
                      <div />
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-[#94A3B8]" />
                      </div>
                      <p className="text-sm text-[#64748B]">
                        No attendance records found
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden">
                {attendanceHistory.length > 0 ? (
                  attendanceHistory.map((attendance) => (
                    <div
                      key={attendance._id || attendance.id || Math.random()}
                      className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm hover:border-[#ff5500] transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#002185]">
                            {formatDate(attendance.date)}
                          </p>
                          <p className="mt-1 text-xs text-[#64748B]">
                            {attendance.workHours || 0} hours worked
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                            attendance.status || "Absent",
                          )}`}
                        >
                          {attendance.status || "Absent"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E2E8F0] pt-4">
                        <div>
                          <p className="text-xs text-[#64748B]">Clock In</p>
                          <p className="mt-1 text-sm font-medium text-[#002185]">
                            {formatTime(attendance.clockIn)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#64748B]">Clock Out</p>
                          <p className="mt-1 text-sm font-medium text-[#002185]">
                            {formatTime(attendance.clockOut)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-[#94A3B8]" />
                      </div>
                      <p className="text-sm text-[#64748B]">
                        No attendance records found
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
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
    </>
  );
};

export default EmployeesAttendance;
