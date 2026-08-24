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
          bg: "bg-[#F0FDF4] text-[#16A34A] border-[#16A34A]/30",
          dot: "bg-[#16A34A]",
          label: "Active",
        };
      case "suspended":
        return {
          bg: "bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]/30",
          dot: "bg-[#DC2626]",
          label: "Suspended",
        };
      case "inactive":
        return {
          bg: "bg-[#FFFBEB] text-[#B45309] border-[#F59E0B]/30",
          dot: "bg-[#F59E0B]",
          label: "Inactive",
        };
      default:
        return {
          bg: "bg-[#F8FAFC] text-[#64748B] border-[#64748B]/30",
          dot: "bg-[#64748B]",
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
    <div id="employee-directory-component" className="space-y-5">
      {/* Top Banner & KPI Stat Chips */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#002185] text-white uppercase tracking-wider">
                Staff Directory
              </span>
              <span className="text-xs text-[#64748B] font-medium">
                Live Database Connection
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#002185] mt-1">
              Staff Members & Contact Directory
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Search, filter, and access staff contact details, department roles, and real-time active status.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center min-w-[70px]">
              <div className="text-sm font-bold text-[#002185]">{metrics.total}</div>
              <div className="text-[10px] text-[#64748B] font-medium uppercase">Total Staff</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#F0FDF4] border border-[#16A34A]/20 text-center min-w-[70px]">
              <div className="text-sm font-bold text-[#16A34A]">{metrics.active}</div>
              <div className="text-[10px] text-[#16A34A] font-medium uppercase">Active</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#FFFBEB] border border-[#F59E0B]/20 text-center min-w-[70px]">
              <div className="text-sm font-bold text-[#B45309]">{metrics.inactive}</div>
              <div className="text-[10px] text-[#B45309] font-medium uppercase">Inactive</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 text-center min-w-[70px]">
              <div className="text-sm font-bold text-[#DC2626]">{metrics.suspended}</div>
              <div className="text-[10px] text-[#DC2626] font-medium uppercase">Suspended</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center min-w-[70px]">
              <div className="text-sm font-bold text-[#002185]">{metrics.deptsCount}</div>
              <div className="text-[10px] text-[#64748B] font-medium uppercase">Depts</div>
            </div>
          </div>
        </div>

        {/* Action Message Feedback Banner */}
        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              actionMessage.type === "success"
                ? "bg-[#F0FDF4] text-[#16A34A] border-[#16A34A]/30"
                : "bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === "success" ? (
                <Check className="w-4 h-4 text-[#16A34A]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-[#64748B] hover:text-[#0F172A] p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Input and Filter Bar */}
        <div className="mt-4 pt-4 border-t border-[#E2E8F0] flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, email, phone, employee ID, location..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#002185] focus:ring-1 focus:ring-[#002185] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#0F172A]"
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
              className="px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#002185] cursor-pointer hover:border-[#002185] transition-all shrink-0"
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
              className="px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#002185] cursor-pointer hover:border-[#002185] transition-all shrink-0"
            >
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st === "All" ? "All Statuses" : st}
                </option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0] shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid Card View"
                className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#002185]"
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
                    ? "bg-[#002185] text-white shadow-xs"
                    : "text-[#64748B] hover:text-[#002185]"
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
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:opacity-50 ${
                exportSuccess
                  ? "bg-green-600 text-white border border-green-600"
                  : "bg-[#F8FAFC] hover:bg-[#002185] text-[#002185] hover:text-white border border-[#E2E8F0] hover:border-[#002185]"
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
                  <span>Download CSV</span>
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 text-current">
                    {filteredEmployees.length}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter tags summary */}
        {(search || selectedDepartment !== "All" || selectedStatus !== "All") && (
          <div className="mt-3 flex items-center justify-between text-xs text-[#64748B] bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#002185]" />
              <span>
                Showing <strong className="text-[#002185]">{filteredEmployees.length}</strong> matching results of {employees.length} total staff
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="text-[#002185] hover:text-[#ff5500] font-bold cursor-pointer inline-flex items-center gap-1 text-[11px]"
              >
                <Download className="w-3 h-3" />
                Export Filtered View
              </button>
              <span className="text-[#CBD5E1]">|</span>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedDepartment("All");
                  setSelectedStatus("All");
                }}
                className="text-[#ff5500] hover:underline font-semibold cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid Card View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                className="bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#002185] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Row: Avatar, Name, ID & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#002185] to-[#0A2E9E] text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#002185] truncate group-hover:text-[#ff5500] transition-colors">
                          {emp.fullName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-[#64748B] mt-0.5">
                          <span className="font-mono bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E2E8F0] text-[10px] font-semibold text-[#002185]">
                            {emp.employeeId || "EMP"}
                          </span>
                          <span className="truncate">{emp.department}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${badge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Role Title */}
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                    <Briefcase className="w-3.5 h-3.5 text-[#ff5500] shrink-0" />
                    <span className="truncate">{emp.position || "Staff Member"}</span>
                  </div>

                  {/* Admin Status Quick Switcher */}
                  {isAdmin && (
                    <div className="mt-3 p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                        <span>Account Status</span>
                        {statusUpdatingId === empId && (
                          <Loader2 className="w-3 h-3 text-[#002185] animate-spin" />
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
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
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

                  {/* Contact Details Info Box */}
                  <div className="mt-3 space-y-2 text-xs">
                    {/* Email */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F8FAFC] transition-colors group/item">
                      <a
                        href={`mailto:${emp.email}`}
                        className="flex items-center gap-2 text-[#475569] hover:text-[#002185] truncate"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                        <span className="truncate">{emp.email || "No email"}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(emp.email, `email_${empId}`)}
                        title="Copy email"
                        className="text-[#94A3B8] hover:text-[#002185] p-1 rounded transition-colors cursor-pointer"
                      >
                        {copiedField === `email_${empId}` ? (
                          <Check className="w-3 h-3 text-[#16A34A]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F8FAFC] transition-colors group/item">
                      <a
                        href={`tel:${emp.phone}`}
                        className="flex items-center gap-2 text-[#475569] hover:text-[#002185] truncate"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                        <span>{emp.phone || "+233 24 000 0000"}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(emp.phone, `phone_${empId}`)}
                        title="Copy phone number"
                        className="text-[#94A3B8] hover:text-[#002185] p-1 rounded transition-colors cursor-pointer"
                      >
                        {copiedField === `phone_${empId}` ? (
                          <Check className="w-3 h-3 text-[#16A34A]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 px-2 py-1 text-[#64748B] text-[11px]">
                      <MapPin className="w-3 h-3 text-[#94A3B8] shrink-0" />
                      <span>{emp.location || "Accra Head Office"}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setEmployeeToDelete(emp)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEF2F2] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Delete employee permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-[#94A3B8] font-medium">
                      Type: {emp.employmentType || "Full-time"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(emp)}
                    className="px-3 py-1.5 rounded-lg bg-[#002185] hover:bg-[#ff5500] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table / List View */}
      {viewMode === "table" && (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px] tracking-wider">
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
              <tbody className="divide-y divide-[#E2E8F0]">
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
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#002185] text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#002185]">
                              {emp.fullName}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {emp.role || "Employee"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="px-4 py-3 font-mono font-semibold text-[#002185]">
                        {emp.employeeId || "EMP"}
                      </td>

                      {/* Role & Dept */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0F172A]">
                          {emp.position || "Staff Member"}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {emp.department}
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="px-4 py-3 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[#0F172A]">
                          <Mail className="w-3 h-3 text-[#64748B]" />
                          <a
                            href={`mailto:${emp.email}`}
                            className="hover:text-[#002185] hover:underline truncate max-w-[160px]"
                          >
                            {emp.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#64748B]">
                          <Phone className="w-3 h-3" />
                          <span>{emp.phone || "+233 24 000 0000"}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 text-[#64748B]">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#94A3B8]" />
                          <span>{emp.location || "Accra Head Office"}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Change Status Action (Admin only) */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
                            {["active", "inactive", "suspended"].map((st) => (
                              <button
                                key={st}
                                type="button"
                                disabled={isUpdatingThis || currentStatus === st}
                                onClick={() => handleStatusChange(empId, st)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                                  currentStatus === st
                                    ? st === "active"
                                      ? "bg-[#16A34A] text-white shadow-xs"
                                      : st === "suspended"
                                      ? "bg-[#DC2626] text-white shadow-xs"
                                      : "bg-[#F59E0B] text-white shadow-xs"
                                    : "bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#002185]"
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
                            className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#002185] hover:text-white text-[#002185] text-xs font-semibold transition-all cursor-pointer"
                          >
                            Details
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setEmployeeToDelete(emp)}
                              className="p-1.5 rounded-lg border border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
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
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-full bg-[#F8FAFC] text-[#64748B] flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#002185]">
            No matching staff members found
          </h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            Try adjusting your search query or clear the filter selections to view all registered staff.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedDepartment("All");
              setSelectedStatus("All");
            }}
            className="mt-4 px-4 py-2 bg-[#002185] text-white text-xs font-bold rounded-xl hover:bg-[#ff5500] transition-colors cursor-pointer"
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
                <div className="w-16 h-16 rounded-2xl bg-white text-[#002185] font-black text-xl flex items-center justify-center shadow-md shrink-0">
                  {(selectedEmployee.fullName || "E")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
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
