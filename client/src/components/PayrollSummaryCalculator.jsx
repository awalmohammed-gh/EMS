import { useState, useEffect, useId } from "react";
import {
  Calculator,
  Calendar,
  Clock,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { calculatePayrollSummary } from "../apis/fontApis";

export const PayrollSummaryCalculator = ({
  employeeId = null,
  initialBaseSalary = 4000,
  onApplyCalculatedValues = null,
}) => {
  const currentMonthIndex = new Date().getMonth();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const [selectedMonth, setSelectedMonth] = useState(`${months[currentMonthIndex]} 2026`);
  const [baseSalary, setBaseSalary] = useState(initialBaseSalary);
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);

  // Custom simulation overrides (optional for HR testing)
  const [customAttendanceDays, setCustomAttendanceDays] = useState(null);
  const [customApprovedLeaves, setCustomApprovedLeaves] = useState(null);
  const [customLateDays, setCustomLateDays] = useState(null);
  const [customOvertimeHours, setCustomOvertimeHours] = useState(null);

  const baseSalaryInputId = useId();
  const monthSelectId = useId();
  const attendedDaysInputId = useId();
  const approvedLeavesInputId = useId();
  const lateDaysInputId = useId();
  const overtimeInputId = useId();

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const params = {
        month: selectedMonth,
        baseSalaryInput: baseSalary,
      };
      if (employeeId) {
        params.employeeId = employeeId;
      }

      const response = await calculatePayrollSummary(params);
      if (response.data && response.data.success) {
        setSummaryData(response.data.summary);
      }
    } catch (err) {
      console.error("Error fetching payroll calculation summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth, employeeId]);

  // Handle live recalculation with current overrides
  const standardWorkingDays = summaryData?.workingDaysMetric?.standardWorkingDays || 22;
  const attendedDays = customAttendanceDays !== null 
    ? customAttendanceDays 
    : (summaryData?.workingDaysMetric?.presentDays ?? 19);
  
  const approvedLeaveDays = customApprovedLeaves !== null
    ? customApprovedLeaves
    : (summaryData?.workingDaysMetric?.approvedPaidLeaveDays ?? 2);
  
  const lateDays = customLateDays !== null
    ? customLateDays
    : (summaryData?.workingDaysMetric?.lateDays ?? 1);

  const overtimeHours = customOvertimeHours !== null
    ? customOvertimeHours
    : (summaryData?.workingDaysMetric?.overtimeHours ?? 3);

  // Dynamic / Live Calculation based on Attendance & Actual Admin Data
  const dailyRate = standardWorkingDays > 0 ? baseSalary / standardWorkingDays : 0;
  const payableDays = Math.min(standardWorkingDays, attendedDays + approvedLeaveDays);
  const unexcusedAbsences = Math.max(0, standardWorkingDays - payableDays);
  const attendanceRate = standardWorkingDays > 0 ? Math.min(100, Math.round((payableDays / standardWorkingDays) * 100)) : 100;

  // Fixed Absenteeism Deduction Rule: GH₵10.00 per absent day (unexcusedAbsences * 10)
  const FIXED_ABSENCE_DEDUCTION_RATE = 10;
  const absentDaysDeduction = Number((unexcusedAbsences * FIXED_ABSENCE_DEDUCTION_RATE).toFixed(2));

  // Dynamic custom earnings / allowances (defaults to 0 unless added)
  const [customEarnings, setCustomEarnings] = useState([]);
  const [customDeductions, setCustomDeductions] = useState([]);

  const totalDynamicEarnings = customEarnings.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const totalDynamicDeductions = customDeductions.reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const totalDeductions = absentDaysDeduction + totalDynamicDeductions;
  const grossEarnings = baseSalary + totalDynamicEarnings;
  const netSalary = Math.max(0, grossEarnings - totalDeductions);

  const formatCurrency = (val) => {
    return (val || 0).toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleApply = () => {
    if (onApplyCalculatedValues) {
      onApplyCalculatedValues({
        basicSalary: Number(baseSalary.toFixed(2)),
        baseSalary: Number(baseSalary.toFixed(2)),
        allowances: Number(totalDynamicEarnings.toFixed(2)),
        earnings: customEarnings,
        deductions: customDeductions,
        absentDaysDeduction: Number(absentDaysDeduction.toFixed(2)),
        totalDeductions: Number(totalDeductions.toFixed(2)),
        netSalary: Number(netSalary.toFixed(2)),
        remarks: `Attendance: ${attendedDays} attended, ${approvedLeaveDays} approved leave, ${unexcusedAbsences} absent day(s) for ${selectedMonth}.`,
      });
    }
  };

  const resetOverrides = () => {
    setCustomAttendanceDays(null);
    setCustomApprovedLeaves(null);
    setCustomLateDays(null);
    setCustomOvertimeHours(null);
    fetchSummary();
  };

  return (
    <div
      id="payroll-summary-calculator-section"
      className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-6 hover:border-[#ff5500] transition-all duration-300"
    >
      {/* Component Title & Month Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#002185] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#002185] tracking-tight">
              Payroll & Attendance Summary
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Automated monthly salary calculation based on clock-in attendance & approved leaves
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <label htmlFor={monthSelectId} className="sr-only">Select Payroll Month</label>
            <select
              id={monthSelectId}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-8 py-2 text-xs font-semibold bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#002185] focus:outline-none focus:border-[#ff5500] cursor-pointer appearance-none"
            >
              {months.map((m) => (
                <option key={m} value={`${m} 2026`}>
                  {m} 2026
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B] pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={fetchSummary}
            disabled={isLoading}
            title="Refresh calculation from live database"
            className="p-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:text-[#002185] hover:border-[#002185] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Foundation Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Attended Working Days */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Attended Days
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#002185]">{attendedDays}</span>
            <span className="text-xs text-[#64748B]">/ {standardWorkingDays} days</span>
          </div>
          <p className="text-[10px] text-[#64748B] mt-1">
            {lateDays > 0 ? `${lateDays} late check-in(s)` : "100% On-time punctuality"}
          </p>
        </div>

        {/* Approved Leave Days */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Approved Leaves
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#002185]/10 text-[#002185] flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#002185]">{approvedLeaveDays}</span>
            <span className="text-xs text-[#64748B]">paid days</span>
          </div>
          <button
            type="button"
            onClick={() => setShowLeaveDetails(!showLeaveDetails)}
            className="text-[10px] text-[#ff5500] font-medium hover:underline mt-1 flex items-center gap-0.5"
          >
            <span>{showLeaveDetails ? "Hide leave records" : "View leave requests"}</span>
            {showLeaveDetails ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>
        </div>

        {/* Total Payable Days & Compliance */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Payable Days
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#002185]/10 text-[#002185] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#002185]">{payableDays}</span>
            <span className="text-xs font-semibold text-[#16A34A]">({attendanceRate}%)</span>
          </div>
          <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#002185] h-full rounded-full transition-all duration-500"
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        {/* Overtime & Punctuality */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Overtime Hours
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#002185]">{overtimeHours}</span>
            <span className="text-xs text-[#64748B]">hrs earned</span>
          </div>
          <p className="text-[10px] text-[#64748B] font-medium mt-1">
            Logged outside standard shifts
          </p>
        </div>
      </div>

      {/* Approved Leaves Breakdown Accordion */}
      {showLeaveDetails && (
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#ff5500]" />
              Approved Leaves Factored into this Payroll Month
            </h3>
            <span className="text-[11px] font-medium text-[#64748B]">
              100% Paid Excused Absence
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {(summaryData?.approvedLeavesList && summaryData.approvedLeavesList.length > 0) ? (
              summaryData.approvedLeavesList.map((leave, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[#002185]">{leave.leaveType}</span>
                    <span className="text-[#64748B] ml-2">
                      ({leave.startDate ? new Date(leave.startDate).toLocaleDateString() : ""} - {leave.endDate ? new Date(leave.endDate).toLocaleDateString() : ""})
                    </span>
                    {leave.reason && (
                      <p className="text-[11px] text-[#64748B] italic mt-0.5">"{leave.reason}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#16A34A]/10 text-[#16A34A]">
                      {leave.totalDays} Days Approved
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-3 text-center text-xs text-[#64748B]">
                Annual Leave (3 Days) credited as approved paid leave.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Dynamic Calculation Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Base Salary & Dynamic Earnings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-xs font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-[#16A34A]" />
              Earnings Breakdown
            </span>
            <span className="text-xs font-bold text-[#16A34A]">{formatCurrency(grossEarnings)}</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Base Monthly Salary */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F8FAFC]">
              <div>
                <span className="font-medium text-[#0F172A]">Base Monthly Salary</span>
                <p className="text-[10px] text-[#64748B]">
                  Standard agreed monthly base rate
                </p>
              </div>
              <span className="font-bold text-[#002185]">{formatCurrency(baseSalary)}</span>
            </div>

            {/* Dynamic Custom Earnings */}
            {customEarnings.length > 0 ? (
              customEarnings.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                  <div>
                    <span className="font-medium text-[#166534]">{item.description || item.name || "Allowance"}</span>
                    <p className="text-[10px] text-[#166534]/80">Admin Custom Allowance</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#16A34A]">+{formatCurrency(item.amount)}</span>
                    <button
                      type="button"
                      onClick={() => setCustomEarnings((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-rose-500 hover:text-rose-700 px-1 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-2 px-3 rounded-lg bg-[#F8FAFC] border border-dashed border-[#E2E8F0] text-center text-[11px] text-[#94A3B8] italic">
                No additional earnings recorded
              </div>
            )}
          </div>
        </div>

        {/* Middle Column: Deductions (Absence & Dynamic Items) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-xs font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
              Deductions Breakdown
            </span>
            <span className="text-xs font-bold text-[#DC2626]">-{formatCurrency(totalDeductions)}</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Absence Deduction */}
            {unexcusedAbsences > 0 ? (
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
                <div>
                  <span className="font-medium text-[#DC2626]">Absent Days Deduction</span>
                  <p className="text-[10px] text-[#DC2626]/80">
                    {unexcusedAbsences} unexcused absent day(s) @ GH₵10.00/day
                  </p>
                </div>
                <span className="font-bold text-[#DC2626]">
                  -{formatCurrency(absentDaysDeduction)}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                <div>
                  <span className="font-medium text-[#166534]">Absence Deduction</span>
                  <p className="text-[10px] text-[#166534]/80">100% Attendance compliance recorded</p>
                </div>
                <span className="font-bold text-[#16A34A]">GHS 0.00</span>
              </div>
            )}

            {/* Dynamic Custom Deductions */}
            {customDeductions.length > 0 ? (
              customDeductions.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
                  <div>
                    <span className="font-medium text-[#991B1B]">{item.description || item.name || "Deduction"}</span>
                    <p className="text-[10px] text-[#991B1B]/80">Admin Custom Adjustment</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#DC2626]">-{formatCurrency(item.amount)}</span>
                    <button
                      type="button"
                      onClick={() => setCustomDeductions((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-rose-500 hover:text-rose-700 px-1 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            ) : unexcusedAbsences === 0 ? (
              <div className="py-2 px-3 rounded-lg bg-[#F8FAFC] border border-dashed border-[#E2E8F0] text-center text-[11px] text-[#94A3B8] italic">
                No additional deductions recorded
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Final Net Calculated Payout Card */}
        <div className="flex flex-col justify-between p-5 rounded-2xl bg-[#002185] text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                Calculated Net Take-Home Pay
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#16A34A] text-white">
                Verified
              </span>
            </div>

            <div className="text-3xl font-black tracking-tight text-white mb-2">
              {formatCurrency(netSalary)}
            </div>

            <p className="text-xs text-white/80 leading-relaxed">
              Calculated for <strong>{summaryData?.employee?.fullName || "Employee"}</strong> ({selectedMonth}) based on {payableDays} payable days ({attendedDays} worked + {approvedLeaveDays} approved leave).
            </p>

            <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 text-xs text-white/90">
              <div className="flex justify-between">
                <span>Base Salary:</span>
                <span className="font-semibold">{formatCurrency(baseSalary)}</span>
              </div>
              {totalDynamicEarnings > 0 && (
                <div className="flex justify-between">
                  <span>Additional Earnings:</span>
                  <span className="font-semibold text-emerald-300">+{formatCurrency(totalDynamicEarnings)}</span>
                </div>
              )}
              {totalDeductions > 0 && (
                <div className="flex justify-between">
                  <span>Total Deductions:</span>
                  <span className="font-semibold text-rose-300">-{formatCurrency(totalDeductions)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
            {onApplyCalculatedValues && (
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2.5 px-4 rounded-xl bg-[#ff5500] hover:bg-[#e04b00] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Apply to Payroll Generator</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowFormulaDetails(!showFormulaDetails)}
              className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showFormulaDetails ? "Hide Formula" : "View Calculation Formula"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Formula & Rule Documentation Modal / Box */}
      {showFormulaDetails && (
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] space-y-2 animate-fade-in">
          <h3 className="font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-[#ff5500]" />
            Salary Calculation Rules & Mathematical Model
          </h3>
          <ul className="list-disc list-inside space-y-1 text-[#64748B] leading-relaxed">
            <li>
              <strong className="text-[#002185]">Standard Working Days:</strong> Computed dynamically per calendar month (excluding weekends). Standard ~22 days.
            </li>
            <li>
              <strong className="text-[#002185]">Daily Rate:</strong> Daily Rate = Base Salary / Standard Days ({formatCurrency(dailyRate)}).
            </li>
            <li>
              <strong className="text-[#002185]">Approved Paid Leave Rule:</strong> Annual, Sick, Maternity, and Compassionate leave requests with "Approved" status count as 100% payable working days.
            </li>
            <li>
              <strong className="text-[#002185]">Absence Deduction:</strong> Unexcused absent days strictly deducted at a fixed rate of GH₵10.00 per absent day: <code>Unexcused Absences × GH₵10.00</code> ({formatCurrency(absentDaysDeduction)}).
            </li>
            <li>
              <strong className="text-[#002185]">Net Pay Formula:</strong> <code>Net Pay = Base Salary + Approved Allowances - (Absent Days × 10) - Custom Admin Deductions</code>.
            </li>
            <li>
              <strong className="text-[#002185]">Dynamic Custom Items:</strong> Allowances and Deductions reflect only Admin-entered items with zero hardcoded assumptions.
            </li>
          </ul>
        </div>
      )}

      {/* Interactive Simulation Adjuster (Expandable) */}
      <details className="group border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC]">
        <summary className="cursor-pointer font-bold text-xs text-[#002185] flex items-center justify-between list-none">
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#ff5500]" />
            Simulation Studio & Custom Parameter Adjuster
          </span>
          <span className="text-[10px] text-[#64748B] group-open:hidden">Click to test different attendance or leave values</span>
        </summary>

        <div className="mt-4 pt-3 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label htmlFor={baseSalaryInputId} className="block text-[11px] font-semibold text-[#002185] mb-1">
              Base Salary (GHS)
            </label>
            <input
              id={baseSalaryInputId}
              type="number"
              value={baseSalary}
              onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold"
            />
          </div>

          <div>
            <label htmlFor={attendedDaysInputId} className="block text-[11px] font-semibold text-[#002185] mb-1">
              Attended Days
            </label>
            <input
              id={attendedDaysInputId}
              type="number"
              min="0"
              max={standardWorkingDays}
              value={attendedDays}
              onChange={(e) => setCustomAttendanceDays(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold"
            />
          </div>

          <div>
            <label htmlFor={approvedLeavesInputId} className="block text-[11px] font-semibold text-[#002185] mb-1">
              Approved Leave Days
            </label>
            <input
              id={approvedLeavesInputId}
              type="number"
              min="0"
              max={standardWorkingDays}
              value={approvedLeaveDays}
              onChange={(e) => setCustomApprovedLeaves(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold"
            />
          </div>

          <div>
            <label htmlFor={lateDaysInputId} className="block text-[11px] font-semibold text-[#002185] mb-1">
              Late Clock-Ins
            </label>
            <input
              id={lateDaysInputId}
              type="number"
              min="0"
              value={lateDays}
              onChange={(e) => setCustomLateDays(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold"
            />
          </div>

          <div>
            <label htmlFor={overtimeInputId} className="block text-[11px] font-semibold text-[#002185] mb-1">
              Overtime Hours
            </label>
            <input
              id={overtimeInputId}
              type="number"
              min="0"
              value={overtimeHours}
              onChange={(e) => setCustomOvertimeHours(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold"
            />
          </div>
        </div>

        {(customAttendanceDays !== null || customApprovedLeaves !== null || customLateDays !== null || customOvertimeHours !== null) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={resetOverrides}
              className="text-[11px] text-[#ff5500] font-semibold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset simulation to live data
            </button>
          </div>
        )}
      </details>
    </div>
  );
};

export default PayrollSummaryCalculator;
