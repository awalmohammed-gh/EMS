import { useState, useEffect } from "react";
import {
  X,
  User,
  Calendar,
  Banknote,
  Calculator,
  CreditCard,
  FileText,
  Sparkles,
} from "lucide-react";
import { namesList, payrollGenerate, calculatePayrollSummary } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";
import Loading from "../../ui/Loading";

export const PayslipsModal = ({ onClose }) => {
  const [payslipForm, setPayslipForm] = useState({
    employeeId: "",
    month: "2026-08",
    paymentDate: new Date().toISOString().split("T")[0],
    basicSalary: "",
    allowances: "",
    deductions: "",
    paymentMethod: "Bank Transfer",
    remarks: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const { setShowToast } = useManagement();
  const [employeeNames, setEmployeeNames] = useState([]);

  useEffect(() => {
    const fetchNameList = async () => {
      try {
        const { data } = await namesList();
        if (data.success) {
          setEmployeeNames(data.employees || []);
        } else {
          setShowToast({
            message: data.message || "Failed to load employee list",
            type: "error",
            show: true,
          });
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchNameList();
  }, [setShowToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setPayslipForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const basicSalary = Number(payslipForm.basicSalary) || 0;
  const allowances = Number(payslipForm.allowances) || 0;
  const deductions = Number(payslipForm.deductions) || 0;
  const netSalary = basicSalary + allowances - deductions;

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Auto-calculate values based on employee's attendance and approved leaves
  const handleAutoCalculate = async () => {
    try {
      setIsCalculating(true);
      const params = {
        month: payslipForm.month ? `${payslipForm.month}` : "August 2026",
        baseSalaryInput: payslipForm.basicSalary || 4000,
      };
      if (payslipForm.employeeId) {
        params.employeeId = payslipForm.employeeId;
      }

      const res = await calculatePayrollSummary(params);
      if (res.data && res.data.success) {
        const calc = res.data.summary;
        const earnedBase = calc.salaryCalculation.earnedBaseSalary;
        const totalAllow = calc.salaryCalculation.allowances.total + calc.salaryCalculation.overtimeBonus;
        const totalDeduct = calc.salaryCalculation.deductions.total;

        setPayslipForm((prev) => ({
          ...prev,
          basicSalary: earnedBase,
          allowances: totalAllow,
          deductions: totalDeduct,
          remarks: `Calculated from ${calc.workingDaysMetric.presentDays} attended days, ${calc.workingDaysMetric.approvedPaidLeaveDays} approved leave days, and ${calc.workingDaysMetric.lateDays} late check-ins for ${calc.month}.`,
        }));

        setShowToast({
          message: "Payroll figures auto-calculated from attendance & approved leaves!",
          type: "success",
          show: true,
        });
      }
    } catch (err) {
      console.error("Auto calculation error:", err);
      setShowToast({
        message: "Failed to auto-calculate from attendance. Please enter manually.",
        type: "error",
        show: true,
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      setIsLoading(true);

      const payslipData = {
        employee: payslipForm.employeeId,
        payMonth: payslipForm.month,
        paymentDate: payslipForm.paymentDate,
        basicSalary: basicSalary,
        allowances: allowances,
        deductions: deductions,
        paymentMethod: payslipForm.paymentMethod,
        remarks: payslipForm.remarks || "",
        netSalary: netSalary,
        status: "Paid",
      };

      const { data } = await payrollGenerate(payslipData);
      if (data.success) {
        setShowToast({
          message: data.message || "Payslip created successfully!",
          type: "success",
          show: true,
        });
        onClose();
      } else {
        setShowToast({
          message: data.message || "Failed to generate payslip",
          type: "error",
          show: true,
        });
      }
    } catch (error) {
      console.error(error);
      setShowToast({
        message: error.response?.data?.message || "An error occurred generating payslip",
        type: "error",
        show: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-[#FFFFFF] shadow-2xl border-2 border-[#002185] animate-fade-in overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5 bg-[#FFFFFF]">
          <div>
            <h2 className="text-xl font-bold text-[#002185]">
              Generate Payslip
            </h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Create employee payslip with automatic attendance & leave calculations
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#ff5500]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Auto-Calculate Helper Banner */}
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#002185]">
            <Sparkles className="w-4 h-4 text-[#ff5500] shrink-0" />
            <span>Compute salary based on employee clock-ins & approved leaves</span>
          </div>
          <button
            type="button"
            onClick={handleAutoCalculate}
            disabled={isCalculating}
            className="px-3 py-1.5 rounded-lg bg-[#002185] hover:bg-[#ff5500] text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>{isCalculating ? "Calculating..." : "Auto-Calculate"}</span>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form
          id="payslip-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* Employee */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#002185] uppercase tracking-wider">
              Employee <span className="text-[#DC2626]">*</span>
            </label>

            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />

              <select
                name="employeeId"
                value={payslipForm.employeeId}
                onChange={handleChange}
                required
                className="w-full appearance-none rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-xs font-medium text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30 cursor-pointer"
              >
                <option value="">Select Employee</option>
                {employeeNames.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.employeeId} - {employee.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month & Payment Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#002185] uppercase tracking-wider">
                Pay Month <span className="text-[#DC2626]">*</span>
              </label>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />

                <input
                  type="month"
                  name="month"
                  value={payslipForm.month}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-xs font-medium text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#002185] uppercase tracking-wider">
                Payment Date <span className="text-[#DC2626]">*</span>
              </label>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />

                <input
                  type="date"
                  name="paymentDate"
                  value={payslipForm.paymentDate}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-xs font-medium text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                />
              </div>
            </div>
          </div>

          {/* Financials: Basic Salary, Allowances, Deductions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#002185] uppercase tracking-wider">
                Basic Salary (GHS) <span className="text-[#DC2626]">*</span>
              </label>

              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="number"
                  name="basicSalary"
                  value={payslipForm.basicSalary}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-3 text-xs font-medium text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#002185] uppercase tracking-wider">
                Allowances (GHS)
              </label>

              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="number"
                  name="allowances"
                  value={payslipForm.allowances}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-3 text-xs font-medium text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#002185] uppercase tracking-wider">
                Deductions (GHS)
              </label>

              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="number"
                  name="deductions"
                  value={payslipForm.deductions}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-3 text-xs font-medium text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#002185] uppercase tracking-wider">
              Payment Method <span className="text-[#DC2626]">*</span>
            </label>

            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <select
                name="paymentMethod"
                value={payslipForm.paymentMethod}
                onChange={handleChange}
                required
                className="w-full appearance-none rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-xs font-medium text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30 cursor-pointer"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#002185] uppercase tracking-wider">
              Remarks
            </label>

            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
              <textarea
                name="remarks"
                value={payslipForm.remarks}
                onChange={handleChange}
                rows={2}
                placeholder="Attendance notes or payment remarks..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-xs font-medium text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30 resize-none"
              />
            </div>
          </div>

          {/* Net Salary Highlight Summary Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Calculated Net Payable Salary:
              </span>
              <p className="text-xs text-[#64748B] mt-0.5">
                Basic ({formatCurrency(basicSalary)}) + Allowances ({formatCurrency(allowances)}) - Deductions ({formatCurrency(deductions)})
              </p>
            </div>
            <span className="text-xl font-black text-[#002185]">
              {formatCurrency(netSalary)}
            </span>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] px-6 py-4 bg-[#FFFFFF]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E2E8F0] px-5 py-2 text-xs font-semibold text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#002185]"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="payslip-form"
            className="rounded-xl bg-[#002185] px-6 py-2 text-xs font-bold text-white transition hover:bg-[#ff5500] shadow-sm"
          >
            Generate Payslip
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayslipsModal;
