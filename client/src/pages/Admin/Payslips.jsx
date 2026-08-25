import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  Building2,
  Calendar,
  Clock,
  FileText,
  Eye,
  Calculator,
  BanknoteIcon,
  Download,
  Printer,
  RefreshCw,
  Trash2,
  CheckCircle2,
  MoreVertical,
} from "lucide-react";
import { useManagement } from "../../context/ManagementContextProvider";
import PayslipsModal from "../../components/modal/PayslipsModal";
import PayrollDetailsModal from "../../components/modal/PayrollDetailsModal";
import PayrollSummaryCalculator from "../../components/PayrollSummaryCalculator";
import PayrollCycleHistory from "../../components/PayrollCycleHistory";
import PenaltyPayrollImpactChart from "../../components/PenaltyPayrollImpactChart";
import { getAllPayslips, updatePayrollStatus, deletePayroll } from "../../apis/fontApis";
import { downloadPayslipPDF } from "../../utils/payslipPdfGenerator";
import {
  List,
  History,
  TrendingDown,
} from "lucide-react";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const Payslips = () => {
  const navigate = useNavigate();
  const [activeViewTab, setActiveViewTab] = useState("records"); // "records" | "calculator"
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All Months");
  const { showPayslipsModal, setShowPayslipsModal, setShowToast } = useManagement();
  const [payslips, setPayslips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Details Modal State
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Action Menu Dropdown State for rows
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Get current month and year
  const getCurrentMonth = () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentDate = new Date();
    return months[currentDate.getMonth()];
  };

  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  const allMonths = [
    "All Months",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();

  const fetchPayslips = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await getAllPayslips();
      if (data.success) {
        setPayslips(data.list || []);
      } else {
        setError(data.message || "Failed to fetch payroll records.");
        setShowToast({
          message: data.message,
          show: true,
          type: "error",
        });
      }
    } catch (error) {
      console.error(error);
      setError(error.message || "An error occurred while fetching payroll.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  // Filter Data
  const filteredData = payslips.filter((pay) => {
    const employeeName = pay?.employee?.fullName || pay?.employeeName || "";
    const department = pay?.employee?.department || pay?.department || "";
    const employeeId = pay?.employee?.employeeId || pay?.employeeId || "";
    const month = pay?.payMonth || pay?.month || "";
    const status = pay?.status || "";

    const matchesSearch =
      employeeName.toLowerCase().includes(search.toLowerCase()) ||
      department.toLowerCase().includes(search.toLowerCase()) ||
      employeeId.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === "All" || status === filterStatus;

    let payMonth = month;
    if (!payMonth && pay?.paymentDate) {
      try {
        const date = new Date(pay.paymentDate);
        const months = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        payMonth = months[date.getMonth()];
      } catch {
        payMonth = "";
      }
    }

    const matchesMonth =
      filterMonth === "All Months" || (payMonth && payMonth.toLowerCase().includes(filterMonth.toLowerCase()));

    return matchesSearch && matchesStatus && matchesMonth;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "bg-[#16A34A] text-white";
      case "Pending":
        return "bg-[#F59E0B] text-white";
      case "Failed":
        return "bg-[#DC2626] text-white";
      default:
        return "bg-[#64748B] text-white";
    }
  };

  const statusOptions = ["All", "Paid", "Pending", "Failed"];

  // Calculate summary stats
  const totalEmployees = filteredData.length;
  const totalPaid = filteredData
    .filter((pay) => pay?.status === "Paid")
    .reduce((sum, pay) => sum + (Number(pay?.netSalary) || 0), 0);
  const totalPending = filteredData
    .filter((pay) => pay?.status === "Pending")
    .reduce((sum, pay) => sum + (Number(pay?.netSalary) || 0), 0);
  const totalDeductions = filteredData.reduce(
    (sum, pay) => sum + (Number(pay?.deductions) || 0),
    0
  );

  const formatCurrency = (amount) => {
    return (Number(amount) || 0).toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getInitials = (name) => {
    if (!name) return "E";
    return name.charAt(0).toUpperCase();
  };

  // View Details Action Handler
  const handleViewDetails = (payrollItem) => {
    setSelectedPayroll(payrollItem);
    setShowDetailsModal(true);
    setActiveMenuId(null);
  };

  // Quick Status Update
  const handleQuickStatusUpdate = async (item, newStatus) => {
    const targetId = item?._id || item?.id || item?.payslipNumber;
    if (!targetId) return;

    try {
      const res = await updatePayrollStatus(targetId, { status: newStatus });
      if (res.data?.success) {
        setShowToast({
          message: `Status updated to ${newStatus}`,
          type: "success",
          show: true,
        });
        fetchPayslips();
      }
    } catch (err) {
      console.error(err);
      setShowToast({
        message: err.message || "Failed to update status",
        type: "error",
        show: true,
      });
    } finally {
      setActiveMenuId(null);
    }
  };

  // Download PDF Action Handler
  const handleDownloadPDF = async (payrollItem) => {
    try {
      setShowToast({
        message: `Generating official payslip PDF for ${payrollItem?.employee?.fullName || payrollItem?.employeeName || "employee"}...`,
        type: "success",
        show: true,
      });
      await downloadPayslipPDF(payrollItem);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setShowToast({
        message: "Failed to generate PDF. Opening print preview...",
        type: "error",
        show: true,
      });
      navigate(`/print-payslips/${payrollItem?._id || payrollItem?.id || payrollItem?.payslipNumber}`);
    }
  };

  // Delete Action
  const handleDelete = async (item) => {
    const targetId = item?._id || item?.id || item?.payslipNumber;
    if (!targetId) return;

    if (!window.confirm(`Are you sure you want to delete this payroll record for ${item?.employee?.fullName || item?.employeeName}?`)) {
      return;
    }

    try {
      const res = await deletePayroll(targetId);
      if (res.data?.success) {
        setShowToast({
          message: "Payroll record deleted successfully.",
          type: "success",
          show: true,
        });
        fetchPayslips();
      }
    } catch (err) {
      console.error(err);
      setShowToast({
        message: err.message || "Failed to delete record",
        type: "error",
        show: true,
      });
    } finally {
      setActiveMenuId(null);
    }
  };

  // Export Monthly Payroll Report as CSV
  const handleExportReport = () => {
    if (filteredData.length === 0) {
      setShowToast({
        message: "No payroll records to export.",
        type: "error",
        show: true,
      });
      return;
    }

    const headers = [
      "Payslip No",
      "Employee ID",
      "Employee Name",
      "Department",
      "Pay Month",
      "Payment Date",
      "Basic Salary (GHS)",
      "Allowances (GHS)",
      "Deductions (GHS)",
      "Net Salary (GHS)",
      "Payment Method",
      "Status",
    ];

    const rows = filteredData.map((item, idx) => {
      const pNum = item.payslipNumber || item.id || `PAY-2026-08-${idx + 1}`;
      const empId = item.employee?.employeeId || item.employeeId || `EMP00${idx + 1}`;
      const empName = item.employee?.fullName || item.employeeName || "Employee";
      const dept = item.employee?.department || item.department || "Operations";
      const month = item.payMonth || item.month || "August 2026";
      const date = item.paymentDate || "2026-08-25";
      const basic = Number(item.basicSalary || 0);
      const allow = Number(item.allowances || 0);
      const deduct = Number(item.deductions || 0);
      const net = Number(item.netSalary || (basic + allow - deduct));
      const method = item.paymentMethod || "Bank Transfer";
      const status = item.status || "Paid";

      return [
        `"${pNum}"`,
        `"${empId}"`,
        `"${empName}"`,
        `"${dept}"`,
        `"${month}"`,
        `"${date}"`,
        basic.toFixed(2),
        allow.toFixed(2),
        deduct.toFixed(2),
        net.toFixed(2),
        `"${method}"`,
        `"${status}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Payroll_Report_${filterMonth !== "All Months" ? filterMonth : "Summary"}_${currentYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowToast({
      message: "Monthly payroll report exported successfully.",
      type: "success",
      show: true,
    });
  };

  if (isLoading && payslips.length === 0) {
    return <Loading />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
              Payroll Management
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              Employee payroll table, payslip generation, and attendance-based salary calculations with fixed absence deductions.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportReport}
              className="px-3.5 py-2.5 bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] rounded-xl transition-all duration-200 text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              title="Export filtered records to CSV"
            >
              <Download className="w-4 h-4 text-[#002185]" />
              Export CSV
            </button>

            <div className="text-xs text-[#64748B] bg-[#FFFFFF] px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-1.5 font-medium">
              <Calendar className="h-4 w-4 text-[#ff5500]" />
              <span className="font-semibold text-[#002185]">
                {currentMonth} {currentYear}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPayslipsModal(true)}
              className="px-4 py-2.5 bg-[#002185] hover:bg-[#ff5500] text-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Generate Payslip
            </button>
          </div>
        </div>

        {/* Primary View Switcher Tabs */}
        <div className="flex items-center p-1.5 bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl self-start flex-wrap gap-1">
          <button
            id="tab-btn-records"
            type="button"
            onClick={() => setActiveViewTab("records")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === "records"
                ? "bg-[#002185] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#002185] dark:text-slate-400"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Payroll Records ({payslips.length})</span>
          </button>

          <button
            id="tab-btn-cycles"
            type="button"
            onClick={() => setActiveViewTab("cycles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === "cycles"
                ? "bg-[#002185] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#002185] dark:text-slate-400"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Cycle History</span>
          </button>

          <button
            id="tab-btn-impact"
            type="button"
            onClick={() => setActiveViewTab("impact")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === "impact"
                ? "bg-[#002185] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#002185] dark:text-slate-400"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Penalty Impact Analytics</span>
          </button>

          <button
            id="tab-btn-calculator"
            type="button"
            onClick={() => setActiveViewTab("calculator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeViewTab === "calculator"
                ? "bg-[#002185] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#002185] dark:text-slate-400"
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-[#ff5500]" />
            <span>Attendance & Salary Calculator</span>
          </button>
        </div>

        {/* Dynamic Payroll & Attendance Calculator */}
        {activeViewTab === "calculator" && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-200">
            <PayrollSummaryCalculator
              onApplyCalculatedValues={(_calculatedData) => {
                setShowPayslipsModal(true);
              }}
            />
          </div>
        )}

        {/* Payroll Cycle History */}
        {activeViewTab === "cycles" && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-200">
            <PayrollCycleHistory
              onSelectCycle={(cycleMonth) => {
                setFilterMonth(cycleMonth.split(" ")[0]);
                setActiveViewTab("records");
              }}
            />
          </div>
        )}

        {/* Penalty Impact Analytics Dashboard Chart */}
        {activeViewTab === "impact" && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-200">
            <PenaltyPayrollImpactChart />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={fetchPayslips}
            onClose={() => setError(null)}
          />
        )}

        {/* Tab 3: Records Table View */}
        {activeViewTab === "records" && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                      Total Employees
                    </p>
                    <p className="text-2xl font-bold text-[#002185] mt-1">
                      {totalEmployees}
                    </p>
                    <span className="text-[10px] text-[#64748B] block mt-0.5">On Active Payroll</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#002185] flex items-center justify-center text-white shadow-xs">
                    <User className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[#166534] uppercase tracking-wider">
                      Total Paid Out
                    </p>
                    <p className="text-2xl font-bold text-[#16A34A] mt-1">
                      {formatCurrency(totalPaid)}
                    </p>
                    <span className="text-[10px] text-[#166534] block mt-0.5">Disbursed to Staff</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#16A34A]">
                    <BanknoteIcon className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[#92400E] uppercase tracking-wider">
                      Pending Approvals
                    </p>
                    <p className="text-2xl font-bold text-[#F59E0B] mt-1">
                      {formatCurrency(totalPending)}
                    </p>
                    <span className="text-[10px] text-[#92400E] block mt-0.5">Awaiting Transfer</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#F59E0B]">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                      Taxes & Deductions
                    </p>
                    <p className="text-2xl font-bold text-[#DC2626] mt-1">
                      {formatCurrency(totalDeductions)}
                    </p>
                    <span className="text-[10px] text-[#64748B] block mt-0.5">SSNIT & PAYE Withheld</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#DC2626]">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-[#64748B]" />
                </div>
                <input
                  type="text"
                  placeholder="Search by employee name, ID, or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-xl bg-[#FFFFFF] text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition-all duration-200"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl bg-[#FFFFFF] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent text-xs font-semibold cursor-pointer hover:border-[#ff5500]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      Status: {status}
                    </option>
                  ))}
                </select>

                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3.5 py-2.5 border border-[#E2E8F0] rounded-xl bg-[#FFFFFF] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent text-xs font-semibold cursor-pointer hover:border-[#ff5500]"
                >
                  {allMonths.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={fetchPayslips}
                  disabled={isLoading}
                  title="Refresh Table Data"
                  className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#002185] hover:bg-[#F8FAFC] transition cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#002185]" : ""}`} />
                </button>
              </div>
            </div>

            {/* Results Count Summary */}
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <div>
                Showing{" "}
                <span className="font-bold text-[#002185]">
                  {filteredData.length}
                </span>{" "}
                of{" "}
                <span className="font-bold text-[#002185]">
                  {payslips.length}
                </span>{" "}
                payroll entries
              </div>
              {filterMonth !== "All Months" && (
                <span className="bg-[#EFF6FF] text-[#1E40AF] px-2.5 py-0.5 rounded-full font-medium border border-[#BFDBFE]">
                  Month: {filterMonth}
                </span>
              )}
            </div>

            {/* Main Payroll Table */}
            <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs bg-white">
              {/* Table Header */}
              <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                <div className="col-span-4">Employee Details</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Pay Period</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2 text-right">Net Salary</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Main Content Rows */}
              <div className="divide-y divide-[#E2E8F0]">
                {filteredData.map((pay, index) => {
                  const empName = pay?.employee?.fullName || pay?.employeeName || "Employee";
                  const empId = pay?.employee?.employeeId || pay?.employeeId || "EMP001";
                  const dept = pay?.employee?.department || pay?.department || "Operations";
                  const pos = pay?.employee?.position || pay?.position || "Staff";
                  const payMonth = pay?.payMonth || pay?.month || "August 2026";
                  const net = Number(pay?.netSalary || 0);
                  const isMenuOpen = activeMenuId === (pay?._id || pay?.id || index);

                  return (
                    <div
                      key={pay?._id || pay?.id || index}
                      className="hover:bg-[#F8FAFC]/80 transition-colors duration-150"
                    >
                      {/* Desktop Grid Row */}
                      <div className="hidden lg:grid grid-cols-12 gap-3 items-center px-5 py-3.5">
                        {/* Employee Details */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#002185] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                            {getInitials(empName)}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleViewDetails(pay)}
                              className="text-sm font-bold text-[#002185] hover:text-[#ff5500] transition text-left cursor-pointer"
                            >
                              {empName}
                            </button>
                            <p className="text-xs text-[#64748B] flex items-center gap-2">
                              <span>ID: {empId}</span>
                              <span>•</span>
                              <span>{pos}</span>
                            </p>
                          </div>
                        </div>

                        {/* Department */}
                        <div className="col-span-2">
                          <p className="text-xs font-medium text-[#334155] flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                            {dept}
                          </p>
                        </div>

                        {/* Pay Month */}
                        <div className="col-span-2">
                          <p className="text-xs font-semibold text-[#0F172A] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#ff5500]" />
                            {payMonth}
                          </p>
                          <span className="text-[10px] text-[#94A3B8] block">
                            Paid: {formatDate(pay?.paymentDate)}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="col-span-1">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getStatusColor(
                              pay?.status || "Paid"
                            )}`}
                          >
                            {pay?.status || "Paid"}
                          </span>
                        </div>

                        {/* Net Salary */}
                        <div className="col-span-2 text-right">
                          <p className="text-sm font-bold text-[#002185] tabular-nums">
                            {formatCurrency(net)}
                          </p>
                          <span className="text-[10px] text-[#64748B]">
                            Basic: {formatCurrency(pay?.basicSalary)}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex items-center justify-end gap-1 relative">
                          {/* Eye Icon ("View Details") */}
                          <button
                            id={`btn-view-details-${pay?._id || index}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(pay);
                            }}
                            className="p-1.5 text-[#002185] hover:text-[#ff5500] hover:bg-[#F1F5F9] rounded-lg transition-all duration-200 cursor-pointer"
                            title="View Complete Breakdown"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download PDF Icon */}
                          <button
                            id={`btn-download-pdf-${pay?._id || index}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(pay);
                            }}
                            className="p-1.5 text-[#16A34A] hover:text-[#002185] hover:bg-[#F1F5F9] rounded-lg transition-all duration-200 cursor-pointer"
                            title="Download PDF Payslip"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Print Icon */}
                          <button
                            id={`btn-print-payslip-${pay?._id || index}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/print-payslips/${pay?._id || pay?.id || pay?.payslipNumber}`);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#002185] hover:bg-[#F1F5F9] rounded-lg transition-all duration-200 cursor-pointer"
                            title="Print Payslip Document"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Delete Icon */}
                          <button
                            id={`btn-delete-payslip-${pay?._id || index}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(pay);
                            }}
                            className="p-1.5 text-[#DC2626] hover:text-red-700 hover:bg-[#FEF2F2] rounded-lg transition-all duration-200 cursor-pointer"
                            title="Delete Payroll Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* More Options Dropdown */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(
                                isMenuOpen ? null : (pay?._id || pay?.id || index)
                              );
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#002185] hover:bg-[#F1F5F9] rounded-lg transition-all duration-200 cursor-pointer"
                            title="More Options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu Popup */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-1.5 z-30 animate-in fade-in duration-150"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(pay);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#002185]" />
                                View Full Breakdown
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPDF(pay);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-[#16A34A] hover:bg-[#F0FDF4] flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download PDF
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickStatusUpdate(pay, "Paid");
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-[#16A34A] hover:bg-[#F0FDF4] flex items-center gap-2 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Mark as Paid
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickStatusUpdate(pay, "Pending");
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-[#F59E0B] hover:bg-[#FFFBEB] flex items-center gap-2 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Mark as Pending
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/print-payslips/${pay?._id || pay?.id || pay?.payslipNumber}`);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-[#002185] hover:bg-[#F8FAFC] flex items-center gap-2 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Print Payslip View
                              </button>
                              <div className="border-t border-[#E2E8F0] my-1"></div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(pay);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 cursor-pointer font-semibold"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Record
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mobile Card Row */}
                      <div className="lg:hidden p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#002185] flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {getInitials(empName)}
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(pay);
                                }}
                                className="text-sm font-bold text-[#002185] hover:text-[#ff5500] text-left cursor-pointer"
                              >
                                {empName}
                              </button>
                              <p className="text-xs text-[#64748B]">
                                {dept} • {empId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(pay);
                              }}
                              className="p-2 text-[#002185] hover:bg-[#F1F5F9] rounded-lg transition cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPDF(pay);
                              }}
                              className="p-2 text-[#16A34A] hover:bg-[#F0FDF4] rounded-lg transition cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/print-payslips/${pay?._id || pay?.id || pay?.payslipNumber}`);
                              }}
                              className="p-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-lg transition cursor-pointer"
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(pay);
                              }}
                              className="p-2 text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] text-xs">
                          <div>
                            <span className="text-[#64748B] block">{payMonth}</span>
                            <span
                              className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(
                                pay?.status || "Paid"
                              )}`}
                            >
                              {pay?.status || "Paid"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[#64748B] block">Net Take-Home</span>
                            <span className="text-sm font-bold text-[#002185]">
                              {formatCurrency(net)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty State */}
              {filteredData.length === 0 && (
                <div className="text-center py-16 px-4 bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-[#94A3B8]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#002185]">
                    No payroll records found
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                    Try adjusting your search keywords, month selection, or generate a new payslip.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPayslipsModal(true)}
                    className="mt-4 px-4 py-2 bg-[#002185] text-white rounded-xl text-xs font-bold hover:bg-[#ff5500] transition cursor-pointer"
                  >
                    Generate First Payslip
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal - Generate Payslip */}
      {showPayslipsModal && (
        <PayslipsModal
          onClose={() => setShowPayslipsModal(false)}
          onSuccess={fetchPayslips}
        />
      )}

      {/* Modal - View Full Details (Eye Icon) */}
      {showDetailsModal && selectedPayroll && (
        <PayrollDetailsModal
          payrollId={selectedPayroll?._id || selectedPayroll?.id || selectedPayroll?.payslipNumber}
          initialData={selectedPayroll}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPayroll(null);
          }}
          onRefresh={fetchPayslips}
        />
      )}
    </>
  );
};

export default Payslips;
