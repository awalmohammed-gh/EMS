import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  BanknoteIcon,
  Clock,
  FileText,
  Eye,
  Download,
  Lock,
  RefreshCw,
  CheckCircle2,
  Filter,
} from "lucide-react";
import EmployeePayslipsModal from "../../components/modal/EmployeePayslipsModal";
import { useManagement } from "../../context/ManagementContextProvider";
import { getEmployeePayslip } from "../../apis/fontApis";
import { downloadPayslipPDF, printPayslipDocument } from "../../utils/payslipPdfGenerator";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const EmployeePayslips = () => {
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [employeePayslips, setEmployeePayslips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const { setShowToast } = useManagement();

  const fetchEmployeePayslips = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await getEmployeePayslip();

      if (data.success) {
        let payslips = [];
        if (Array.isArray(data.payslips)) {
          payslips = data.payslips;
        } else if (data.payslips && typeof data.payslips === "object") {
          payslips = [data.payslips];
        } else {
          payslips = [];
        }
        // Strict client-side filter: Only released / published / paid payslips are accessible
        const releasedPayslips = payslips.filter((p) => {
          const s = (p.status || "").toLowerCase();
          return s === "paid" || s === "published";
        });
        setEmployeePayslips(releasedPayslips);
      } else {
        setIsError(data.message || "Failed to fetch payslips.");
        setShowToast({
          show: true,
          message: data.message || "Failed to fetch payslips.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching payslips:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to fetch payslips.";
      setIsError(errorMessage);
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
    fetchEmployeePayslips();
  }, []);

  const formatCurrency = (amount) => {
    return (
      (Number(amount) || 0).toLocaleString("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "Paid").toLowerCase();
    if (s === "paid" || s === "published") {
      return "bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20";
    }
    return "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]";
  };

  const handleDownloadPDF = (payslip) => {
    try {
      downloadPayslipPDF(payslip);
      setShowToast({
        show: true,
        message: `Official PDF payslip downloaded for ${payslip.payMonth || payslip.month || "pay period"}.`,
        type: "success",
      });
    } catch (err) {
      console.error("Error downloading PDF:", err);
      printPayslipDocument(payslip);
    }
  };

  const handlePrint = (payslip) => {
    printPayslipDocument(payslip);
  };

  // Compute dynamic list of years present in payslips, default to recent years
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    const currentYear = new Date().getFullYear().toString();
    yearsSet.add(currentYear);
    yearsSet.add((Number(currentYear) - 1).toString());

    employeePayslips.forEach((slip) => {
      const monthVal = slip.month || slip.payMonth || "";
      if (monthVal) {
        const yearPart = monthVal.split("-")[0];
        if (yearPart && yearPart.length === 4) {
          yearsSet.add(yearPart);
        }
      }
      if (slip.paymentDate) {
        try {
          const y = new Date(slip.paymentDate).getFullYear().toString();
          yearsSet.add(y);
        } catch {
          // ignore
        }
      }
    });

    return Array.from(yearsSet).sort().reverse();
  }, [employeePayslips]);

  const filteredPayslips = useMemo(() => {
    return employeePayslips.filter((slip) => {
      const monthStr = slip.month || slip.payMonth || "";
      let slipYear = "";
      let slipMonth = "";

      if (monthStr && monthStr.includes("-")) {
        const parts = monthStr.split("-");
        slipYear = parts[0];
        slipMonth = parts[1]?.padStart(2, "0");
      } else if (slip.paymentDate) {
        try {
          const d = new Date(slip.paymentDate);
          slipYear = d.getFullYear().toString();
          slipMonth = String(d.getMonth() + 1).padStart(2, "0");
        } catch {
          // pass
        }
      }

      const matchesYear = selectedYear === "all" || !slipYear || slipYear === selectedYear;
      const matchesMonth = selectedMonth === "all" || !slipMonth || slipMonth === selectedMonth;
      return matchesYear && matchesMonth;
    });
  }, [employeePayslips, selectedYear, selectedMonth]);

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message={isError}
        onRetry={fetchEmployeePayslips}
        onClose={() => setIsError(null)}
      />
    );
  }

  return (
    <>
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E48] dark:text-blue-100">
              My Payslips &amp; History
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Official released payslips and monthly take-home history
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchEmployeePayslips}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#002185] bg-white border border-[#E2E8F0] rounded-xl hover:bg-slate-50 transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
              <span>Refresh</span>
            </button>
            <div className="text-xs text-[#64748B] bg-white px-3.5 py-2 rounded-xl border border-[#E2E8F0] shadow-xs font-semibold">
              {filteredPayslips.length} Released Payslip{filteredPayslips.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Clean, Streamlined Monthly Billing Cycle Filter */}
        <div
          id="payslip-monthly-filter-bar"
          className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Filter className="w-4 h-4 text-[#002185] dark:text-blue-400" />
            <span>Billing Cycle Filter</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Year Selector */}
            <select
              id="payslip-filter-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-[#0B1E48] dark:text-blue-100 rounded-xl px-3.5 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            {/* Month Selector */}
            <select
              id="payslip-filter-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-[#0B1E48] dark:text-blue-100 rounded-xl px-3.5 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>

            {(selectedYear !== "all" || selectedMonth !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear("all");
                  setSelectedMonth("all");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-[#002185] dark:hover:text-blue-400 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Payslip List or Locked State */}
        {filteredPayslips.length > 0 ? (
          <div className="space-y-4">
            {filteredPayslips.map((payslip) => {
              const cardBaseSalary = Number(
                payslip.breakdown?.baseSalary !== undefined
                  ? payslip.breakdown.baseSalary
                  : payslip.baseSalary !== undefined
                  ? payslip.baseSalary
                  : payslip.basicSalary || 0
              );

              const cardAllowances = Number(
                payslip.breakdown?.totalAllowances !== undefined
                  ? payslip.breakdown.totalAllowances
                  : Array.isArray(payslip.earnings)
                  ? payslip.earnings.reduce((s, i) => s + Number(i.amount || 0), 0)
                  : Number(payslip.allowances || 0)
              );

              const cardAbsence = payslip.breakdown?.absenceDeduction || payslip.absenceDeduction || {};
              const cardAbsenceAmount = Number(
                cardAbsence.totalAmount !== undefined
                  ? cardAbsence.totalAmount
                  : Number(payslip.absentDaysDeduction || 0)
              );

              const cardLateness = payslip.breakdown?.latenessDeduction || payslip.latenessDeduction || {};
              const cardLatenessAmount = Number(
                cardLateness.totalAmount !== undefined
                  ? cardLateness.totalAmount
                  : (typeof payslip.latenessDeduction === "number" ? payslip.latenessDeduction : 0)
              );

              const cardCustomDeductions = Number(
                payslip.breakdown?.totalCustomDeductions !== undefined
                  ? payslip.breakdown.totalCustomDeductions
                  : Array.isArray(payslip.deductions)
                  ? payslip.deductions.reduce((s, i) => s + Number(i.amount || 0), 0)
                  : Number(payslip.deductions || 0)
              );

              const cardTotalDeductions = Number(
                payslip.breakdown?.totalDeductions !== undefined
                  ? payslip.breakdown.totalDeductions
                  : (cardCustomDeductions + cardAbsenceAmount + cardLatenessAmount)
              );

              const cardNetSalary = Number(
                payslip.netSalary !== undefined && payslip.netSalary !== null
                  ? payslip.netSalary
                  : payslip.netPay !== undefined && payslip.netPay !== null
                  ? payslip.netPay
                  : payslip.breakdown?.netSalary !== undefined
                  ? payslip.breakdown.netSalary
                  : (cardBaseSalary + cardAllowances - cardTotalDeductions)
              );

              return (
                <div
                  key={payslip.id || payslip._id || payslip.payslipNumber || Math.random()}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xs hover:shadow-md transition-all duration-300"
                >
                  {/* Top Section */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#002185]/10 flex items-center justify-center shrink-0 text-[#002185]">
                        <FileText className="w-5 h-5" />
                      </div>

                      <div>
                        <h3 className="font-bold text-[#002185] text-base">
                          {payslip.month || payslip.payMonth || "Monthly Payslip"}
                        </h3>
                        <p className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-[#002185]" />
                          <span>Disbursement: {formatDate(payslip.paymentDate)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                        {payslip.month || payslip.payMonth || "Pay Period"}
                      </span>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(payslip.status || "Paid")}`}
                      >
                        {payslip.status || "Paid"}
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="mt-5 grid grid-cols-1 gap-3 border-t border-[#E2E8F0] pt-4 sm:grid-cols-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200">
                        <Calendar className="h-4 w-4 text-[#002185]" />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#64748B] font-medium">Payment Date</p>
                        <p className="text-xs font-bold text-[#0F172A]">
                          {formatDate(payslip.paymentDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-200">
                        <BanknoteIcon className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#64748B] font-medium">Net Take-Home Salary</p>
                        <p className="text-sm font-black text-[#002185]">
                          {formatCurrency(cardNetSalary)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200">
                        <Clock className="h-4 w-4 text-[#64748B]" />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#64748B] font-medium">Payslip Number</p>
                        <p className="text-xs font-mono font-bold text-[#0F172A]">
                          {payslip.payslipNumber || payslip.id || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transparent Itemized Salary Breakdown Box */}
                  <div className="mt-4 rounded-xl border border-[#E2E8F0] overflow-hidden">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-3.5 border-b border-[#E2E8F0]">
                      <div>
                        <p className="text-[11px] text-[#64748B]">Base Monthly Salary</p>
                        <p className="text-xs sm:text-sm font-bold text-[#002185]">
                          {formatCurrency(cardBaseSalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#64748B]">Allowances &amp; Additions</p>
                        <p className="text-xs sm:text-sm font-bold text-[#16A34A]">
                          +{formatCurrency(cardAllowances)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#64748B]">Total Deductions</p>
                        <p className="text-xs sm:text-sm font-bold text-[#DC2626]">
                          -{formatCurrency(cardTotalDeductions)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#64748B]">Final Net Pay</p>
                        <p className="text-xs sm:text-sm font-black text-[#002185]">
                          {formatCurrency(cardNetSalary)}
                        </p>
                      </div>
                    </div>

                    {/* Itemized Line Items Breakdown */}
                    <div className="bg-white p-3 text-xs flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-[#64748B]">Itemized Details:</span>

                      {/* Absence Penalty Pill */}
                      {cardAbsenceAmount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[11px] font-semibold">
                          <span>Absenteeism ({cardAbsence.daysCount || payslip.absentDays || 1} unexcused day(s) @ {formatCurrency(cardAbsence.ratePerDay || 10)}):</span>
                          <span className="font-black">-{formatCurrency(cardAbsenceAmount)}</span>
                        </span>
                      ) : null}

                      {/* Lateness Penalty Pill */}
                      {cardLatenessAmount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5] text-[11px] font-semibold">
                          <span>Lateness ({cardLateness.lateDaysCount || 1} day(s), {cardLateness.totalLateMinutes || 0} min(s)):</span>
                          <span className="font-black">-{formatCurrency(cardLatenessAmount)}</span>
                        </span>
                      ) : null}

                      {/* Perfect Attendance Standing */}
                      {cardAbsenceAmount === 0 && cardLatenessAmount === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-[11px] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>100% Attendance (Zero Penalties)</span>
                        </span>
                      ) : null}

                      {/* Dynamic Allowances */}
                      {Array.isArray(payslip.breakdown?.allowances) &&
                        payslip.breakdown.allowances.map((item, idx) => (
                          <span
                            key={`earn-${idx}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-[11px]"
                          >
                            <span>{item.title}</span>
                            <span className="font-bold">+{formatCurrency(item.amount)}</span>
                          </span>
                        ))}

                      {/* Custom Deductions */}
                      {Array.isArray(payslip.breakdown?.customDeductions) &&
                        payslip.breakdown.customDeductions.map((item, idx) => (
                          <span
                            key={`ded-${idx}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[11px]"
                          >
                            <span>{item.title}</span>
                            <span className="font-bold">-{formatCurrency(item.amount)}</span>
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap justify-end gap-2.5 border-t border-[#E2E8F0] pt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedPayslip(payslip)}
                      className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#002185] hover:border-[#002185] transition cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Breakdown</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrint(payslip)}
                      className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#002185] transition cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadPDF(payslip)}
                      className="flex items-center gap-1.5 rounded-xl bg-[#002185] hover:bg-[#ff5500] px-4 py-2 text-xs font-bold text-white transition shadow-xs cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Locked / Unpublished State Banner */
          <div id="locked-payslip-banner" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 sm:p-12 text-center shadow-xs">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                <Lock className="w-8 h-8" />
              </div>
            </div>
            <span className="inline-block px-3.5 py-1 text-xs font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 rounded-full mb-3">
              Official Payslip Pending Release
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              No published payslip for this period. Payslips are released by Management upon payment.
            </h3>
            <p className="text-sm text-slate-700 max-w-lg mx-auto mt-2 leading-relaxed font-medium">
              Your official payslip for this period has not been released yet. Once generated and verified by management upon payment, your complete itemized breakdown and downloadable official PDF will be unlocked here.
            </p>
          </div>
        )}
      </div>

      {/* Payslip Details Modal */}
      {selectedPayslip && (
        <EmployeePayslipsModal
          payslip={selectedPayslip}
          allPayslips={employeePayslips}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </>
  );
};

export default EmployeePayslips;
