import { useState, useMemo } from "react";
import {
  Search,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  LayoutGrid,
  List,
  Copy,
  Check,
  Users,
  X,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Trash2,
  UserPlus,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
  Layers,
  Building,
  Activity,
} from "lucide-react";
import { exportEmployeesToCSV } from "../utils/exportCsv";
import {
  updateEmployeeStatus,
  bulkUpdateEmployees,
  deleteEmployee,
} from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";
import Avatar from "./Avatar";
import EmployeeDetailModal from "./EmployeeDetailModal";

export const EmployeeDirectory = ({
  employees = [],
  isLoading = false,
  onRefresh,
}) => {
  const { role, setShowEmployeeModal } = useManagement();
  const isAdmin =
    role === "admin" || window.location.pathname.startsWith("/admin");

  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Bulk Selection State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [bulkAction, setBulkAction] = useState(""); // "department" | "status" | ""
  const [bulkTargetDepartment, setBulkTargetDepartment] = useState("");
  const [bulkTargetStatus, setBulkTargetStatus] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Single Status update & delete state
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Extract unique departments and statuses
  const rawDepartments = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  }, [employees]);

  const departments = useMemo(() => {
    return ["All", ...rawDepartments];
  }, [rawDepartments]);

  const standardDepartments = [
    "Engineering",
    "Product",
    "Design",
    "Marketing",
    "Human Resources",
    "Finance",
    "Operations",
    "Customer Support",
    "Sales",
  ];

  const allAvailableDepartments = useMemo(() => {
    return Array.from(new Set([...rawDepartments, ...standardDepartments])).filter(Boolean);
  }, [rawDepartments]);

  const statusOptions = [
    "All",
    "Active",
    "On Leave",
    "Terminated",
    "Inactive",
    "Suspended",
  ];

  const getStatusBadge = (status, isActive, emp = null) => {
    let raw;
    if (emp?.isOnLeave || emp?.onLeave || emp?.currentLeaveStatus === "Approved") {
      raw = "on leave";
    } else if (emp?.isTerminated || emp?.terminated) {
      raw = "terminated";
    } else if (status) {
      raw = String(status).toLowerCase().trim().replace(/[-_]/g, " ");
    } else if (isActive !== false) {
      raw = "active";
    } else {
      raw = "inactive";
    }

    if (raw === "on leave" || raw === "onleave" || raw === "leave" || raw === "on-leave") {
      return {
        bg: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/70",
        dot: "bg-blue-500",
        label: "On Leave",
        code: "on leave",
      };
    }

    if (raw === "terminated" || raw === "dismissed") {
      return {
        bg: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70",
        dot: "bg-rose-500",
        label: "Terminated",
        code: "terminated",
      };
    }

    if (raw === "active") {
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70",
        dot: "bg-emerald-500",
        label: "Active",
        code: "active",
      };
    }

    if (raw === "suspended") {
      return {
        bg: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/70",
        dot: "bg-red-500",
        label: "Suspended",
        code: "suspended",
      };
    }

    if (raw === "inactive") {
      return {
        bg: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70",
        dot: "bg-amber-500",
        label: "Inactive",
        code: "inactive",
      };
    }

    return {
      bg: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      dot: "bg-slate-500",
      label: raw.charAt(0).toUpperCase() + raw.slice(1),
      code: raw,
    };
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.toLowerCase().trim();
      const nameMatch = (emp.fullName || "").toLowerCase().includes(q);
      const emailMatch = (emp.email || "").toLowerCase().includes(q);
      const phoneMatch = (emp.phone || "").toLowerCase().includes(q);
      const deptMatch = (emp.department || "").toLowerCase().includes(q);
      const posMatch = (emp.position || "").toLowerCase().includes(q);
      const idMatch = (emp.employeeId || "").toLowerCase().includes(q);
      const locMatch = (emp.location || "").toLowerCase().includes(q);

      const matchesSearch =
        !q ||
        nameMatch ||
        emailMatch ||
        phoneMatch ||
        deptMatch ||
        posMatch ||
        idMatch ||
        locMatch;

      const badge = getStatusBadge(emp.status, emp.isActive, emp);
      const empStatusLabel = badge.label.toLowerCase();
      const matchesStatus =
        selectedStatus === "All" ||
        empStatusLabel === selectedStatus.toLowerCase() ||
        badge.code === selectedStatus.toLowerCase();

      const matchesDept =
        selectedDepartment === "All" || emp.department === selectedDepartment;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [employees, search, selectedStatus, selectedDepartment]);

  // Quick Metrics
  const metrics = useMemo(() => {
    const total = employees.length;
    let active = 0;
    let onLeave = 0;
    let terminated = 0;
    let inactive = 0;
    let suspended = 0;

    employees.forEach((e) => {
      const badge = getStatusBadge(e.status, e.isActive, e);
      if (badge.label === "Active") active++;
      else if (badge.label === "On Leave") onLeave++;
      else if (badge.label === "Terminated") terminated++;
      else if (badge.label === "Suspended") suspended++;
      else inactive++;
    });

    const deptsCount = new Set(employees.map((e) => e.department).filter(Boolean)).size;
    return { total, active, onLeave, terminated, inactive, suspended, deptsCount };
  }, [employees]);

  // Bulk selection toggles
  const handleToggleSelectAll = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedEmployeeIds([]);
    } else {
      const allIds = filteredEmployees.map((e) => e._id || e.employeeId);
      setSelectedEmployeeIds(allIds);
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk update execution
  const handleExecuteBulkUpdate = async () => {
    if (selectedEmployeeIds.length === 0) return;
    try {
      setIsBulkUpdating(true);
      const updates = {};
      if (bulkAction === "department" && bulkTargetDepartment) {
        updates.department = bulkTargetDepartment;
      } else if (bulkAction === "status" && bulkTargetStatus) {
        updates.status = bulkTargetStatus;
      } else {
        return;
      }

      const res = await bulkUpdateEmployees(selectedEmployeeIds, updates);
      if (res?.data?.success) {
        setActionMessage({
          type: "success",
          text:
            res.data.message ||
            `Successfully updated ${selectedEmployeeIds.length} employee record(s).`,
        });
        setSelectedEmployeeIds([]);
        setShowBulkModal(false);
        setBulkAction("");
        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      } else {
        setActionMessage({
          type: "error",
          text: res?.data?.message || "Failed to execute batch update.",
        });
      }
    } catch (err) {
      console.error("Bulk update error:", err);
      setActionMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          err.message ||
          "Failed to perform batch update.",
      });
    } finally {
      setIsBulkUpdating(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      const isFiltered =
        Boolean(search) ||
        selectedDepartment !== "All" ||
        selectedStatus !== "All";

      let listToExport = employees;
      if (selectedEmployeeIds.length > 0) {
        listToExport = employees.filter((e) =>
          selectedEmployeeIds.includes(e._id || e.employeeId)
        );
      } else if (filteredEmployees.length > 0) {
        listToExport = filteredEmployees;
      }

      const dateTag = new Date().toISOString().split("T")[0];
      const filename =
        selectedEmployeeIds.length > 0
          ? `employee_directory_selected_${selectedEmployeeIds.length}_${dateTag}.csv`
          : isFiltered
          ? `employee_directory_filtered_${dateTag}.csv`
          : `employee_directory_all_${dateTag}.csv`;

      const success = exportEmployeesToCSV(listToExport, filename);
      if (success) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Export CSV error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStatusChange = async (employeeId, newStatus) => {
    try {
      setStatusUpdatingId(employeeId);
      setActionMessage(null);
      const res = await updateEmployeeStatus(employeeId, newStatus);
      if (res?.data?.success) {
        setActionMessage({
          type: "success",
          text: res.data.message || `Status updated to ${newStatus}.`,
        });
        if (
          selectedEmployee &&
          (selectedEmployee._id === employeeId ||
            selectedEmployee.employeeId === employeeId)
        ) {
          setSelectedEmployee((prev) => ({
            ...prev,
            status: newStatus,
            isActive: newStatus === "active",
          }));
        }
        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      }
    } catch (err) {
      console.error("Status update error:", err);
      setActionMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          err.message ||
          "Failed to update employee status.",
      });
    } finally {
      setStatusUpdatingId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    const targetId = employeeToDelete._id || employeeToDelete.employeeId;
    try {
      setIsDeleting(true);
      const res = await deleteEmployee(targetId);
      if (res?.data?.success) {
        setActionMessage({
          type: "success",
          text:
            res.data.message ||
            `Employee "${employeeToDelete.fullName}" successfully removed.`,
        });
        setEmployeeToDelete(null);
        if (
          selectedEmployee &&
          (selectedEmployee._id === targetId ||
            selectedEmployee.employeeId === targetId)
        ) {
          setSelectedEmployee(null);
        }
        if (typeof onRefresh === "function") {
          await onRefresh();
        }
      }
    } catch (err) {
      console.error("Delete employee error:", err);
      setActionMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          err.message ||
          "Failed to delete employee from database.",
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";
    try {
      return new Date(dateVal).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(dateVal);
    }
  };

  const isAllSelected =
    filteredEmployees.length > 0 &&
    selectedEmployeeIds.length === filteredEmployees.length;

  return (
    <div id="employee-directory-component" className="space-y-6">
      {/* Top Filter / Search Bar & KPI Stat Chips */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Staff Members & Directory
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Search, filter, manage records, bulk-update departments/statuses, and access full employee profiles.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-center min-w-[60px]">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {metrics.total}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Total
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-center min-w-[65px]">
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.active}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                Active
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 text-center min-w-[70px]">
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {metrics.onLeave}
              </div>
              <div className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold uppercase tracking-wider">
                On Leave
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-center min-w-[75px]">
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {metrics.terminated}
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold uppercase tracking-wider">
                Terminated
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-center min-w-[65px]">
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {metrics.inactive}
              </div>
              <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">
                Inactive
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-center min-w-[55px]">
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {metrics.deptsCount}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Depts
              </div>
            </div>
          </div>
        </div>

        {/* Action Message Feedback Banner */}
        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              actionMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bulk Selection Actions Bar */}
        {isAdmin && selectedEmployeeIds.length > 0 && (
          <div className="mt-4 p-3.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {selectedEmployeeIds.length}
              </div>
              <div>
                <div className="text-xs font-bold text-blue-950 dark:text-blue-200">
                  {selectedEmployeeIds.length} Employee{selectedEmployeeIds.length > 1 ? "s" : ""} Selected
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300">
                  Choose a batch action to apply across selected employees.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Batch Change Department */}
              <button
                type="button"
                id="btn-bulk-change-department"
                onClick={() => {
                  setBulkAction("department");
                  setBulkTargetDepartment(rawDepartments[0] || "Engineering");
                  setShowBulkModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Building className="w-3.5 h-3.5" />
                <span>Batch Department</span>
              </button>

              {/* Batch Change Status */}
              <button
                type="button"
                id="btn-bulk-change-status"
                onClick={() => {
                  setBulkAction("status");
                  setBulkTargetStatus("active");
                  setShowBulkModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Batch Status</span>
              </button>

              {/* Export Selected CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Selected</span>
              </button>

              {/* Clear Selection */}
              <button
                type="button"
                onClick={() => setSelectedEmployeeIds([])}
                className="p-1.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-200/50 dark:hover:bg-blue-900/40 text-xs font-semibold transition-all cursor-pointer"
                title="Deselect all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search Input and Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, email, phone, employee ID, location..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer hover:border-blue-500 transition-all shrink-0"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "All" ? "All Departments" : dept}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer hover:border-blue-500 transition-all shrink-0"
            >
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st === "All" ? "All Statuses" : st}
                </option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid Card View"
                className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table List View"
                className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh Button */}
            {typeof onRefresh === "function" && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh staff records"
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isLoading
                      ? "animate-spin text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            {/* Download / Export CSV Button */}
            <button
              id="btn-directory-export-csv"
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || employees.length === 0}
              title={`Download employee records as CSV (${filteredEmployees.length} records)`}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer disabled:opacity-50 ${
                exportSuccess
                  ? "bg-emerald-600 text-white border border-emerald-600"
                  : "bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-600"
              }`}
            >
              {exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Exported!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-current font-bold">
                    {selectedEmployeeIds.length > 0
                      ? selectedEmployeeIds.length
                      : filteredEmployees.length}
                  </span>
                </>
              )}
            </button>

            {/* New Employee Button */}
            {typeof setShowEmployeeModal === "function" && (
              <button
                id="btn-directory-new-employee"
                type="button"
                onClick={() => setShowEmployeeModal(true)}
                title="Add a new employee to directory"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter tags summary */}
        {(search || selectedDepartment !== "All" || selectedStatus !== "All") && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                Showing <strong className="text-slate-900 dark:text-white">{filteredEmployees.length}</strong> matching results of {employees.length} total staff
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1 text-[11px]"
              >
                <Download className="w-3 h-3" />
                Export Filtered
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedDepartment("All");
                  setSelectedStatus("All");
                }}
                className="text-orange-600 dark:text-orange-400 hover:underline font-semibold cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid Card View with Selection Checkboxes & Lift-on-hover */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredEmployees.map((emp) => {
            const badge = getStatusBadge(emp.status, emp.isActive, emp);
            const empId = emp._id || emp.employeeId;
            const isSelected = selectedEmployeeIds.includes(empId);
            const initials = (emp.fullName || "E")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={empId}
                id={`directory-card-${emp.employeeId || empId}`}
                className={`bg-white dark:bg-slate-900 border rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md dark:shadow-black/20 dark:hover:shadow-black/40 transition-all duration-200 ease-out hover:-translate-y-1 flex flex-col justify-between group cursor-default relative ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20"
                    : "border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/50 dark:hover:border-blue-500/50"
                }`}
              >
                <div>
                  {/* Top Row: Checkbox, Avatar, Name, ID & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox for Admin bulk action */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(empId)}
                          className="shrink-0 text-slate-400 hover:text-blue-600 transition-colors p-0.5 cursor-pointer"
                          title={isSelected ? "Deselect" : "Select employee"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                          )}
                        </button>
                      )}

                      <Avatar
                        src={
                          emp.profilePicture ||
                          emp.profile_picture ||
                          emp.avatar ||
                          emp.avatar_url ||
                          emp.profile_image_url
                        }
                        name={emp.fullName}
                        size="lg"
                        shape="rounded"
                        className="w-12 h-12 rounded-2xl shrink-0 shadow-2xs"
                        fallbackInitials={initials}
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {emp.fullName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-mono bg-slate-50 dark:bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-800/80 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                            {emp.employeeId || "EMP"}
                          </span>
                          <span className="truncate">{emp.department}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 transition-all shadow-2xs ${badge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Role Title */}
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate">
                      {emp.position || "Staff Member"}
                    </span>
                  </div>

                  {/* Contact Details Info Box */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    {/* Email */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group/item">
                      <a
                        href={`mailto:${emp.email}`}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {emp.email || "No email"}
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(emp.email, `email_${empId}`)}
                        title="Copy email"
                        className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors cursor-pointer"
                      >
                        {copiedField === `email_${empId}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group/item">
                      <a
                        href={`tel:${emp.phone}`}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{emp.phone || "+233 24 000 0000"}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(emp.phone, `phone_${empId}`)}
                        title="Copy phone number"
                        className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors cursor-pointer"
                      >
                        {copiedField === `phone_${empId}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 px-2 py-1 text-slate-400 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{emp.location || "Accra Head Office"}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setEmployeeToDelete(emp)}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Delete employee permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Type: {emp.employmentType || "Full-time"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(emp)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table / List View - Desktop Table + Mobile Card-View */}
      {viewMode === "table" && (
        <>
          {/* Mobile Card-View Mode (Visible on small screens: < md) */}
          <div className="block md:hidden space-y-3.5">
            {/* Mobile Bulk Selection Bar (Admin only) */}
            {isAdmin && filteredEmployees.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>
                    {isAllSelected
                      ? `All ${filteredEmployees.length} selected`
                      : selectedEmployeeIds.length > 0
                      ? `${selectedEmployeeIds.length} selected`
                      : "Select all staff"}
                  </span>
                </button>
                {selectedEmployeeIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(true)}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-2xs"
                  >
                    Bulk Action
                  </button>
                )}
              </div>
            )}

            {/* Mobile Cards List */}
            {filteredEmployees.map((emp) => {
              const badge = getStatusBadge(emp.status, emp.isActive, emp);
              const empId = emp._id || emp.employeeId;
              const isSelected = selectedEmployeeIds.includes(empId);
              const initials = (emp.fullName || "E")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const isUpdatingThis = statusUpdatingId === empId;

              return (
                <div
                  key={`mobile-card-${empId}`}
                  id={`mobile-employee-card-${empId}`}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs transition-all ${
                    isSelected
                      ? "border-blue-500/80 bg-blue-50/20 dark:bg-blue-950/20 shadow-blue-500/5"
                      : "border-slate-200/80 dark:border-slate-800/80"
                  }`}
                >
                  {/* Card Header: Checkbox + Avatar + Names + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(empId)}
                          className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer shrink-0"
                          title={isSelected ? "Deselect" : "Select"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          )}
                        </button>
                      )}

                      <Avatar
                        src={
                          emp.profilePicture ||
                          emp.profile_picture ||
                          emp.avatar ||
                          emp.avatar_url ||
                          emp.profile_image_url
                        }
                        name={emp.fullName}
                        size="md"
                        shape="rounded"
                        className="w-11 h-11 rounded-xl shrink-0 shadow-2xs"
                        fallbackInitials={initials}
                      />

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {emp.fullName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-200/60 dark:border-blue-800/60">
                            {emp.employeeId || "EMP"}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {emp.role || "Staff"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Department & Role Badge */}
                  <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/60 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold truncate">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">{emp.position || "Staff Member"}</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                      {emp.department || "General"}
                    </span>
                  </div>

                  {/* Contact Info (Clickable for Mobile) */}
                  <div className="mt-2.5 space-y-1.5 text-xs">
                    {/* Email */}
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
                      <a
                        href={`mailto:${emp.email}`}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 truncate text-[11px]"
                      >
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email || "No email"}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(emp.email, `mobile_email_${empId}`)}
                        className="text-slate-400 hover:text-blue-600 p-1 rounded cursor-pointer"
                        title="Copy email"
                      >
                        {copiedField === `mobile_email_${empId}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/30">
                      <a
                        href={`tel:${emp.phone}`}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-[11px]"
                      >
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{emp.phone || "+233 24 000 0000"}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(emp.phone, `mobile_phone_${empId}`)}
                        className="text-slate-400 hover:text-blue-600 p-1 rounded cursor-pointer"
                        title="Copy phone"
                      >
                        {copiedField === `mobile_phone_${empId}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 px-1.5 text-slate-400 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{emp.location || "Accra Head Office"}</span>
                    </div>
                  </div>

                  {/* Admin Status Switcher Row */}
                  {isAdmin && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Status:
                        </span>
                        <div className="grid grid-cols-4 gap-1 flex-1 max-w-[240px]">
                          {[
                            { key: "active", label: "Active", activeClass: "bg-emerald-600 text-white" },
                            { key: "on leave", label: "Leave", activeClass: "bg-blue-600 text-white" },
                            { key: "terminated", label: "Term", activeClass: "bg-rose-600 text-white" },
                            { key: "inactive", label: "Inact", activeClass: "bg-amber-600 text-white" },
                          ].map((st) => {
                            const isCurrent =
                              badge.code === st.key ||
                              badge.label.toLowerCase() === st.key;
                            return (
                              <button
                                key={st.key}
                                type="button"
                                disabled={isUpdatingThis || isCurrent}
                                onClick={() => handleStatusChange(empId, st.key)}
                                className={`py-1 rounded-lg text-[10px] font-semibold text-center transition-all cursor-pointer ${
                                  isCurrent
                                    ? `${st.activeClass} shadow-2xs font-bold`
                                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                                } disabled:opacity-50`}
                                title={`Set status to ${st.label}`}
                              >
                                {st.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => setEmployeeToDelete(emp)}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        title="Delete employee permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {emp.employmentType || "Full-time"}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(emp)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Visible on md and larger screens) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm dark:shadow-black/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 uppercase font-semibold text-xs tracking-wider">
                  <tr>
                    {isAdmin && (
                      <th className="px-4 py-3.5 w-10">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 cursor-pointer"
                          title={isAllSelected ? "Deselect all" : "Select all"}
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="px-4 py-3.5">Staff Member</th>
                    <th className="px-4 py-3.5">ID</th>
                    <th className="px-4 py-3.5">Role & Department</th>
                    <th className="px-4 py-3.5">Contact Details</th>
                    <th className="px-4 py-3.5">Location</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    {isAdmin && <th className="px-4 py-3.5 text-center">Update Status</th>}
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredEmployees.map((emp) => {
                    const badge = getStatusBadge(emp.status, emp.isActive, emp);
                    const empId = emp._id || emp.employeeId;
                    const isSelected = selectedEmployeeIds.includes(empId);
                    const initials = (emp.fullName || "E")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const isUpdatingThis = statusUpdatingId === empId;

                    return (
                      <tr
                        key={empId}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        {/* Checkbox for Admin */}
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOne(empId)}
                              className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                              )}
                            </button>
                          </td>
                        )}

                        {/* Name & Avatar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={
                                emp.profilePicture ||
                                emp.profile_picture ||
                                emp.avatar ||
                                emp.avatar_url ||
                                emp.profile_image_url
                              }
                              name={emp.fullName}
                              size="sm"
                              shape="rounded"
                              className="w-9 h-9 rounded-xl shrink-0"
                              fallbackInitials={initials}
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {emp.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {emp.role || "Employee"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td className="px-4 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {emp.employeeId || "EMP"}
                        </td>

                        {/* Role & Dept */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {emp.position || "Staff Member"}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {emp.department}
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className="px-4 py-3 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <a
                              href={`mailto:${emp.email}`}
                              className="hover:text-blue-600 hover:underline truncate max-w-[160px]"
                            >
                              {emp.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Phone className="w-3 h-3" />
                            <span>{emp.phone || "+233 24 000 0000"}</span>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{emp.location || "Accra Head Office"}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${badge.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>

                        {/* Change Status Action (Admin only) */}
                        {isAdmin && (
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                              {[
                                { key: "active", label: "Active", activeClass: "bg-emerald-600 text-white" },
                                { key: "on leave", label: "On Leave", activeClass: "bg-blue-600 text-white" },
                                { key: "terminated", label: "Terminated", activeClass: "bg-rose-600 text-white" },
                                { key: "inactive", label: "Inactive", activeClass: "bg-amber-600 text-white" },
                              ].map((st) => {
                                const isCurrent =
                                  badge.code === st.key ||
                                  badge.label.toLowerCase() === st.key;
                                return (
                                  <button
                                    key={st.key}
                                    type="button"
                                    disabled={isUpdatingThis || isCurrent}
                                    onClick={() => handleStatusChange(empId, st.key)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                                      isCurrent
                                        ? `${st.activeClass} shadow-xs font-bold`
                                        : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 hover:text-blue-600"
                                    } disabled:opacity-50`}
                                    title={`Set status to ${st.label}`}
                                  >
                                    {st.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        )}

                        {/* Action Buttons */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedEmployee(emp)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                            >
                              Profile
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setEmployeeToDelete(emp)}
                                className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                title="Delete employee permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {filteredEmployees.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-12 text-center shadow-sm dark:shadow-black/20">
          <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No matching staff members found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or clear the filter selections to view all registered staff.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              id="btn-empty-clear-filters"
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedDepartment("All");
                setSelectedStatus("All");
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
            {typeof setShowEmployeeModal === "function" && (
              <button
                id="btn-empty-new-employee"
                type="button"
                onClick={() => setShowEmployeeModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Employee</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => !isBulkUpdating && setShowBulkModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-blue-50 dark:bg-blue-950/60 p-6 border-b border-blue-200 dark:border-blue-800/60 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-blue-950 dark:text-blue-100">
                  Batch Update Employees
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Updating {selectedEmployeeIds.length} selected employee records simultaneously.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {bulkAction === "department" && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                    Select Target Department
                  </label>
                  <select
                    value={bulkTargetDepartment}
                    onChange={(e) => setBulkTargetDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    {allAvailableDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {bulkAction === "status" && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                    Select Target Account Status
                  </label>
                  <select
                    value={bulkTargetStatus}
                    onChange={(e) => setBulkTargetStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="on leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                This change will be applied directly to the database and will reflect across payroll, permissions, and reporting modules.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={handleExecuteBulkUpdate}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBulkUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Records...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Batch Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {employeeToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => !isDeleting && setEmployeeToDelete(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-rose-50 dark:bg-rose-950/60 p-6 border-b border-rose-200 dark:border-rose-800/60 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-950 dark:text-rose-100">
                  Confirm Employee Deletion
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  This action permanently removes the record from the database.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Staff Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {employeeToDelete.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Employee ID:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {employeeToDelete.employeeId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Email Address:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {employeeToDelete.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {employeeToDelete.department}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800">
                Warning: Once deleted, this employee will no longer be able to log in, and all associated profile data will be permanently cleared from the active database.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteEmployee}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Record...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Employee</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Employee Profile Detail Modal with Print and Salary Adjustments Tab */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        isOpen={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployee(null)}
        isAdmin={isAdmin}
        statusUpdatingId={statusUpdatingId}
        onStatusChange={handleStatusChange}
        onDeleteRequest={(emp) => setEmployeeToDelete(emp)}
        getStatusBadge={getStatusBadge}
        formatDate={formatDate}
      />
    </div>
  );
};

export default EmployeeDirectory;
