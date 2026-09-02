import { X } from "lucide-react";
import LeaveRequestForm from "../LeaveRequestForm";

export const ApplyLeaveModal = ({ onClose, onSuccess }) => {
  const handleSuccess = (createdLeave) => {
    if (onSuccess) {
      onSuccess(createdLeave);
    }
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div
      id="apply-leave-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      {/* Modal Container */}
      <div
        id="apply-leave-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-t-[28px] sm:rounded-3xl sm:max-w-lg bg-white dark:bg-slate-900 shadow-2xl border border-[#002185]/20 dark:border-slate-800 animate-fade-in p-5 sm:p-6"
      >
        <div className="flex justify-end mb-2">
          <button
            id="btn-close-apply-leave-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#ff5500] hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <LeaveRequestForm
          inline={false}
          onSuccess={handleSuccess}
          onCancel={onClose}
          title="Apply for Leave"
          subtitle="Submit your time off request with date range and justification"
        />
      </div>
    </div>
  );
};

export default ApplyLeaveModal;
