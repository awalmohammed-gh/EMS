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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      {/* Modal Container */}
      <div
        id="apply-leave-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg mx-auto bg-white dark:bg-[#111927] border border-slate-200/70 dark:border-slate-800 rounded-2xl shadow-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in p-5 sm:p-6"
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
