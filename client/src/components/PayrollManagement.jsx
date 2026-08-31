import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  DollarSign,
  Calendar,
  FileText,
  Download,
  Printer,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Eye,
} from "lucide-react";

import {
  getAllPayslips,
  namesList,
  updatePayrollStatus,
  getAdminPayrollSummary,
} from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";
import PayslipsModal from "./modal/PayslipsModal";
import PayrollDetailsModal from "./modal/PayrollDetailsModal";
import { downloadPayslipPDF } from "../utils/payslipPdfGenerator";
import Avatar from "./Avatar";

export const PayrollManagement = () => {
  const navigate = useNavigate();
  const { showPayslipsModal, setShowPayslipsModal, setShowToast } = useManagement();

  // Data States
  const [employees, setEmployees] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Dynamic Aggregation KPI Summary State
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalPaidOut: 0,
    pendingApprovals: 0,
    taxesAndDeductions: 0,
  });

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modals & Action States
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch KPI Summary from backend aggregation pipeline
  const fetchPayrollSummary = useCallback(async (monthToQuery = selectedMonth) => {
    try {
      const params = {};
      if (monthToQuery && monthToQuery !== "all" && monthToQuery !== "All" && monthToQuery !== "All Months") {
        params.month = monthToQuery;
      }
      const res = await getAdminPayrollSummary(params);
      if (res.data?.success || res.data?.totalPaidOut !== undefined) {
        setSummary({
          totalEmployees: Number(res.data.totalEmployees || 0),
          totalPaidOut: Number(res.data.totalPaidOut !== undefined ? res.data.totalPaidOut : (res.data.totalPayrollDisbursed || 0)),
          pendingApprovals: Number(res.data.pendingApprovals !== undefined ? res.data.pendingApprovals : (res.data.pendingDisbursements || 0)),
          taxesAndDeductions: Number(res.data.taxesAndDeductions !== undefined ? res.data.taxesAndDeductions : 0),
        });
      }
    } catch (err) {
      console.warn("Could not fetch payroll summary:", err);
    }
  }, [selectedMonth]);

  // Load both active employees, payslips, and summary from backend
  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const [employeesRes, payslipsRes] = await Promise.allSettled([
        namesList(),
        getAllPayslips(),
      ]);

      // Handle active employees list
      if (employeesRes.status === "fulfilled" && employeesRes.value?.data) {
        const empData = employeesRes.value.data;
        const empList = Array.isArray(empData)
          ? empData
          : empData.employees || empData.data || [];
        setEmployees(empList);
      } else {
        console.warn("Could not retrieve active employees:", employeesRes.reason);
      }

      // Handle payslips list
      if (payslipsRes.status === "fulfilled" && payslipsRes.value?.data) {
        const pData = payslipsRes.value.data;
        const pList = Array.isArray(pData)
          ? pData
          : pData.payslips || pData.payroll || pData.data || [];
        setPayslips(pList);
      } else {
        const errObj = payslipsRes.reason;
        console.error("Could not retrieve payroll records:", errObj);
        setError(
          errObj?.response?.data?.message ||
            errObj?.message ||
            "Failed to load payroll data from server."
        );
      }

      await fetchPayrollSummary(selectedMonth);
    } catch (err) {
      console.error("Fatal error fetching payroll management data:", err);
      setError(err.response?.data?.message || err.message || "Failed to load data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchPayrollSummary, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchPayrollSummary(selectedMonth);
  }, [selectedMonth, fetchPayrollSummary]);

  // Currency Formatter
  const formatCurrency = (val) => {
    return Number(val || 0).toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Distinct Departments for Filter
  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    payslips.forEach((p) => {
      const dept = p.department || p.employee?.department;
      if (dept) set.add(dept);
    });
    return Array.from(set).sort();
  }, [employees, payslips]);

  // Distinct Months for Filter
  const months = useMemo(() => {
    const set = new Set();
    payslips.forEach((p) => {
      const m = p.payMonth || p.month;
      if (m) set.add(m);
    });
    return Array.from(set).sort().reverse();
  }, [payslips]);

  // Map and Join Employees with their Payroll Records
  const mappedRecords = useMemo(() => {
    return payslips.map((record) => {
      // Find matching employee if populated or referenced by ID
      const empId = String(record.employee?._id || record.employee || record.employeeId || "");
      const matchedEmp = employees.find(
        (e) =>
          String(e._id) === empId ||
          String(e.employeeId) === String(record.employeeId) ||
          e.email === record.employee?.email
      );

      const fullName =
        record.employee?.fullName ||
        record.employeeName ||
        matchedEmp?.fullName ||
        matchedEmp?.name ||
        "Employee";

      const employeeCode =
        record.employee?.employeeId ||
        record.employeeId ||
        matchedEmp?.employeeId ||
        "EMP";

      const department =
        record.employee?.department ||
        record.department ||
        matchedEmp?.department ||
        "Operations";

      const position =
        record.employee?.position ||
        record.position ||
        matchedEmp?.position ||
        "Staff";

      const avatar =
        record.employee?.profilePicture ||
        record.employee?.avatar ||
        matchedEmp?.profilePicture ||
        matchedEmp?.avatar ||
        "";

      const basicSalary = Number(record.basicSalary || record.baseSalary || 0);
      const allowances = Number(record.allowances || 0);
      const deductions = Number(record.deductions?.reduce?.((a, c) => a + (c.amount || 0), 0) || (typeof record.deductions === "number" ? record.deductions : 0));
      const absenceDeduction = Number(record.absentDaysDeduction || record.absenceDeduction || 0);
      const latenessDeduction = Number(record.latenessDeduction || record.latenessPenalties || 0);
      const totalAttendanceDeductions = Number(record.totalAttendanceDeductions || (absenceDeduction + latenessDeduction));
      const netPay = Number(record.netSalary || record.netPay || Math.max(0, basicSalary + allowances - deductions - totalAttendanceDeductions));

      return {
        ...record,
        id: record._id || record.id || record.payslipNumber,
        fullName,
        employeeCode,
        department,
        position,
        avatar,
        basicSalary,
        allowances,
        deductions,
        absenceDeduction,
        latenessDeduction,
        totalAttendanceDeductions,
        netPay,
        status: record.status || "Published",
        payMonth: record.payMonth || record.month || "N/A",
      };
    });
  }, [payslips, employees]);

  // Filter & Sort Logic
  const filteredRecords = useMemo(() => {
    let result = [...mappedRecords];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          (r.fullName || "").toLowerCase().includes(q) ||
          (r.employeeCode || "").toLowerCase().includes(q) ||
          (r.department || "").toLowerCase().includes(q) ||
          (r.position || "").toLowerCase().includes(q) ||
          (r.payslipNumber || "").toLowerCase().includes(q)
      );
    }

    // Department filter
    if (departmentFilter !== "all") {
      result = result.filter((r) => r.department === departmentFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(
        (r) => (r.status || "").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Month filter
    if (selectedMonth !== "all") {
      result = result.filter(
        (r) => (r.payMonth || "").toLowerCase() === selectedMonth.toLowerCase()
      );
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "createdAt" || sortField === "paymentDate") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [mappedRecords, searchQuery, departmentFilter, statusFilter, selectedMonth, sortField, sortOrder]);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    const s = (status || "published").toLowerCase();
    if (s === "paid") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Paid
        </span>
      );
    }
    if (s === "pending" || s === "draft") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
        <FileText className="w-3 h-3" />
        Published
      </span>
    );
  };

  // Status Change Handler
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await updatePayrollStatus(id, { status: newStatus });
      if (res.data?.success) {
        setShowToast({
          show: true,
          message: `Payroll status updated to ${newStatus}.`,
          type: "success",
        });
        fetchData(true);
      }
    } catch (err) {
      console.error("Status update error:", err);
      setShowToast({
        show: true,
        message: err.response?.data?.message || "Failed to update status.",
        type: "error",
      });
    }
  };

  return (
    <div id="payroll-management-container" className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Payroll Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage employee disbursements, salary calculations, and attendance penalties
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="payroll-refresh-btn"
              type="button"
              onClick={() => fetchData(true)}
              disabled={isRefreshing || isLoading}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              id="payroll-generate-payslip-btn"
              type="button"
              onClick={() => setShowPayslipsModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Payslip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 shadow-sm dark:shadow-black/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Employees</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {summary.totalEmployees}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">Active Staff on Record</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 shadow-sm dark:shadow-black/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Paid Out</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              GH₵{Number(summary.totalPaidOut || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">Disbursed to Staff</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 shadow-sm dark:shadow-black/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Approvals</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              GH₵{Number(summary.pendingApprovals || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">Awaiting Transfer</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 shadow-sm dark:shadow-black/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Taxes & Deductions</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              GH₵{Number(summary.taxesAndDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">Absence, Lateness & Deductions</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm dark:shadow-black/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="payroll-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by employee name, ID, department, or payslip #..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          <select
            id="payroll-dept-filter"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            id="payroll-month-filter"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Filter by pay month"
            className="px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            id="payroll-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-black/20 overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Loading active employees and payroll records...
            </p>
          </div>
        ) : error ? (
          <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Failed to load payroll data
            </h3>
            <p className="text-xs text-slate-500 max-w-md">{error}</p>
            <button
              type="button"
              onClick={() => fetchData()}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Payroll Records Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              {searchQuery || departmentFilter !== "all" || statusFilter !== "all" || selectedMonth !== "all"
                ? "No payroll records match the selected filter criteria. Try clearing the filters."
                : "No payslips have been generated yet. Click 'Generate Payslip' to calculate monthly salaries."}
            </p>
            <button
              id="payroll-empty-generate-btn"
              type="button"
              onClick={() => setShowPayslipsModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Generate First Payslip</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200/80 dark:border-slate-800/80 tracking-wider">
                <tr>
                  <th className="py-3.5 px-5 cursor-pointer" onClick={() => handleSort("fullName")}>
                    <div className="flex items-center gap-1.5">
                      <span>Employee</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Department & Role</th>
                  <th className="py-3.5 px-4 cursor-pointer" onClick={() => handleSort("payMonth")}>
                    <div className="flex items-center gap-1.5">
                      <span>Pay Month</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right cursor-pointer" onClick={() => handleSort("basicSalary")}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Basic Salary</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">Penalties</th>
                  <th className="py-3.5 px-4 text-right cursor-pointer" onClick={() => handleSort("netPay")}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Net Pay</span>
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredRecords.map((record) => {
                  const initial = record.fullName?.charAt(0)?.toUpperCase() || "E";
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Employee Column */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={record.avatar}
                            fullName={record.fullName}
                            size="sm"
                            shape="rounded"
                            className="w-9 h-9 rounded-xl shrink-0"
                            fallbackInitials={initial}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {record.fullName}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {record.employeeCode}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department & Role */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {record.department}
                          </p>
                          <p className="text-xs text-slate-400">{record.position}</p>
                        </div>
                      </td>

                      {/* Pay Month */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{record.payMonth}</span>
                        </div>
                      </td>

                      {/* Basic Salary */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(record.basicSalary)}
                      </td>

                      {/* Penalties */}
                      <td className="py-3.5 px-4 text-right">
                        {record.totalAttendanceDeductions > 0 ? (
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            -{formatCurrency(record.totalAttendanceDeductions)}
                          </span>
                        ) : (
                          <span className="text-slate-400">GH₵0.00</span>
                        )}
                      </td>

                      {/* Net Pay */}
                      <td className="py-3.5 px-4 text-right font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {formatCurrency(record.netPay)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(record.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayroll(record);
                              setShowDetailsModal(true);
                            }}
                            title="View Full Breakdown"
                            aria-label="View Full Breakdown"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#002185] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadPayslipPDF(record)}
                            title="Download PDF"
                            aria-label="Download PDF"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/print-payslips/${record.id}`)}
                            title="Print Payslip"
                            aria-label="Print Payslip"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#ff5500] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Quick Status Toggle Button */}
                          {record.status !== "Paid" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(record.id, "Paid")}
                              title="Mark as Paid"
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold transition-colors"
                            >
                              Mark Paid
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
        )}
      </div>

      {/* Payslip Generator Modal */}
      {showPayslipsModal && (
        <PayslipsModal
          isOpen={showPayslipsModal}
          onClose={() => setShowPayslipsModal(false)}
          onSuccess={() => {
            setShowPayslipsModal(false);
            fetchData(true);
          }}
        />
      )}

      {/* Details Breakdown Modal */}
      {showDetailsModal && selectedPayroll && (
        <PayrollDetailsModal
          isOpen={showDetailsModal}
          payroll={selectedPayroll}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPayroll(null);
          }}
        />
      )}
    </div>
  );
};

export default PayrollManagement;
