import { useState } from "react";
import { X, Calendar, FileText, Send, CalendarDays, AlertCircle, CheckCircle2 } from "lucide-react";
import { applyForLeave } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";

export const LeaveRequestModal = ({ onClose, onSuccess, initialLeaveType = "Annual Leave" }) => {
  const [formData, setFormData] = useState({
    leaveType: initialLeaveType,
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
      setErrorMessage("End date cannot be earlier than start date.");
      return;
    }

    if (!formData.reason || formData.reason.trim().length < 5) {
      setErrorMessage("Please provide a reason (minimum 5 characters).");
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

        if (onSuccess) {
          onSuccess(data.leave || data);
        }

        setTimeout(() => {
          if (onClose) onClose();
        }, 800);
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
      id="leave-request-modal"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      {/* Modal Card */}
      <div
        id="leave-request-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-[28px] sm:rounded-3xl sm:max-w-lg bg-white dark:bg-slate-900 shadow-2xl border border-[#002185]/20 dark:border-slate-800 animate-fade-in p-5 sm:p-6 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#002185]/5 dark:bg-blue-950/50 text-[#002185] dark:text-blue-400 shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white">Request Leave</h2>
              <p className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400">Submit your time-off request with dates and justification</p>
            </div>
          </div>
          <button
            id="close-leave-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#ff5500] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div id="leave-modal-error-alert" className="mb-4 flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div id="leave-modal-success-alert" className="mb-4 flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form id="leave-request-modal-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Leave Type */}
          <div>
            <label className="block text-xs font-bold text-[#002185] uppercase tracking-wider mb-1.5">
              Leave Type <span className="text-[#ff5500]">*</span>
            </label>
            <select
              id="modal-leave-type-select"
              name="leaveType"
              value={formData.leaveType}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A] font-medium outline-hidden focus:border-[#002185] focus:ring-2 focus:ring-[#002185]/20 cursor-pointer"
            >
              <option value="Annual Leave">Annual Leave (Paid)</option>
              <option value="Sick Leave">Sick Leave (Paid)</option>
              <option value="Casual Leave">Casual Leave (Paid)</option>
              <option value="Maternity Leave">Maternity Leave (Paid)</option>
              <option value="Paternity Leave">Paternity Leave (Paid)</option>
              <option value="Study Leave">Study Leave</option>
              <option value="Bereavement Leave">Bereavement Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#002185] uppercase tracking-wider mb-1.5">
                Start Date <span className="text-[#ff5500]">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  id="modal-leave-start-date"
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A] font-medium outline-hidden focus:border-[#002185] focus:ring-2 focus:ring-[#002185]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002185] uppercase tracking-wider mb-1.5">
                End Date <span className="text-[#ff5500]">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  id="modal-leave-end-date"
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A] font-medium outline-hidden focus:border-[#002185] focus:ring-2 focus:ring-[#002185]/20"
                />
              </div>
            </div>
          </div>

          {/* Duration Summary */}
          {daysCount > 0 && (
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Total Duration Requested:</span>
              <span className="font-bold text-[#002185] bg-[#002185]/10 px-2.5 py-0.5 rounded-full">
                {daysCount} {daysCount === 1 ? "Day" : "Days"}
              </span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-[#002185] uppercase tracking-wider mb-1.5">
              Reason / Justification <span className="text-[#ff5500]">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-[#64748B]" />
              <textarea
                id="modal-leave-reason"
                name="reason"
                rows={3}
                placeholder="Explain the purpose of your leave request..."
                value={formData.reason}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-sm text-[#0F172A] font-medium outline-hidden focus:border-[#002185] focus:ring-2 focus:ring-[#002185]/20 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              id="modal-cancel-leave-btn"
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              id="modal-submit-leave-btn"
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl shadow-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
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
    </div>
  );
};

export default LeaveRequestModal;
