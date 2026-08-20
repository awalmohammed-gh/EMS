import mongoose from "mongoose";
import { Notification } from "../models/notificationModel.js";

// In-memory reactive store for role-based notifications (guarantees offline & instant resilience)
export const liveNotificationStore = [
  // ================= ADMIN ROLE NOTIFICATIONS (Triggered by Employee Actions) =================
  {
    _id: "notif_admin_001",
    id: "notif_admin_001",
    recipient_id: "admin",
    recipient_role: "admin",
    sender_id: "demo_employee_id_001",
    sender_role: "employee",
    sender_name: "Kwame Mensah",
    title: "New Annual Leave Request Submitted",
    message: "Kwame Mensah (Software Engineering) submitted a request for 4 days of Annual Leave from 2026-08-25 to 2026-08-28 for review.",
    type: "leave_request",
    category: "leave",
    priority: "high",
    action_url: "/admin/dashboard/leave",
    action_label: "Review Leave Request",
    metadata: {
      employeeId: "EMP001",
      employeeName: "Kwame Mensah",
      department: "Software Engineering",
      leaveType: "Annual Leave",
      totalDays: 4,
      startDate: "2026-08-25",
      endDate: "2026-08-28",
    },
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    _id: "notif_admin_002",
    id: "notif_admin_002",
    recipient_id: "admin",
    recipient_role: "admin",
    sender_id: "emp_002",
    sender_role: "employee",
    sender_name: "Ama Serwaa",
    title: "New Casual Leave Request Submitted",
    message: "Ama Serwaa (Design & UX) submitted a 1-day Casual Leave request for 2026-08-22 (Urgent personal banking and passport renewal).",
    type: "leave_request",
    category: "leave",
    priority: "medium",
    action_url: "/admin/dashboard/leave",
    action_label: "Review Leave Request",
    metadata: {
      employeeId: "EMP002",
      employeeName: "Ama Serwaa",
      department: "Design & UX",
      leaveType: "Casual Leave",
      totalDays: 1,
      startDate: "2026-08-22",
      endDate: "2026-08-22",
    },
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    _id: "notif_admin_003",
    id: "notif_admin_003",
    recipient_id: "admin",
    recipient_role: "admin",
    sender_id: "demo_employee_id_001",
    sender_role: "employee",
    sender_name: "Kwame Mensah",
    title: "Employee Profile Details Updated",
    message: "Kwame Mensah updated contact telephone and emergency contact details in the employee portal directory.",
    type: "profile_updated",
    category: "profile",
    priority: "low",
    action_url: "/admin/dashboard/employees",
    action_label: "View Employee Directory",
    metadata: {
      employeeId: "EMP001",
      employeeName: "Kwame Mensah",
      field: "Emergency Contact / Phone",
    },
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
  {
    _id: "notif_admin_004",
    id: "notif_admin_004",
    recipient_id: "admin",
    recipient_role: "admin",
    sender_id: "system",
    sender_role: "system",
    sender_name: "Attendance Monitor",
    title: "Daily Attendance Reconciliation Report",
    message: "Morning check-in roster complete. 88% on-time staff attendance recorded for active engineering and design teams.",
    type: "attendance_alert",
    category: "attendance",
    priority: "info",
    action_url: "/admin/dashboard/attendance",
    action_label: "View Timesheet Log",
    metadata: {
      rate: "88%",
      date: new Date().toISOString().split("T")[0],
    },
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 3600 * 5).toISOString(),
  },

  // ================= EMPLOYEE ROLE NOTIFICATIONS (Triggered by Admin Actions) =================
  {
    _id: "notif_emp_001",
    id: "notif_emp_001",
    recipient_id: "demo_employee_id_001",
    recipient_role: "employee",
    sender_id: "admin_001",
    sender_role: "admin",
    sender_name: "Payroll Administrator",
    title: "New Payslip Published (August 2026)",
    message: "Your monthly salary disbursement of GHS 4,500.00 for August 2026 has been generated and approved by Accounts.",
    type: "payroll_published",
    category: "payroll",
    priority: "high",
    action_url: "/employee/dashboard/payslips",
    action_label: "View Payslip & Breakdown",
    metadata: {
      period: "August 2026",
      netSalary: 4500,
      payslipNumber: "PAY-2026-08-001",
    },
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    _id: "notif_emp_002",
    id: "notif_emp_002",
    recipient_id: "demo_employee_id_001",
    recipient_role: "employee",
    sender_id: "admin_001",
    sender_role: "admin",
    sender_name: "Human Resources",
    title: "Leave Request Approved",
    message: "Your Annual Leave request for 5 days (2026-09-01 to 2026-09-05) has been approved by HR management.",
    type: "leave_approved",
    category: "leave",
    priority: "high",
    action_url: "/employee/dashboard/leave",
    action_label: "View Leave History",
    metadata: {
      leaveType: "Annual Leave",
      totalDays: 5,
      startDate: "2026-09-01",
      endDate: "2026-09-05",
      status: "Approved",
    },
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    _id: "notif_emp_003",
    id: "notif_emp_003",
    recipient_id: "all_employees",
    recipient_role: "employee",
    sender_id: "admin_001",
    sender_role: "admin",
    sender_name: "Executive Management",
    title: "Company Holiday Notice: Founders' Day",
    message: "Statutory public holiday scheduled on September 21, 2026. The office will remain closed and standard operations resume the following business day.",
    type: "announcement",
    category: "announcement",
    priority: "info",
    action_url: "/employee/dashboard",
    action_label: "View Dashboard",
    metadata: {
      holidayDate: "2026-09-21",
    },
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 3600 * 8).toISOString(),
  },
  {
    _id: "notif_emp_004",
    id: "notif_emp_004",
    recipient_id: "all_employees",
    recipient_role: "employee",
    sender_id: "admin_001",
    sender_role: "admin",
    sender_name: "System Security Team",
    title: "Security & Portal Policy Update",
    message: "Two-factor authentication guidelines and session timeout parameters have been refreshed for employee accounts.",
    type: "system_update",
    category: "system",
    priority: "low",
    action_url: "/employee/dashboard/settings",
    action_label: "Account Settings",
    metadata: {
      policy: "v2.4",
    },
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 86400).toISOString(),
  },
];

// Helper to create and record a new notification
export const createNotificationRecord = async ({
  recipient_id,
  recipient_role,
  sender_id = "system",
  sender_role = "system",
  sender_name = "System",
  title,
  message,
  type = "system_update",
  category = "system",
  priority = "medium",
  action_url = "",
  action_label = "View Details",
  metadata = {},
}) => {
  const newNotif = {
    _id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    id: "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
    recipient_id: String(recipient_id || (recipient_role === "admin" ? "admin" : "all_employees")),
    recipient_role: recipient_role === "admin" ? "admin" : "employee",
    sender_id: String(sender_id),
    sender_role,
    sender_name,
    title,
    message,
    type,
    category,
    priority,
    action_url,
    action_label,
    metadata,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  // 1. Attempt writing to MongoDB if available
  try {
    const doc = await Notification.create({
      recipient_id: newNotif.recipient_id,
      recipient_role: newNotif.recipient_role,
      sender_id: newNotif.sender_id,
      sender_role: newNotif.sender_role,
      sender_name: newNotif.sender_name,
      title: newNotif.title,
      message: newNotif.message,
      type: newNotif.type,
      category: newNotif.category,
      priority: newNotif.priority,
      action_url: newNotif.action_url,
      action_label: newNotif.action_label,
      metadata: newNotif.metadata,
      is_read: false,
      created_at: new Date(),
    });
    if (doc) {
      newNotif._id = String(doc._id);
      newNotif.id = String(doc._id);
    }
  } catch (err) {
    console.warn("MongoDB notification create fallback:", err.message);
  }

  // 2. Add to reactive in-memory store
  liveNotificationStore.unshift(newNotif);
  return newNotif;
};

// GET /api/notifications
// Retrieves role-filtered notification list
export const getNotifications = async (req, res) => {
  try {
    const queryRole = req.query.role || req.headers["x-role"] || (req.baseUrl.includes("admin") ? "admin" : "");
    const userRole = req.employee?.role || (req.admin ? "admin" : queryRole || "admin");
    const isAdmin = userRole === "admin" || queryRole === "admin";

    const employeeId =
      req.employee?.id ||
      req.employee?._id ||
      req.employee?.employeeId ||
      req.headers["x-employee-id"] ||
      "demo_employee_id_001";

    let dbNotifications = [];

    // 1. Try querying MongoDB for this role and recipient
    try {
      const filter = isAdmin
        ? { recipient_role: "admin" }
        : {
            recipient_role: "employee",
            $or: [
              { recipient_id: String(employeeId) },
              { recipient_id: "all_employees" },
              { recipient_id: "demo_employee_id_001" },
              { recipient_id: "EMP001" },
            ],
          };

      const found = await Notification.find(filter).sort({ created_at: -1 }).lean();
      if (found && found.length > 0) {
        dbNotifications = found.map((n) => ({
          ...n,
          id: String(n._id),
          unread: !n.is_read,
          timestamp: n.created_at || n.createdAt,
        }));
      }
    } catch (err) {
      console.warn("Notification DB fetch fallback:", err.message);
    }

    // 2. Merge with live in-memory store
    const storeNotifications = liveNotificationStore
      .filter((n) => {
        if (isAdmin) {
          return n.recipient_role === "admin";
        } else {
          return (
            n.recipient_role === "employee" &&
            (n.recipient_id === String(employeeId) ||
              n.recipient_id === "all_employees" ||
              n.recipient_id === "demo_employee_id_001" ||
              n.recipient_id === "EMP001")
          );
        }
      })
      .map((n) => ({
        ...n,
        id: String(n._id || n.id),
        unread: !n.is_read,
        timestamp: n.created_at || n.createdAt,
      }));

    // Deduplicate by ID
    const seen = new Set();
    const merged = [];

    // Prioritize storeNotifications so dynamic in-turn updates show immediately
    [...storeNotifications, ...dbNotifications].forEach((item) => {
      const key = String(item.id || item._id);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    });

    // Sort by timestamp descending
    merged.sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at));

    // Calculate metrics
    const unreadCount = merged.filter((n) => !n.is_read).length;
    const leaveCount = merged.filter((n) => n.category === "leave").length;
    const payrollCount = merged.filter((n) => n.category === "payroll").length;
    const systemCount = merged.filter((n) => n.category === "system").length;
    const announcementCount = merged.filter((n) => n.category === "announcement").length;

    return res.status(200).json({
      success: true,
      role: isAdmin ? "admin" : "employee",
      recipient_id: isAdmin ? "admin" : employeeId,
      notifications: merged,
      unreadCount,
      counts: {
        total: merged.length,
        unread: unreadCount,
        leave: leaveCount,
        payroll: payrollCount,
        system: systemCount,
        announcement: announcementCount,
      },
    });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch notifications.",
    });
  }
};

// PATCH /api/notifications/:id/read
// Marks a specific notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required.",
      });
    }

    // 1. Update in in-memory store
    const storeItem = liveNotificationStore.find(
      (n) => String(n._id) === String(id) || String(n.id) === String(id)
    );
    if (storeItem) {
      storeItem.is_read = true;
    }

    // 2. Update in MongoDB if ObjectId
    try {
      if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
        await Notification.findByIdAndUpdate(id, { is_read: true });
      }
    } catch (err) {
      console.warn("DB update read fallback:", err.message);
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      id,
      is_read: true,
    });
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark notification as read.",
    });
  }
};

// PATCH /api/notifications/read-all
// Marks all notifications for the current role/recipient as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const queryRole = req.query.role || req.headers["x-role"] || "admin";
    const userRole = req.employee?.role || (req.admin ? "admin" : queryRole);
    const isAdmin = userRole === "admin" || queryRole === "admin";
    const employeeId =
      req.employee?.id || req.headers["x-employee-id"] || "demo_employee_id_001";

    // 1. Update in-memory store
    liveNotificationStore.forEach((item) => {
      if (isAdmin) {
        if (item.recipient_role === "admin") {
          item.is_read = true;
        }
      } else {
        if (
          item.recipient_role === "employee" &&
          (item.recipient_id === String(employeeId) ||
            item.recipient_id === "all_employees" ||
            item.recipient_id === "demo_employee_id_001" ||
            item.recipient_id === "EMP001")
        ) {
          item.is_read = true;
        }
      }
    });

    // 2. Update in MongoDB
    try {
      const filter = isAdmin
        ? { recipient_role: "admin" }
        : {
            recipient_role: "employee",
            $or: [
              { recipient_id: String(employeeId) },
              { recipient_id: "all_employees" },
              { recipient_id: "demo_employee_id_001" },
            ],
          };

      await Notification.updateMany(filter, { is_read: true });
    } catch (err) {
      console.warn("DB markAllRead fallback:", err.message);
    }

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark all notifications as read.",
    });
  }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required.",
      });
    }

    const idx = liveNotificationStore.findIndex(
      (n) => String(n._id) === String(id) || String(n.id) === String(id)
    );
    if (idx !== -1) {
      liveNotificationStore.splice(idx, 1);
    }

    try {
      if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
        await Notification.findByIdAndDelete(id);
      }
    } catch (err) {
      console.warn("DB delete notification fallback:", err.message);
    }

    return res.status(200).json({
      success: true,
      message: "Notification dismissed successfully.",
    });
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete notification.",
    });
  }
};

// POST /api/notifications
// Admin or System creates a targeted notification/announcement
export const createNotification = async (req, res) => {
  try {
    const {
      recipient_id,
      recipient_role,
      title,
      message,
      type,
      category,
      priority,
      action_url,
      action_label,
      metadata,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required.",
      });
    }

    const newNotif = await createNotificationRecord({
      recipient_id: recipient_id || (recipient_role === "admin" ? "admin" : "all_employees"),
      recipient_role: recipient_role || "employee",
      sender_id: req.employee?.id || "admin_001",
      sender_role: req.employee ? "employee" : "admin",
      sender_name: req.employee ? "Employee" : "System Administrator",
      title,
      message,
      type: type || "announcement",
      category: category || "announcement",
      priority: priority || "medium",
      action_url: action_url || "",
      action_label: action_label || "View Details",
      metadata: metadata || {},
    });

    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      notification: newNotif,
    });
  } catch (error) {
    console.error("Error in createNotification:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create notification.",
    });
  }
};
