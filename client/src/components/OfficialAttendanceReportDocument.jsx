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
  normalizeAttendanceReportData,
  downloadAttendanceReportPDF,
} from "../utils/attendanceReportPdfGenerator";

/**
 * OfficialAttendanceReportDocument Component
 *
 * Clean corporate document layout matching all styling and print specifications:
 * 1. Header with Company Logo, bold title "ATTENDANCE REPORT" in deep navy (#1e3a8a), dynamic Report ID, Date Generated, and 3px deep navy rule.
 * 2. Two-column metadata grid (EMPLOYEE INFORMATION & AUDIT & REPORT PERIOD with verified compliance status).
 * 3. KPI Highlights Banner with 4 metric cards (Present Days, Late Logins, Absent Days, Total Work Hours & Rate).
 * 4. Daily Attendance Audit Log Table with shift windows, check-in, check-out, duration, and status tags.
 * 5. PDF download and print handlers adhering to @media print CSS rules.
 */
export const OfficialAttendanceReportDocument = ({
  employee = {},
  attendanceList = [],
  period = "",
  dateRange = "",
  onBack,
  showControls = true,
  title = "Official Individual Attendance Report",
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const reportPayload = {
    employee,
    attendanceList,
    period,
    dateRange,
  };

  const data = normalizeAttendanceReportData(reportPayload);

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      await downloadAttendanceReportPDF(reportPayload);
    } catch (err) {
      console.error("Attendance PDF download error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Controls Bar (Hidden in Print Mode) */}
      {showControls && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs print:hidden no-print">
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
                {data.employeeName} • {data.reportPeriod} • {data.records.length} Recorded Shifts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="btn-print-attendance-sheet"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              id="btn-download-attendance-pdf"
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

      {/* Official Corporate Attendance Document Card */}
      <div
        id="corporate-attendance-canvas"
        className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-12 print-container print-card print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* 1. Document Header & Branding */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-2xs shrink-0">
              <img
                src={logo}
                alt="Company Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1e3a8a] tracking-tight leading-none">
                ATTENDANCE REPORT
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-500 font-mono mt-1">
                {data.reportId}
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
        <div className="w-full h-[3px] bg-[#1e3a8a] mb-6"></div>

        {/* 2. Metadata Grid (Two-Column Layouts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* EMPLOYEE INFORMATION */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
            <h2 className="text-xs font-black text-[#1e3a8a] uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
              EMPLOYEE INFORMATION
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Staff Name
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
                  Job Position
                </span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {data.position}
                </span>
              </div>
            </div>
          </div>

          {/* AUDIT & REPORT PERIOD */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
            <h2 className="text-xs font-black text-[#1e3a8a] uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
              AUDIT & REPORT PERIOD
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Report Month / Period
                </span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {data.reportPeriod}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Total Logged Days
                </span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                  {data.totalDays} Days
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Punctuality & Compliance Status
                </span>
                <span className="text-sm font-black text-[#16a34a] inline-flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                  {data.complianceRate}% Compliance Score ({data.presentDays} Present, {data.excusedDays} Excused)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. KPI Highlights Banner (4 Metric Tiles) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-left">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
              Present Days
            </span>
            <span className="text-lg font-black text-emerald-700 block mt-0.5">
              {data.presentDays} Days
            </span>
            <span className="text-[10px] font-semibold text-emerald-600">
              On-time shifts
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-left">
            <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">
              Late Check-ins
            </span>
            <span className="text-lg font-black text-rose-700 block mt-0.5">
              {data.lateDays} Days
            </span>
            <span className="text-[10px] font-semibold text-rose-600">
              {data.totalLateMinutes} total late mins
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left">
            <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
              Absent Days
            </span>
            <span className="text-lg font-black text-amber-700 block mt-0.5">
              {data.absentDays} Days
            </span>
            <span className="text-[10px] font-semibold text-amber-600">
              {data.excusedDays > 0 ? `${data.excusedDays} excused` : "Unexcused"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-left">
            <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider block">
              Logged Work Hours
            </span>
            <span className="text-lg font-black text-blue-700 block mt-0.5">
              {data.totalWorkHours} hrs
            </span>
            <span className="text-[10px] font-semibold text-blue-600">
              ~{data.averageHoursPerDay} hrs / day
            </span>
          </div>
        </div>

        {/* 4. Daily Attendance Audit Log Table */}
        <div className="mb-6 border border-[#bfdbfe] rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f0f7ff] border-b border-[#bfdbfe]">
                <th className="px-4 py-3 text-[11px] font-black text-[#1e3a8a] uppercase tracking-wider">
                  DATE & DAY
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-[#1e3a8a] uppercase tracking-wider">
                  SCHEDULED SHIFT
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-[#1e3a8a] uppercase tracking-wider">
                  CLOCK IN
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-[#1e3a8a] uppercase tracking-wider">
                  CLOCK OUT
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-[#1e3a8a] uppercase tracking-wider">
                  WORK HOURS
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-[#1e3a8a] uppercase tracking-wider text-center">
                  STATUS
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-[#1e3a8a] uppercase tracking-wider text-right">
                  AUDIT NOTES
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bfdbfe]">
              {data.records.length > 0 ? (
                data.records.map((rec, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={rec.id || idx}
                      className={isEven ? "bg-white" : "bg-slate-50/50"}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <span>{rec.date}</span>
                        <span className="text-[10px] text-slate-500 font-normal block">
                          {rec.dayOfWeek}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {rec.scheduledShift}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {rec.clockIn}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {rec.clockOut}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1e3a8a]">
                        {rec.workHours}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            rec.status === "Present"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : rec.status === "Late"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : rec.status === "Excused"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 text-[11px]">
                        {rec.notes || (rec.isExcused ? "Penalty waived" : "Verified")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="bg-white">
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-400 italic text-xs"
                  >
                    No attendance records found for this period.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#f1f5f9] border-t-2 border-[#1e3a8a]">
                <td
                  colSpan={4}
                  className="px-4 py-3 font-black text-[#1e3a8a] uppercase text-xs"
                >
                  TOTAL LOGGED WORK HOURS
                </td>
                <td className="px-4 py-3 font-black text-sm text-[#1e3a8a]">
                  {data.totalWorkHours} hrs
                </td>
                <td
                  colSpan={2}
                  className="px-4 py-3 text-right font-bold text-xs text-[#1e3a8a]"
                >
                  Average: {data.averageHoursPerDay} hrs/shift
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 5. Footer & Supervisor Sign-off Line for Print */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 pt-4 border-t border-slate-200 gap-3">
          <div>
            <span className="font-semibold block text-slate-700">
              Generated by Eyenit HR & Attendance Management System
            </span>
            <span className="italic text-[11px] text-slate-400">
              Official Corporate Record • Validated against digital biometric audit logs
            </span>
          </div>

          <div className="text-right pt-2 sm:pt-0">
            <span className="text-[11px] text-slate-600 block">
              Supervisor Verification & Sign-off: _______________________
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficialAttendanceReportDocument;
