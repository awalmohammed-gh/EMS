import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Banknote,
  Calendar,
  Download,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Receipt,
  Printer,
  ChevronDown,
} from "lucide-react";
import { getEmployeePayslip } from "../apis/fontApis";
import { downloadPayslipPDF, printPayslipDocument } from "../utils/payslipPdfGenerator";
import EmployeePayslipsModal from "./modal/EmployeePayslipsModal";
import { useManagement } from "../context/ManagementContextProvider";

export const EmployeePayrollHistory = ({
  initialPayslips = null,
  title = "Payroll History & Pay Stubs",
  subtitle = "View and download historical pay stubs and verified salary disbursement records",
  showSummaryMetrics = true,
  maxDisplay = null,
}) => {
  const [payslips, setPayslips] = useState(initialPayslips || []);
  const [isLoading, setIsLoading] = useState(!initialPayslips);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const { setShowToast } = useManagement();

  // Helper to format currency in Ghana Cedis
  const formatGHS = (val) => {
    const num = Number(val) || 0;
    return `GH₵${num.toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Helper to format date strings
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Fetch payslips from API
  const fetchPayslips = useCallback(async (isSilent = false) => {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const res = await getEmployeePayslip();
      const data = res?.data;

      if (data?.success || Array.isArray(data?.payslips)) {
        let list = [];
        if (Array.isArray(data?.payslips)) {
          list = data.payslips;
        } else if (data?.payslips && typeof data.payslips === "object") {
          list = [data.payslips];
        }

        // Release/Payment filter: allow released or published/paid records, or all if available
        setPayslips(list);
      } else {
        const msg = data?.message || "Failed to load payroll history.";
        if (!isSilent) setError(msg);
      }
    } catch (err) {
      console.error("Error fetching payroll history:", err);
      const msg = err.response?.data?.message || err.message || "Failed to load payroll history.";
      if (!isSilent) setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialPayslips) {
      fetchPayslips();
    } else {
      setPayslips(initialPayslips);
    }
  }, [fetchPayslips, initialPayslips]);

  // Extract available years for dropdown
  const availableYears = useMemo(() => {
    const years = new Set();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);

    payslips.forEach((p) => {
      const monthStr = p.payMonth || p.month || "";
      if (monthStr && monthStr.includes("-")) {
        const y = monthStr.split("-")[0];
        if (y && y.length === 4) years.add(y);
      }
      if (p.paymentDate) {
        try {
          const y = new Date(p.paymentDate).getFullYear().toString();
          if (y && y.length === 4) years.add(y);
        } catch {
          // ignore
        }
      }
      if (p.payrollPeriod?.year) {
        years.add(String(p.payrollPeriod.year));
      }
    });

    return Array.from(years).sort().reverse();
  }, [payslips]);

  // Normalize payslip for calculations and display
  const getNormalizedDetails = (slip) => {
    const period = slip.payMonth || slip.month || (slip.payrollPeriod ? `${slip.payrollPeriod.month} ${slip.payrollPeriod.year}` : "Pay Period");
    const refId = slip.payslipNumber || (slip._id ? `PAY-${String(slip._id).slice(-6).toUpperCase()}` : (slip.id ? `PAY-${String(slip.id).slice(-6).toUpperCase()}` : "PAY-REF"));
    const dateIssued = slip.paymentDate || slip.createdAt;

    const baseSalary = Number(
      slip.breakdown?.baseSalary !== undefined
        ? slip.breakdown.baseSalary
        : slip.baseSalary !== undefined
        ? slip.baseSalary
        : slip.basicSalary || 0
    );

    const allowances = Number(
      slip.breakdown?.totalAllowances !== undefined
        ? slip.breakdown.totalAllowances
        : Array.isArray(slip.earnings)
        ? slip.earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        : Number(slip.allowances || 0)
    );

    const lateness = Number(
      slip.breakdown?.latenessDeduction?.totalAmount !== undefined
        ? slip.breakdown.latenessDeduction.totalAmount
        : Number(slip.latenessDeduction || 0)
    );

    const absence = Number(
      slip.breakdown?.absenceDeduction?.totalAmount !== undefined
        ? slip.breakdown.absenceDeduction.totalAmount
        : Number(slip.absentDaysDeduction || 0)
    );

    const customDeductions = Number(
      slip.breakdown?.totalCustomDeductions !== undefined
        ? slip.breakdown.totalCustomDeductions
        : Array.isArray(slip.deductions)
        ? slip.deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        : Number(slip.deductions || 0)
    );

    const totalDeductions = Number(
      slip.breakdown?.totalDeductions !== undefined
        ? slip.breakdown.totalDeductions
        : (customDeductions + absence + lateness)
    );

    const netPay = Number(
      slip.netSalary !== undefined && slip.netSalary !== null
        ? slip.netSalary
        : slip.netPay !== undefined && slip.netPay !== null
        ? slip.netPay
        : slip.breakdown?.netSalary !== undefined
        ? slip.breakdown.netSalary
        : (baseSalary + allowances - totalDeductions)
    );

    const status = String(slip.status || "Paid");

    return {
      period,
      refId,
      dateIssued,
      baseSalary,
      allowances,
      lateness,
      absence,
      customDeductions,
      totalDeductions,
      netPay,
      status,
    };
  };

  // Filtered payslips
  const filteredPayslips = useMemo(() => {
    return payslips.filter((slip) => {
      const details = getNormalizedDetails(slip);
      const search = searchTerm.toLowerCase().trim();

      // Search term matching
      const matchesSearch =
        !search ||
        details.period.toLowerCase().includes(search) ||
        details.refId.toLowerCase().includes(search) ||
        details.status.toLowerCase().includes(search) ||
        String(details.netPay).includes(search);

      // Year filter
      let slipYear = "";
      if (slip.payMonth && slip.payMonth.includes("-")) {
        slipYear = slip.payMonth.split("-")[0];
      } else if (slip.payrollPeriod?.year) {
        slipYear = String(slip.payrollPeriod.year);
      } else if (slip.paymentDate) {
        try {
          slipYear = new Date(slip.paymentDate).getFullYear().toString();
        } catch {
          // ignore
        }
      }
      const matchesYear = selectedYear === "all" || !slipYear || slipYear === selectedYear;

      // Status filter
      const matchesStatus =
        selectedStatus === "all" ||
        details.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesYear && matchesStatus;
    });
  }, [payslips, searchTerm, selectedYear, selectedStatus]);

  const displayList = maxDisplay ? filteredPayslips.slice(0, maxDisplay) : filteredPayslips;

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalTakeHome = 0;
    let totalDeductions = 0;
    let count = 0;

    payslips.forEach((slip) => {
      const d = getNormalizedDetails(slip);
      totalTakeHome += d.netPay;
      totalDeductions += d.totalDeductions;
      count += 1;
    });

    const averageNet = count > 0 ? totalTakeHome / count : 0;
    const latestPeriod = payslips.length > 0 ? getNormalizedDetails(payslips[0]).period : "None";

    return {
      totalCount: count,
      totalTakeHome,
      totalDeductions,
      averageNet,
      latestPeriod,
    };
  }, [payslips]);

  // Handle direct PDF Download
  const handleDownload = async (slip) => {
    const slipId = slip._id || slip.id || slip.payslipNumber;
    try {
      setDownloadingId(slipId);
      await downloadPayslipPDF(slip);
      if (setShowToast) {
        setShowToast({
          show: true,
          message: `Official pay stub PDF downloaded successfully!`,
          type: "success",
        });
      }
    } catch (err) {
      console.error("PDF download failed:", err);
      if (setShowToast) {
        setShowToast({
          show: true,
          message: "Failed to generate pay stub PDF.",
          type: "error",
        });
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "paid" || s === "published") {
      return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60";
    }
    if (s === "pending" || s === "draft") {
      return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
    }
    return "bg-slate-50 dark:bg-[#162033] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60";
  };

  return (
    <div id="employee-payroll-history-section" className="space-y-4">
      {/* Component Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111927] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#002185] dark:text-blue-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => fetchPayslips(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-[#162033] dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60 transition cursor-pointer disabled:opacity-50"
            title="Refresh pay stubs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#002185] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
            {payslips.length} Pay Stub{payslips.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Summary Metrics Row */}
      {showSummaryMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-[#111927] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Historical Pay Stubs</span>
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
              {metrics.totalCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Latest: <span className="font-semibold text-slate-700 dark:text-slate-300">{metrics.latestPeriod}</span>
            </p>
          </div>

          <div className="bg-white dark:bg-[#111927] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Total Net Take-Home</span>
              <Banknote className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
              {formatGHS(metrics.totalTakeHome)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Disbursed to bank / mobile wallet
            </p>
          </div>

          <div className="bg-white dark:bg-[#111927] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Average Net Pay</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
              {formatGHS(metrics.averageNet)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Per finalized billing cycle
            </p>
          </div>

          <div className="bg-white dark:bg-[#111927] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">Total Deductions</span>
              <ShieldCheck className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">
              {formatGHS(metrics.totalDeductions)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Taxes, lateness &amp; deductions
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#111927] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pay period, reference number, or amount..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#162033] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#162033] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer font-medium"
          >
            <option value="all">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Status selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#162033] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="published">Published</option>
            <option value="pending">Pending</option>
          </select>

          {(searchTerm || selectedYear !== "all" || selectedStatus !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedYear("all");
                setSelectedStatus("all");
              }}
              className="px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white dark:bg-[#111927] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#002185] dark:text-blue-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Retrieving historical pay stubs...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{error}</p>
            <button
              type="button"
              onClick={() => fetchPayslips()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 rounded-xl cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : displayList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#162033] flex items-center justify-center mx-auto text-slate-400">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No historical pay stubs found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {searchTerm || selectedYear !== "all" || selectedStatus !== "all"
                ? "No records matched your search filters. Try adjusting your year or status selection."
                : "Official payslips will appear here as soon as management completes and authorizes monthly payroll disbursement."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/75 dark:bg-[#162033]/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Pay Period</th>
                  <th className="py-3.5 px-4">Reference #</th>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4 text-right">Base Salary</th>
                  <th className="py-3.5 px-4 text-right">Allowances</th>
                  <th className="py-3.5 px-4 text-right">Deductions</th>
                  <th className="py-3.5 px-4 text-right">Net Take-Home</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {displayList.map((slip, index) => {
                  const item = getNormalizedDetails(slip);
                  const slipKey = slip._id || slip.id || slip.payslipNumber || index;
                  const isDownloading = downloadingId === (slip._id || slip.id || slip.payslipNumber);

                  return (
                    <tr
                      key={slipKey}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Pay Period */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400 shrink-0" />
                          <span>{item.period}</span>
                        </div>
                      </td>

                      {/* Reference # */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60">
                          {item.refId}
                        </span>
                      </td>

                      {/* Payment Date */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {formatDate(item.dateIssued)}
                      </td>

                      {/* Base Salary */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatGHS(item.baseSalary)}
                      </td>

                      {/* Allowances */}
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {item.allowances > 0 ? `+${formatGHS(item.allowances)}` : "—"}
                      </td>

                      {/* Deductions */}
                      <td className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400">
                        {item.totalDeductions > 0 ? `-${formatGHS(item.totalDeductions)}` : "—"}
                      </td>

                      {/* Net Take-Home */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-slate-900 dark:text-white text-sm bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                          {formatGHS(item.netPay)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedPayslip(slip)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-[#002185] dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 transition cursor-pointer font-semibold text-[11px]"
                            title="View Itemized Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* Download PDF Button */}
                          <button
                            type="button"
                            onClick={() => handleDownload(slip)}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#162033] dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition cursor-pointer font-semibold text-[11px] disabled:opacity-50"
                            title="Download Official PDF"
                          >
                            <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
                            <span>{isDownloading ? "Generating..." : "PDF"}</span>
                          </button>
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

      {/* Detailed Modal Triggered When User Clicks 'View' */}
      {selectedPayslip && (
        <EmployeePayslipsModal
          payslip={selectedPayslip}
          allPayslips={payslips}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
};

export default EmployeePayrollHistory;
