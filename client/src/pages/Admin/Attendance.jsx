import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock as ClockIcon,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarDays,
  ArrowRight,
  X,
  Edit3,
  BarChart3,
  Fingerprint,
} from "lucide-react";
import { useManagement } from "../../context/ManagementContextProvider";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";
import Toaster from "../../ui/Toaster";
import {
  getAllAttendance,
  updateAttendanceRecord,
  createManualAttendanceRecord,
  allEmployees,
  allLeaves,
} from "../../apis/fontApis";
import WeeklyAttendanceChart from "../../components/WeeklyAttendanceChart";
import AttendanceMonthlyCalendar from "../../components/AttendanceMonthlyCalendar";
import BiometricBulkUploadModal from "../../components/BiometricBulkUploadModal";

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [visualizationTab, setVisualizationTab] = useState("calendar"); // 'calendar' | 'trends' | 'both'

  // Modal states
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [adjustmentFormData, setAdjustmentFormData] = useState({
    id: "",
    employeeId: "",
    employeeName: "",
    date: "",
    clockIn: "",
    clockOut: "",
    status: "Present",
    notes: "",
  });
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);

  const { showToast, setShowToast } = useManagement();

  // Fetch live attendance directly from database
  const fetchAttendance = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setIsError(null);
      const { data } = await getAllAttendance();

      if (data && data.success) {
        setAttendance(data.attendance || []);
        setLastSyncTime(new Date());
      } else if (!silent) {
        setIsError(data?.message || "Failed to fetch attendance.");
      }
    } catch (error) {
      console.error("Error fetching live attendance:", error);
      if (!silent) {
        const errorMessage =
          error.response?.data?.message || "Failed to fetch attendance records.";
        setIsError(errorMessage);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  // Fetch employee directory for reference & adjustment tools
  const fetchEmployees = async () => {
    try {
      const { data } = await allEmployees();
      if (data && data.success && Array.isArray(data.employees)) {
        setEmployeesList(data.employees);
      }
    } catch (err) {
      console.warn("Could not fetch employees directory:", err.message);
    }
  };

  // Fetch leave requests to track monthly leaves and absences
  const fetchLeaves = async () => {
    try {
      const { data } = await allLeaves();
      if (data && data.success) {
        let leaves = [];
        if (Array.isArray(data.leaves)) {
          leaves = data.leaves;
        } else if (Array.isArray(data.data)) {
          leaves = data.data;
        }
        setLeaveRequests(leaves);
      }
    } catch (err) {
      console.warn("Could not fetch leave requests:", err.message);
    }
  };

  // Initial fetch and automatic real-time sync
  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
    fetchLeaves();

    // Auto-refresh interval every 4 seconds for real-time employee clock-in/out updates
    const interval = setInterval(() => {
      fetchAttendance(true);
    }, 4000);

    // Cross-tab broadcast channel synchronization
    let bc;
    try {
      bc = new BroadcastChannel("eyenit_attendance_sync");
      bc.onmessage = (event) => {
        console.log("Real-time attendance broadcast received:", event.data);
        fetchAttendance(true);
      };
    } catch (err) {
      console.warn("BroadcastChannel not supported:", err.message);
    }

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
    };
  }, []);

  // Compute departments from records and employee directory
  const departments = useMemo(() => {
    const set = new Set();
    attendance.forEach((item) => {
      if (item.employee?.department) set.add(item.employee.department);
    });
    employeesList.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set);
  }, [attendance, employeesList]);

  // Real-time statistics computed directly from live database records
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = attendance.filter((item) => item.date === today);

    // Unique employees who have logged or are in the system
    const employeeIds = new Set();
    attendance.forEach((item) => {
      if (item.employee?._id || item.employee?.id) {
        employeeIds.add(item.employee._id || item.employee.id);
      }
    });
    employeesList.forEach((emp) => {
      if (emp._id || emp.employeeId) {
        employeeIds.add(emp._id || emp.employeeId);
      }
    });

    const totalHeadcount = Math.max(employeeIds.size, employeesList.length || 1);
    const presentToday = todayAttendance.filter((item) => item.clockIn).length;
    const lateToday = todayAttendance.filter(
      (item) => item.status === "Late",
    ).length;
    const onTimeToday = todayAttendance.filter(
      (item) => item.status === "On Time" || item.status === "Present",
    ).length;
    const absentToday = Math.max(0, totalHeadcount - presentToday);

    const totalHours = attendance.reduce(
      (sum, item) => sum + (item.workHours || 0),
      0,
    );
    const averageHours =
      attendance.length > 0 ? (totalHours / attendance.length).toFixed(1) : "0.0";

    return {
      totalEmployees: totalHeadcount,
      presentToday,
      absentToday,
      lateToday,
      onTimeToday,
      averageHours,
    };
  }, [attendance, employeesList]);

  // Filtered attendance records based on search, department, status, and date
  const filteredAttendance = useMemo(() => {
    let list = [...attendance];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((item) => {
        const name = item.employee?.fullName?.toLowerCase() || "";
        const code = item.employee?.employeeId?.toLowerCase() || "";
        const dept = item.employee?.department?.toLowerCase() || "";
        const pos = item.employee?.position?.toLowerCase() || "";
        return (
          name.includes(term) ||
          code.includes(term) ||
          dept.includes(term) ||
          pos.includes(term)
        );
      });
    }

    // Status filter
    if (statusFilter !== "All") {
      list = list.filter((item) => {
        if (statusFilter === "On Time") {
          return item.status === "On Time" || item.status === "Present";
        }
        return (item.status || "").toLowerCase() === statusFilter.toLowerCase();
      });
    }

    // Department filter
    if (departmentFilter !== "All") {
      list = list.filter(
        (item) =>
          (item.employee?.department || "").toLowerCase() ===
          departmentFilter.toLowerCase(),
      );
    }

    // Date filter
    if (dateFilter) {
      list = list.filter((item) => item.date === dateFilter);
    }

    // Sort by date descending and creation time descending
    list.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return list;
  }, [attendance, searchTerm, statusFilter, departmentFilter, dateFilter]);

  // Helper functions for safe display
  const getEmployeeName = (item) => {
    return item.employee?.fullName || "Employee";
  };

  const getEmployeeDepartment = (item) => {
    return item.employee?.department || "General";
  };

  const getEmployeePosition = (item) => {
    return item.employee?.position || "Staff";
  };

  const getEmployeeCode = (item) => {
    return (
      item.employee?.employeeId ||
      item.employee?._id?.slice(-6) ||
      "EMP"
    );
  };

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
      return date || "-";
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    try {
      if (typeof timeString === "string" && timeString.includes(":") && !timeString.includes("T")) {
        return timeString;
      }
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return timeString;
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString || "-";
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "On Time":
      case "Present":
        return "bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20";
      case "Late":
        return "bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/20";
      case "Absent":
        return "bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20";
      case "On Leave":
        return "bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20";
      default:
        return "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "On Time":
      case "Present":
        return <CheckCircle className="w-3.5 h-3.5 text-[#16A34A]" />;
      case "Late":
        return <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" />;
      case "Absent":
        return <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />;
      default:
        return <ClockIcon className="w-3.5 h-3.5 text-[#64748B]" />;
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredAttendance.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Employee ID",
      "Employee Name",
      "Department",
      "Position",
      "Clock In",
      "Clock Out",
      "Work Hours",
      "Status",
      "Notes",
    ];
    const rows = filteredAttendance.map((item) => [
      `"${formatDate(item.date)}"`,
      `"${getEmployeeCode(item)}"`,
      `"${getEmployeeName(item)}"`,
      `"${getEmployeeDepartment(item)}"`,
      `"${getEmployeePosition(item)}"`,
      `"${formatTime(item.clockIn)}"`,
      `"${formatTime(item.clockOut)}"`,
      item.workHours || 0,
      `"${item.status || "Absent"}"`,
      `"${item.notes || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `live_attendance_records_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Admin Manual Adjustment / Override Submission
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    try {
      setIsSavingAdjustment(true);

      if (adjustmentFormData.id) {
        // Update existing attendance record
        await updateAttendanceRecord(adjustmentFormData.id, {
          clockIn: adjustmentFormData.clockIn || null,
          clockOut: adjustmentFormData.clockOut || null,
          status: adjustmentFormData.status,
          notes: adjustmentFormData.notes,
        });
        setShowToast({
          show: true,
          message: "Attendance record adjusted successfully.",
          type: "success",
        });
      } else {
        // Create manual entry
        await createManualAttendanceRecord({
          employeeId: adjustmentFormData.employeeId,
          date: adjustmentFormData.date,
          clockIn: adjustmentFormData.clockIn || null,
          clockOut: adjustmentFormData.clockOut || null,
          status: adjustmentFormData.status,
          notes: adjustmentFormData.notes,
        });
        setShowToast({
          show: true,
          message: "Manual attendance record created.",
          type: "success",
        });
      }

      setShowAdjustmentModal(false);
      await fetchAttendance();
    } catch (err) {
      console.error("Error saving adjustment:", err);
      setShowToast({
        show: true,
        message: err.response?.data?.message || "Failed to save adjustment.",
        type: "error",
      });
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  // Open adjustment modal for existing record
  const handleOpenEditModal = (item) => {
    setAdjustmentFormData({
      id: item._id || item.id || "",
      employeeId: item.employee?.employeeId || item.employee?._id || "",
      employeeName: item.employee?.fullName || "Employee",
      date: item.date || new Date().toISOString().split("T")[0],
      clockIn: item.clockIn ? new Date(item.clockIn).toISOString().slice(11, 16) : "",
      clockOut: item.clockOut ? new Date(item.clockOut).toISOString().slice(11, 16) : "",
      status: item.status || "Present",
      notes: item.notes || "",
    });
    setShowAdjustmentModal(true);
  };

  // Open adjustment modal for a new manual override
  const handleOpenNewOverrideModal = (overrideDate = null) => {
    const firstEmp = employeesList[0];
    setAdjustmentFormData({
      id: "",
      employeeId: firstEmp ? (firstEmp.employeeId || firstEmp._id) : "",
      employeeName: firstEmp ? firstEmp.fullName : "",
      date: typeof overrideDate === "string" && overrideDate ? overrideDate : new Date().toISOString().split("T")[0],
      clockIn: "08:30",
      clockOut: "17:00",
      status: "Present",
      notes: "Retroactive admin entry",
    });
    setShowAdjustmentModal(true);
  };

  if (isLoading && attendance.length === 0) {
    return <Loading />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page Header with Real-Time Database Indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#002185] shrink-0 shadow-sm">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
                  Attendance Management
                </h1>
                {/* Live Database Sync Indicator */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]"></span>
                  </span>
                  Live Database Sync
                </span>
              </div>
              <p className="text-sm text-[#64748B] mt-0.5">
                Employee check-ins and check-outs are recorded immediately and updated in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-biometric-bulk-upload"
              onClick={() => setShowBiometricModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-all shadow-xs"
              title="Bulk Upload Daily Attendance Logs (CSV)"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Biometric CSV Upload</span>
            </button>

            <button
              onClick={handleOpenNewOverrideModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#002185] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:bg-[#E2E8F0]/60 transition-colors shadow-xs"
              title="Manual Override / Retroactive Admin Adjustment"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#ff5500]" />
              <span>Admin Override</span>
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs text-[#64748B] bg-[#FFFFFF] px-3 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
              <Calendar className="h-3.5 w-3.5 text-[#ff5500]" />
              {new Date().toLocaleDateString("en-GH", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {isError && (
          <ErrorMessage
            message={isError}
            onRetry={() => fetchAttendance(false)}
            onClose={() => setIsError(null)}
          />
        )}

        {/* Live Attendance Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-xs hover:border-[#002185]/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#002185] p-2 text-white shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#64748B] truncate uppercase tracking-wide">
                  Staff Headcount
                </p>
                <p className="text-xl font-bold text-[#002185]">
                  {stats.totalEmployees}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-xs hover:border-[#16A34A]/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F0FDF4] p-2 text-[#16A34A] shrink-0">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#64748B] truncate uppercase tracking-wide">
                  Present Today
                </p>
                <p className="text-xl font-bold text-[#16A34A]">
                  {stats.presentToday}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-xs hover:border-[#16A34A]/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F0FDF4] p-2 text-[#16A34A] shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#64748B] truncate uppercase tracking-wide">
                  On Time
                </p>
                <p className="text-xl font-bold text-[#16A34A]">
                  {stats.onTimeToday}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-xs hover:border-[#F59E0B]/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#FFFBEB] p-2 text-[#D97706] shrink-0">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#64748B] truncate uppercase tracking-wide">
                  Late Check-ins
                </p>
                <p className="text-xl font-bold text-[#D97706]">
                  {stats.lateToday}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-xs hover:border-[#DC2626]/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#FEF2F2] p-2 text-[#DC2626] shrink-0">
                <XCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#64748B] truncate uppercase tracking-wide">
                  Absent
                </p>
                <p className="text-xl font-bold text-[#DC2626]">
                  {stats.absentToday}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-xs hover:border-[#002185]/30 transition-all">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F8FAFC] p-2 text-[#64748B] shrink-0">
                <ClockIcon className="h-4 w-4 text-[#002185]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[#64748B] truncate uppercase tracking-wide">
                  Avg. Hours
                </p>
                <p className="text-xl font-bold text-[#002185]">
                  {stats.averageHours}h
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* VISUALIZATION SECTION: Monthly Calendar & Weekly Analytics Switcher */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] border border-[#E2E8F0] p-3 sm:p-4 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#002185]/10 text-[#002185] flex items-center justify-center font-bold">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#002185]">
                  Attendance Visualizations & Heatmaps
                </h3>
                <p className="text-xs text-[#64748B]">
                  Switch between monthly calendar patterns and weekly trend charts
                </p>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-1 shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setVisualizationTab("calendar")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  visualizationTab === "calendar"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#002185]"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Monthly Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => setVisualizationTab("trends")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  visualizationTab === "trends"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#002185]"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Weekly Trends</span>
              </button>

              <button
                type="button"
                onClick={() => setVisualizationTab("both")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  visualizationTab === "both"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#002185]"
                }`}
              >
                <span>Split View</span>
              </button>
            </div>
          </div>

          {/* Monthly Attendance Calendar Component */}
          {(visualizationTab === "calendar" || visualizationTab === "both") && (
            <AttendanceMonthlyCalendar
              attendanceLogs={attendance}
              employeesList={employeesList}
              leaveRequests={leaveRequests}
              onSelectDate={(date) => {
                setDateFilter(date);
                setCurrentPage(1);
                setShowToast({
                  show: true,
                  message: `Filtering table records for ${date}`,
                  type: "info",
                });
              }}
              onOpenOverride={(date) => handleOpenNewOverrideModal(date)}
            />
          )}

          {/* Real-time Recharts Attendance Analytics Chart */}
          {(visualizationTab === "trends" || visualizationTab === "both") && (
            <WeeklyAttendanceChart
              attendanceLogs={attendance}
              title="Live Weekly Attendance Trends & Punctuality"
              subtitle="Real-time breakdown of employee check-in punctuality, tardiness, and logged hours"
            />
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-4 shadow-xs">
          {/* Search Bar */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by name, ID, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 py-2 text-sm text-[#002185] placeholder-[#94A3B8] focus:border-[#002185] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5">
              <Filter className="h-3.5 w-3.5 text-[#64748B]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#002185] focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="On Time">On Time</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-[#002185] focus:outline-none cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Filter */}
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#002185] focus:outline-none"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-[10px] text-[#64748B] hover:text-[#ff5500] underline ml-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-all duration-200 shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Live Attendance Table */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#002185]">
                Real-Time Attendance Log
              </h2>
              <span className="text-xs text-[#64748B]">
                ({filteredAttendance.length} records)
              </span>
            </div>
            <span className="text-[11px] text-[#64748B]">
              Last synced: {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-4 py-3">Department / Position</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Clock In / Out</th>
                  <th className="px-4 py-3">Work Hours</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {currentItems.length > 0 ? (
                  currentItems.map((item) => {
                    const empName = getEmployeeName(item);
                    const empCode = getEmployeeCode(item);
                    const empDept = getEmployeeDepartment(item);
                    const empPos = getEmployeePosition(item);
                    const avatar = item.employee?.avatar || item.employee?.profile_picture;

                    return (
                      <tr
                        key={item._id || item.id || Math.random()}
                        className="hover:bg-[#F8FAFC] transition-colors"
                      >
                        {/* Employee Avatar & Name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#002185] overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt={empName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-bold text-white">
                                  {empName.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#002185] truncate">
                                {empName}
                              </p>
                              <p className="text-xs text-[#64748B]">
                                ID: {empCode}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Department & Position */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-[#002185]">
                            {empDept}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {empPos}
                          </p>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#334155]">
                          {formatDate(item.date)}
                        </td>

                        {/* Clock In / Out */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-[#334155]">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className="text-emerald-700">
                              {formatTime(item.clockIn)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                            <span className={item.clockOut ? "text-[#ff5500]" : "text-[#94A3B8]"}>
                              {item.clockOut ? formatTime(item.clockOut) : "--:--"}
                            </span>
                          </span>
                        </td>

                        {/* Work Hours */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center justify-center min-w-[3rem] font-bold text-[#002185] tabular-nums bg-[#F8FAFC] rounded-lg px-2.5 py-1 text-xs border border-[#E2E8F0]">
                            {item.workHours ? `${item.workHours} hrs` : item.clockIn ? "In Progress" : "-"}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                              item.status || "Absent",
                            )}`}
                          >
                            {getStatusIcon(item.status || "Absent")}
                            {item.status || "Absent"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedAttendance(item);
                                setShowDetailsModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#002185] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-colors"
                              title="View full record log"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Details</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#002185] hover:bg-[#F8FAFC] rounded-lg transition-colors"
                              title="Admin adjustment override"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-12 text-center text-sm text-[#64748B]"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-[#94A3B8]" />
                        </div>
                        <p className="text-base font-semibold text-[#002185]">
                          No attendance records found
                        </p>
                        <p className="text-xs text-[#64748B]">
                          Employee clock-ins and clock-outs will appear here automatically as they occur.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredAttendance.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E2E8F0] px-5 py-3 bg-[#F8FAFC]">
              <div className="text-xs text-[#64748B]">
                Showing{" "}
                <span className="font-semibold text-[#002185]">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-[#002185]">
                  {Math.min(endIndex, filteredAttendance.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-[#002185]">
                  {filteredAttendance.length}
                </span>{" "}
                records
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-[#002185]" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#002185] text-white"
                          : "bg-[#FFFFFF] border border-[#E2E8F0] text-[#002185] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8FAFC] transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-[#002185]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#FFFFFF] shadow-2xl border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4 bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#002185] text-white">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#002185]">
                    Attendance Record Log
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    {formatDate(selectedAttendance.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedAttendance(null);
                }}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#E2E8F0]/50 hover:text-[#002185] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {/* Employee Summary */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="w-10 h-10 rounded-xl bg-[#002185] flex items-center justify-center text-white font-bold shrink-0">
                  {getEmployeeName(selectedAttendance).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#002185]">
                    {getEmployeeName(selectedAttendance)}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {getEmployeePosition(selectedAttendance)} • {getEmployeeDepartment(selectedAttendance)} (ID: {getEmployeeCode(selectedAttendance)})
                  </p>
                </div>
              </div>

              {/* Timestamp Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[10px] font-semibold text-[#64748B] uppercase">
                    Clock In Time
                  </p>
                  <p className="text-sm font-bold text-emerald-700 mt-1">
                    {formatTime(selectedAttendance.clockIn)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[10px] font-semibold text-[#64748B] uppercase">
                    Clock Out Time
                  </p>
                  <p className="text-sm font-bold text-[#ff5500] mt-1">
                    {formatTime(selectedAttendance.clockOut)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[10px] font-semibold text-[#64748B] uppercase">
                    Logged Work Duration
                  </p>
                  <p className="text-sm font-bold text-[#002185] mt-1">
                    {selectedAttendance.workHours || 0} Hours
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[10px] font-semibold text-[#64748B] uppercase">
                    Punctuality Status
                  </p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusStyle(
                        selectedAttendance.status || "Absent",
                      )}`}
                    >
                      {getStatusIcon(selectedAttendance.status || "Absent")}
                      {selectedAttendance.status || "Absent"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedAttendance.notes && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1">
                    Remarks / Audit Notes
                  </p>
                  <p className="text-xs text-[#334155]">
                    {selectedAttendance.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleOpenEditModal(selectedAttendance);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#002185] bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors"
              >
                Adjust Record
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override / Retroactive Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#FFFFFF] shadow-2xl border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4 bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#002185] text-white">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#002185]">
                    {adjustmentFormData.id ? "Admin Adjustment" : "Manual Override Entry"}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    {adjustmentFormData.id ? `Adjusting record for ${adjustmentFormData.employeeName}` : "Create retroactive attendance record"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#E2E8F0]/50 hover:text-[#002185] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4">
              {!adjustmentFormData.id && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                    Employee
                  </label>
                  <select
                    value={adjustmentFormData.employeeId}
                    onChange={(e) =>
                      setAdjustmentFormData({
                        ...adjustmentFormData,
                        employeeId: e.target.value,
                      })
                    }
                    required
                    className="w-full text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                  >
                    {employeesList.map((emp) => (
                      <option key={emp._id || emp.employeeId} value={emp.employeeId || emp._id}>
                        {emp.fullName} ({emp.employeeId || "EMP"}) - {emp.department}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={adjustmentFormData.date}
                    onChange={(e) =>
                      setAdjustmentFormData({
                        ...adjustmentFormData,
                        date: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                    Status
                  </label>
                  <select
                    value={adjustmentFormData.status}
                    onChange={(e) =>
                      setAdjustmentFormData({
                        ...adjustmentFormData,
                        status: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                  >
                    <option value="On Time">On Time</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                    Clock In Time
                  </label>
                  <input
                    type="time"
                    value={adjustmentFormData.clockIn}
                    onChange={(e) =>
                      setAdjustmentFormData({
                        ...adjustmentFormData,
                        clockIn: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                    Clock Out Time
                  </label>
                  <input
                    type="time"
                    value={adjustmentFormData.clockOut}
                    onChange={(e) =>
                      setAdjustmentFormData({
                        ...adjustmentFormData,
                        clockOut: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                  Reason / Adjustment Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved manual correction by HR"
                  value={adjustmentFormData.notes}
                  onChange={(e) =>
                    setAdjustmentFormData({
                      ...adjustmentFormData,
                      notes: e.target.value,
                    })
                  }
                  className="w-full text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#002185] rounded-xl hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdjustment}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSavingAdjustment ? "Saving..." : "Save Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Biometric Bulk CSV Upload Modal */}
      <BiometricBulkUploadModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        employeesList={employeesList}
        onSuccess={(result) => {
          fetchAttendance(false);
          setShowToast({
            show: true,
            message: `Biometric attendance imported: ${result.stats?.createdCount || 0} created, ${result.stats?.updatedCount || 0} updated!`,
            type: "success",
          });
        }}
      />

      {/* Toast Notification */}
      {showToast?.show && (
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

export default Attendance;
