import mongoose from "mongoose";
import { Notification } from "../models/notificationModel.js";

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
      query = {
        $or: [
          ...(userId ? [{ recipient_id: userId }] : []),
          { recipient_id: "all_employees" },
          { recipient_role: "employee" },
        ],
      };
    }

    // Execute mongoose query sorted by created_at descending
    const documents = await Notification.find(query)
      .sort({ created_at: -1 })
      .lean();

    const notifications = documents.map((doc) => ({
      ...doc,
      id: String(doc._id),
      _id: String(doc._id),
      is_read: Boolean(doc.is_read),
      timestamp: doc.created_at || doc.createdAt,
    }));

    // Derive live summary metrics from real database documents
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const leaveCount = notifications.filter((n) => n.category === "leave").length;
    const payrollCount = notifications.filter((n) => n.category === "payroll").length;
    const systemCount = notifications.filter((n) => n.category === "system").length;
    const announcementCount = notifications.filter(
      (n) => n.category === "announcement"
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
 * PATCH /api/notifications/:id/read
 * Marks a specific notification document as read
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

    let updatedDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updatedDoc = await Notification.findByIdAndUpdate(
        id,
        { $set: { is_read: true } },
        { new: true }
      );
    } else {
      updatedDoc = await Notification.findOneAndUpdate(
        { _id: id },
        { $set: { is_read: true } },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read in database.",
      id,
      notification: updatedDoc,
    });
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to mark notification as read.",
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
    } else {
      await Notification.deleteOne({ _id: id });
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
