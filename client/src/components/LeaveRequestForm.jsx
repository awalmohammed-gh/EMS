import { useState } from "react";
import {
  Calendar,
  Clock,
  FileText,
  Send,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Info,
} from "lucide-react";
import { applyForLeave } from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";

export const LeaveRequestForm = ({
  onSuccess = null,
  onCancel = null,
  inline = true,
  title = "Submit Leave Request",
  subtitle = "Request time off by specifying your leave type, date range, and reason.",
}) => {
  const [formData, setFormData] = useState({
    leaveType: "Annual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { setShowToast } = useManagement();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);
  };

  // Calculate inclusive duration in days
  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    const diff = Math.abs(end - start);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const daysCount = calculateDays();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.leaveType) {
      setErrorMessage("Please select a valid leave category.");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setErrorMessage("Please select both a start date and an end date.");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
      setErrorMessage("End date cannot be prior to the start date.");
      return;
    }

    if (!formData.reason || formData.reason.trim().length < 5) {
      setErrorMessage("Please provide a meaningful reason (minimum 5 characters).");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload = {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
      };

      const response = await applyForLeave(payload);
      const data = response.data;

      if (data && (data.success || response.status === 200 || response.status === 201)) {
        const msg = data.message || "Leave request submitted successfully!";
        setSuccessMessage(msg);
        setShowToast({
          show: true,
          message: msg,
          type: "success",
        });

        // Reset form
        setFormData({
          leaveType: "Annual Leave",
          startDate: "",
          endDate: "",
          reason: "",
        });

        if (onSuccess) {
          onSuccess(data.leave);
        }
      } else {
        const errorMsg = data?.message || "Failed to submit leave request.";
        setErrorMessage(errorMsg);
        setShowToast({
          show: true,
          message: errorMsg,
          type: "error",
        });
      }
    } catch (err) {
      console.error("Error submitting leave request:", err);
      const msg =
        err.response?.data?.message ||
        "An unexpected error occurred while communicating with the backend. Please try again.";
      setErrorMessage(msg);
      setShowToast({
        show: true,
        message: msg,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="employee-leave-request-form"
      className={`${
        inline
          ? "bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300"
          : "bg-[#FFFFFF] rounded-xl"
      }`}
    >
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#002185]/5 text-[#002185] shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#002185] tracking-tight">{title}</h3>
            <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mb-5 flex items-center gap-2.5 p-4 rounded-xl bg-[#F0FDF4] border border-[#16A34A]/20 text-[#16A34A] text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Application Received</p>
            <p className="text-xs text-[#16A34A]/90">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="mb-5 flex items-center gap-2.5 p-4 rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 text-[#DC2626] text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Leave Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#002185] uppercase tracking-wider mb-2">
            Leave Type <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <select
              name="leaveType"
              value={formData.leaveType}
              onChange={handleChange}
              disabled={isLoading}
              required
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#002185] focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-60"
            >
              <option value="Annual Leave">Annual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Paternity Leave">Paternity Leave</option>
              <option value="Study Leave">Study Leave</option>
              <option value="Compassionate Leave">Compassionate Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#64748B]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Date Range Selection */}
        <div>
          <label className="block text-xs font-semibold text-[#002185] uppercase tracking-wider mb-2">
            Leave Date Range <span className="text-[#DC2626]">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <span className="block text-[11px] text-[#64748B] mb-1">Start Date</span>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#002185] focus:bg-white transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <span className="block text-[11px] text-[#64748B] mb-1">End Date</span>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || new Date().toISOString().split("T")[0]}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#002185] focus:bg-white transition-all disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Real-time Days Calculation Pill */}
          {daysCount > 0 && (
            <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
              <div className="flex items-center gap-2 text-[#002185] font-medium">
                <Clock className="w-4 h-4 text-[#ff5500]" />
                <span>Calculated Requested Period:</span>
              </div>
              <span className="bg-[#002185] text-white px-2.5 py-1 rounded-lg font-bold">
                {daysCount} {daysCount === 1 ? "Day" : "Days"} Total
              </span>
            </div>
          )}
        </div>

        {/* Reason Textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-[#002185] uppercase tracking-wider">
              Reason / Justification <span className="text-[#DC2626]">*</span>
            </label>
            <span className="text-[11px] text-[#64748B]">
              {formData.reason.length} / 500 characters
            </span>
          </div>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-[#64748B]" />
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              placeholder="State the purpose of your leave request (e.g. medical appointment, annual holiday, personal development)..."
              required
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#002185] focus:bg-white transition-all resize-none disabled:opacity-60"
            />
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B]">
          <Info className="w-4 h-4 text-[#002185] shrink-0 mt-0.5" />
          <p>
            Submitted requests are stored securely and routed to HR / Administration for review. Status updates will reflect live in your leave dashboard.
          </p>
        </div>

        {/* Submission Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#002185] hover:bg-[#F8FAFC] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#002185] text-white text-xs font-bold shadow-sm hover:bg-[#ff5500] hover:shadow-md transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Request...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Leave Request</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveRequestForm;
