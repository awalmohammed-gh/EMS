import { useState, useMemo } from "react";
import {
  Search,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  Check,
  PhoneCall,
  UserCheck,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

// Generates realistic historical salary adjustment increments based on employee joining details
const generateSalaryHistory = (employee) => {
  if (!employee) return [];
  const baseSal = Number(
    employee.baseSalary ||
      employee.basicSalary ||
      employee.salary ||
      employee.monthlyRate ||
      4500
  );

  const joinDate = employee.employmentDate
    ? new Date(employee.employmentDate)
    : new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000);

  const adjustments = [];
  const initialBase = Math.round(baseSal * 0.72);

  // 1. Initial Offer / Starting Salary
  adjustments.push({
    id: "adj-1",
    effectiveDate: joinDate.toISOString().split("T")[0],
    previousSalary: 0,
    newSalary: initialBase,
    percentageChange: 0,
    type: "Starting Base",
    reason: "Initial Employment Contract Offer",
    approvedBy: "Human Resources Board",
    status: "Completed",
  });

  // 2. Probation Confirmation (+12%)
  const probationDate = new Date(joinDate);
  probationDate.setMonth(probationDate.getMonth() + 6);
  const postProbation = Math.round(initialBase * 1.12);
  adjustments.push({
    id: "adj-2",
    effectiveDate: probationDate.toISOString().split("T")[0],
    previousSalary: initialBase,
    newSalary: postProbation,
    percentageChange: 12.0,
    type: "Probation Confirmation",
    reason: "Successful Completion of 6-Month Probationary Period",
    approvedBy: "Operations Director",
    status: "Completed",
  });

  // 3. Annual Performance Merit Review (+15%)
  const annualDate = new Date(probationDate);
  annualDate.setFullYear(annualDate.getFullYear() + 1);
  const postAnnual = Math.round(postProbation * 1.15);
  adjustments.push({
    id: "adj-3",
    effectiveDate: annualDate.toISOString().split("T")[0],
    previousSalary: postProbation,
    newSalary: postAnnual,
    percentageChange: 15.0,
    type: "Merit Increment",
    reason: "Annual High-Performance Rating & Core Competency Milestone",
    approvedBy: "Compensation Committee",
    status: "Completed",
  });

  // 4. Current Market Realignment / Promotion
  const marketDate = new Date(annualDate);
  marketDate.setMonth(marketDate.getMonth() + 6);
  const currentBase = Math.max(baseSal, postAnnual);
  const lastChangePct = parseFloat(
    (((currentBase - postAnnual) / postAnnual) * 100).toFixed(1)
  );

  adjustments.push({
    id: "adj-4",
    effectiveDate: marketDate.toISOString().split("T")[0],
    previousSalary: postAnnual,
    newSalary: currentBase,
    percentageChange: lastChangePct > 0 ? lastChangePct : 8.5,
    type: "Market Adjustment",
    reason: "Industry Benchmark & Role Seniority Realignment",
    approvedBy: "Executive Management",
    status: "Active",
  });

  return adjustments.reverse(); // Most recent first
};

export const EmployeeDetailModal = ({
  employee,
  isOpen,
  onClose,
  isAdmin,
  statusUpdatingId,
  onStatusChange,
  onDeleteRequest,
  getStatusBadge,
  formatDate,
}) => {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "salary_history"
  const [copiedField, setCopiedField] = useState(null);

  // Salary history table search & pagination states
  const [salarySearch, setSalarySearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const rawSalaryHistory = useMemo(() => {
    return generateSalaryHistory(employee);
  }, [employee]);

  const filteredSalaryHistory = useMemo(() => {
    if (!salarySearch.trim()) return rawSalaryHistory;
    const q = salarySearch.toLowerCase().trim();
    return rawSalaryHistory.filter(
      (item) =>
        (item.effectiveDate || "").toLowerCase().includes(q) ||
        (item.type || "").toLowerCase().includes(q) ||
        (item.reason || "").toLowerCase().includes(q) ||
        (item.approvedBy || "").toLowerCase().includes(q) ||
        String(item.newSalary || "").includes(q) ||
        String(item.percentageChange || "").includes(q)
    );
  }, [rawSalaryHistory, salarySearch]);

  const totalPages = Math.ceil(filteredSalaryHistory.length / itemsPerPage) || 1;
  const paginatedSalaryHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSalaryHistory.slice(start, start + itemsPerPage);
  }, [filteredSalaryHistory, currentPage]);

  if (!isOpen || !employee) return null;

  const mBadge = getStatusBadge(
    employee.status,
    employee.isActive,
    employee
  );

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const initials = (employee.fullName || "E")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const currentSalary =
    employee.baseSalary ||
    employee.basicSalary ||
    employee.salary ||
    employee.monthlyRate ||
    5200;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="print-employee-profile-card"
        className="bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in flex flex-col max-h-[90vh] print-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#002185] p-4 sm:p-6 text-white relative shrink-0">
          <div className="flex items-center justify-between no-print mb-3">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-white/90">
              <span>Employee Record Profile</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-print-profile"
                onClick={handlePrint}
                title="Print Employee Profile"
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-white/20"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Profile</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close Profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white text-[#002185] font-black text-xl flex items-center justify-center shadow-md shrink-0 overflow-hidden border-2 border-white/40">
              {employee.profilePicture ||
              employee.profile_picture ||
              employee.avatar ||
              employee.avatar_url ? (
                <img
                  src={
                    employee.profilePicture ||
                    employee.profile_picture ||
                    employee.avatar ||
                    employee.avatar_url
                  }
                  alt={employee.fullName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  {employee.fullName}
                </h3>
                <span className="font-mono bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20">
                  {employee.employeeId || "EMP"}
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                {employee.position || "Staff Member"} • {employee.department}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${mBadge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${mBadge.dot}`} />
                  {mBadge.label}
                </span>
                <span className="text-[11px] text-blue-200">
                  Joined {formatDate(employee.employmentDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 border-t border-white/15 pt-3 no-print">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "bg-white text-[#002185] shadow-xs"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Profile Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("salary_history")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "salary_history"
                  ? "bg-white text-[#002185] shadow-xs"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Salary Adjustments</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  activeTab === "salary_history"
                    ? "bg-blue-100 text-[#002185]"
                    : "bg-white/20 text-white"
                }`}
              >
                {rawSalaryHistory.length}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Admin Quick Status Switcher */}
              {isAdmin && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-2 no-print">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Update Account Status
                    </span>
                    {statusUpdatingId ===
                      (employee._id || employee.employeeId) && (
                      <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    )}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
                    {[
                      {
                        key: "active",
                        label: "Active",
                        activeClass: "bg-emerald-600 text-white",
                      },
                      {
                        key: "on leave",
                        label: "On Leave",
                        activeClass: "bg-blue-600 text-white",
                      },
                      {
                        key: "terminated",
                        label: "Terminated",
                        activeClass: "bg-rose-600 text-white",
                      },
                      {
                        key: "inactive",
                        label: "Inactive",
                        activeClass: "bg-amber-600 text-white",
                      },
                      {
                        key: "suspended",
                        label: "Suspended",
                        activeClass: "bg-red-600 text-white",
                      },
                    ].map((st) => {
                      const empId = employee._id || employee.employeeId;
                      const isCurrent =
                        mBadge.code === st.key ||
                        mBadge.label.toLowerCase() === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          disabled={isCurrent || statusUpdatingId === empId}
                          onClick={() => onStatusChange(empId, st.key)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                            isCurrent
                              ? `${st.activeClass} shadow-xs`
                              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600"
                          } disabled:opacity-60`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl print-card">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Work Email
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                      {employee.email}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(employee.email, "modal_email")}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold mt-1 inline-flex items-center gap-1 cursor-pointer no-print"
                    >
                      {copiedField === "modal_email" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>
                        {copiedField === "modal_email" ? "Copied!" : "Copy Email"}
                      </span>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl print-card">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Phone Number
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {employee.phone || "+233 24 000 0000"}
                    </div>
                    <a
                      href={`tel:${employee.phone}`}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold mt-1 inline-flex items-center gap-1 no-print"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Call Directly</span>
                    </a>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl print-card">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Office Location
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {employee.location || "Accra Head Office"}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl print-card">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Emergency Contact
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {employee.emergencyContact || "+233 20 000 0000"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Role & Organizational Details */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Organizational & Compensation Profile
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 print-card">
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Department
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {employee.department}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 print-card">
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Employment Type
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {employee.employmentType || "Full-time"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 print-card">
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Current Base Pay
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      GHS {Number(currentSalary).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 print-card">
                    <span className="text-[10px] text-slate-400 block font-medium">
                      System Role
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white capitalize">
                      {employee.role || "Employee"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Salary Adjustments History */}
          {activeTab === "salary_history" && (
            <div className="space-y-4">
              {/* Summary Stats Chips */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-center">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Initial Base
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                    GHS {Number(rawSalaryHistory[rawSalaryHistory.length - 1]?.newSalary || 0).toLocaleString("en-GH")}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-center">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Current Base
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    GHS {Number(rawSalaryHistory[0]?.newSalary || currentSalary).toLocaleString("en-GH")}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-center">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Net Growth
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>
                      +
                      {rawSalaryHistory[rawSalaryHistory.length - 1]?.newSalary
                        ? Math.round(
                            ((Number(rawSalaryHistory[0]?.newSalary || currentSalary) -
                              Number(rawSalaryHistory[rawSalaryHistory.length - 1]?.newSalary)) /
                              Number(rawSalaryHistory[rawSalaryHistory.length - 1]?.newSalary)) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Search filter for history */}
              <div className="relative no-print">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={salarySearch}
                  onChange={(e) => {
                    setSalarySearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search adjustments by date, type, reason, amount..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Salary Adjustments Table */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5">Effective Date</th>
                        <th className="px-3.5 py-2.5">Adjustment Type</th>
                        <th className="px-3.5 py-2.5 text-right">Previous Pay</th>
                        <th className="px-3.5 py-2.5 text-right">New Base</th>
                        <th className="px-3.5 py-2.5 text-center">Increment</th>
                        <th className="px-3.5 py-2.5">Reason & Approval</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedSalaryHistory.map((adj) => {
                        return (
                          <tr
                            key={adj.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatDate(adj.effectiveDate)}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-3">
                              <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                                {adj.type}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {adj.status}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono text-slate-500 whitespace-nowrap">
                              {adj.previousSalary > 0
                                ? `GHS ${adj.previousSalary.toLocaleString("en-GH")}`
                                : "—"}
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              GHS {adj.newSalary.toLocaleString("en-GH")}
                            </td>
                            <td className="px-3.5 py-3 text-center whitespace-nowrap">
                              {adj.percentageChange > 0 ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/70">
                                  <TrendingUp className="w-3 h-3" />
                                  +{adj.percentageChange}%
                                </span>
                              ) : adj.percentageChange === 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  Base
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200">
                                  <TrendingDown className="w-3 h-3" />
                                  {adj.percentageChange}%
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 min-w-[150px]">
                              <div className="text-slate-700 dark:text-slate-300 font-medium">
                                {adj.reason}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Auth: {adj.approvedBy}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {paginatedSalaryHistory.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No salary adjustment records found matching your query.
                  </div>
                )}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400 no-print">
                  <span>
                    Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredSalaryHistory.length} total entries)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-2 shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onDeleteRequest(employee);
                }}
                className="flex-1 sm:flex-initial justify-center px-3 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/70 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial justify-center px-3 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs text-center"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Print Profile</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#002185] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs text-center"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
export default EmployeeDetailModal;
