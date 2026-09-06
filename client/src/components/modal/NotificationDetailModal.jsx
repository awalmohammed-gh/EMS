import { useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Calendar,
} from "lucide-react";

/**
 * NotificationDetailModal component
 * Perfectly centered both vertically and horizontally in the viewport with a fixed backdrop overlay
 * Rendered using ReactDOM.createPortal into document.body to avoid parent container CSS clipping.
 */
export const NotificationDetailModal = ({
  isOpen = false,
  notification = null,
  onClose = () => {},
  onMarkRead = () => {},
}) => {
  // Prevent background scrolling while modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key press
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!isOpen || !notification) return null;

  const item = notification;
  const senderName = item.sender_name || item.author || "System";
  const initial = senderName.charAt(0).toUpperCase() || "S";
  const isOfficial = true;

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  const handleDismiss = () => {
    if (onMarkRead) {
      onMarkRead(item);
    }
    if (onClose) {
      onClose();
    }
  };

  const modalContent = (
    <div
      id="notification-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-modal-title"
    >
      <div
        id="notification-detail-modal-container"
        className="relative w-full max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-[28px] sm:rounded-3xl sm:max-w-lg shadow-2xl p-5 sm:p-6 overflow-hidden flex flex-col gap-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sender Avatar Badge */}
            <div
              id="notification-sender-badge"
              className="w-10 h-10 rounded-full bg-[#002185] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm"
            >
              {initial}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  Posted by {senderName}
                </span>
                {isOfficial && (
                  <span
                    id="notification-official-badge"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/80 text-[#002185] dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                  >
                    <ShieldCheck className="w-3 h-3 text-[#ff5500]" />
                    Official
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(item.createdAt || item.created_at || item.timestamp)}</span>
              </div>
            </div>
          </div>

          <button
            id="btn-close-notification-modal-x"
            type="button"
            onClick={handleDismiss}
            aria-label="Close notification modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Body Content */}
        <div className="space-y-2.5 py-1 overflow-y-auto max-h-[60vh]">
          {item.title && (
            <h3
              id="notification-modal-title"
              className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug"
            >
              {item.title}
            </h3>
          )}

          <div
            id="notification-modal-body"
            className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed"
          >
            {item.message || item.content || "No details provided for this alert."}
          </div>
        </div>

        {/* Footer Section */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 shrink-0">
          {/* Left: Marked as read status */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold justify-center sm:justify-start">
            <CheckCircle2 className="w-4 h-4" />
            <span>Marked as read</span>
          </div>

          {/* Right: Prominent Styled Close Button */}
          <button
            id="btn-close-notification-modal"
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#002185] hover:bg-[#ff5500] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 text-center"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render into document.body using portal to guarantee overlay escaping from parent styling
  if (typeof document !== "undefined" && document.body) {
    return ReactDOM.createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default NotificationDetailModal;
