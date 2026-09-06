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
          ? "bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm transition-all duration-300"
          : "bg-white dark:bg-[#111927] rounded-xl"
      }`}
    >
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#002185]/10 dark:bg-blue-900/30 text-[#002185] dark:text-blue-400 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mb-5 flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Application Received</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="mb-5 flex items-center gap-2.5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Leave Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Leave Type <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              name="leaveType"
              value={formData.leaveType}
              onChange={handleChange}
              disabled={isLoading}
              required
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#111927] transition-all appearance-none cursor-pointer disabled:opacity-60"
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
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Date Range Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Leave Date Range <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Start Date</span>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#111927] transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">End Date</span>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate || new Date().toISOString().split("T")[0]}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#111927] transition-all disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Real-time Days Calculation Pill */}
          {daysCount > 0 && (
            <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Calculated Requested Period:</span>
              </div>
              <span className="bg-[#002185] dark:bg-blue-600 text-white px-2.5 py-1 rounded-lg font-bold">
                {daysCount} {daysCount === 1 ? "Day" : "Days"} Total
              </span>
            </div>
          )}
        </div>

        {/* Reason Textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Reason / Justification <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {formData.reason.length} / 500 characters
            </span>
          </div>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              placeholder="State the purpose of your leave request (e.g. medical appointment, annual holiday, personal development)..."
              required
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#111927] transition-all resize-none disabled:opacity-60"
            />
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-[#162033] border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
          <Info className="w-4 h-4 text-[#002185] dark:text-blue-400 shrink-0 mt-0.5" />
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
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#002185] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#162033] transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all duration-200 disabled:opacity-60 cursor-pointer"
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
