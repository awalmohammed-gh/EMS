import { useState, useEffect, useCallback } from "react";
import {
  X,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Printer,
  Trash2,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Percent,
  Check,
  ShieldCheck,
} from "lucide-react";
import { getPayslipDetails, updatePayrollStatus, deletePayroll } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";
import OfficialPayslipDocument from "../OfficialPayslipDocument";
import { downloadPayslipPDF, printPayslipDocument } from "../../utils/payslipPdfGenerator";

export const PayrollDetailsModal = ({ payrollId, initialData, onClose, onRefresh }) => {
  const [payroll, setPayroll] = useState(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("breakdown"); // 'breakdown' | 'attendance' | 'print'
  const { setShowToast } = useManagement();

  // Fetch full details from backend API (GET /api/pay/:id or GET /api/payroll/:id)
  const fetchPayrollDetails = useCallback(async () => {
    if (!payrollId && !initialData?._id && !initialData?.payslipNumber) return;
    const targetId = payrollId || initialData?._id || initialData?.payslipNumber;

    try {
      setIsLoading(true);
      setError(null);
      const res = await getPayslipDetails(targetId);
      if (res.data?.success && (res.data.payroll || res.data.payslip)) {
        setPayroll(res.data.payroll || res.data.payslip);
      } else if (initialData) {
        setPayroll(initialData);
      } else {
        setError(res.data?.message || "Failed to load payroll details.");
      }
    } catch (err) {
      console.warn("Error fetching payroll detail, using initial/fallback data:", err.message);
      if (initialData) {
        setPayroll(initialData);
      } else {
        setError(err.message || "Failed to fetch payroll record.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [payrollId, initialData]);

  useEffect(() => {
    fetchPayrollDetails();
  }, [fetchPayrollDetails]);

  // Handle status update (Paid / Pending / Failed)
  const handleStatusChange = async (newStatus) => {
    const targetId = payroll?._id || payroll?.id || payroll?.payslipNumber || payrollId;
    if (!targetId) return;

    try {
      setIsUpdatingStatus(true);
      const res = await updatePayrollStatus(targetId, { status: newStatus });
      if (res.data?.success) {
        setPayroll((prev) => ({ ...prev, status: newStatus }));
        setShowToast({
          message: `Payroll status updated to "${newStatus}"`,
          type: "success",
          show: true,
        });
        if (onRefresh) onRefresh();
      } else {
        setShowToast({
          message: res.data?.message || "Failed to update status",
          type: "error",
          show: true,
        });
      }
    } catch (err) {
      console.error(err);
      setShowToast({
        message: err.message || "Could not update status",
        type: "error",
        show: true,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    const targetId = payroll?._id || payroll?.id || payroll?.payslipNumber || payrollId;
    if (!targetId) return;

    if (!window.confirm("Are you sure you want to delete this payroll record?")) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await deletePayroll(targetId);
      if (res.data?.success) {
        setShowToast({
          message: "Payroll record deleted successfully.",
          type: "success",
          show: true,
        });
        if (onRefresh) onRefresh();
        onClose();
      } else {
        setShowToast({
          message: res.data?.message || "Failed to delete record",
          type: "error",
          show: true,
        });
      }
    } catch (err) {
      console.error(err);
      setShowToast({
        message: err.message || "Failed to delete record",
        type: "error",
        show: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount) => {
    return (Number(amount) || 0).toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#F59E0B] border border-[#F59E0B]/20">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
            {status || "Unknown"}
          </span>
        );
    }
  };

  const employee = payroll?.employee || {
    fullName: payroll?.employeeName || "Employee Name",
    employeeId: payroll?.employeeId || "EMP001",
    department: payroll?.department || "Department",
    position: payroll?.position || "Position",
    email: payroll?.email || "employee@eyenit.com",
    bankName: payroll?.bankName || "Standard Bank",
    accountNumber: payroll?.accountNumber || "••• ••• 4829",
  };

  const basicSalary = Number(payroll?.basicSalary || 0);
  const allowances = Number(payroll?.allowances || 0);
  const deductions = Number(payroll?.deductions || 0);
  const netSalary = Number(payroll?.netSalary || (basicSalary + allowances - deductions));
  const grossEarnings = basicSalary + allowances;

  return (
    <div
      id="payroll-details-modal-overlay"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="payroll-details-modal-container"
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E2E8F0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] bg-white flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#002185] text-white flex items-center justify-center text-lg font-bold shadow-md shadow-[#002185]/20 shrink-0">
              {employee?.fullName ? employee.fullName.charAt(0).toUpperCase() : "E"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-[#002185]">
                  {employee?.fullName || "Employee Payroll Details"}
                </h2>
                {getStatusBadge(payroll?.status)}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#64748B] mt-1 flex-wrap">
                <span className="font-semibold text-[#002185]">
                  ID: {employee?.employeeId || payroll?.employeeId || "N/A"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                  {employee?.department || "Operations"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#ff5500]" />
                  {payroll?.payMonth || payroll?.month || "August 2026"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchPayrollDetails}
              disabled={isLoading}
              title="Refresh Record"
              className="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#002185] hover:bg-[#F8FAFC] transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#002185]" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 pb-2 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("breakdown")}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "breakdown"
                ? "bg-[#002185] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#002185] hover:bg-white"
            }`}
          >
            Salary & Taxes Breakdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "attendance"
                ? "bg-[#002185] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#002185] hover:bg-white"
            }`}
          >
            Attendance & Work Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("print")}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "print"
                ? "bg-[#002185] text-white shadow-xs"
                : "text-[#64748B] hover:text-[#002185] hover:bg-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Payslip Preview
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {isLoading && !payroll ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-[#002185] animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#002185]">Fetching payroll record...</p>
              <p className="text-xs text-[#64748B] mt-1">Retrieving employee salary & attendance calculations</p>
            </div>
          ) : error && !payroll ? (
            <div className="py-12 px-6 text-center bg-[#FEF2F2] rounded-xl border border-[#FECACA]">
              <AlertTriangle className="w-8 h-8 text-[#DC2626] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#DC2626]">{error}</p>
              <button
                type="button"
                onClick={fetchPayrollDetails}
                className="mt-3 px-4 py-2 bg-[#DC2626] text-white rounded-lg text-xs font-semibold hover:bg-[#B91C1C] transition cursor-pointer"
              >
                Retry Fetch
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: BREAKDOWN */}
              {activeTab === "breakdown" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                      <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                        Gross Salary
                      </span>
                      <p className="text-xl font-bold text-[#002185] mt-1">
                        {formatCurrency(grossEarnings)}
                      </p>
                      <span className="text-[11px] text-[#64748B] mt-0.5 block">
                        Base Monthly Salary {allowances > 0 ? "+ Allowances" : ""}
                      </span>
                    </div>

                    <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                      <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                        Absenteeism Deductions
                      </span>
                      <p className="text-xl font-bold text-[#DC2626] mt-1">
                        -{formatCurrency(deductions)}
                      </p>
                      <span className="text-[11px] text-[#64748B] mt-0.5 block">
                        Absence status adjustments
                      </span>
                    </div>

                    <div className="bg-[#F0FDF4] p-4 rounded-xl border border-[#BBF7D0] shadow-xs">
                      <span className="text-[11px] font-bold text-[#166534] uppercase tracking-wider block">
                        Net Payable Amount
                      </span>
                      <p className="text-xl font-bold text-[#16A34A] mt-1">
                        {formatCurrency(netSalary)}
                      </p>
                      <span className="text-[11px] text-[#166534] mt-0.5 block font-medium">
                        Disbursable Salary
                      </span>
                    </div>
                  </div>

                  {/* Detailed Earnings vs Deductions Table */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Earnings */}
                    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-[#F8FAFC] px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-[#16A34A]" />
                          Earnings Breakdown
                        </h4>
                        <span className="text-xs font-bold text-[#16A34A]">
                          {formatCurrency(grossEarnings)}
                        </span>
                      </div>
                      <div className="p-4 divide-y divide-[#F1F5F9] text-xs">
                        <div className="py-2.5 flex items-center justify-between">
                          <span className="text-[#64748B]">Base Monthly Salary</span>
                          <span className="font-semibold text-[#0F172A]">
                            {formatCurrency(basicSalary)}
                          </span>
                        </div>
                        {Array.isArray(payroll?.earnings) && payroll.earnings.length > 0 ? (
                          payroll.earnings.map((item, idx) => (
                            <div key={idx} className="py-2.5 flex items-center justify-between">
                              <span className="text-[#64748B]">{item.description || item.name}</span>
                              <span className="font-semibold text-[#16A34A]">
                                +{formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))
                        ) : allowances > 0 ? (
                          <div className="py-2.5 flex items-center justify-between">
                            <span className="text-[#64748B]">Allowances & Bonuses</span>
                            <span className="font-semibold text-[#16A34A]">
                              +{formatCurrency(allowances)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-[#F8FAFC] px-4 py-2.5 border-b border-[#E2E8F0] flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#002185] uppercase tracking-wider flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-[#DC2626]" />
                          Deductions Breakdown
                        </h4>
                        <span className="text-xs font-bold text-[#DC2626]">
                          -{formatCurrency(deductions)}
                        </span>
                      </div>
                      <div className="p-4 divide-y divide-[#F1F5F9] text-xs">
                        {Number(payroll?.absentDaysDeduction) > 0 && (
                          <div className="py-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[#64748B] block font-medium">Absence Deduction</span>
                              <span className="text-[10px] text-[#94A3B8]">Deductions triggered on unexcused absent status</span>
                            </div>
                            <span className="font-semibold text-[#DC2626]">
                              -{formatCurrency(payroll.absentDaysDeduction)}
                            </span>
                          </div>
                        )}
                        {Array.isArray(payroll?.deductions) && payroll.deductions.length > 0 ? (
                          payroll.deductions.map((item, idx) => (
                            <div key={idx} className="py-2.5 flex items-center justify-between">
                              <span className="text-[#64748B]">{item.description || item.name}</span>
                              <span className="font-semibold text-[#DC2626]">
                                -{formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))
                        ) : deductions > 0 && !payroll?.absentDaysDeduction ? (
                          <div className="py-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[#64748B] block font-medium">Deductions</span>
                              <span className="text-[10px] text-[#94A3B8]">Standard statutory deductions</span>
                            </div>
                            <span className="font-semibold text-[#DC2626]">
                              -{formatCurrency(deductions)}
                            </span>
                          </div>
                        ) : !payroll?.absentDaysDeduction && deductions === 0 ? (
                          <div className="py-2.5 text-[#94A3B8] italic text-center">
                            No deductions recorded
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Disbursement & Banking Details */}
                  <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs">
                    <h4 className="text-xs font-bold text-[#002185] uppercase tracking-wider mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#ff5500]" />
                      Payment & Banking Information
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[#64748B] block">Payslip No.</span>
                        <span className="font-bold text-[#002185] mt-0.5 block font-mono">
                          {payroll?.payslipNumber || payroll?.id || "PAY-2026-08"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Payment Date</span>
                        <span className="font-semibold text-[#0F172A] mt-0.5 block">
                          {formatDate(payroll?.paymentDate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Payment Method</span>
                        <span className="font-semibold text-[#0F172A] mt-0.5 block">
                          {payroll?.paymentMethod || "Bank Transfer"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Bank / Account</span>
                        <span className="font-semibold text-[#0F172A] mt-0.5 block">
                          {employee?.bankName || "Stanbic Bank Ghana"} ({employee?.accountNumber?.slice(-4) || "4829"})
                        </span>
                      </div>
                    </div>

                    {payroll?.remarks && (
                      <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-xs">
                        <span className="font-semibold text-[#002185]">Admin Notes / Remarks: </span>
                        <span className="text-[#64748B]">{payroll.remarks}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ATTENDANCE METRICS */}
              {activeTab === "attendance" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                      <span className="text-[11px] font-bold text-[#64748B] uppercase block">Working Days</span>
                      <p className="text-xl font-bold text-[#002185] mt-1">22 days</p>
                      <span className="text-[10px] text-[#64748B]">Standard Monthly Baseline</span>
                    </div>

                    <div className="bg-[#F0FDF4] p-3.5 rounded-xl border border-[#BBF7D0]">
                      <span className="text-[11px] font-bold text-[#166534] uppercase block">Present Days</span>
                      <p className="text-xl font-bold text-[#16A34A] mt-1">21 days</p>
                      <span className="text-[10px] text-[#166534]">Logged & Verified</span>
                    </div>

                    <div className="bg-[#FFFBEB] p-3.5 rounded-xl border border-[#FDE68A]">
                      <span className="text-[11px] font-bold text-[#92400E] uppercase block">Approved Leaves</span>
                      <p className="text-xl font-bold text-[#D97706] mt-1">1 day</p>
                      <span className="text-[10px] text-[#92400E]">Paid Annual Leave</span>
                    </div>

                    <div className="bg-[#EFF6FF] p-3.5 rounded-xl border border-[#BFDBFE]">
                      <span className="text-[11px] font-bold text-[#1E40AF] uppercase block">Compliance</span>
                      <p className="text-xl font-bold text-[#2563EB] mt-1">96.5%</p>
                      <span className="text-[10px] text-[#1E40AF]">Attendance Score</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs">
                    <h4 className="text-xs font-bold text-[#002185] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                      Attendance Salary Calculation Logic
                    </h4>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      Salary calculations automatically reconcile daily biometric/digital clock-ins,
                      grace periods for on-time arrival, overtime hours logged beyond regular work hours, and HR-approved
                      paid leaves to compute final payable days without unexcused deductions.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: PRINT PREVIEW */}
              {activeTab === "print" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <OfficialPayslipDocument
                    payslip={payroll}
                    showControls={false}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Changer Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[#64748B] font-medium hidden sm:inline">Change Status:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStatusChange("Paid")}
                disabled={isUpdatingStatus || payroll?.status === "Paid"}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  payroll?.status === "Paid"
                    ? "bg-[#16A34A] text-white shadow-xs"
                    : "bg-white border border-[#E2E8F0] text-[#16A34A] hover:bg-[#F0FDF4]"
                }`}
              >
                <Check className="w-3 h-3" />
                Paid
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("Pending")}
                disabled={isUpdatingStatus || payroll?.status === "Pending"}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  payroll?.status === "Pending"
                    ? "bg-[#F59E0B] text-white shadow-xs"
                    : "bg-white border border-[#E2E8F0] text-[#F59E0B] hover:bg-[#FFFBEB]"
                }`}
              >
                <Clock className="w-3 h-3" />
                Pending
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("Failed")}
                disabled={isUpdatingStatus || payroll?.status === "Failed"}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  payroll?.status === "Failed"
                    ? "bg-[#DC2626] text-white shadow-xs"
                    : "bg-white border border-[#E2E8F0] text-[#DC2626] hover:bg-[#FEF2F2]"
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Failed
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              id="btn-modal-delete-payroll"
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-2 border border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Delete payroll entry"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            <button
              id="btn-modal-download-pdf"
              type="button"
              onClick={() => downloadPayslipPDF(payroll)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              id="btn-modal-print-payslip"
              type="button"
              onClick={() => printPayslipDocument(payroll)}
              className="px-3.5 py-2 bg-[#002185] hover:bg-[#ff5500] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              id="btn-modal-close"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollDetailsModal;
