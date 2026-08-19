import {
  X,
  Building2,
  Briefcase,
  Calendar,
  BanknoteIcon,
  Download,
  FileText,
} from "lucide-react";
import logo from "../../assets/eyenit_logo.png";

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

  // Build a clean, presentable HTML layout for the payslip with logo
  const generatePayslipHTML = () => {
    const currentDate = new Date().toLocaleDateString("en-GH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const logoBase64 = logo;

    return `
      <div style="width: 750px; padding: 40px; font-family: Arial, Helvetica, sans-serif; color: #0F172A; background: #ffffff; box-sizing: border-box; position: relative; overflow: hidden;">
        
        <!-- Background Blurred Logo -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; filter: blur(4px); pointer-events: none; z-index: 0;">
          <img src="${logoBase64}" alt="" style="width: 500px; height: auto; display: block;" />
        </div>
        
        <!-- Additional blurred logo for more coverage -->
        <div style="position: absolute; top: 20%; left: 10%; opacity: 0.03; filter: blur(8px); pointer-events: none; z-index: 0; transform: rotate(-15deg);">
          <img src="${logoBase64}" alt="" style="width: 300px; height: auto; display: block;" />
        </div>
        <div style="position: absolute; bottom: 15%; right: 5%; opacity: 0.03; filter: blur(8px); pointer-events: none; z-index: 0; transform: rotate(20deg);">
          <img src="${logoBase64}" alt="" style="width: 350px; height: auto; display: block;" />
        </div>

        <!-- Main Content -->
        <div style="position: relative; z-index: 1;">
          
          <!-- Header with Logo -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid #002185; padding-bottom: 20px; margin-bottom: 28px;">
            <div style="display:flex; align-items:center; gap: 12px;">
              <div style="width: 140px; height: 140px; display: flex; align-items: center; justify-content: center;">
                <img src="${logoBase64}" alt="EYENIT" style="width: 100%; height: auto; object-fit: contain;" />
              </div>
              <div>
                <div style="font-size: 24px; font-weight: bold; color: #002185; letter-spacing: 1px;">PAYSLIP</div>
                <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Payslip No: ${payslip.payslipNumber || payslip.id || "N/A"}</div>
              </div>
            </div>
            <div style="text-align:right; font-size: 12px; color:#64748B;">
              <div>Date Generated</div>
              <div style="font-weight:600; color:#0F172A; margin-top:2px;">${currentDate}</div>
            </div>
          </div>

          <!-- Employee Info -->
          <div style="margin-bottom: 26px;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 10px;">
              Employee Information
            </div>
            <table style="width:100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color:#64748B; width:22%;">Name</td>
                <td style="padding: 6px 0; font-weight:600; color:#0F172A; width:28%;">${payslip.employeeName || "N/A"}</td>
                <td style="padding: 6px 0; color:#64748B; width:22%;">Employee ID</td>
                <td style="padding: 6px 0; font-weight:600; color:#0F172A;">${payslip.employeeId || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color:#64748B;">Department</td>
                <td style="padding: 6px 0; font-weight:600; color:#0F172A;">${payslip.department || "N/A"}</td>
                <td style="padding: 6px 0; color:#64748B;">Position</td>
                <td style="padding: 6px 0; font-weight:600; color:#0F172A;">${payslip.position || "N/A"}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Info -->
          <div style="margin-bottom: 26px;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 10px;">
              Payment Information
            </div>
            <table style="width:100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color:#64748B; width:22%;">Pay Period</td>
                <td style="padding: 6px 0; font-weight:600; color:#0F172A; width:28%;">${payslip.month || payslip.payMonth || "N/A"}</td>
                <td style="padding: 6px 0; color:#64748B; width:22%;">Payment Date</td>
                <td style="padding: 6px 0; font-weight:600; color:#0F172A;">${formatDate(payslip.paymentDate)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color:#64748B;">Status</td>
                <td style="padding: 6px 0; font-weight:600; color:#16A34A;">${payslip.status || "Paid"}</td>
                <td></td>
                <td></td>
              </tr>
            </table>
          </div>

          <!-- Salary Breakdown -->
          <div>
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 10px;">
              Salary Breakdown
            </div>
            <table style="width:100%; border-collapse: collapse; font-size: 13px; border: 1px solid #E2E8F0;">
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px 14px; color:#334155;">Basic Salary</td>
                <td style="padding: 12px 14px; text-align:right; font-weight:600; color:#0F172A;">${formatCurrency(payslip.basicSalary)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px 14px; color:#334155;">Allowances</td>
                <td style="padding: 12px 14px; text-align:right; font-weight:600; color:#16A34A;">+${formatCurrency(payslip.allowances)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px 14px; color:#334155;">Deductions</td>
                <td style="padding: 12px 14px; text-align:right; font-weight:600; color:#DC2626;">-${formatCurrency(payslip.deductions)}</td>
              </tr>
              <tr style="background:#F8FAFC;">
                <td style="padding: 16px 14px; font-weight:bold; color:#002185; font-size:15px;">NET SALARY</td>
                <td style="padding: 16px 14px; text-align:right; font-weight:bold; color:#002185; font-size:18px;">${formatCurrency(payslip.netSalary)}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;
  };

  // Opens the styled payslip in a new window and triggers the print dialog.
  const openPrintableWindow = (title) => {
    const content = generatePayslipHTML();
    const printWindow = window.open("", "_blank", "width=850,height=1000");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              * { box-sizing: border-box; }
              body {
                font-family: Arial, Helvetica, sans-serif;
                background: #f1f5f9;
                display: flex;
                justify-content: center;
                padding: 30px 0;
                margin: 0;
              }
              @media print {
                body { background: white; padding: 0; margin: 0; }
              }
              @page {
                size: A4;
                margin: 0;
              }
            </style>
          </head>
          <body>
            ${content}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // "Download" opens the print dialog so the user can choose "Save as PDF"
  const downloadPayslip = () => {
    openPrintableWindow(`Payslip - ${payslip.employeeName || "Employee"}`);
  };

  // Print payslip
  const printPayslip = () => {
    openPrintableWindow(`Payslip - ${payslip.employeeName || "Employee"}`);
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

          {/* Salary Breakdown */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Salary Breakdown
            </h3>

            <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] transition-all duration-200">
              {/* Basic Salary */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-4">
                <div className="flex items-center gap-2">
                  <BanknoteIcon className="h-4 w-4 text-[#64748B]" />
                  <span className="text-sm text-[#334155]">Basic Salary</span>
                </div>
                <span className="text-sm font-medium text-[#002185] tabular-nums">
                  {formatCurrency(payslip.basicSalary)}
                </span>
              </div>

              {/* Allowances */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-4">
                <div className="flex items-center gap-2">
                  <BanknoteIcon className="h-4 w-4 text-[#16A34A]" />
                  <span className="text-sm text-[#334155]">Allowances</span>
                </div>
                <span className="text-sm font-medium text-[#16A34A] tabular-nums">
                  +{formatCurrency(payslip.allowances)}
                </span>
              </div>

              {/* Deductions */}
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-4">
                <div className="flex items-center gap-2">
                  <BanknoteIcon className="h-4 w-4 text-[#DC2626]" />
                  <span className="text-sm text-[#334155]">Deductions</span>
                </div>
                <span className="text-sm font-medium text-[#DC2626] tabular-nums">
                  -{formatCurrency(payslip.deductions)}
                </span>
              </div>

              {/* Net Salary */}
              <div className="flex items-center justify-between bg-[#F8FAFC] px-4 py-5">
                <span className="font-semibold text-[#002185]">Net Salary</span>
                <span className="text-xl font-bold text-[#002185] tabular-nums">
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
