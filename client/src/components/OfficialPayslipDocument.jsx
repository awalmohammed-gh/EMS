import { useState } from "react";
import {
  Download,
  Printer,
  ArrowLeft,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import logo from "../assets/eyenit_logo.png";
import {
  formatCurrency,
  normalizePayslipData,
  downloadPayslipPDF,
  printPayslipDocument,
} from "../utils/payslipPdfGenerator";

/**
 * OfficialPayslipDocument Component
 *
 * Clean corporate document layout matching all styling specifications:
 * 1. Header with Company Logo, bold title "PAYSLIP" in deep navy (#1e3a8a), dynamic ID, Date Generated, and 3px deep navy rule.
 * 2. Two-column metadata grid (EMPLOYEE INFORMATION & PAYMENT INFORMATION with "Paid" in bold green #16a34a).
 * 3. Salary breakdown table with #bfdbfe border, green allowances subheader, red deductions & absenteeism penalty subheader, and highlighted slate net salary summary footer.
 * 4. PDF download and print handlers.
 */
export const OfficialPayslipDocument = ({
  payslip,
  onBack,
  showControls = true,
  title = "Official Employee Payslip",
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const data = normalizePayslipData(payslip);

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      await downloadPayslipPDF(payslip);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    printPayslipDocument(payslip);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Controls Bar */}
      {showControls && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#1e3a8a] dark:text-blue-400" />
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {data.employeeName} • {data.payPeriod}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#172554] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-75"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Generating PDF..." : "Download Official PDF"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Official Corporate Document Card */}
      <div
        id="corporate-payslip-canvas"
        className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-12 print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* 1. Document Header & Branding */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-2xs">
              <img
                src={logo}
                alt="Company Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#1e3a8a] tracking-tight leading-none">
                PAYSLIP
              </h1>
              <p className="text-sm font-bold text-slate-500 font-mono mt-1">
                {data.payslipId}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Date Generated
            </span>
            <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
              {data.dateGenerated}
            </span>
          </div>
        </div>

        {/* Solid deep-navy horizontal line (#1e3a8a, height: 3px) */}
        <div className="w-full h-[3px] bg-[#1e3a8a] mb-8"></div>

        {/* 2. Metadata Grid (Two-Column Layouts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* EMPLOYEE INFORMATION */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h2 className="text-xs font-black text-[#1e3a8a] uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
              EMPLOYEE INFORMATION
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Name
                </span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {data.employeeName}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Employee ID
                </span>
                <span className="font-bold text-slate-900 text-sm font-mono block mt-0.5">
                  {data.employeeId}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Department
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {data.department}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Position
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {data.position}
                </span>
              </div>
            </div>
          </div>

          {/* PAYMENT INFORMATION */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h2 className="text-xs font-black text-[#1e3a8a] uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
              PAYMENT INFORMATION
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Pay Period
                </span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {data.payPeriod}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Payment Date
                </span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {data.paymentDate}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Status
                </span>
                <span className="text-base font-black text-[#16a34a] inline-flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                  {data.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Salary Breakdown Table */}
        <div className="mb-8 border border-[#bfdbfe] rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#f0f7ff] border-b border-[#bfdbfe]">
                <th className="px-5 py-3.5 text-xs font-black text-[#1e3a8a] uppercase tracking-wider">
                  ITEM DESCRIPTION
                </th>
                <th className="px-5 py-3.5 text-xs font-black text-[#1e3a8a] uppercase tracking-wider text-right">
                  AMOUNT (GHS)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bfdbfe]">
              {/* Basic Salary */}
              <tr className="bg-white">
                <td className="px-5 py-3.5 font-bold text-slate-900">
                  Basic Salary
                </td>
                <td className="px-5 py-3.5 text-right font-black text-[#1e3a8a] text-base">
                  {formatCurrency(data.basicSalary)}
                </td>
              </tr>

              {/* ADDITIONAL EARNINGS & ALLOWANCES Subheader */}
              <tr className="bg-[#ecfdf5]">
                <td
                  colSpan={2}
                  className="px-5 py-2.5 text-xs font-black text-[#059669] uppercase tracking-wider"
                >
                  ADDITIONAL EARNINGS & ALLOWANCES
                </td>
              </tr>
              {data.dynamicAllowances.length > 0 ? (
                data.dynamicAllowances.map((item, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-5 py-3 text-slate-800 text-sm pl-8">
                      {item.description}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[#059669] text-sm">
                      +{formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="bg-white">
                  <td
                    colSpan={2}
                    className="px-5 py-3 text-slate-400 italic text-xs pl-8"
                  >
                    No additional earnings recorded
                  </td>
                </tr>
              )}

              {/* DEDUCTIONS & ADJUSTMENTS Subheader */}
              <tr className="bg-[#fef2f2]">
                <td
                  colSpan={2}
                  className="px-5 py-2.5 text-xs font-black text-[#dc2626] uppercase tracking-wider"
                >
                  DEDUCTIONS & ADJUSTMENTS
                </td>
              </tr>
              {data.absentDaysDeduction > 0 && (
                <tr className="bg-white">
                  <td className="px-5 py-3 text-slate-800 text-sm pl-8">
                    <span className="font-semibold block">Absenteeism Penalty</span>
                    <span className="text-xs text-slate-500 block">
                      {data.absentDays} unexcused absent day{data.absentDays !== 1 ? "s" : ""} @ {formatCurrency(data.absentRate)}/day
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-[#dc2626] text-sm">
                    -{formatCurrency(data.absentDaysDeduction)}
                  </td>
                </tr>
              )}
              {data.latenessDeduction > 0 && (
                <tr className="bg-white">
                  <td className="px-5 py-3 text-slate-800 text-sm pl-8">
                    <span className="font-semibold block">Lateness Penalties</span>
                    <span className="text-xs text-slate-500 block">
                      {data.lateDaysCount} late check-in{data.lateDaysCount !== 1 ? "s" : ""} • {data.totalLateMinutes} total late mins (Tiered matrix)
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-[#dc2626] text-sm">
                    -{formatCurrency(data.latenessDeduction)}
                  </td>
                </tr>
              )}
              {data.tierBreakdown && data.tierBreakdown.length > 0 &&
                data.tierBreakdown.map((tierItem, tIdx) => (
                  <tr key={`doc-tier-${tIdx}`} className="bg-slate-50/60">
                    <td className="px-5 py-2 text-slate-600 text-xs pl-12">
                      • {tierItem.date || "Date"}: {tierItem.minutesLate || 0} mins late ({tierItem.tier || "Tier fine"})
                    </td>
                    <td className="px-5 py-2 text-right font-medium text-[#dc2626] text-xs">
                      -{formatCurrency(tierItem.penalty || tierItem.total || 0)}
                    </td>
                  </tr>
                ))
              }
              {data.dynamicDeductions.length > 0 ? (
                data.dynamicDeductions.map((item, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-5 py-3 text-slate-800 text-sm pl-8">
                      {item.description}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[#dc2626] text-sm">
                      -{formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))
              ) : null}
              {data.totalDeductions === 0 && (
                <tr className="bg-white">
                  <td
                    colSpan={2}
                    className="px-5 py-3 text-slate-400 italic text-xs pl-8"
                  >
                    No deductions or attendance penalties recorded (100% on-time & present)
                  </td>
                </tr>
              )}
            </tbody>

            {/* NET SALARY Summary Footer Row */}
            <tfoot>
              <tr className="bg-[#f1f5f9] border-t-2 border-[#1e3a8a]">
                <td className="px-5 py-4 text-base font-black text-[#1e3a8a] uppercase tracking-wider">
                  NET SALARY
                </td>
                <td className="px-5 py-4 text-right text-xl font-black text-[#1e3a8a]">
                  {formatCurrency(data.netSalary)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer info note */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 pt-4 border-t border-slate-200 gap-2">
          <span>Generated by Eyenit HR & Payroll Management System</span>
          <span className="italic">
            Official System-Generated Document • No physical signature required
          </span>
        </div>
      </div>
    </div>
  );
};

export default OfficialPayslipDocument;
