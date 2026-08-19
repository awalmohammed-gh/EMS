import { useState } from "react";
import {
  X,
  Calendar,
  FileText,
  Send,
  User,
  Briefcase,
  Clock,
  AlertCircle,
} from "lucide-react";
import { applyForLeave } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";

const ApplyLeaveModal = ({ onClose, onSuccess }) => {
  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);

  const { setShowToast } = useManagement();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setLeaveFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (isError) {
      setIsError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate dates
    if (leaveFormData.startDate && leaveFormData.endDate) {
      const start = new Date(leaveFormData.startDate);
      const end = new Date(leaveFormData.endDate);

      if (end < start) {
        setIsError("End date cannot be before start date.");
        setShowToast({
          show: true,
          message: "End date cannot be before start date.",
          type: "error",
        });
        return;
      }
    }

    try {
      setIsLoading(true);
      setIsError(null);

      const leaveData = {
        leaveType: leaveFormData.leaveType,
        startDate: leaveFormData.startDate,
        endDate: leaveFormData.endDate,
        reason: leaveFormData.reason,
      };

      console.log("Leave Request:", leaveData);

      const { data } = await applyForLeave(leaveData);

      if (data.success) {
        setShowToast({
          show: true,
          message: data.message || "Leave request submitted successfully!",
          type: "success",
        });

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }

        // Close modal after successful submission
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setIsError(data.message || "Failed to submit leave request.");
        setShowToast({
          show: true,
          message: data.message || "Failed to submit leave request.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to submit leave request. Please try again.";
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

  // Calculate days between start and end date
  const calculateDays = () => {
    if (leaveFormData.startDate && leaveFormData.endDate) {
      const start = new Date(leaveFormData.startDate);
      const end = new Date(leaveFormData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return null;
  };

  const daysCount = calculateDays();

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
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-[#FFFFFF] shadow-2xl border-2 border-[#002185] animate-fade-in"
      >
        {/* Header - Sticky */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5 bg-[#FFFFFF] rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002185]">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#002185]">
                Apply for Leave
              </h2>
              <p className="text-sm text-[#64748B]">
                Submit a new leave request
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#ff5500]"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {isError && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-[#FEF2F2] border border-[#DC2626]/20 p-3">
            <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0" />
            <p className="text-sm text-[#DC2626]">{isError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Leave Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#002185]">
              Leave Type <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <select
                name="leaveType"
                value={leaveFormData.leaveType}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 pl-10 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select leave type</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Paternity Leave">Paternity Leave</option>
                <option value="Study Leave">Study Leave</option>
                <option value="Compassionate Leave">Compassionate Leave</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-[#64748B]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Start Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                Start Date <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="date"
                  name="startDate"
                  value={leaveFormData.startDate}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 pl-10 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                End Date <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="date"
                  name="endDate"
                  value={leaveFormData.endDate}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  min={
                    leaveFormData.startDate ||
                    new Date().toISOString().split("T")[0]
                  }
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 pl-10 text-sm text-[#0F172A] outline-none transition hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Days Count - Shows when both dates are selected */}
          {daysCount !== null && daysCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3 hover:border-[#ff5500] transition-all duration-200">
              <Clock className="h-4 w-4 text-[#ff5500]" />
              <p className="text-sm text-[#002185]">
                <span className="font-semibold">{daysCount}</span>{" "}
                {daysCount === 1 ? "day" : "days"} requested
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#002185]">
              Reason <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
              <textarea
                name="reason"
                value={leaveFormData.reason}
                onChange={handleChange}
                required
                disabled={isLoading}
                rows={4}
                placeholder="Enter the reason for your leave..."
                className="w-full resize-none rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 pl-10 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] hover:border-[#ff5500] focus:border-[#ff5500] focus:ring-2 focus:ring-[#ff5500]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <p className="mt-1.5 text-xs text-[#64748B]">
              Please provide a detailed reason for your leave request.
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-4 hover:border-[#ff5500] transition-all duration-200">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-[#002185] flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-xs leading-relaxed text-[#64748B]">
                Your leave request will be sent to your administrator for
                review. The request will remain{" "}
                <span className="font-semibold text-[#002185]">Pending</span>{" "}
                until it is approved or rejected.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-[#E2E8F0] pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-[#E2E8F0] px-5 py-2.5 text-sm font-medium text-[#64748B] transition hover:border-[#ff5500] hover:bg-[#F8FAFC] hover:text-[#002185] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#002185] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#ff5500] shadow-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeaveModal;
