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
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Zap,
  ShieldCheck,
  Flag,
} from "lucide-react";
import { useManagement } from "../../context/ManagementContextProvider";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";
import Toaster from "../../ui/Toaster";
import {
  getAllAttendance,
  updateAttendanceRecord,
  excuseAttendanceRecord,
  flagAttendanceRecord,
  unflagAttendanceRecord,
  recalculateAttendanceRecord,
  createManualAttendanceRecord,
  deleteAttendanceRecord,
  allEmployees,
  allLeaves,
} from "../../apis/fontApis";
import GlobalDateRangePicker from "../../components/GlobalDateRangePicker";
import Avatar from "../../components/Avatar";
import WeeklyAttendanceChart from "../../components/WeeklyAttendanceChart";
import AttendanceMonthlyCalendar from "../../components/AttendanceMonthlyCalendar";
import AttendanceIntensityHeatmap from "../../components/AttendanceIntensityHeatmap";
import AttendanceQuickActionsMenu from "../../components/AttendanceQuickActionsMenu";
import ExcuseLatenessModal from "../../components/modal/ExcuseLatenessModal";
import FlagAttendanceModal from "../../components/modal/FlagAttendanceModal";
import ManualOverrideModal from "../../components/modal/ManualOverrideModal";

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [visualizationTab, setVisualizationTab] = useState("calendar"); // 'calendar' | 'trends' | 'both'

  // Modal states
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [excuseModalRecord, setExcuseModalRecord] = useState(null);
  const [flagModalRecord, setFlagModalRecord] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

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
  const [deleteConfirmAttendance, setDeleteConfirmAttendance] = useState(null);
  const [isDeletingAttendance, setIsDeletingAttendance] = useState(false);

  const { showToast, setShowToast } = useManagement();

  // Quick Action: Handle Excuse Lateness & Waive Penalty
  const handleConfirmExcuse = async ({ reason, status, waivePenalty }) => {
    if (!excuseModalRecord) return;
    const targetId = excuseModalRecord._id || excuseModalRecord.id;
    if (!targetId) return;

    try {
      setIsProcessingAction(true);
      const res = await excuseAttendanceRecord(targetId, {
        reason,
        status: status || "Present",
        waivePenalty,
      });

      if (res?.data?.success || res?.status === 200) {
        setShowToast({
          show: true,
          message: `Lateness excused for ${getEmployeeName(excuseModalRecord)}. Penalty waived!`,
          type: "success",
        });
        setExcuseModalRecord(null);
        await fetchAttendance(false);
      } else {
        throw new Error(res?.data?.message || "Failed to excuse lateness.");
      }
    } catch (err) {
      console.error("Error excusing lateness:", err);
      setShowToast({
        show: true,
        message: err.response?.data?.message || err.message || "Failed to excuse lateness.",
        type: "error",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Quick Action: Handle Flag Record for Review
  const handleConfirmFlag = async ({ reason, severity }) => {
    if (!flagModalRecord) return;
    const targetId = flagModalRecord._id || flagModalRecord.id;
    if (!targetId) return;

    try {
      setIsProcessingAction(true);
      const res = await flagAttendanceRecord(targetId, {
        reason,
        severity,
      });

      if (res?.data?.success || res?.status === 200) {
        setShowToast({
          show: true,
          message: `Attendance record flagged for review: "${reason}"`,
          type: "success",
        });
        setFlagModalRecord(null);
        await fetchAttendance(false);
      } else {
        throw new Error(res?.data?.message || "Failed to flag record.");
      }
    } catch (err) {
      console.error("Error flagging record:", err);
      setShowToast({
        show: true,
        message: err.response?.data?.message || err.message || "Failed to flag record.",
        type: "error",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Quick Action: Handle Remove Review Flag
  const handleUnflagRecord = async (record) => {
    const targetId = record._id || record.id;
    if (!targetId) return;

    try {
      setIsProcessingAction(true);
      const res = await unflagAttendanceRecord(targetId);
      if (res?.data?.success || res?.status === 200) {
        setShowToast({
          show: true,
          message: "Review flag removed from attendance record.",
          type: "success",
        });
        await fetchAttendance(false);
      } else {
        throw new Error(res?.data?.message || "Failed to remove flag.");
      }
    } catch (err) {
      console.error("Error removing flag:", err);
      setShowToast({
        show: true,
        message: err.response?.data?.message || "Failed to remove flag.",
        type: "error",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Quick Action: Handle Recalculate Policy Penalties
  const handleRecalculateRecord = async (record) => {
    const targetId = record._id || record.id;
    if (!targetId) return;

    try {
      setIsProcessingAction(true);
      const res = await recalculateAttendanceRecord(targetId);
      if (res?.data?.success || res?.status === 200) {
        setShowToast({
          show: true,
          message: "Penalties recalculated per company work hours & tier policy.",
          type: "success",
        });
        await fetchAttendance(false);
      } else {
        throw new Error(res?.data?.message || "Failed to recalculate.");
      }
    } catch (err) {
      console.error("Error recalculating penalties:", err);
      setShowToast({
        show: true,
        message: err.response?.data?.message || "Failed to recalculate policy penalties.",
        type: "error",
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Delete Attendance Record
  const handleConfirmDeleteAttendance = async () => {
    if (!deleteConfirmAttendance) return;
    const targetId = deleteConfirmAttendance._id || deleteConfirmAttendance.id;
    if (!targetId) return;

    try {
      setIsDeletingAttendance(true);
      const res = await deleteAttendanceRecord(targetId);
      if (res?.data?.success || res?.status === 200) {
        setAttendance((prev) =>
          prev.filter(
            (a) => String(a._id) !== String(targetId) && String(a.id) !== String(targetId)
          )
        );
        setShowToast({
          show: true,
          message: "Attendance record permanently deleted from the database.",
          type: "success",
        });
        setDeleteConfirmAttendance(null);
        if (showDetailsModal) setShowDetailsModal(false);
      } else {
        throw new Error(res?.data?.message || "Failed to delete attendance record");
      }
    } catch (err) {
      console.error("Error deleting attendance record:", err);
      setShowToast({
        show: true,
        message: err.response?.data?.message || err.message || "Failed to delete attendance record.",
        type: "error",
      });
    } finally {
      setIsDeletingAttendance(false);
    }
  };

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

    // Date single filter
    if (dateFilter) {
      list = list.filter((item) => item.date === dateFilter);
    }

    // Date range filter (start & end date)
    if (startDateFilter) {
      list = list.filter((item) => item.date && item.date >= startDateFilter);
    }
    if (endDateFilter) {
      list = list.filter((item) => item.date && item.date <= endDateFilter);
    }

    // Sort by date descending and creation time descending
    list.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return list;
  }, [attendance, searchTerm, statusFilter, departmentFilter, dateFilter, startDateFilter, endDateFilter]);

  // Calculate selected period summary (present, absent, late, total hours) for records matching active period & department
  const periodSummary = useMemo(() => {
    let periodList = [...attendance];

    if (departmentFilter !== "All") {
      periodList = periodList.filter(
        (item) =>
          (item.employee?.department || "").toLowerCase() ===
          departmentFilter.toLowerCase()
      );
    }

    if (dateFilter) {
      periodList = periodList.filter((item) => item.date === dateFilter);
    }
    if (startDateFilter) {
      periodList = periodList.filter((item) => item.date && item.date >= startDateFilter);
    }
    if (endDateFilter) {
      periodList = periodList.filter((item) => item.date && item.date <= endDateFilter);
    }

    // Determine human-readable period label
    let periodLabel = "All Recorded Dates";
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const yesterdayStr = y.toISOString().split("T")[0];

    if (dateFilter) {
      periodLabel = formatDate(dateFilter);
    } else if (startDateFilter && endDateFilter) {
      if (startDateFilter === endDateFilter) {
        if (startDateFilter === todayStr) periodLabel = "Today";
        else if (startDateFilter === yesterdayStr) periodLabel = "Yesterday";
        else periodLabel = formatDate(startDateFilter);
      } else {
        periodLabel = `${formatDate(startDateFilter)} – ${formatDate(endDateFilter)}`;
      }
    } else if (startDateFilter) {
      periodLabel = `From ${formatDate(startDateFilter)}`;
    } else if (endDateFilter) {
      periodLabel = `Up to ${formatDate(endDateFilter)}`;
    } else if (dateRangePreset === "today") {
      periodLabel = "Today";
    } else if (dateRangePreset === "yesterday") {
      periodLabel = "Yesterday";
    } else if (dateRangePreset === "week") {
      periodLabel = "Last 7 Days";
    } else if (dateRangePreset === "month") {
      periodLabel = "This Month";
    }

    const totalLogs = periodList.length;
    const presentRecords = periodList.filter(
      (item) => item.clockIn || item.status === "Present" || item.status === "On Time" || item.status === "Late"
    );
    const presentCount = presentRecords.length;

    const onTimeCount = periodList.filter(
      (item) => (item.status === "On Time" || item.status === "Present") && !item.lateMinutes && item.status !== "Late"
    ).length;

    const lateCount = periodList.filter(
      (item) => item.status === "Late" || Number(item.lateMinutes || 0) > 0
    ).length;

    // Absent count: explicit Absent status records or unclocked in single-day views
    const explicitAbsent = periodList.filter((item) => item.status === "Absent").length;
    let absentCount = explicitAbsent;
    if ((dateFilter || (startDateFilter && startDateFilter === endDateFilter)) && absentCount === 0) {
      const relevantHeadcount = departmentFilter !== "All"
        ? employeesList.filter((e) => (e.department || "").toLowerCase() === departmentFilter.toLowerCase()).length
        : Math.max(stats.totalEmployees, employeesList.length || 0);
      absentCount = Math.max(0, relevantHeadcount - presentCount);
    }

    const totalHours = periodList.reduce((sum, item) => sum + (Number(item.workHours) || 0), 0);
    const avgHours = totalLogs > 0 ? (totalHours / totalLogs).toFixed(1) : "0.0";
    const punctualityRate = presentCount > 0 ? Math.round(((presentCount - lateCount) / presentCount) * 100) : 100;

    return {
      periodLabel,
      totalLogs,
      presentCount,
      onTimeCount,
      lateCount,
      absentCount,
      totalHours: totalHours.toFixed(1),
      avgHours,
      punctualityRate,
    };
  }, [attendance, departmentFilter, dateFilter, startDateFilter, endDateFilter, dateRangePreset, employeesList, stats.totalEmployees]);

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
      case "On Leave":
        return <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />;
      default:
        return <ClockIcon className="w-3.5 h-3.5 text-[#64748B]" />;
    }
  };

  // Quick Date Range Handler
  const handleDatePresetChange = (preset) => {
    setDateRangePreset(preset);
    setDateFilter("");
    const now = new Date();

    if (preset === "all") {
      setStartDateFilter("");
      setEndDateFilter("");
    } else if (preset === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setStartDateFilter(todayStr);
      setEndDateFilter(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDateFilter(yStr);
      setEndDateFilter(yStr);
    } else if (preset === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      setStartDateFilter(weekAgo.toISOString().split("T")[0]);
      setEndDateFilter(now.toISOString().split("T")[0]);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDateFilter(firstDay.toISOString().split("T")[0]);
      setEndDateFilter(now.toISOString().split("T")[0]);
    }
    setCurrentPage(1);
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
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E48] dark:text-blue-100">
              Attendance Management
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Employee check-ins and check-outs are recorded immediately and updated in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-refresh-attendance-data"
              onClick={() => fetchAttendance(false)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#002185] rounded-xl transition-all shadow-xs disabled:opacity-60 cursor-pointer"
              title="Refresh Attendance Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#002185]" : "text-slate-600"}`} />
              <span>Refresh Data</span>
            </button>

            <button
              onClick={handleOpenNewOverrideModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-colors shadow-xs cursor-pointer"
              title="Manual Override / Retroactive Admin Adjustment"
            >
              <Edit3 className="w-3.5 h-3.5 text-white" />
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

        {/* Global Date-Range Picker Filter */}
        <GlobalDateRangePicker
          startDate={startDateFilter}
          endDate={endDateFilter}
          preset={dateRangePreset}
          title="Attendance Period & Date Filter"
          onRangeChange={({ startDate, endDate, preset }) => {
            setStartDateFilter(startDate);
            setEndDateFilter(endDate);
            setDateRangePreset(preset);
            if (startDate || endDate) {
              setDateFilter("");
            }
            setCurrentPage(1);
          }}
        />

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
            <div className="flex flex-wrap items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-1 shadow-2xs self-start sm:self-auto">
              <button
                type="button"
                id="btn-admin-heatmap"
                onClick={() => setVisualizationTab("heatmap")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  visualizationTab === "heatmap"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#002185]"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Intensity Heatmap</span>
              </button>

              <button
                type="button"
                id="btn-admin-calendar"
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
                id="btn-admin-trends"
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
                id="btn-admin-split"
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

          {/* Attendance Intensity Heatmap Component */}
          {(visualizationTab === "heatmap" || visualizationTab === "both") && (
            <AttendanceIntensityHeatmap
              attendanceLogs={filteredAttendance.length > 0 ? filteredAttendance : attendance}
              title="Organization Attendance Intensity"
              subtitle="Organization-wide daily check-in pattern matrix, worked hours density, and active streak patterns"
              onSelectDay={(date) => {
                setDateFilter(date);
                setCurrentPage(1);
                setShowToast({
                  show: true,
                  message: `Filtering table records for ${date}`,
                  type: "info",
                });
              }}
            />
          )}

          {/* Monthly Attendance Calendar Component */}
          {(visualizationTab === "calendar" || visualizationTab === "both") && (
            <AttendanceMonthlyCalendar
              attendanceLogs={filteredAttendance.length > 0 ? filteredAttendance : attendance}
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
              attendanceData={filteredAttendance.length > 0 ? filteredAttendance : attendance}
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

            {/* Date Range Presets */}
            <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-0.5">
              {[
                { id: "all", label: "All" },
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "week", label: "7 Days" },
                { id: "month", label: "Month" },
                { id: "custom", label: "Custom" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleDatePresetChange(preset.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    dateRangePreset === preset.id
                      ? "bg-[#002185] text-white shadow-2xs"
                      : "text-[#64748B] hover:text-[#002185]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Date Range Inputs (Start & End Date) */}
            {dateRangePreset === "custom" ? (
              <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1 text-xs">
                <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-medium text-[#002185] focus:outline-none"
                  aria-label="Start date filter"
                  placeholder="Start"
                />
                <span className="text-[#94A3B8]">-</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-medium text-[#002185] focus:outline-none"
                  aria-label="End date filter"
                  placeholder="End"
                />
                {(startDateFilter || endDateFilter) && (
                  <button
                    onClick={() => {
                      setStartDateFilter("");
                      setEndDateFilter("");
                      setDateRangePreset("all");
                    }}
                    className="text-[10px] text-[#64748B] hover:text-[#ff5500] underline ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              /* Single Date Filter */
              <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setStartDateFilter("");
                    setEndDateFilter("");
                    setDateRangePreset("custom");
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-medium text-[#002185] focus:outline-none"
                />
                {dateFilter && (
                  <button
                    onClick={() => {
                      setDateFilter("");
                      setDateRangePreset("all");
                    }}
                    className="text-[10px] text-[#64748B] hover:text-[#ff5500] underline ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

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

        {/* Selected Period Summary Widget */}
        <div
          id="attendance-period-summary-widget"
          className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#002185]/10 text-[#002185] font-bold">
                <Calendar className="h-4 w-4" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#002185]">
                    Selected Period Summary
                  </h3>
                  <span className="text-[11px] font-bold text-[#002185] bg-[#002185]/10 px-2.5 py-0.5 rounded-full border border-[#002185]/20">
                    {periodSummary.periodLabel}
                  </span>
                  {departmentFilter !== "All" && (
                    <span className="text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                      Dept: {departmentFilter}
                    </span>
                  )}
                  {statusFilter !== "All" && (
                    <span className="text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                      Status: {statusFilter}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Aggregated employee attendance statistics for the currently selected timeframe
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-[#64748B] bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0] self-start sm:self-auto">
              <span>Punctuality: <strong className="text-[#16A34A]">{periodSummary.punctualityRate}%</strong></span>
              <span>•</span>
              <span>Logged: <strong className="text-[#002185]">{periodSummary.totalHours} hrs</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-3.5">
            {/* Total Present */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#F0FDF4] border border-[#16A34A]/20 transition-all hover:shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16A34A] text-white shrink-0 shadow-2xs">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A]">
                  Total Present
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-[#16A34A]">
                    {periodSummary.presentCount}
                  </span>
                  <span className="text-[11px] text-[#16A34A]/80 font-semibold truncate">
                    ({periodSummary.onTimeCount} on time)
                  </span>
                </div>
              </div>
            </div>

            {/* Total Late */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#FFFBEB] border border-[#F59E0B]/20 transition-all hover:shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D97706] text-white shrink-0 shadow-2xs">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#D97706]">
                  Total Late
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-[#D97706]">
                    {periodSummary.lateCount}
                  </span>
                  <span className="text-[11px] text-[#D97706]/80 font-semibold truncate">
                    tardy entries
                  </span>
                </div>
              </div>
            </div>

            {/* Total Absent */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 transition-all hover:shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DC2626] text-white shrink-0 shadow-2xs">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">
                  Total Absent
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-[#DC2626]">
                    {periodSummary.absentCount}
                  </span>
                  <span className="text-[11px] text-[#DC2626]/80 font-semibold truncate">
                    unrecorded
                  </span>
                </div>
              </div>
            </div>

            {/* Total Work Hours Logged */}
            <div className="flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] transition-all hover:shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#002185] text-white shrink-0 shadow-2xs">
                <ClockIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Logged Hours
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-[#002185]">
                    {periodSummary.totalHours}h
                  </span>
                  <span className="text-[11px] text-[#64748B] font-semibold truncate">
                    (avg {periodSummary.avgHours}h)
                  </span>
                </div>
              </div>
            </div>
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
                            <Avatar
                              src={avatar}
                              fullName={empName}
                              size="sm"
                              shape="rounded"
                              className="w-9 h-9 rounded-xl shrink-0"
                            />
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

                        {/* Status Badge & Flags */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                                  item.status || "Absent",
                                )}`}
                              >
                                {getStatusIcon(item.status || "Absent")}
                                {item.status || "Absent"}
                              </span>

                              {/* Excused Badge */}
                              {item.isExcused && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                                  title={`Excused by ${item.excusedBy || "Manager"}: ${item.excuseReason || "Penalty Waived"}`}
                                >
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Excused</span>
                                </span>
                              )}

                              {/* Flagged Badge */}
                              {item.flaggedForReview && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                                  title={`Flagged for Review: ${item.flagReason || "Requires HR review"}`}
                                >
                                  <Flag className="w-3 h-3 text-amber-600" />
                                  <span>Flagged</span>
                                </span>
                              )}
                            </div>

                            {/* Delay & Penalty Subtext */}
                            {((item.delayMinutes && item.delayMinutes > 0) || (item.latePenalty && item.latePenalty > 0)) && (
                              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                                {item.delayMinutes > 0 && (
                                  <span>{item.delayMinutes}m delay</span>
                                )}
                                {item.latePenalty > 0 && !item.isExcused && (
                                  <span className="font-bold text-rose-600">
                                    • GH₵{Number(item.latePenalty).toFixed(2)} penalty
                                  </span>
                                )}
                                {item.isExcused && (
                                  <span className="font-semibold text-emerald-600">
                                    • GH₵0.00 waived
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Actions Dropdown Menu */}
                            <AttendanceQuickActionsMenu
                              item={item}
                              onExcuse={(rec) => setExcuseModalRecord(rec)}
                              onFlag={(rec) => setFlagModalRecord(rec)}
                              onUnflag={(rec) => handleUnflagRecord(rec)}
                              onRecalculate={(rec) => handleRecalculateRecord(rec)}
                              onViewDetails={(rec) => {
                                setSelectedAttendance(rec);
                                setShowDetailsModal(true);
                              }}
                              onEdit={(rec) => handleOpenEditModal(rec)}
                              onDelete={(rec) => setDeleteConfirmAttendance(rec)}
                            />

                            <button
                              onClick={() => {
                                setSelectedAttendance(item);
                                setShowDetailsModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#002185] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-colors cursor-pointer"
                              title="View full record log"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden md:inline">Details</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[#64748B] hover:text-[#002185] hover:bg-[#F8FAFC] rounded-lg transition-colors cursor-pointer"
                              title="Admin adjustment override"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmAttendance(item);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete attendance record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

              {/* Excused Status Card */}
              {selectedAttendance.isExcused && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Lateness Officially Excused (Penalty Waived)</span>
                  </div>
                  <p className="text-emerald-900">
                    <span className="font-semibold">Reason:</span> {selectedAttendance.excuseReason || "Authorized by management"}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Excused by {selectedAttendance.excusedBy || "Manager"}
                  </p>
                </div>
              )}

              {/* Flagged Status Card */}
              {selectedAttendance.flaggedForReview && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Flag className="w-4 h-4 text-amber-600" />
                    <span>Flagged for Management & HR Review</span>
                  </div>
                  <p className="text-amber-900">
                    <span className="font-semibold">Notice:</span> {selectedAttendance.flagReason || "Requires administrative follow-up"}
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Flagged by {selectedAttendance.flaggedBy || "Admin"}
                  </p>
                </div>
              )}

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

            <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <button
                onClick={() => {
                  setDeleteConfirmAttendance(selectedAttendance);
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Delete this record"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const itemToExcuse = selectedAttendance;
                    setShowDetailsModal(false);
                    setExcuseModalRecord(itemToExcuse);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Excuse</span>
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenEditModal(selectedAttendance);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#002185] bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Adjust Record
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override / Retroactive Adjustment Modal */}
      <ManualOverrideModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        formData={adjustmentFormData}
        setFormData={setAdjustmentFormData}
        onSave={handleSaveAdjustment}
        employeesList={employeesList}
        isSaving={isSavingAdjustment}
      />

      {/* Quick Actions: Excuse Lateness Modal */}
      <ExcuseLatenessModal
        isOpen={Boolean(excuseModalRecord)}
        onClose={() => setExcuseModalRecord(null)}
        record={excuseModalRecord}
        onConfirm={handleConfirmExcuse}
        isLoading={isProcessingAction}
      />

      {/* Quick Actions: Flag Attendance Modal */}
      <FlagAttendanceModal
        isOpen={Boolean(flagModalRecord)}
        onClose={() => setFlagModalRecord(null)}
        record={flagModalRecord}
        onConfirm={handleConfirmFlag}
        isLoading={isProcessingAction}
      />

      {/* Delete Attendance Confirmation Modal */}
      {deleteConfirmAttendance && (
        <div
          id="delete-attendance-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !isDeletingAttendance && setDeleteConfirmAttendance(null)}
        >
          <div
            id="delete-attendance-modal-container"
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E2E8F0] shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-[#DC2626] flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#002185]">
                  Delete Attendance Record?
                </h3>
                <p className="text-xs text-[#64748B]">
                  Are you sure you want to permanently delete the attendance log for{" "}
                  <span className="font-bold text-[#0F172A]">
                    {getEmployeeName(deleteConfirmAttendance)}
                  </span>{" "}
                  on{" "}
                  <span className="font-semibold text-[#002185]">
                    {formatDate(deleteConfirmAttendance?.date)}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-start gap-2 text-xs text-[#DC2626]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This action is irreversible and will permanently remove this attendance record from the database.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                disabled={isDeletingAttendance}
                onClick={() => setDeleteConfirmAttendance(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAttendance}
                onClick={handleConfirmDeleteAttendance}
                className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingAttendance ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Record...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
