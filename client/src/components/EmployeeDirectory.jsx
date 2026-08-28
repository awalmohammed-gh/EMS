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
  PhoneCall,
  X,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Trash2,
  UserCheck,
  AlertTriangle,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { exportEmployeesToCSV } from "../utils/exportCsv";
import { updateEmployeeStatus, deleteEmployee } from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";
import Avatar from "./Avatar";

export const EmployeeDirectory = ({
  employees = [],
  isLoading = false,
  onRefresh,
}) => {
  const { role } = useManagement();
  const isAdmin = role === "admin" || window.location.pathname.startsWith("/admin");

  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState("table"); // Default to table for easy admin operations
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Status update & delete state
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Extract unique departments and statuses
  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [employees]);

  const statusOptions = ["All", "Active", "Inactive", "Suspended"];

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

      const empStatus = (
        emp.status || (emp.isActive !== false ? "active" : "inactive")
      ).toLowerCase();
      const matchesStatus =
        selectedStatus === "All" ||
        empStatus === selectedStatus.toLowerCase();

      const matchesDept =
        selectedDepartment === "All" || emp.department === selectedDepartment;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [employees, search, selectedStatus, selectedDepartment]);

  // Status Metrics
  const metrics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(
      (e) => (e.status || (e.isActive ? "active" : "inactive")).toLowerCase() === "active"
    ).length;
    const inactive = employees.filter(
      (e) => (e.status || "").toLowerCase() === "inactive"
    ).length;
    const suspended = employees.filter(
      (e) => (e.status || "").toLowerCase() === "suspended"
    ).length;
    const deptsCount = new Set(employees.map((e) => e.department).filter(Boolean))
      .size;
    return { total, active, inactive, suspended, deptsCount };
  }, [employees]);

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      const isFiltered =
        Boolean(search) ||
        selectedDepartment !== "All" ||
        selectedStatus !== "All";

      const listToExport =
        filteredEmployees.length > 0 ? filteredEmployees : employees;

      const dateTag = new Date().toISOString().split("T")[0];
      const filename = isFiltered
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
        if (selectedEmployee && (selectedEmployee._id === employeeId || selectedEmployee.employeeId === employeeId)) {
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
        if (selectedEmployee && (selectedEmployee._id === targetId || selectedEmployee.employeeId === targetId)) {
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

  const getStatusBadge = (status, isActive) => {
    const raw = (status || (isActive !== false ? "active" : "inactive")).toLowerCase();
    switch (raw) {
      case "active":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
          dot: "bg-emerald-500",
          label: "Active",
        };
      case "suspended":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
          dot: "bg-rose-500",
          label: "Suspended",
        };
      case "inactive":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
          dot: "bg-amber-500",
          label: "Inactive",
        };
      default:
        return {
          bg: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
          dot: "bg-slate-500",
          label: raw.charAt(0).toUpperCase() + raw.slice(1),
        };
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
                Search, filter, and access staff contact details, department roles, and real-time status.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-center min-w-[65px]">
              <div className="text-sm font-bold text-slate-900 dark:text-white">{metrics.total}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-center min-w-[65px]">
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{metrics.active}</div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">Active</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-center min-w-[65px]">
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{metrics.inactive}</div>
              <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase tracking-wider">Inactive</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-center min-w-[65px]">
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{metrics.suspended}</div>
              <div className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold uppercase tracking-wider">Suspended</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-center min-w-[65px]">
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{metrics.deptsCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Depts</div>
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

            {/* Download CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || employees.length === 0}
              title={`Download CSV export (${filteredEmployees.length} records)`}
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
                  <span>CSV</span>
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-current font-bold">
                    {filteredEmployees.length}
                  </span>
                </>
              )}
            </button>
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

      {/* Grid Card View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredEmployees.map((emp) => {
            const badge = getStatusBadge(emp.status, emp.isActive);
            const empId = emp._id || emp.employeeId;
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
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/50 dark:hover:border-blue-500/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Row: Avatar, Name, ID & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={emp.profilePicture || emp.profile_picture || emp.avatar || emp.avatar_url || emp.profile_image_url}
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
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${badge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Role Title */}
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate">{emp.position || "Staff Member"}</span>
                  </div>

                  {/* Admin Status Quick Switcher */}
                  {isAdmin && (
                    <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Account Status</span>
                        {statusUpdatingId === empId && (
                          <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {["active", "inactive", "suspended"].map((st) => {
                          const currentStatus = (emp.status || (emp.isActive !== false ? "active" : "inactive")).toLowerCase();
                          const isCurrent = currentStatus === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              disabled={statusUpdatingId === empId || isCurrent}
                              onClick={() => handleStatusChange(empId, st)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all cursor-pointer ${
                                isCurrent
                                  ? st === "active"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : st === "suspended"
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "bg-amber-600 text-white shadow-xs"
                                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600"
                              } disabled:opacity-60`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Contact Details Info Box */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    {/* Email */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group/item">
                      <a
                        href={`mailto:${emp.email}`}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email || "No email"}</span>
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

      {/* Table / List View */}
      {viewMode === "table" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm dark:shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 uppercase font-semibold text-xs tracking-wider">
                <tr>
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
                  const badge = getStatusBadge(emp.status, emp.isActive);
                  const empId = emp._id || emp.employeeId;
                  const initials = (emp.fullName || "E")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const currentStatus = (emp.status || (emp.isActive !== false ? "active" : "inactive")).toLowerCase();
                  const isUpdatingThis = statusUpdatingId === empId;

                  return (
                    <tr
                      key={empId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={emp.profilePicture || emp.profile_picture || emp.avatar || emp.avatar_url || emp.profile_image_url}
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
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Change Status Action (Admin only) */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            {["active", "inactive", "suspended"].map((st) => (
                              <button
                                key={st}
                                type="button"
                                disabled={isUpdatingThis || currentStatus === st}
                                onClick={() => handleStatusChange(empId, st)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all cursor-pointer ${
                                  currentStatus === st
                                    ? st === "active"
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : st === "suspended"
                                      ? "bg-rose-600 text-white shadow-xs"
                                      : "bg-amber-600 text-white shadow-xs"
                                    : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 hover:text-blue-600"
                                } disabled:opacity-50`}
                                title={`Set status to ${st}`}
                              >
                                {st}
                              </button>
                            ))}
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
                            Details
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
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedDepartment("All");
              setSelectedStatus("All");
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {employeeToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => !isDeleting && setEmployeeToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#E2E8F0] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#FEF2F2] p-6 border-b border-[#FCA5A5]/40 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#DC2626] text-white flex items-center justify-center shadow-xs shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#991B1B]">
                  Confirm Employee Deletion
                </h3>
                <p className="text-xs text-[#B91C1C] mt-0.5">
                  This action permanently removes the record from the database.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-3 text-xs text-[#475569]">
              <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Staff Name:</span>
                  <span className="font-bold text-[#0F172A]">{employeeToDelete.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Employee ID:</span>
                  <span className="font-mono font-bold text-[#002185]">{employeeToDelete.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Email Address:</span>
                  <span className="font-semibold text-[#0F172A]">{employeeToDelete.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Department:</span>
                  <span className="font-semibold text-[#0F172A]">{employeeToDelete.department}</span>
                </div>
              </div>
              <p className="text-[11px] text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-xl border border-[#FCA5A5]">
                Warning: Once deleted, this employee will no longer be able to log in, and all associated portal profile data will be permanently cleared from the active database.
              </p>
            </div>

            <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-white text-xs font-bold text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteEmployee}
                className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

      {/* Employee Profile Detail Modal / Drawer */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedEmployee(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E2E8F0] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#002185] to-[#0A2E9E] p-6 text-white relative">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white text-[#002185] font-black text-xl flex items-center justify-center shadow-md shrink-0 overflow-hidden">
                  {selectedEmployee.profilePicture || selectedEmployee.profile_picture || selectedEmployee.avatar || selectedEmployee.avatar_url ? (
                    <img
                      src={selectedEmployee.profilePicture || selectedEmployee.profile_picture || selectedEmployee.avatar || selectedEmployee.avatar_url}
                      alt={selectedEmployee.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    (selectedEmployee.fullName || "E")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedEmployee.fullName}
                  </h3>
                  <p className="text-xs text-white/80">
                    {selectedEmployee.position || "Staff Member"} • {selectedEmployee.department}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {selectedEmployee.employeeId || "EMP"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 capitalize">
                      {selectedEmployee.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Admin Status Management in Profile Modal */}
              {isAdmin && (
                <div className="p-3 bg-[#F8FAFC] border border-[#002185]/20 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#ff5500]" />
                      Update Account Status
                    </span>
                    {statusUpdatingId === (selectedEmployee._id || selectedEmployee.employeeId) && (
                      <Loader2 className="w-3.5 h-3.5 text-[#002185] animate-spin" />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {["active", "inactive", "suspended"].map((st) => {
                      const empId = selectedEmployee._id || selectedEmployee.employeeId;
                      const isCurrent = (selectedEmployee.status || (selectedEmployee.isActive !== false ? "active" : "inactive")).toLowerCase() === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={isCurrent || statusUpdatingId === empId}
                          onClick={() => handleStatusChange(empId, st)}
                          className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                            isCurrent
                              ? st === "active"
                                ? "bg-[#16A34A] text-white shadow-xs"
                                : st === "suspended"
                                ? "bg-[#DC2626] text-white shadow-xs"
                                : "bg-[#F59E0B] text-white shadow-xs"
                              : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#002185] hover:text-[#002185]"
                          } disabled:opacity-60`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contact Information Section */}
              <div>
                <h4 className="text-xs font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <PhoneCall className="w-3.5 h-3.5 text-[#ff5500]" />
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <div className="text-[10px] uppercase font-semibold text-[#64748B]">Work Email</div>
                    <div className="font-semibold text-[#0F172A] truncate mt-0.5">
                      {selectedEmployee.email}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedEmployee.email, "modal_email")}
                      className="text-[10px] text-[#002185] hover:text-[#ff5500] font-bold mt-1 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === "modal_email" ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "modal_email" ? "Copied!" : "Copy Email"}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <div className="text-[10px] uppercase font-semibold text-[#64748B]">Phone Number</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">
                      {selectedEmployee.phone || "+233 24 000 0000"}
                    </div>
                    <a
                      href={`tel:${selectedEmployee.phone}`}
                      className="text-[10px] text-[#002185] hover:text-[#ff5500] font-bold mt-1 inline-flex items-center gap-1"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Call Directly</span>
                    </a>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <div className="text-[10px] uppercase font-semibold text-[#64748B]">Office Location</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">
                      {selectedEmployee.location || "Accra Head Office"}
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <div className="text-[10px] uppercase font-semibold text-[#64748B]">Emergency Contact</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">
                      {selectedEmployee.emergencyContact || "+233 20 000 0000"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Role & Employment Details */}
              <div className="pt-2 border-t border-[#E2E8F0]">
                <h4 className="text-xs font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-3.5 h-3.5 text-[#ff5500]" />
                  Organizational Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <span className="text-[10px] text-[#64748B] block">Department</span>
                    <span className="font-bold text-[#002185]">{selectedEmployee.department}</span>
                  </div>
                  <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <span className="text-[10px] text-[#64748B] block">Employment Type</span>
                    <span className="font-bold text-[#002185]">{selectedEmployee.employmentType || "Full-time"}</span>
                  </div>
                  <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <span className="text-[10px] text-[#64748B] block">Join Date</span>
                    <span className="font-bold text-[#002185]">{formatDate(selectedEmployee.employmentDate)}</span>
                  </div>
                  <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <span className="text-[10px] text-[#64748B] block">System Role</span>
                    <span className="font-bold text-[#002185] capitalize">{selectedEmployee.role || "Employee"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setEmployeeToDelete(selectedEmployee);
                  }}
                  className="px-3 py-2 bg-[#FEF2F2] hover:bg-[#FCA5A5]/30 text-[#DC2626] border border-[#FCA5A5] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>
              ) : (
                <span className="text-[11px] text-[#64748B]">
                  ID: {selectedEmployee.employeeId || "EMP"}
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-[#002185] hover:bg-[#ff5500] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;
