import { useState } from "react";
import {
  X,
  User,
  Calendar,
  Banknote,
  Calculator,
  CreditCard,
  FileText,
} from "lucide-react";
import { namesList, payrollGenerate } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";
import { useEffect } from "react";
import Loading from "../../ui/Loading";

const PayslipsModal = ({ onClose }) => {
  const [payslipForm, setPayslipForm] = useState({
    employeeId: "",
    month: "",
    paymentDate: "",
    basicSalary: "",
    allowances: "",
    deductions: "",
    paymentMethod: "",
    remarks: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const { showToast, setShowToast } = useManagement();
  const [employeeNames, setEmployeeNames] = useState([]);

  useEffect(() => {
    const fetchNameList = async () => {
      try {
        const { data } = await namesList();
        if (data.success) {
          setEmployeeNames(data.employees);

        } else {
          setShowToast({
            message: data.message,
            type: "error",
            show: true,
          });
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchNameList();
  }, []);

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
    return amount.toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
        status: "Pending",
      };

      console.log(payslipData);

      const { data } = await payrollGenerate(payslipData);
      if (data.success) {
        setShowToast({
          message: data.message,
          type: "success",
          show: true,
        });
        onClose();
      } else {
        setShowToast({
          message: data.message,
          type: "error",
          show: true,
        });
      }
    } catch (error) {
      console.error(error);
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

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-xl bg-[#FFFFFF] shadow-2xl border-2 border-[#002185] animate-fade-in flex flex-col overflow-hidden"
      >
        {/* Header - Fixed */}
        <div className="shrink-0 flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4 bg-[#FFFFFF] rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-[#002185]">
              Generate Payslip
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Create a new employee payslip
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

        {/* Form Body - Scrollable */}
        <form
          id="payslip-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
        >
          {/* Employee */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#002185]">
              Employee <span className="text-[#DC2626]">*</span>
            </label>

            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />

              <select
                name="employeeId"
                value={payslipForm.employeeId}
                onChange={handleChange}
                required
                className="w-full appearance-none rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30 cursor-pointer"
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
              <label className="mb-2 block text-sm font-medium text-[#002185]">
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
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#002185]">
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
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                />
              </div>
            </div>
          </div>

          {/* Salary Information */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#002185]">
              Salary Information
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Basic Salary */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#64748B]">
                  Basic Salary <span className="text-[#DC2626]">*</span>
                </label>

                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />

                  <input
                    type="number"
                    name="basicSalary"
                    value={payslipForm.basicSalary}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-3 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                  />
                </div>
              </div>

              {/* Allowances */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#64748B]">
                  Allowances
                </label>

                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16A34A]" />

                  <input
                    type="number"
                    name="allowances"
                    value={payslipForm.allowances}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-3 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                  />
                </div>
              </div>

              {/* Deductions */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#64748B]">
                  Deductions
                </label>

                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#DC2626]" />

                  <input
                    type="number"
                    name="deductions"
                    value={payslipForm.deductions}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-3 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method & Remarks */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#002185]">
                Payment Method <span className="text-[#DC2626]">*</span>
              </label>

              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />

                <select
                  name="paymentMethod"
                  value={payslipForm.paymentMethod}
                  onChange={handleChange}
                  required
                  className="w-full appearance-none rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30 cursor-pointer"
                >
                  <option value="">Select Payment Method</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#002185]">
                Remarks
              </label>

              <div className="relative">
                <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />

                <input
                  type="text"
                  name="remarks"
                  value={payslipForm.remarks}
                  onChange={handleChange}
                  placeholder="Additional notes..."
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-10 pr-4 text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30"
                />
              </div>
            </div>
          </div>

          {/* Net Salary Preview */}
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 hover:border-[#ff5500] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#ff5500]" />

                <div>
                  <p className="text-sm font-medium text-[#64748B]">
                    Net Salary Preview
                  </p>
                  <p className="text-xs text-[#64748B]">
                    Basic + Allowances - Deductions
                  </p>
                </div>
              </div>

              <p className="text-xl font-bold text-[#002185]">
                {formatCurrency(netSalary)}
              </p>
            </div>
          </div>
        </form>

        {/* Footer - Fixed */}
        <div className="shrink-0 flex justify-end gap-3 border-t border-[#E2E8F0] px-6 py-4 bg-[#FFFFFF] rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E2E8F0] px-5 py-2.5 text-sm font-medium text-[#64748B] transition hover:border-[#ff5500] hover:bg-[#F8FAFC] hover:text-[#002185]"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="payslip-form"
            className="rounded-lg bg-[#002185] px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-[#ff5500] hover:shadow-lg"
          >
            Generate Payslip
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayslipsModal;
