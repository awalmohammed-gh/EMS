import {
  X,
  Building2,
  Briefcase,
  Calendar,
  BanknoteIcon,
  Download,
  FileText,
} from "lucide-react";
import {
  downloadPayslipPDF,
  printPayslipDocument,
} from "../../utils/payslipPdfGenerator";

const EmployeePayslipsModal = ({ payslip, onClose }) => {
  const formatCurrency = (amount) => {
    return (
      amount?.toLocaleString("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) || "GHS 0.00"
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
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[#FFFFFF] shadow-2xl border-2 border-[#002185] animate-fade-in"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5 bg-[#FFFFFF] rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002185]">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#002185]">
                Payslip Details
              </h2>
              <p className="text-sm text-[#64748B]">{payslip.month}</p>
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
          {/* Employee Information */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Employee Information
            </h3>

            <div className="grid grid-cols-1 gap-4 rounded-lg bg-[#F8FAFC] p-4 sm:grid-cols-2 border border-[#E2E8F0] transition-all duration-200">
              {/* Employee */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#002185] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {payslip.employeeName?.charAt(0).toUpperCase() || "E"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Employee</p>
                  <p className="text-sm font-medium text-[#002185]">
                    {payslip.employeeName || "N/A"}
                  </p>
                </div>
              </div>

              {/* Employee ID */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                  <FileText className="h-3.5 w-3.5 text-[#64748B]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Employee ID</p>
                  <p className="text-sm font-medium text-[#002185] font-mono">
                    {payslip.employeeId || "N/A"}
                  </p>
                </div>
              </div>

              {/* Department */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                  <Building2 className="h-3.5 w-3.5 text-[#64748B]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Department</p>
                  <p className="text-sm font-medium text-[#002185]">
                    {payslip.department || "N/A"}
                  </p>
                </div>
              </div>

              {/* Position */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                  <Briefcase className="h-3.5 w-3.5 text-[#64748B]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Position</p>
                  <p className="text-sm font-medium text-[#002185]">
                    {payslip.position || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Payment Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[#E2E8F0] p-4 bg-[#FFFFFF] transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#64748B]" />
                  <p className="text-xs text-[#64748B]">Pay Period</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#002185]">
                  {payslip.month || payslip.payMonth || "N/A"}
                </p>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] p-4 bg-[#FFFFFF] transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#64748B]" />
                  <p className="text-xs text-[#64748B]">Payment Date</p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#002185]">
                  {formatDate(payslip.paymentDate)}
                </p>
              </div>

              <div className="rounded-lg border border-[#E2E8F0] p-4 bg-[#FFFFFF] transition-all duration-200">
                <p className="text-xs text-[#64748B]">Status</p>
                <span
                  className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(payslip.status)}`}
                >
                  {payslip.status || "Paid"}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Salary Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Salary Breakdown & Custom Items
              </h3>
              <span className="text-[11px] font-medium text-[#64748B]">Admin Verified</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] transition-all duration-200">
              {/* Basic Salary */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3.5 bg-[#F8FAFC]">
                <div className="flex items-center gap-2">
                  <BanknoteIcon className="h-4 w-4 text-[#002185]" />
                  <span className="text-sm font-semibold text-[#0F172A]">Base Salary</span>
                </div>
                <span className="text-sm font-bold text-[#002185] tabular-nums">
                  {formatCurrency(
                    payslip.baseSalary !== undefined
                      ? payslip.baseSalary
                      : payslip.basicSalary || 0
                  )}
                </span>
              </div>

              {/* Dynamic Earnings Section */}
              <div className="border-b border-[#E2E8F0]">
                <div className="px-4 py-2 bg-[#F1F5F9]/60 text-[11px] font-bold text-[#16A34A] uppercase tracking-wider flex items-center justify-between">
                  <span>Additional Earnings & Allowances</span>
                  <span>
                    +
                    {formatCurrency(
                      Array.isArray(payslip.earnings)
                        ? payslip.earnings.reduce(
                            (sum, item) => sum + Number(item.amount || 0),
                            0
                          )
                        : Number(payslip.allowances || 0)
                    )}
                  </span>
                </div>
                {Array.isArray(payslip.earnings) && payslip.earnings.length > 0 ? (
                  payslip.earnings.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b last:border-b-0 border-[#F1F5F9] px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <span className="text-sm text-[#334155]">
                        {item.description || item.name || `Allowance #${idx + 1}`}
                      </span>
                      <span className="text-sm font-medium text-[#16A34A] tabular-nums">
                        +{formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-[#94A3B8] italic bg-white">
                    No additional earnings recorded
                  </div>
                )}
              </div>

              {/* Dynamic Deductions Section */}
              <div className="border-b border-[#E2E8F0]">
                <div className="px-4 py-2 bg-[#F1F5F9]/60 text-[11px] font-bold text-[#DC2626] uppercase tracking-wider flex items-center justify-between">
                  <span>Deductions & Adjustments</span>
                  <span>
                    -
                    {formatCurrency(
                      (Array.isArray(payslip.deductions)
                        ? payslip.deductions.reduce(
                            (sum, item) => sum + Number(item.amount || 0),
                            0
                          )
                        : Number(payslip.deductions || 0)) +
                        Number(payslip.absentDaysDeduction || 0)
                    )}
                  </span>
                </div>

                {/* Absence Deduction if present */}
                {Number(payslip.absentDaysDeduction) > 0 && (
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-3 hover:bg-[#FEF2F2]/30 transition-colors">
                    <div>
                      <span className="text-sm font-medium text-[#DC2626]">
                        Absence Deduction
                      </span>
                      <span className="block text-[10px] text-[#94A3B8]">
                        Triggered on unexcused absent status
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-[#DC2626] tabular-nums">
                      -{formatCurrency(payslip.absentDaysDeduction)}
                    </span>
                  </div>
                )}

                {/* Dynamic deductions mapped strictly from Admin inputs */}
                {Array.isArray(payslip.deductions) &&
                payslip.deductions.length > 0 ? (
                  payslip.deductions.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b last:border-b-0 border-[#F1F5F9] px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <span className="text-sm text-[#334155]">
                        {item.description || item.name || `Deduction #${idx + 1}`}
                      </span>
                      <span className="text-sm font-medium text-[#DC2626] tabular-nums">
                        -{formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                ) : !payslip.absentDaysDeduction &&
                  !(typeof payslip.deductions === "number" && payslip.deductions > 0) ? (
                  <div className="px-4 py-3 text-xs text-[#94A3B8] italic bg-white">
                    No additional deductions recorded (100% Attendance)
                  </div>
                ) : typeof payslip.deductions === "number" &&
                  payslip.deductions > 0 ? (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-[#334155]">Deductions</span>
                    <span className="text-sm font-medium text-[#DC2626] tabular-nums">
                      -{formatCurrency(payslip.deductions)}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Net Salary Summary Box */}
              <div className="flex items-center justify-between bg-[#F8FAFC] px-4 py-5">
                <div>
                  <span className="font-bold text-[#002185] block">
                    Net Payable Salary
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    Base + Total Earnings - Total Deductions
                  </span>
                </div>
                <span className="text-2xl font-black text-[#002185] tabular-nums">
                  {formatCurrency(payslip.netSalary)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-[#E2E8F0] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E2E8F0] px-5 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#002185]"
            >
              Close
            </button>

            <button
              type="button"
              onClick={printPayslip}
              className="flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-5 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#002185]"
            >
              <FileText className="h-4 w-4" />
              Print
            </button>

            <button
              type="button"
              onClick={downloadPayslip}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#002185] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#ff5500] shadow-sm hover:shadow-lg"
            >
              <Download className="h-4 w-4" />
              Download Payslip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePayslipsModal;
