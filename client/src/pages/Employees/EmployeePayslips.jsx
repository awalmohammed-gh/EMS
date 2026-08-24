import { useEffect, useState } from "react";
import {
  Calendar,
  BanknoteIcon,
  Clock,
  FileText,
  Eye,
  Download,
  Building2,
  Calculator,
} from "lucide-react";
import EmployeePayslipsModal from "../../components/modal/EmployeePayslipsModal";
import PayrollSummaryCalculator from "../../components/PayrollSummaryCalculator";
import { useManagement } from "../../context/ManagementContextProvider";
import { getEmployeePayslip } from "../../apis/fontApis";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";
import logo from "../../assets/eyenit_logo.png";

const EmployeePayslips = () => {
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [employeePayslips, setEmployeePayslips] = useState([]);
  const [showCalculator, setShowCalculator] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);

  const { setShowToast } = useManagement();

  const fetchEmployeePayslips = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await getEmployeePayslip();
      console.log("Payslips API response:", data);

      if (data.success) {
        let payslips = [];
        if (Array.isArray(data.payslips)) {
          payslips = data.payslips;
        } else if (data.payslips && typeof data.payslips === "object") {
          payslips = [data.payslips];
        } else {
          payslips = [];
        }
        setEmployeePayslips(payslips);
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
        month: "short",
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
        return "bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/20";
      case "Failed":
        return "bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20";
      default:
        return "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]";
    }
  };

  // Build a clean, presentable HTML layout for the payslip with logo
  // (used for both the print preview and the PDF download)
  // Build a clean, presentable HTML layout for the payslip with logo
  // (used for both the print preview and the PDF download)
  // Build a clean, presentable HTML layout for the payslip with logo
  // (used for both the print preview and the PDF download)
  const generatePayslipHTML = (payslip) => {
    const currentDate = new Date().toLocaleDateString("en-GH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Convert logo to base64 for inline use in HTML
    const logoBase64 = logo;

    const baseSalary = Number(
      payslip.baseSalary !== undefined
        ? payslip.baseSalary
        : payslip.basicSalary || 0
    );
    const earningsList = Array.isArray(payslip.earnings) ? payslip.earnings : [];
    const deductionsList = Array.isArray(payslip.deductions)
      ? payslip.deductions
      : typeof payslip.deductions === "number" && payslip.deductions > 0
      ? [{ description: "Deductions", amount: payslip.deductions }]
      : [];
    const absentDeduction = Number(payslip.absentDaysDeduction || 0);

    const earningsRowsHTML =
      earningsList.length > 0
        ? earningsList
            .map(
              (item) => `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 14px; color:#334155;">${item.description || item.name || "Allowance"}</td>
            <td style="padding: 10px 14px; text-align:right; font-weight:600; color:#16A34A;">+${formatCurrency(item.amount)}</td>
          </tr>`
            )
            .join("")
        : `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td colspan="2" style="padding: 8px 14px; color:#94A3B8; font-style: italic; font-size: 12px;">No additional earnings recorded</td>
          </tr>`;

    const deductionsRowsHTML =
      deductionsList.length > 0 || absentDeduction > 0
        ? `
          ${
            absentDeduction > 0
              ? `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 14px; color:#334155;">Absence Deduction</td>
            <td style="padding: 10px 14px; text-align:right; font-weight:600; color:#DC2626;">-${formatCurrency(absentDeduction)}</td>
          </tr>`
              : ""
          }
          ${deductionsList
            .map(
              (item) => `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 14px; color:#334155;">${item.description || item.name || "Deduction"}</td>
            <td style="padding: 10px 14px; text-align:right; font-weight:600; color:#DC2626;">-${formatCurrency(item.amount)}</td>
          </tr>`
            )
            .join("")}
        `
        : `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td colspan="2" style="padding: 8px 14px; color:#94A3B8; font-style: italic; font-size: 12px;">No additional deductions recorded (100% Attendance)</td>
          </tr>`;

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

        <!-- Dynamic Salary Breakdown -->
        <div>
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 10px;">
            Salary Breakdown
          </div>
          <table style="width:100%; border-collapse: collapse; font-size: 13px; border: 1px solid #E2E8F0;">
            <thead>
              <tr style="background:#F8FAFC; border-bottom: 1px solid #E2E8F0;">
                <th style="padding: 10px 14px; text-align:left; color:#002185; font-size:11px; text-transform:uppercase;">Item Description</th>
                <th style="padding: 10px 14px; text-align:right; color:#002185; font-size:11px; text-transform:uppercase;">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px 14px; font-weight:600; color:#0F172A;">Basic Salary</td>
                <td style="padding: 12px 14px; text-align:right; font-weight:600; color:#002185;">${formatCurrency(baseSalary)}</td>
              </tr>
              <tr style="background:#F1F5F9;">
                <td colspan="2" style="padding: 6px 14px; font-size:11px; font-weight:bold; color:#16A34A; text-transform:uppercase;">Additional Earnings & Allowances</td>
              </tr>
              ${earningsRowsHTML}
              <tr style="background:#F1F5F9;">
                <td colspan="2" style="padding: 6px 14px; font-size:11px; font-weight:bold; color:#DC2626; text-transform:uppercase;">Deductions & Adjustments</td>
              </tr>
              ${deductionsRowsHTML}
              <tr style="background:#F8FAFC; border-top: 2px solid #E2E8F0;">
                <td style="padding: 16px 14px; font-weight:bold; color:#002185; font-size:15px;">NET SALARY</td>
                <td style="padding: 16px 14px; text-align:right; font-weight:bold; color:#002185; font-size:18px;">${formatCurrency(payslip.netSalary)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  };
  // Opens the styled payslip in a new window and triggers the print dialog.
  // Used for both "Print" and "Download" — for download, the user selects
  // "Save as PDF" as the destination in the browser's print dialog.
  // This avoids needing any external PDF library.
  const openPrintableWindow = (payslip) => {
    const content = generatePayslipHTML(payslip);
    const printWindow = window.open("", "_blank", "width=850,height=1000");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payslip - ${payslip.employeeName || "Employee"}</title>
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
                .no-print { display: none; }
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
  const downloadPayslip = (payslip) => {
    openPrintableWindow(payslip);
    setShowToast({
      show: true,
      message: "Choose 'Save as PDF' in the print dialog to download.",
      type: "success",
    });
  };

  // Print payslip
  const printPayslip = (payslip) => {
    openPrintableWindow(payslip);
  };

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
              My Payslips
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              View your salary payments and attendance-based salary calculations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="px-3.5 py-2 bg-[#F8FAFC] border border-[#002185] text-[#002185] hover:bg-[#002185] hover:text-white rounded-lg transition-all duration-200 text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-[#ff5500]" />
              {showCalculator ? "Hide Salary Breakdown" : "View Attendance & Salary Calculation"}
            </button>
            <div className="text-sm text-[#64748B] bg-[#FFFFFF] px-4 py-2 rounded-lg border border-[#E2E8F0] transition-all duration-300 shadow-sm">
              {employeePayslips.length} payslip
              {employeePayslips.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Dynamic Payroll & Attendance-based Monthly Summary Calculator */}
        {showCalculator && (
          <PayrollSummaryCalculator />
        )}

        {/* Payslip List */}
        {employeePayslips.length > 0 ? (
          <div className="space-y-4">
            {employeePayslips.map((payslip) => (
              <div
                key={payslip.id || payslip._id || Math.random()}
                className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300"
              >
                {/* Top Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#002185] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-white">
                        {payslip.employeeName?.charAt(0).toUpperCase() || "E"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#002185]">
                        {payslip.employeeName || "Employee"}
                      </h3>
                      <p className="text-sm text-[#64748B] flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#002185]" />
                        {payslip.department || payslip.position || "Department"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#64748B]">
                      {payslip.month || payslip.payMonth
                        ? payslip.month || payslip.payMonth
                        : "N/A"}
                    </span>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(payslip.status || "Paid")}`}
                    >
                      {payslip.status || "Paid"}
                    </span>
                  </div>
                </div>

                {/* Payslip Information */}
                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#E2E8F0] pt-5 sm:grid-cols-3">
                  {/* Payment Date */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Payment Date</p>
                      <p className="text-sm font-medium text-[#002185]">
                        {formatDate(payslip.paymentDate)}
                      </p>
                    </div>
                  </div>

                  {/* Net Salary */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0">
                      <BanknoteIcon className="h-4 w-4 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Net Salary</p>
                      <p className="text-sm font-semibold text-[#002185]">
                        {formatCurrency(payslip.netSalary)}
                      </p>
                    </div>
                  </div>

                  {/* Pay Period / Payslip Number */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Payslip Number</p>
                      <p className="text-sm font-medium text-[#002185]">
                        {payslip.payslipNumber || payslip.id || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown */}
                <div className="mt-4 rounded-xl border border-[#E2E8F0] overflow-hidden">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-3.5 border-b border-[#E2E8F0]">
                    <div>
                      <p className="text-xs text-[#64748B]">Base Salary</p>
                      <p className="text-sm font-semibold text-[#002185]">
                        {formatCurrency(
                          payslip.baseSalary !== undefined
                            ? payslip.baseSalary
                            : payslip.basicSalary || 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Allowances & Bonuses</p>
                      <p className="text-sm font-semibold text-[#16A34A]">
                        +
                        {formatCurrency(
                          Array.isArray(payslip.earnings)
                            ? payslip.earnings.reduce(
                                (sum, item) => sum + Number(item.amount || 0),
                                0
                              )
                            : Number(payslip.allowances || 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Total Deductions</p>
                      <p className="text-sm font-semibold text-[#DC2626]">
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
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Net Salary</p>
                      <p className="text-sm font-bold text-[#002185]">
                        {formatCurrency(payslip.netSalary)}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Items Pill Bar (if custom items exist) */}
                  {(Array.isArray(payslip.earnings) && payslip.earnings.length > 0) ||
                  (Array.isArray(payslip.deductions) && payslip.deductions.length > 0) ? (
                    <div className="bg-white p-3 text-xs flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#64748B]">Custom Items:</span>
                      {Array.isArray(payslip.earnings) &&
                        payslip.earnings.map((item, idx) => (
                          <span
                            key={`earn-${idx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-[11px]"
                          >
                            <span>{item.description || item.name}</span>
                            <span className="font-semibold">+{formatCurrency(item.amount)}</span>
                          </span>
                        ))}
                      {Array.isArray(payslip.deductions) &&
                        payslip.deductions.map((item, idx) => (
                          <span
                            key={`ded-${idx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[11px]"
                          >
                            <span>{item.description || item.name}</span>
                            <span className="font-semibold">-{formatCurrency(item.amount)}</span>
                          </span>
                        ))}
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-[#E2E8F0] pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(payslip)}
                    className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC] hover:text-[#002185] hover:border-[#002185] transition-all duration-300"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>

                  <button
                    type="button"
                    onClick={() => printPayslip(payslip)}
                    className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC] hover:text-[#002185] hover:border-[#002185] transition-all duration-300"
                  >
                    <FileText className="h-4 w-4" />
                    Print
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadPayslip(payslip)}
                    className="flex items-center gap-2 rounded-lg bg-[#002185] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff5500] transition-all duration-300 shadow-sm hover:shadow-lg"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-14 text-center shadow-sm transition-all duration-300">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#94A3B8]" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-[#002185]">
              No payslips available
            </h3>
            <p className="text-sm text-[#64748B] mt-1">
              Your payslips will appear here once they are generated.
            </p>
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <EmployeePayslipsModal
          payslip={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </>
  );
};;;

export default EmployeePayslips;
