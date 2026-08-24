import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Pin,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Tag,
  Building2,
  Share2,
  Check,
} from "lucide-react";
import { getAnnouncementById } from "../../apis/fontApis";
import { notificationService } from "../../services/notificationService";

export const AnnouncementModal = ({
  isOpen = false,
  announcementId = null,
  announcementData = null,
  onClose = () => {},
  onMarkRead = () => {},
  role = "employee",
}) => {
  const [announcement, setAnnouncement] = useState(announcementData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch full details whenever the modal is opened with an ID or data
  const fetchDetails = useCallback(async (id) => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await getAnnouncementById(id);
      if (res?.data?.success && res.data.announcement) {
        setAnnouncement(res.data.announcement);
      }
    } catch (err) {
      console.warn("Could not fetch announcement detail from backend:", err.message);
      // Fallback to existing announcementData if available
      if (!announcementData) {
        setError(err.response?.data?.message || "Failed to load announcement details.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [announcementData]);

  useEffect(() => {
    if (isOpen) {
      if (announcementData) {
        setAnnouncement(announcementData);
      }
      const targetId = announcementId || announcementData?._id || announcementData?.id;
      if (targetId) {
        fetchDetails(targetId);
      }
    } else {
      setError(null);
      setCopied(false);
    }
  }, [isOpen, announcementId, announcementData, fetchDetails]);

  const handleDismiss = useCallback(() => {
    // Notify notification service to refresh counts and unread state
    try {
      notificationService.getNotifications({ role, force: true }).catch(() => {});
      const bc = new BroadcastChannel("eyenit_notification_channel");
      bc.postMessage({ type: "notification_read", timestamp: Date.now() });
      bc.close();
    } catch {
      // BroadcastChannel fallback
    }

    if (onMarkRead && announcement) {
      onMarkRead(announcement);
    }
    if (onClose) {
      onClose();
    }
  }, [role, onMarkRead, announcement, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleDismiss]);

  const handleCopyLink = () => {
    try {
      const textToCopy = `${announcement?.title || "Announcement"}\n\n${announcement?.content || ""}`;
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  if (!isOpen) return null;

  const currentItem = announcement || announcementData || {};
  const priority = (currentItem.priority || "normal").toLowerCase();

  // Priority Badge Helper
  const renderPriorityBadge = () => {
    if (priority === "urgent") {
      return (
        <span
          id="announcement-priority-urgent"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Urgent
        </span>
      );
    }
    if (priority === "important" || priority === "high") {
      return (
        <span
          id="announcement-priority-important"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Important
        </span>
      );
    }
    return (
      <span
        id="announcement-priority-normal"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
      >
        <Info className="w-3.5 h-3.5" />
        Normal
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recently published";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(dateStr);
    }
  };

  const authorName =
    currentItem.author ||
    currentItem.createdBy?.fullName ||
    currentItem.createdBy?.name ||
    "Management";

  return (
    <div
      id="announcement-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
    >
      <div
        id="announcement-detail-modal-container"
        className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Action Bar */}
        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                priority === "urgent"
                  ? "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                  : priority === "important" || priority === "high"
                  ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                  : "bg-[#002185]/10 text-[#002185] dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900"
              }`}
            >
              <Megaphone className="w-5 h-5" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {renderPriorityBadge()}

                {currentItem.isPinned && (
                  <span
                    id="announcement-pinned-tag"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/30"
                  >
                    <Pin className="w-3 h-3 fill-[#ff5500]" />
                    Pinned
                  </span>
                )}

                {currentItem.category && (
                  <span
                    id="announcement-category-tag"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    {currentItem.category}
                  </span>
                )}
              </div>

              <h2
                id="announcement-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight pt-1"
              >
                {isLoading && !currentItem.title ? "Loading announcement..." : currentItem.title || "Announcement Details"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy announcement text"
              aria-label="Copy announcement text"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              id="announcement-modal-close-x-btn"
              type="button"
              onClick={handleDismiss}
              aria-label="Close modal"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip: Author tag & Published Date */}
        <div className="px-6 py-3 bg-[#F8FAFC] dark:bg-slate-850 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#002185] text-white flex items-center justify-center text-[10px] font-bold">
              {authorName.charAt(0).toUpperCase()}
            </div>
            <span id="announcement-author-tag" className="font-semibold text-slate-800 dark:text-slate-200">
              Posted by {authorName}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-[#002185] dark:text-blue-300 font-medium text-[10px] border border-blue-200/60 dark:border-blue-900">
              <ShieldCheck className="w-3 h-3 text-[#ff5500]" />
              Official
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span id="announcement-published-date">
              {formatDate(currentItem.createdAt || currentItem.created_at)}
            </span>
          </div>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading && !currentItem.content ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Clock className="w-8 h-8 animate-spin text-[#002185]" />
              <p className="text-sm font-medium">Fetching complete announcement...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Notice</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Full Text Content with Rich Formatting */}
              <div
                id="announcement-full-content"
                className="text-sm sm:text-base text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-normal"
              >
                {currentItem.content || currentItem.message || "No content details provided for this announcement."}
              </div>

              {/* Department & Target Audience Footer Details */}
              {(currentItem.department || currentItem.targetAudience) && (
                <div className="pt-4 mt-6 border-t border-[#E2E8F0] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {currentItem.department && currentItem.department !== "All" && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-800">
                      <Building2 className="w-4 h-4 text-[#002185] dark:text-blue-400" />
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Department</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{currentItem.department}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-800">
                    <User className="w-4 h-4 text-[#ff5500]" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Audience</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {currentItem.targetAudience === "all" ? "All Company Staff" : currentItem.targetAudience || "All Employees"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Marked as read</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="announcement-modal-dismiss-btn"
              type="button"
              onClick={handleDismiss}
              className="px-6 py-2.5 rounded-full bg-[#002185] hover:bg-[#ff5500] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
