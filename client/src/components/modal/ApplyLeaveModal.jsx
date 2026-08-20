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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FFFFFF] shadow-2xl border border-[#002185]/20 animate-fade-in p-6"
      >
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#ff5500] hover:bg-[#F8FAFC] transition-colors"
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
