import mongoose from "mongoose";
import { Notification } from "../models/notificationModel.js";
import { Payroll } from "../models/payrollModel.js";
import { Employee } from "../models/employeeModel.js";

/**
 * Helper to persist a new notification document into MongoDB
 */
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
  try {
    const doc = await Notification.create({
      recipient_id: String(
        recipient_id || (recipient_role === "admin" ? "admin" : "all_employees")
      ),
      recipient_role: recipient_role === "admin" ? "admin" : "employee",
      sender_id: String(sender_id),
      sender_role,
      sender_name,
      title: title.trim(),
      message: message.trim(),
      type,
      category,
      priority,
      action_url,
      action_label,
      metadata,
      is_read: false,
      created_at: new Date(),
    });

    return doc.toObject();
  } catch (err) {
    console.error("Error creating notification document:", err.message);
    return null;
  }
};

/**
 * GET /api/notifications
 * Fetches actual documents from the 'notifications' collection based on authenticated user ID / role,
 * sorted by 'created_at' in descending order.
 */
export const getNotifications = async (req, res) => {
  try {
    const queryRole =
      req.query.role ||
      req.headers["x-role"] ||
      (req.baseUrl.includes("admin") ? "admin" : "");
    const userRole =
      req.employee?.role || (req.admin ? "admin" : queryRole || "admin");
    const isAdmin = userRole === "admin" || queryRole === "admin";

    const userId = String(
      req.user?.id ||
      req.user?._id ||
      req.employee?.id ||
      req.employee?._id ||
      req.employee?.employeeId ||
      req.admin?.id ||
      req.query.user_id ||
      req.query.recipient_id ||
      req.headers["x-user-id"] ||
      req.headers["x-employee-id"] ||
      ""
    );

    // Mongoose query targeting actual documents for this recipient
    let query = {};
    if (isAdmin) {
      query = {
        $or: [
          { recipient_role: "admin" },
          { recipient_id: "admin" },
          ...(userId ? [{ recipient_id: userId }] : []),
        ],
      };
    } else {
      const possibleIds = [
        "all_employees",
        "all",
        ...(userId ? [userId] : []),
        ...(req.employee?.employeeId ? [String(req.employee.employeeId)] : []),
        ...(req.employee?._id ? [String(req.employee._id)] : []),
        ...(req.employee?.email ? [String(req.employee.email)] : []),
        ...(req.user?.employeeId ? [String(req.user.employeeId)] : []),
        ...(req.user?._id ? [String(req.user._id)] : []),
        ...(req.user?.email ? [String(req.user.email)] : []),
      ];

      query = {
        $or: [
          { recipient_id: { $in: possibleIds } },
          { recipient_role: "employee", recipient_id: { $in: possibleIds } },
          { recipient_id: "all_employees" },
          { recipient_id: "all" },
        ],
      };
    }

    // Execute mongoose query sorted by created_at descending
    const documents = await Notification.find(query)
      .sort({ created_at: -1 })
      .lean();

    // For employees, ensure any published payslips have an active notification alert
    if (!isAdmin && userId) {
      try {
        let empObjectIds = [];
        if (mongoose.Types.ObjectId.isValid(userId)) {
          empObjectIds.push(new mongoose.Types.ObjectId(userId));
        }
        if (req.employee?._id && mongoose.Types.ObjectId.isValid(req.employee._id)) {
          empObjectIds.push(new mongoose.Types.ObjectId(req.employee._id));
        }
        if (empObjectIds.length === 0 && userId) {
          const empDoc = await Employee.findOne({
            $or: [{ employeeId: userId }, { email: userId }],
          }).lean();
          if (empDoc?._id) {
            empObjectIds.push(empDoc._id);
          }
        }

        let empQuery = {};
        if (empObjectIds.length > 0) {
          empQuery = { employee: { $in: empObjectIds } };
        }

        const publishedPayslips = await Payroll.find({
          ...empQuery,
          status: { $in: ["Published", "published", "Paid", "paid"] },
        }).lean();

        for (const ps of publishedPayslips) {
          const psNumber = ps.payslipNumber || String(ps._id);
          const alreadyNotified = documents.some(
            (d) =>
              d.metadata?.payslipNumber === psNumber ||
              d.metadata?.payslipId === String(ps._id) ||
              d.title?.includes(ps.payMonth)
          );

          if (!alreadyNotified) {
            const netAmount = Number(ps.netSalary || ps.netPay || 0);
            const isPaid = (ps.status || "").toLowerCase() === "paid";
            const newNotif = await createNotificationRecord({
              recipient_id: userId,
              recipient_role: "employee",
              sender_id: "admin",
              sender_role: "admin",
              sender_name: "Management",
              title: isPaid ? "💰 Monthly Payslip Paid & Released" : "📄 New Monthly Payslip Published",
              message: isPaid
                ? `Your salary for ${ps.payMonth} (GH₵${netAmount.toFixed(2)}) has been disbursed and marked as Paid.`
                : `Your official payslip for ${ps.payMonth} has been published by Management. Net Take-Home: GH₵${netAmount.toFixed(2)}.`,
              type: "payroll_alert",
              category: "payroll",
              priority: "high",
              action_url: "/employee/dashboard/payslips",
              action_label: "View Payslip",
              metadata: {
                payMonth: ps.payMonth,
                payslipNumber: psNumber,
                payslipId: String(ps._id),
                netPay: netAmount,
                status: ps.status,
              },
            });

            if (newNotif) {
              documents.unshift(newNotif);
            }
          }
        }
      } catch (syncErr) {
        console.warn("Could not auto-sync published payslip notifications:", syncErr.message);
      }
    }

    // Deduplicate by _id
    const seenMap = new Map();
    const uniqueDocs = [];
    for (const doc of documents) {
      const docId = String(doc._id);
      if (!seenMap.has(docId)) {
        seenMap.set(docId, true);
        uniqueDocs.push(doc);
      }
    }

    const notifications = uniqueDocs.map((doc) => ({
      ...doc,
      id: String(doc._id),
      _id: String(doc._id),
      is_read: Boolean(doc.is_read !== undefined ? doc.is_read : doc.isRead),
      timestamp: doc.created_at || doc.createdAt,
    }));

    // Derive live summary metrics from real database documents
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const leaveCount = notifications.filter((n) => n.category === "leave").length;
    const payrollCount = notifications.filter(
      (n) => n.category === "payroll" || n.type === "payroll_alert" || n.category === "payslip"
    ).length;
    const systemCount = notifications.filter(
      (n) =>
        (n.category === "system" ||
        n.category === "attendance" ||
        !n.category) &&
        n.category !== "payroll" &&
        n.type !== "payroll_alert" &&
        n.category !== "payslip"
    ).length;
    const announcementCount = notifications.filter(
      (n) => n.category === "announcement" || n.type === "announcement"
    ).length;

    return res.status(200).json({
      success: true,
      role: isAdmin ? "admin" : "employee",
      recipient_id: isAdmin ? "admin" : userId || "employee",
      notifications,
      unreadCount,
      counts: {
        total: notifications.length,
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
      message: error.message || "Failed to fetch notifications from database.",
    });
  }
};

/**
 * PATCH /api/notifications/:id/read & /api/notifications/:id/unread & /api/notifications/:id/toggle
 * Marks a specific notification document as read/unread
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required.",
      });
    }

    const isRead = req.body?.is_read !== undefined ? Boolean(req.body.is_read) : true;
    let updatedDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updatedDoc = await Notification.findByIdAndUpdate(
        id,
        { $set: { is_read: isRead } },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Notification marked as ${isRead ? "read" : "unread"} in database.`,
      id,
      notification: updatedDoc,
    });
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update notification read status.",
    });
  }
};

export const markNotificationAsUnread = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required.",
      });
    }

    let updatedDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updatedDoc = await Notification.findByIdAndUpdate(
        id,
        { $set: { is_read: false } },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as unread in database.",
      id,
      notification: updatedDoc,
    });
  } catch (error) {
    console.error("Error in markNotificationAsUnread:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark notification as unread.",
    });
  }
};

export const toggleNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required.",
      });
    }

    let updatedDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      const existing = await Notification.findById(id);
      if (existing) {
        existing.is_read = !existing.is_read;
        await existing.save();
        updatedDoc = existing;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Notification status toggled.",
      id,
      notification: updatedDoc,
    });
  } catch (error) {
    console.error("Error in toggleNotificationRead:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle notification status.",
    });
  }
};

/**
 * PATCH /api/notifications/read-all & /api/notifications/mark-all-read
 * Executes an updateMany query marking all unread notifications for this user as read
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const queryRole = req.query.role || req.headers["x-role"] || "admin";
    const userRole = req.employee?.role || (req.admin ? "admin" : queryRole);
    const isAdmin = userRole === "admin" || queryRole === "admin";
    const userId = String(
      req.user?.id ||
      req.employee?.id ||
      req.admin?.id ||
      req.query.user_id ||
      req.headers["x-user-id"] ||
      req.headers["x-employee-id"] ||
      ""
    );

    const filter = isAdmin
      ? { recipient_role: "admin", is_read: false }
      : {
          recipient_role: "employee",
          is_read: false,
          ...(userId ? { $or: [{ recipient_id: userId }, { recipient_id: "all_employees" }] } : {}),
        };

    // Atomic updateMany query
    const result = await Notification.updateMany(filter, { $set: { is_read: true } });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount || 0,
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

/**
 * DELETE /api/notifications & /api/notifications/clear-all
 * Deletes all notifications for the requesting role or user
 */
export const deleteAllNotifications = async (req, res) => {
  try {
    const queryRole = req.query.role || req.headers["x-role"] || "admin";
    const userRole = req.employee?.role || (req.admin ? "admin" : queryRole);
    const isAdmin = userRole === "admin" || queryRole === "admin";
    const userId = String(
      req.user?.id ||
      req.employee?.id ||
      req.admin?.id ||
      req.query.user_id ||
      req.headers["x-user-id"] ||
      req.headers["x-employee-id"] ||
      ""
    );

    const filter = isAdmin
      ? { recipient_role: "admin" }
      : {
          recipient_role: "employee",
          ...(userId ? { $or: [{ recipient_id: userId }, { recipient_id: "all_employees" }] } : {}),
        };

    const result = await Notification.deleteMany(filter);

    return res.status(200).json({
      success: true,
      message: "All notifications removed successfully.",
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    console.error("Error in deleteAllNotifications:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete all notifications.",
    });
  }
};

/**
 * DELETE /api/notifications/:id
 * Deletes a notification document from the database
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required.",
      });
    }

    if (mongoose.Types.ObjectId.isValid(id)) {
      await Notification.findByIdAndDelete(id);
    }

    return res.status(200).json({
      success: true,
      message: "Notification removed from database.",
      id,
    });
  } catch (error) {
    console.error("Error in deleteNotification:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete notification.",
    });
  }
};

/**
 * POST /api/notifications
 * Creates a real notification document in the database
 */
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
      recipient_id:
        recipient_id || (recipient_role === "admin" ? "admin" : "all_employees"),
      recipient_role: recipient_role || "employee",
      sender_id: req.employee?.id || req.admin?.id || "system",
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
      message: "Notification created in database successfully.",
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
