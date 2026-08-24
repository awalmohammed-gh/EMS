import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  Info,
  Clock,
  Sparkles,
  X,
  ArrowRight,
  RefreshCw,
  Check,
  DollarSign,
  Megaphone,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useNotificationManager } from "../services/notificationService";
import { AnnouncementModal } from "./modal/AnnouncementModal";

export const NotificationBell = ({ role = "admin", className = "", userId }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [readerModalItem, setReaderModalItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const dropdownRef = useRef(null);

  // Hook into the frontend notification service for dynamic role-based synchronization
  const {
    notifications,
    unreadCount,
    metrics,
    isLoading,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotificationManager(role, { userId, autoPoll: true, pollInterval: 15000 });

  // Click outside listener to dismiss the notifications popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Tabbed notification filtering
  const filteredList = useMemo(() => {
    if (activeTab === "announcement") {
      return notifications.filter(
        (n) => n.category === "announcement" || n.type === "announcement"
      );
    }
    if (activeTab === "leave") {
      return notifications.filter((n) => n.category === "leave");
    }
    if (activeTab === "payroll") {
      return notifications.filter((n) => n.category === "payroll");
    }
    if (activeTab === "system") {
      return notifications.filter(
        (n) =>
          n.category === "system" ||
          n.category === "announcement" ||
          n.category === "attendance" ||
          !n.category
      );
    }
    if (activeTab === "unread") {
      return notifications.filter((n) => !n.is_read && n.unread !== false);
    }
    return notifications;
  }, [notifications, activeTab]);

  // Relative time helper
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return "Just now";
    try {
      const now = new Date();
      const past = new Date(timestamp);
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return past.toLocaleDateString("en-GH", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  // Get icon for notification category
  const getNotificationIcon = (item) => {
    if (item.type === "announcement" || item.category === "announcement") {
      return <Megaphone className="w-4 h-4 text-[#ff5500]" />;
    }
    switch (item.category) {
      case "leave":
        return <CalendarCheck className="w-4 h-4 text-[#ff5500]" />;
      case "payroll":
        return <DollarSign className="w-4 h-4 text-[#16A34A]" />;
      case "attendance":
        return <Clock className="w-4 h-4 text-[#002185] dark:text-blue-400" />;
      case "system":
        return <Sparkles className="w-4 h-4 text-[#002185] dark:text-blue-400" />;
      default:
        return <Info className="w-4 h-4 text-[#002185] dark:text-blue-400" />;
    }
  };

  const getIconBg = (item) => {
    if (item.type === "announcement" || item.category === "announcement") {
      return "bg-[#ff5500]/10 border-[#ff5500]/20";
    }
    switch (item.category) {
      case "leave":
        return "bg-[#ff5500]/10 border-[#ff5500]/20";
      case "payroll":
        return "bg-[#16A34A]/10 border-[#16A34A]/20";
      case "attendance":
        return "bg-[#002185]/10 border-[#002185]/20 dark:bg-blue-500/20 dark:border-blue-500/30";
      case "system":
        return "bg-[#002185]/10 border-[#002185]/20 dark:bg-blue-500/20 dark:border-blue-500/30";
      default:
        return "bg-[#F1F5F9] dark:bg-slate-800 border-[#E2E8F0] dark:border-slate-700";
    }
  };

  // Notification item navigation/action handler
  const handleItemClick = useCallback(
    async (item) => {
      const itemId = item._id || item.id;
      const isItemRead = Boolean(item.is_read || item.unread === false);
      const actionTargetUrl = item.action_url || item.actionUrl;

      if (!isItemRead) {
        await markAsRead(itemId);
      }

      // If it's an announcement notification, open the reader modal
      if (item.type === "announcement" || item.category === "announcement") {
        const annId =
          item.announcementId ||
          item.metadata?.announcementId ||
          item.metadata?.announcement_id ||
          item._id ||
          item.id;

        setReaderModalItem({
          _id: annId,
          id: annId,
          title: item.title?.replace(/^(📢|📌|🚨)\s*(Company|Urgent|Important)?\s*Announcement:\s*/i, "") || item.title,
          content: item.message,
          priority: item.priority || "normal",
          createdAt: item.created_at || item.createdAt || item.timestamp,
          category: item.category || "Company News",
          author: item.sender_name || "Management",
        });
        setIsOpen(false);
        return;
      }

      if (actionTargetUrl) {
        setIsOpen(false);
        navigate(actionTargetUrl);
      }
    },
    [markAsRead, navigate]
  );

  return (
    <>
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        {/* Bell Trigger Button */}
        <button
          id="dashboard-notification-bell-btn"
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              refresh(false);
            }
          }}
          aria-label="View system notifications and real-time alerts"
          className="relative p-2 sm:p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 text-[#002185] dark:text-blue-400 hover:border-[#002185] dark:hover:border-blue-500 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#002185]/20"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:rotate-12" />

          {/* Live Dynamic Unread Indicator Badge */}
          {unreadCount > 0 && (
            <span
              id="notification-unread-badge"
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 sm:min-w-[20px] sm:h-5 px-1 rounded-full bg-[#ff5500] text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center shadow-md animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Popover Dropdown Panel */}
        {isOpen && (
          <div
            id="dashboard-notifications-dropdown"
            className="absolute right-0 mt-3 w-[340px] sm:w-[420px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {/* Header */}
            <div className="p-4 px-5 border-b border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#002185]/10 dark:bg-blue-500/20 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-[#002185] dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#002185] dark:text-blue-400">Notifications</h3>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    {unreadCount > 0
                      ? `${unreadCount} unread realtime alert${unreadCount > 1 ? "s" : ""}`
                      : notifications.length > 0
                      ? `${notifications.length} total notification${notifications.length > 1 ? "s" : ""}`
                      : "All notifications caught up"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => refresh(true)}
                  disabled={isLoading}
                  title="Refresh notifications"
                  className="p-1.5 rounded-lg text-[#64748B] dark:text-slate-400 hover:text-[#002185] dark:hover:text-blue-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#002185] dark:text-blue-400" : ""}`} />
                </button>
              </div>
            </div>

            {/* Quick Bulk Action Bar: Mark all as read & Delete all */}
            <div className="px-4 py-2 bg-[#F8FAFC]/80 dark:bg-slate-950/80 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <button
                id="notification-mark-all-read-btn"
                type="button"
                onClick={() => {
                  if (unreadCount > 0) {
                    markAllAsRead();
                  }
                }}
                disabled={unreadCount === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-[#002185] dark:text-blue-400 hover:bg-[#002185]/10 dark:hover:bg-blue-500/20 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                title={unreadCount > 0 ? "Mark all notifications as read" : "All notifications are already marked read"}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>

              <button
                id="notification-delete-all-btn"
                type="button"
                onClick={() => {
                  if (notifications.length > 0) {
                    setShowDeleteConfirm(true);
                  }
                }}
                disabled={notifications.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all cursor-pointer"
                title={notifications.length > 0 ? "Delete all notifications" : "No notifications to delete"}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete all</span>
              </button>
            </div>

            {/* Delete All Confirmation Banner */}
            {showDeleteConfirm && (
              <div className="p-3 px-4 bg-rose-50 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-900 text-xs flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-200 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Clear all {notifications.length} notifications permanently?</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="notification-confirm-delete-all-btn"
                    type="button"
                    onClick={async () => {
                      await deleteAllNotifications();
                      setShowDeleteConfirm(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-2xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Yes, Delete All</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-2 bg-[#F8FAFC] dark:bg-slate-950 border-b border-[#E2E8F0] dark:border-slate-800 overflow-x-auto text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-[#002185] dark:bg-blue-600 text-white shadow-xs font-bold"
                    : "text-[#64748B] dark:text-slate-400 hover:text-[#002185] dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-850"
                }`}
              >
                All ({metrics.all})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("leave")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "leave"
                    ? "bg-[#002185] dark:bg-blue-600 text-white shadow-xs font-bold"
                    : "text-[#64748B] dark:text-slate-400 hover:text-[#002185] dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-850"
                }`}
              >
                Leaves ({metrics.leave})
              </button>
              {metrics.payroll > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("payroll")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "payroll"
                      ? "bg-[#002185] dark:bg-blue-600 text-white shadow-xs font-bold"
                      : "text-[#64748B] dark:text-slate-400 hover:text-[#002185] dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-850"
                  }`}
                >
                  Payroll ({metrics.payroll})
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("system")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "system"
                    ? "bg-[#002185] dark:bg-blue-600 text-white shadow-xs font-bold"
                    : "text-[#64748B] dark:text-slate-400 hover:text-[#002185] dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-850"
                }`}
              >
                Updates ({metrics.system})
              </button>
              {metrics.unread > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("unread")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === "unread"
                      ? "bg-[#ff5500] text-white shadow-xs font-bold"
                      : "text-[#ff5500] hover:bg-[#ff5500]/10 font-bold"
                  }`}
                >
                  Unread ({metrics.unread})
                </button>
              )}
            </div>

            {/* Notification List Body */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F1F5F9] dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center mx-auto mb-3 text-[#94A3B8]">
                    <Check className="w-6 h-6 text-[#16A34A]" />
                  </div>
                  <p className="text-sm font-bold text-[#0F172A] dark:text-slate-100">You&apos;re all caught up!</p>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                    {activeTab === "unread"
                      ? "No unread notifications to review."
                      : "No real-time notifications matching this filter."}
                  </p>
                </div>
              ) : (
                filteredList.map((item) => {
                  const itemId = item._id || item.id;
                  const isItemRead = Boolean(item.is_read || item.unread === false);
                  const actionTargetUrl = item.action_url || item.actionUrl;
                  const actionBtnLabel = item.action_label || item.actionLabel || "View Details";

                  return (
                    <div
                      key={itemId}
                      onClick={() => handleItemClick(item)}
                      className={`p-4 transition-all cursor-pointer flex gap-3 group relative hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 ${
                        isItemRead ? "bg-white dark:bg-slate-900 opacity-85" : "bg-[#F8FAFC]/60 dark:bg-slate-850/60"
                      }`}
                    >
                      {/* Category Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${getIconBg(
                          item
                        )}`}
                      >
                        {getNotificationIcon(item)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-1">
                          <h4
                            className={`text-xs truncate ${
                              isItemRead
                                ? "font-semibold text-[#0F172A] dark:text-slate-200"
                                : "font-bold text-[#002185] dark:text-blue-400"
                            }`}
                          >
                            {item.title}
                          </h4>
                          {!isItemRead && (
                            <span className="w-2 h-2 rounded-full bg-[#ff5500] shrink-0" title="Unread" />
                          )}
                        </div>

                        <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed line-clamp-2">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-2">
                          <span className="text-[10px] text-[#94A3B8] dark:text-slate-500 font-medium">
                            {getRelativeTime(item.created_at || item.createdAt || item.timestamp)}
                          </span>

                          {(actionTargetUrl || item.type === "announcement" || item.category === "announcement") && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(item);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#002185] dark:text-blue-400 hover:text-[#ff5500] dark:hover:text-[#ff5500] transition-colors"
                            >
                              <span>{actionBtnLabel}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick Dismiss Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(itemId);
                        }}
                        title="Dismiss notification"
                        className="absolute top-3 right-3 p-1 rounded-lg text-[#94A3B8] dark:text-slate-500 hover:text-[#DC2626] dark:hover:text-red-400 hover:bg-[#FEF2F2] dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Controls */}
            <div className="p-3 px-4 bg-[#F8FAFC] dark:bg-slate-950 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (role === "admin") {
                    navigate("/admin/dashboard/announcements");
                  } else {
                    navigate("/employee/dashboard");
                  }
                }}
                className="text-[#002185] dark:text-blue-400 hover:text-[#ff5500] dark:hover:text-[#ff5500] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>{role === "admin" ? "Announcement Board" : "View Dashboard"}</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              {notifications.length > 0 && (
                <span className="text-[11px] text-[#94A3B8] dark:text-slate-500">
                  Realtime Broadcast Active
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Announcement Detail Reader Modal */}
      <AnnouncementModal
        isOpen={Boolean(readerModalItem)}
        announcementId={readerModalItem?._id || readerModalItem?.id}
        announcementData={readerModalItem}
        onClose={() => {
          setReaderModalItem(null);
          refresh(false);
        }}
        onMarkRead={() => {
          refresh(false);
        }}
        role={role}
      />
    </>
  );
};

export default NotificationBell;
