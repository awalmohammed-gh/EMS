// components/admin/settings/PayrollSettings.js
import { useState } from "react";
import {
  CreditCard,
  Calendar,
  Banknote,
  Plus,
  X,
} from "lucide-react";

 const payrollSettings = {
  currency: "GHS",
  currencySymbol: "₵",
  payrollFrequency: "Monthly",
  paymentDate: 25,
  paymentMethods: ["Bank Transfer", "Mobile Money", "Cash"],
  taxEnabled: true,
  overtimeEnabled: true,
};

const PayrollSettings = () => {
  const [payroll, setPayroll] = useState(payrollSettings);

  const handleChange = (field, value) => {
    setPayroll((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddPaymentMethod = () => {
    setPayroll((prev) => ({
      ...prev,
      paymentMethods: [...prev.paymentMethods, ""],
    }));
  };

  const handleRemovePaymentMethod = (index) => {
    setPayroll((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((_, i) => i !== index),
    }));
  };

  const handlePaymentMethodChange = (index, value) => {
    setPayroll((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((item, i) =>
        i === index ? value : item,
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Currency
          </label>
          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <select
              value={payroll.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 appearance-none"
            >
              <option value="GHS">GHS - Ghana Cedis</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Currency Symbol
          </label>
          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              value={payroll.currencySymbol}
              onChange={(e) => handleChange("currencySymbol", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Payroll Frequency
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <select
              value={payroll.payrollFrequency}
              onChange={(e) => handleChange("payrollFrequency", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 appearance-none"
            >
              <option value="Weekly">Weekly</option>
              <option value="Bi-Weekly">Bi-Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Payment Date (Day of Month)
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={payroll.paymentDate}
              onChange={(e) =>
                handleChange("paymentDate", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#002185]">
          Payment Methods
        </label>
        {payroll.paymentMethods.map((method, index) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={method}
              onChange={(e) => handlePaymentMethodChange(index, e.target.value)}
              placeholder="Payment method"
              className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
            <button
              onClick={() => handleRemovePaymentMethod(index)}
              className="p-2 text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors"
              disabled={payroll.paymentMethods.length <= 1}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddPaymentMethod}
          className="flex items-center gap-1 text-sm text-[#ff5500] hover:underline mt-1"
        >
          <Plus className="w-4 h-4" />
          Add Payment Method
        </button>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={payroll.taxEnabled}
            onChange={(e) => handleChange("taxEnabled", e.target.checked)}
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">Enable Tax Calculation</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={payroll.overtimeEnabled}
            onChange={(e) => handleChange("overtimeEnabled", e.target.checked)}
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">
            Enable Overtime Calculation
          </span>
        </label>
      </div>
    </div>
  );
};

export default PayrollSettings;
