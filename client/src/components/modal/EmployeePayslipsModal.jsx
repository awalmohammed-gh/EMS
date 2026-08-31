import { useState } from "react";
import {
  X,
  Building2,
  Calendar,
  BanknoteIcon,
  Download,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Calculator,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  GitCompare,
} from "lucide-react";
import {
  downloadPayslipPDF,
  printPayslipDocument,
} from "../../utils/payslipPdfGenerator";

const EmployeePayslipsModal = ({ payslip, allPayslips = [], onClose }) => {
  const [showVarianceComparison, setShowVarianceComparison] = useState(false);
  const [selectedPreviousMonthId, setSelectedPreviousMonthId] = useState("");

  if (!payslip) return null;

  const formatCurrency = (amount) => {
    return (
      amount?.toLocaleString("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) || "GH₵0.00"
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20";
      case "Pending":
        return "bg-[#FFFBEB] text-[#F59E0B] border border-[#F59E0B]/20";
      case "Failed":
        return "bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20";
      default:
        return "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]";
    }
  };

  // Helper to parse dates/month strings for sorting
  const parseMonthTimestamp = (slip) => {
    if (!slip) return 0;
    if (slip.paymentDate) {
      const t = new Date(slip.paymentDate).getTime();
      if (!isNaN(t)) return t;
    }
    if (slip.createdAt) {
      const t = new Date(slip.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    const mStr = slip.month || slip.payMonth || "";
    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december",
    ];
    const lower = mStr.toLowerCase();
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) {
        const yearMatch = mStr.match(/\b(20\d\d)\b/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
        return new Date(year, i, 1).getTime();
      }
    }
    return 0;
  };

  // Current Payslip metrics
  const currentPayMonth = payslip.month || payslip.payMonth || "Current Month";
  const currentTimestamp = parseMonthTimestamp(payslip);

  // Extract structured breakdown values for current payslip
  const baseSalary = Number(
    payslip.breakdown?.baseSalary !== undefined
      ? payslip.breakdown.baseSalary
      : payslip.baseSalary !== undefined
      ? payslip.baseSalary
      : payslip.basicSalary || 0
  );

  const allowancesList = Array.isArray(payslip.breakdown?.allowances)
    ? payslip.breakdown.allowances
    : Array.isArray(payslip.earnings)
    ? payslip.earnings
    : [];
  const totalAllowances = allowancesList.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const absenceData = payslip.breakdown?.absenceDeduction ||
    payslip.absenceDeduction || {
      daysCount: 0,
      ratePerDay: 10,
      totalAmount: Number(payslip.absentDaysDeduction || 0),
    };
  const absenceDays = Number(absenceData.daysCount || 0);
  const absenceRate = Number(
    absenceData.ratePerDay !== undefined ? absenceData.ratePerDay : 10
  );
  const absenceTotal = Number(
    absenceData.totalAmount !== undefined
      ? absenceData.totalAmount
      : Number(payslip.absentDaysDeduction || 0)
  );

  const latenessData = payslip.breakdown?.latenessDeduction ||
    payslip.latenessDeduction || {
      totalLateMinutes: 0,
      lateDaysCount: 0,
      tierBreakdown: [],
      totalAmount: Number(
        typeof payslip.latenessDeduction === "number"
          ? payslip.latenessDeduction
          : 0
      ),
    };
  const totalLateMinutes = Number(latenessData.totalLateMinutes || 0);
  const lateDaysCount = Number(latenessData.lateDaysCount || 0);
  const tierBreakdown = Array.isArray(latenessData.tierBreakdown)
    ? latenessData.tierBreakdown
    : [];
  const latenessTotal = Number(
    latenessData.totalAmount !== undefined ? latenessData.totalAmount : 0
  );

  const customDeductionsList = Array.isArray(
    payslip.breakdown?.customDeductions
  )
    ? payslip.breakdown.customDeductions
    : Array.isArray(payslip.deductions)
    ? payslip.deductions
    : typeof payslip.deductions === "number" && payslip.deductions > 0
    ? [{ title: "Standard Deductions", amount: payslip.deductions }]
    : [];
  const totalCustomDeductions = customDeductionsList.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalAttendancePenalties = absenceTotal + latenessTotal;
  const totalAllDeductions = totalAttendancePenalties + totalCustomDeductions;
  const netSalary = Number(
    payslip.netSalary !== undefined && payslip.netSalary !== null
      ? payslip.netSalary
      : payslip.netPay !== undefined && payslip.netPay !== null
      ? payslip.netPay
      : payslip.breakdown?.netSalary !== undefined
      ? payslip.breakdown.netSalary
      : Math.max(0, baseSalary + totalAllowances - totalAllDeductions)
  );

  const penaltyOverride = payslip.penaltyOverride;

  // Resolve candidate previous payslips from allPayslips list
  const currentId = String(payslip._id || payslip.id || payslip.payslipNumber || "");
  const otherPayslips = (allPayslips || []).filter(
    (p) => String(p._id || p.id || p.payslipNumber || "") !== currentId
  );

  // Filter strictly previous payslips (chronologically prior to current payslip)
  const priorPayslips = otherPayslips.filter((p) => {
    const t = parseMonthTimestamp(p);
    return t > 0 && currentTimestamp > 0 ? t < currentTimestamp : true;
  });

  // Sort candidate previous payslips descending (most recent first)
  priorPayslips.sort((a, b) => parseMonthTimestamp(b) - parseMonthTimestamp(a));

  // Determine active previous payslip to compare against
  let previousPayslip = null;
  if (selectedPreviousMonthId) {
    previousPayslip =
      priorPayslips.find(
        (p) =>
          String(p._id || p.id || p.payslipNumber || "") ===
          selectedPreviousMonthId
      ) || null;
  } else if (priorPayslips.length > 0) {
    previousPayslip = priorPayslips[0];
  } else if (otherPayslips.length > 0) {
    previousPayslip = otherPayslips[0];
  }

  // Extract previous payslip metrics (or standard zero-penalty baseline if first period)
  const isBaselineComparison = !previousPayslip;
  const prevPayMonth = previousPayslip
    ? previousPayslip.month || previousPayslip.payMonth || "Previous Month"
    : "Previous Period (Baseline)";

  const prevBaseSalary = Number(
    previousPayslip?.breakdown?.baseSalary !== undefined
      ? previousPayslip.breakdown.baseSalary
      : previousPayslip?.baseSalary !== undefined
      ? previousPayslip.baseSalary
      : previousPayslip?.basicSalary || baseSalary
  );

  const prevAbsenceData = previousPayslip?.breakdown?.absenceDeduction ||
    previousPayslip?.absenceDeduction || {
      daysCount: 0,
      ratePerDay: absenceRate,
      totalAmount: Number(previousPayslip?.absentDaysDeduction || 0),
    };
  const prevAbsenceDays = Number(prevAbsenceData.daysCount || 0);
  const prevAbsenceTotal = Number(
    prevAbsenceData.totalAmount !== undefined
      ? prevAbsenceData.totalAmount
      : Number(previousPayslip?.absentDaysDeduction || 0)
  );

  const prevLatenessData = previousPayslip?.breakdown?.latenessDeduction ||
    previousPayslip?.latenessDeduction || {
      totalLateMinutes: 0,
      lateDaysCount: 0,
      totalAmount: Number(
        typeof previousPayslip?.latenessDeduction === "number"
          ? previousPayslip.latenessDeduction
          : 0
      ),
    };
  const prevLateDaysCount = Number(prevLatenessData.lateDaysCount || 0);
  const prevTotalLateMinutes = Number(prevLatenessData.totalLateMinutes || 0);
  const prevLatenessTotal = Number(
    prevLatenessData.totalAmount !== undefined
      ? prevLatenessData.totalAmount
      : 0
  );

  const prevCustomList = Array.isArray(
    previousPayslip?.breakdown?.customDeductions
  )
    ? previousPayslip.breakdown.customDeductions
    : Array.isArray(previousPayslip?.deductions)
    ? previousPayslip.deductions
    : typeof previousPayslip?.deductions === "number" &&
      previousPayslip.deductions > 0
    ? [{ title: "Standard Deductions", amount: previousPayslip.deductions }]
    : [];
  const prevCustomTotal = prevCustomList.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const prevAttendancePenalties = prevAbsenceTotal + prevLatenessTotal;
  const prevTotalAllDeductions = prevAttendancePenalties + prevCustomTotal;
  const prevNetSalary = Number(
    previousPayslip?.breakdown?.netSalary !== undefined
      ? previousPayslip.breakdown.netSalary
      : previousPayslip?.netSalary !== undefined
      ? previousPayslip.netSalary
      : Math.max(0, prevBaseSalary - prevTotalAllDeductions)
  );

  // Variance Calculations (Current - Previous)
  const diffAbsenceAmount = absenceTotal - prevAbsenceTotal;
  const diffAbsenceDays = absenceDays - prevAbsenceDays;

  const diffLatenessAmount = latenessTotal - prevLatenessTotal;
  const diffLateDays = lateDaysCount - prevLateDaysCount;
  const diffLateMinutes = totalLateMinutes - prevTotalLateMinutes;

  const diffCustomAmount = totalCustomDeductions - prevCustomTotal;

  const diffTotalDeductions = totalAllDeductions - prevTotalAllDeductions;
  const diffNetSalary = netSalary - prevNetSalary;

  // Percentage variance calculation for total deductions
  let deductionPercentChange = 0;
  if (prevTotalAllDeductions > 0) {
    deductionPercentChange = (
      (diffTotalDeductions / prevTotalAllDeductions) *
      100
    ).toFixed(1);
  } else if (diffTotalDeductions > 0) {
    deductionPercentChange = 100;
  }

  // Trend sentiment:
  // In deductions: A decrease (negative diff) is FAVORABLE (Green); An increase is UNFAVORABLE (Red)
  const isDeductionFavorable = diffTotalDeductions < 0;
  const isDeductionUnfavorable = diffTotalDeductions > 0;

  // Download official corporate PDF
  const downloadPayslip = async () => {
    try {
      await downloadPayslipPDF(payslip);
    } catch {
      printPayslipDocument(payslip);
    }
  };

  // Print payslip
  const printPayslip = () => {
    printPayslipDocument(payslip);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-[#FFFFFF] shadow-2xl border-2 border-[#002185] animate-fade-in"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4.5 bg-[#FFFFFF] rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002185]">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#002185]">
                  Employee Payslip & Deduction Breakdown
                </h2>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Pay Period: <span className="font-semibold text-[#0F172A]">{payslip.month || payslip.payMonth}</span> • Ref: {payslip.payslipNumber || payslip.id || "N/A"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#ff5500]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Employee & Payment Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee Information */}
            <div className="rounded-xl bg-[#F8FAFC] p-4 border border-[#E2E8F0]">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#002185] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Employee Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#64748B] block text-[11px]">Employee Name</span>
                  <span className="font-semibold text-[#0F172A]">{payslip.employeeName || payslip.employee?.fullName || "Staff Member"}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Employee ID</span>
                  <span className="font-mono font-semibold text-[#002185]">{payslip.employeeId || payslip.employee?.employeeId || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Department</span>
                  <span className="font-medium text-[#334155]">{payslip.department || payslip.employee?.department || "Operations"}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Position</span>
                  <span className="font-medium text-[#334155]">{payslip.position || payslip.employee?.position || "Staff"}</span>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="rounded-xl bg-[#F8FAFC] p-4 border border-[#E2E8F0]">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#002185] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Disbursement Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#64748B] block text-[11px]">Payment Date</span>
                  <span className="font-semibold text-[#0F172A]">{formatDate(payslip.paymentDate)}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Payment Method</span>
                  <span className="font-medium text-[#334155]">{payslip.paymentMethod || "Bank Transfer"}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Status</span>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusColor(payslip.status || "Paid")}`}>
                    {payslip.status || "Paid"}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Net Disbursed</span>
                  <span className="font-bold text-[#002185] text-sm">{formatCurrency(netSalary)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Waiver Alert (if penalty override is active) */}
          {penaltyOverride?.isWaived && (
            <div className="rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1E40AF]">Attendance Penalty Waiver Approved</span>
                  <span className="bg-[#DBEAFE] text-[#1E40AF] px-2 py-0.5 rounded font-semibold text-[10px]">
                    Total Waived: {formatCurrency(penaltyOverride.totalWaived)}
                  </span>
                </div>
                <p className="text-[#1E3A8A] mt-1">
                  <span className="font-semibold">Reason:</span> {penaltyOverride.reason || "Administrative waiver approved."}
                </p>
                <p className="text-[#60A5FA] text-[10px] mt-0.5">
                  Authorized by {penaltyOverride.waivedBy || "Administrator"} on {formatDate(penaltyOverride.waivedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Transparent Itemized Breakdown Section */}
          <div className="space-y-5">
            {/* Breakdown Header & MoM Deduction Variance Toggle Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#002185] flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#ff5500]" />
                  Itemized Salary & Deductions Breakdown
                </h3>
                <span className="text-xs text-[#64748B]">Currency: Ghana Cedis (GH₵) • Official Payroll Record</span>
              </div>

              {/* MoM Deduction Comparison Toggle Switch */}
              <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 rounded-xl shadow-xs">
                <div className="flex flex-col text-left sm:text-right">
                  <span className="text-xs font-bold text-[#002185] flex items-center gap-1.5">
                    <GitCompare className="w-3.5 h-3.5 text-[#ff5500]" />
                    Compare with Previous Month
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    {showVarianceComparison ? `Comparing vs ${prevPayMonth}` : "Highlight deduction variance"}
                  </span>
                </div>

                {/* Accessible Toggle Button */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={showVarianceComparison}
                  onClick={() => setShowVarianceComparison(!showVarianceComparison)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    showVarianceComparison ? "bg-[#002185]" : "bg-[#CBD5E1]"
                  }`}
                  title="Toggle Previous Month Deduction Comparison"
                >
                  <span className="sr-only">Toggle Previous Month Deduction Comparison</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      showVarianceComparison ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* DIRECT MONTH-OVER-MONTH DEDUCTION VARIANCE COMPARISON CARD */}
            {showVarianceComparison && (
              <div className="rounded-xl border-2 border-[#002185]/30 bg-[#F8FAFC] p-4.5 space-y-4 animate-fade-in shadow-sm">
                {/* Variance Header & Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#002185] text-white flex items-center justify-center shadow-xs">
                      <GitCompare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#002185]">
                          Month-over-Month Deduction Variance
                        </h4>
                        <span className="text-[10px] font-semibold bg-[#E0E7FF] text-[#3730A3] px-2 py-0.5 rounded-full">
                          {currentPayMonth} vs {prevPayMonth}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B]">
                        Direct comparative variance across absenteeism penalties, lateness fines, and net take-home pay.
                      </p>
                    </div>
                  </div>

                  {/* Multiple Historical Months Selector (if more than 1 prior record available) */}
                  {priorPayslips.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#64748B] whitespace-nowrap">Compare with:</span>
                      <select
                        value={selectedPreviousMonthId || String(previousPayslip?._id || previousPayslip?.id || previousPayslip?.payslipNumber || "")}
                        onChange={(e) => setSelectedPreviousMonthId(e.target.value)}
                        className="text-xs bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-[#0F172A] font-medium focus:ring-1 focus:ring-[#002185] cursor-pointer"
                      >
                        {priorPayslips.map((p, idx) => (
                          <option
                            key={`prior-${idx}`}
                            value={String(p._id || p.id || p.payslipNumber || "")}
                          >
                            {p.month || p.payMonth || `Payslip #${idx + 1}`} ({formatCurrency(p.netSalary || p.netPay || 0)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isBaselineComparison && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-2.5 py-1 rounded-md font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                      First Pay Period: Comparing against zero-penalty baseline
                    </span>
                  )}
                </div>

                {/* 3 High-Impact KPI Variance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Total Deductions Variance Card */}
                  <div className={`p-3.5 rounded-xl border ${
                    isDeductionFavorable
                      ? "bg-[#F0FDF4] border-[#BBF7D0]"
                      : isDeductionUnfavorable
                      ? "bg-[#FEF2F2] border-[#FECACA]"
                      : "bg-white border-[#E2E8F0]"
                  }`}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#64748B]">Total Deductions Shift</span>
                      {isDeductionFavorable ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7] px-1.5 py-0.5 rounded">
                          <TrendingDown className="w-3.5 h-3.5" /> Favorable (-{Math.abs(deductionPercentChange)}%)
                        </span>
                      ) : isDeductionUnfavorable ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.5 rounded">
                          <TrendingUp className="w-3.5 h-3.5" /> Higher (+{Math.abs(deductionPercentChange)}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                          <Minus className="w-3.5 h-3.5" /> No Change
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-bold text-[#0F172A] tabular-nums">
                        {formatCurrency(totalAllDeductions)}
                      </span>
                      <span className={`text-xs font-bold tabular-nums ${
                        isDeductionFavorable
                          ? "text-[#16A34A]"
                          : isDeductionUnfavorable
                          ? "text-[#DC2626]"
                          : "text-[#64748B]"
                      }`}>
                        {diffTotalDeductions > 0 ? `+${formatCurrency(diffTotalDeductions)}` : diffTotalDeductions < 0 ? `-${formatCurrency(Math.abs(diffTotalDeductions))}` : "GH₵0.00"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1">
                      Prev: {formatCurrency(prevTotalAllDeductions)} in {prevPayMonth}
                    </p>
                  </div>

                  {/* Attendance Penalties (Absenteeism & Lateness) */}
                  <div className="p-3.5 rounded-xl border bg-white border-[#E2E8F0]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#64748B]">Attendance Penalties</span>
                      <span className="text-[11px] font-bold text-[#002185] bg-[#EEF2FF] px-1.5 py-0.5 rounded">
                        Absence & Lateness
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-bold text-[#0F172A] tabular-nums">
                        {formatCurrency(totalAttendancePenalties)}
                      </span>
                      <span className={`text-xs font-bold tabular-nums ${
                        absenceTotal + latenessTotal < prevAttendancePenalties
                          ? "text-[#16A34A]"
                          : absenceTotal + latenessTotal > prevAttendancePenalties
                          ? "text-[#DC2626]"
                          : "text-[#64748B]"
                      }`}>
                        {totalAttendancePenalties - prevAttendancePenalties > 0
                          ? `+${formatCurrency(totalAttendancePenalties - prevAttendancePenalties)}`
                          : totalAttendancePenalties - prevAttendancePenalties < 0
                          ? `-${formatCurrency(Math.abs(totalAttendancePenalties - prevAttendancePenalties))}`
                          : "GH₵0.00"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1">
                      {diffAbsenceDays > 0 ? `+${diffAbsenceDays} absent days` : diffAbsenceDays < 0 ? `${diffAbsenceDays} absent days` : "Same absence days"} • {diffLateDays > 0 ? `+${diffLateDays} late days (${diffLateMinutes > 0 ? `+${diffLateMinutes}m` : `${diffLateMinutes}m`})` : diffLateDays < 0 ? `${diffLateDays} late days (${diffLateMinutes}m)` : diffLateMinutes !== 0 ? `${diffLateMinutes > 0 ? `+${diffLateMinutes}m` : `${diffLateMinutes}m`}` : "Same punctuality"}
                    </p>
                  </div>

                  {/* Net Take-Home Pay Variance */}
                  <div className={`p-3.5 rounded-xl border ${
                    diffNetSalary > 0
                      ? "bg-[#F0FDF4] border-[#BBF7D0]"
                      : diffNetSalary < 0
                      ? "bg-[#FFFBEB] border-[#FDE68A]"
                      : "bg-white border-[#E2E8F0]"
                  }`}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#64748B]">Net Pay Take-Home</span>
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        diffNetSalary > 0
                          ? "text-[#16A34A] bg-[#DCFCE7]"
                          : diffNetSalary < 0
                          ? "text-[#D97706] bg-[#FEF3C7]"
                          : "text-[#64748B] bg-[#F1F5F9]"
                      }`}>
                        {diffNetSalary > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : diffNetSalary < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        {diffNetSalary > 0 ? "Take-Home Boost" : diffNetSalary < 0 ? "Reduced Take-Home" : "Identical"}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-bold text-[#002185] tabular-nums">
                        {formatCurrency(netSalary)}
                      </span>
                      <span className={`text-xs font-bold tabular-nums ${
                        diffNetSalary > 0 ? "text-[#16A34A]" : diffNetSalary < 0 ? "text-[#DC2626]" : "text-[#64748B]"
                      }`}>
                        {diffNetSalary > 0 ? `+${formatCurrency(diffNetSalary)}` : diffNetSalary < 0 ? `-${formatCurrency(Math.abs(diffNetSalary))}` : "GH₵0.00"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1">
                      Prev: {formatCurrency(prevNetSalary)} in {prevPayMonth}
                    </p>
                  </div>
                </div>

                {/* Granular Line-by-Line Comparative Table */}
                <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
                  <div className="bg-[#002185] text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider uppercase">
                      Line-by-Line Deduction & Pay Comparison
                    </span>
                    <span className="text-[11px] text-[#BFDBFE]">
                      Variance = Current ({currentPayMonth}) - Previous ({prevPayMonth})
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] text-[#64748B] font-semibold">
                          <th className="py-2.5 px-3.5">Deduction / Pay Category</th>
                          <th className="py-2.5 px-3 text-right">Previous ({prevPayMonth})</th>
                          <th className="py-2.5 px-3 text-right">Current ({currentPayMonth})</th>
                          <th className="py-2.5 px-3 text-right">Variance Amount</th>
                          <th className="py-2.5 px-3.5 text-center">Variance Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {/* Row: Absenteeism Penalty */}
                        <tr className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-2.5 px-3.5">
                            <div className="font-semibold text-[#0F172A]">Absenteeism Deduction</div>
                            <div className="text-[10px] text-[#64748B]">
                              Current: {absenceDays}d @ {formatCurrency(absenceRate)} • Prev: {prevAbsenceDays}d
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#64748B] font-mono tabular-nums">
                            {formatCurrency(prevAbsenceTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#DC2626] font-mono font-semibold tabular-nums">
                            {formatCurrency(absenceTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                            <span className={diffAbsenceAmount < 0 ? "text-[#16A34A]" : diffAbsenceAmount > 0 ? "text-[#DC2626]" : "text-[#64748B]"}>
                              {diffAbsenceAmount > 0 ? `+${formatCurrency(diffAbsenceAmount)}` : diffAbsenceAmount < 0 ? `-${formatCurrency(Math.abs(diffAbsenceAmount))}` : "GH₵0.00"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            {diffAbsenceAmount < 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                                <TrendingDown className="w-3 h-3" /> Improved ({Math.abs(diffAbsenceDays)} fewer days)
                              </span>
                            ) : diffAbsenceAmount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
                                <TrendingUp className="w-3 h-3" /> +{diffAbsenceDays} extra absent day{diffAbsenceDays !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                                <Minus className="w-3 h-3" /> Unchanged
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Row: Lateness Penalties */}
                        <tr className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-2.5 px-3.5">
                            <div className="font-semibold text-[#0F172A]">Lateness Penalties</div>
                            <div className="text-[10px] text-[#64748B]">
                              Current: {lateDaysCount} late days ({totalLateMinutes}m) • Prev: {prevLateDaysCount} days ({prevTotalLateMinutes}m)
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#64748B] font-mono tabular-nums">
                            {formatCurrency(prevLatenessTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#DC2626] font-mono font-semibold tabular-nums">
                            {formatCurrency(latenessTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                            <span className={diffLatenessAmount < 0 ? "text-[#16A34A]" : diffLatenessAmount > 0 ? "text-[#DC2626]" : "text-[#64748B]"}>
                              {diffLatenessAmount > 0 ? `+${formatCurrency(diffLatenessAmount)}` : diffLatenessAmount < 0 ? `-${formatCurrency(Math.abs(diffLatenessAmount))}` : "GH₵0.00"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            {diffLatenessAmount < 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                                <TrendingDown className="w-3 h-3" /> Better Punctuality ({Math.abs(diffLateMinutes)}m less)
                              </span>
                            ) : diffLatenessAmount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
                                <TrendingUp className="w-3 h-3" /> +{diffLateMinutes}m more late
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                                <Minus className="w-3 h-3" /> Unchanged
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Row: Custom Admin Adjustments */}
                        {(totalCustomDeductions > 0 || prevCustomTotal > 0) && (
                          <tr className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-2.5 px-3.5">
                              <div className="font-semibold text-[#0F172A]">Custom Administrative Deductions</div>
                              <div className="text-[10px] text-[#64748B]">Other administrative adjustments & payroll items</div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#64748B] font-mono tabular-nums">
                              {formatCurrency(prevCustomTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#DC2626] font-mono font-semibold tabular-nums">
                              {formatCurrency(totalCustomDeductions)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                              <span className={diffCustomAmount < 0 ? "text-[#16A34A]" : diffCustomAmount > 0 ? "text-[#DC2626]" : "text-[#64748B]"}>
                                {diffCustomAmount > 0 ? `+${formatCurrency(diffCustomAmount)}` : diffCustomAmount < 0 ? `-${formatCurrency(Math.abs(diffCustomAmount))}` : "GH₵0.00"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className="text-[10px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
                                {diffCustomAmount === 0 ? "Unchanged" : `${diffCustomAmount > 0 ? "+" : ""}${formatCurrency(diffCustomAmount)}`}
                              </span>
                            </td>
                          </tr>
                        )}

                        {/* Summary Row: Total Deductions */}
                        <tr className="bg-[#F8FAFC] font-bold border-t-2 border-[#E2E8F0]">
                          <td className="py-3 px-3.5 text-[#0F172A] text-xs">
                            TOTAL MONTHLY DEDUCTIONS
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#64748B] tabular-nums">
                            {formatCurrency(prevTotalAllDeductions)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#DC2626] tabular-nums">
                            {formatCurrency(totalAllDeductions)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            <span className={isDeductionFavorable ? "text-[#16A34A]" : isDeductionUnfavorable ? "text-[#DC2626]" : "text-[#64748B]"}>
                              {diffTotalDeductions > 0 ? `+${formatCurrency(diffTotalDeductions)}` : diffTotalDeductions < 0 ? `-${formatCurrency(Math.abs(diffTotalDeductions))}` : "GH₵0.00"}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {isDeductionFavorable ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7] border border-[#BBF7D0] px-2.5 py-0.5 rounded-md">
                                <TrendingDown className="w-3.5 h-3.5" /> -{Math.abs(deductionPercentChange)}% Deductions
                              </span>
                            ) : isDeductionUnfavorable ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#DC2626] bg-[#FEE2E2] border border-[#FECACA] px-2.5 py-0.5 rounded-md">
                                <TrendingUp className="w-3.5 h-3.5" /> +{Math.abs(deductionPercentChange)}% Deductions
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2.5 py-0.5 rounded-md">
                                Neutral (0.0%)
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Summary Row: Net Take-Home Salary */}
                        <tr className="bg-[#EFF6FF] font-bold border-t border-[#BFDBFE]">
                          <td className="py-3 px-3.5 text-[#002185] text-xs">
                            FINAL NET TAKE-HOME PAY
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#475569] tabular-nums">
                            {formatCurrency(prevNetSalary)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#002185] text-sm tabular-nums">
                            {formatCurrency(netSalary)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            <span className={diffNetSalary > 0 ? "text-[#16A34A]" : diffNetSalary < 0 ? "text-[#DC2626]" : "text-[#64748B]"}>
                              {diffNetSalary > 0 ? `+${formatCurrency(diffNetSalary)}` : diffNetSalary < 0 ? `-${formatCurrency(Math.abs(diffNetSalary))}` : "GH₵0.00"}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                              diffNetSalary > 0
                                ? "text-[#16A34A] bg-[#DCFCE7] border border-[#BBF7D0]"
                                : diffNetSalary < 0
                                ? "text-[#D97706] bg-[#FEF3C7] border border-[#FDE68A]"
                                : "text-[#64748B] bg-[#F1F5F9]"
                            }`}>
                              {diffNetSalary > 0 ? `+${formatCurrency(diffNetSalary)} Gain` : diffNetSalary < 0 ? `-${formatCurrency(Math.abs(diffNetSalary))} Reduction` : "Exact Match"}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Plain-Language Takeaway Insight */}
                <div className="rounded-lg bg-white border border-[#E2E8F0] p-3 text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#ff5500] shrink-0 mt-0.5" />
                  <p className="text-[#334155]">
                    {isDeductionFavorable ? (
                      <span>
                        <strong className="text-[#16A34A]">Favorable Attendance Trend:</strong> Your total deductions decreased by{" "}
                        <strong>{formatCurrency(Math.abs(diffTotalDeductions))} ({Math.abs(deductionPercentChange)}%)</strong> compared to {prevPayMonth}. This attendance improvement contributed directly to an increased net take-home salary of {formatCurrency(netSalary)}.
                      </span>
                    ) : isDeductionUnfavorable ? (
                      <span>
                        <strong className="text-[#DC2626]">Deduction Increase Notice:</strong> Total deductions increased by{" "}
                        <strong>{formatCurrency(diffTotalDeductions)} (+{Math.abs(deductionPercentChange)}%)</strong> compared to {prevPayMonth} due to{" "}
                        {diffAbsenceAmount > 0 && diffLatenessAmount > 0
                          ? `${diffAbsenceDays} additional absent day(s) and ${diffLateMinutes} additional late minute(s)`
                          : diffAbsenceAmount > 0
                          ? `${diffAbsenceDays} additional unexcused absent day(s)`
                          : `${diffLateMinutes} additional minutes late`}
                        .
                      </span>
                    ) : (
                      <span>
                        <strong className="text-[#002185]">Consistent Attendance Record:</strong> Your deductions remained completely identical to {prevPayMonth} at {formatCurrency(totalAllDeductions)}.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* 1. Base Salary */}
            <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-[#002185]/10 flex items-center justify-center text-[#002185]">
                    <BanknoteIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#0F172A]">Employee Base Salary</span>
                    <p className="text-[11px] text-[#64748B]">Agreed contractual monthly base salary from database</p>
                  </div>
                </div>
                <span className="text-base font-bold text-[#002185] tabular-nums">
                  {formatCurrency(baseSalary)}
                </span>
              </div>
            </div>

            {/* 2. Dynamic Allowances & Additional Earnings */}
            <div className="rounded-xl border border-[#BBF7D0] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#F0FDF4] border-b border-[#BBF7D0]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#166534]">
                    Allowances & Dynamic Earnings
                  </span>
                  <span className="text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D] px-2 py-0.5 rounded-full">
                    {allowancesList.length} item{allowancesList.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-sm font-bold text-[#166534] tabular-nums">
                  +{formatCurrency(totalAllowances)}
                </span>
              </div>

              <div className="divide-y divide-[#F0FDF4] bg-white">
                {allowancesList.length > 0 ? (
                  allowancesList.map((item, idx) => (
                    <div
                      key={`allowance-${idx}`}
                      className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span className="font-medium text-[#334155]">
                          {item.title || item.description || item.name || `Allowance #${idx + 1}`}
                        </span>
                      </div>
                      <span className="font-semibold text-[#16A34A] tabular-nums">
                        +{formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-[#94A3B8] italic">
                    No custom allowances recorded for this pay period.
                  </div>
                )}
              </div>
            </div>

            {/* 3. Attendance Penalty Breakdown: Absenteeism & Lateness */}
            <div className="rounded-xl border border-[#FECACA] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#FEF2F2] border-b border-[#FECACA]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">
                    Attendance Deductions (Absenteeism & Lateness)
                  </span>
                </div>
                <span className="text-sm font-bold text-[#DC2626] tabular-nums">
                  -{formatCurrency(totalAttendancePenalties)}
                </span>
              </div>

              <div className="p-4 space-y-4 bg-white">
                {/* Absenteeism Breakdown */}
                <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#0F172A]">
                          Absenteeism Penalty
                        </span>
                        <span className="text-[10px] bg-[#FEF2F2] text-[#DC2626] font-semibold px-2 py-0.5 rounded">
                          {absenceDays} unexcused absent day{absenceDays !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-1">
                        Calculation Rule: <span className="font-mono">{absenceDays} days × {formatCurrency(absenceRate)}/day</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#64748B] block">Absenteeism Deduction</span>
                      <span className="font-bold text-[#DC2626] text-sm tabular-nums">
                        {absenceTotal > 0 ? `-${formatCurrency(absenceTotal)}` : "GH₵0.00"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lateness Penalties Breakdown */}
                <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                        <span className="font-semibold text-xs text-[#0F172A]">
                          Lateness Penalties Breakdown
                        </span>
                        <span className="text-[10px] bg-[#FFFBEB] text-[#D97706] font-semibold px-2 py-0.5 rounded">
                          {lateDaysCount} late day{lateDaysCount !== 1 ? "s" : ""} • {totalLateMinutes} total mins late
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5">
                        Tiered fine matrix applied against official clock-in timestamps
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#64748B] block">Total Lateness Deductions</span>
                      <span className="font-bold text-[#DC2626] text-sm tabular-nums">
                        {latenessTotal > 0 ? `-${formatCurrency(latenessTotal)}` : "GH₵0.00"}
                      </span>
                    </div>
                  </div>

                  {/* Itemized Table of Lateness Logs */}
                  {tierBreakdown.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#E2E8F0] text-[11px] text-[#64748B] font-semibold">
                            <th className="py-1.5 pr-3">Date</th>
                            <th className="py-1.5 px-3">Clock-In</th>
                            <th className="py-1.5 px-3">Minutes Late</th>
                            <th className="py-1.5 px-3">Tier Category</th>
                            <th className="py-1.5 pl-3 text-right">Fine</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {tierBreakdown.map((tierItem, tIdx) => (
                            <tr key={`tier-${tIdx}`} className="text-[#334155] hover:bg-[#F1F5F9]/50">
                              <td className="py-2 pr-3 font-medium">{tierItem.date || "N/A"}</td>
                              <td className="py-2 px-3 font-mono">{tierItem.clockIn || "Late"}</td>
                              <td className="py-2 px-3">
                                <span className="inline-flex items-center gap-1 font-semibold text-[#D97706]">
                                  {tierItem.minutesLate || 0} mins
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded text-[10px] font-semibold">
                                  {tierItem.tier || "Standard Tier"}
                                </span>
                              </td>
                              <td className="py-2 pl-3 text-right font-bold text-[#DC2626] tabular-nums">
                                -{formatCurrency(tierItem.penalty || tierItem.total || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : lateDaysCount === 0 && absenceDays === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-[#166534] bg-[#F0FDF4] p-2.5 rounded border border-[#BBF7D0]">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                      <span>Perfect Attendance & Punctuality: Zero penalties incurred during this billing cycle.</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 4. Custom Admin Deductions */}
            {customDeductionsList.length > 0 && (
              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#334155]">
                    Custom Administrative Adjustments & Deductions
                  </span>
                  <span className="text-sm font-bold text-[#DC2626] tabular-nums">
                    -{formatCurrency(totalCustomDeductions)}
                  </span>
                </div>
                <div className="divide-y divide-[#E2E8F0] bg-white">
                  {customDeductionsList.map((item, idx) => (
                    <div
                      key={`custom-ded-${idx}`}
                      className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-[#F8FAFC]"
                    >
                      <span className="font-medium text-[#334155]">
                        {item.title || item.description || item.name || `Adjustment #${idx + 1}`}
                      </span>
                      <span className="font-semibold text-[#DC2626] tabular-nums">
                        -{formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Net Salary Calculation Flow */}
            <div className="rounded-xl bg-[#002185] text-white p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#93C5FD] block">
                    Net Take-Home Salary
                  </span>
                  <div className="text-xs text-[#BFDBFE] mt-1 space-y-0.5">
                    <div>
                      <span className="font-mono">
                        Base ({formatCurrency(baseSalary)}) + Allowances ({formatCurrency(totalAllowances)}) - Absence ({formatCurrency(absenceTotal)}) - Lateness ({formatCurrency(latenessTotal)}) - Custom ({formatCurrency(totalCustomDeductions)})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-3xl font-extrabold tracking-tight tabular-nums block">
                    {formatCurrency(netSalary)}
                  </span>
                  <span className="text-[11px] text-[#93C5FD]">Total Verified Net Payable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-[#E2E8F0] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E2E8F0] px-5 py-2.5 text-xs font-semibold text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#002185]"
            >
              Close
            </button>

            <button
              type="button"
              onClick={printPayslip}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#002185] text-[#002185] px-5 py-2.5 text-xs font-semibold hover:bg-[#002185] hover:text-white transition-all shadow-xs"
            >
              <FileText className="h-4 w-4" />
              Print Payslip
            </button>

            <button
              type="button"
              onClick={downloadPayslip}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#002185] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff5500] shadow-sm hover:shadow-lg"
            >
              <Download className="h-4 w-4" />
              Download Official PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePayslipsModal;
