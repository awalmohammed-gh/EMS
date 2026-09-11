import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getAuthMe, getAdminMe, getEmployee, authLogout, adminLogout, employeeLogout, getSettings } from "../apis/fontApis";
import { notificationService } from "../services/notificationService";
import Toaster from "../ui/Toaster";

const ManagementContext = createContext();

/**
 * Helper to safely decode a JWT payload in the browser
 */
const parseJwt = (token) => {
  try {
    if (!token || typeof token !== "string") return null;
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const ManagementContextProvider = ({ children }) => {
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPayslipsModal, setShowPayslipsModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showToast, setShowToast] = useState({
    message: "",
    show: false,
    type: "success",
  });

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);
  const openSidebar = () => setIsSidebarOpen(true);

  // Role and User state derived dynamically from active session (zero localStorage)
  const [role, setRole] = useState(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/employee")) {
      return "employee";
    }
    return "admin";
  });

  const [user, setUser] = useState(null);

  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Fetch current logged in user from database based on active HTTP-only session cookie
  const fetchCurrentUser = useCallback(async (currentRole) => {
    try {
      setIsLoadingUser(true);
      let activeRole = currentRole;
      if (!activeRole) {
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/employee")) {
          activeRole = "employee";
        } else {
          activeRole = "admin";
        }
      }
      setRole(activeRole);

      // 1. Try unified getAuthMe first
      try {
        const meRes = await getAuthMe();
        if (meRes?.data?.success && meRes.data.user) {
          const fetchedUser = meRes.data.user;
          setUser(fetchedUser);
          const resolvedRole = meRes.data.role || fetchedUser.role || activeRole;
          setRole(resolvedRole);
          return;
        }
      } catch {
        // Fallback to role-specific endpoint
      }

      if (activeRole === "employee") {
        const res = await getEmployee();
        if (res?.data?.success && res.data.employee) {
          const empData = res.data.employee;
          setUser(empData);
        }
      } else {
        const res = await getAdminMe();
        if (res?.data?.success && res.data.admin) {
          const adminData = res.data.admin;
          setUser(adminData);
        }
      }
    } catch (err) {
      console.warn("fetchCurrentUser error:", err.message);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // Dynamic Company & Attendance Settings
  const [settings, setSettings] = useState({
    workStartTime: "08:00",
    workEndTime: "19:00",
    attendance: {
      workStartTime: "08:00",
      workEndTime: "19:00",
    },
    company: {
      workStartTime: "08:00",
      workEndTime: "19:00",
    },
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await getSettings();
      if (res?.data?.success && res.data.settings) {
        const fetched = res.data.settings;
        const workEndTime =
          fetched.workEndTime ||
          fetched.attendance?.workEndTime ||
          fetched.company?.workEndTime ||
          "19:00";
        const workStartTime =
          fetched.workStartTime ||
          fetched.attendance?.workStartTime ||
          fetched.company?.workStartTime ||
          "08:00";
        setSettings((prev) => ({
          ...prev,
          ...fetched,
          workStartTime,
          workEndTime,
          attendance: {
            ...prev.attendance,
            ...fetched.attendance,
            workStartTime,
            workEndTime,
          },
          company: {
            ...prev.company,
            ...fetched.company,
            workStartTime,
            workEndTime,
          },
        }));
      }
    } catch (err) {
      console.warn("fetchSettings in ManagementContext error:", err.message);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCurrentUser();
    fetchSettings();
  }, [fetchCurrentUser, fetchSettings]);

  // Logout handler
  const handleUserLogout = async (targetRole = role) => {
    try {
      await authLogout();
    } catch {
      try {
        if (targetRole === "admin") {
          await adminLogout();
        } else {
          await employeeLogout();
        }
      } catch (err) {
        console.warn("Logout error:", err.message);
      }
    } finally {
      setUser(null);
      setShowToast({
        show: true,
        message: "You have been logged out successfully.",
        type: "success",
      });
      // Strict Redirection: Always redirect directly to the tenant's Welcome Gateway (#/welcome)
      if (typeof window !== "undefined") {
        window.location.hash = "#/welcome";
      }
    }
  };

  const clockIn = ({ attendanceData, setAttendanceData }) => {
    // Prevent multiple clock-ins
    if (attendanceData.clockIn) {
      setShowToast({
        show: true,
        message: "You have already clocked in today.",
        type: "error",
      });
      return;
    }

    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Official start time: 8:30 AM
    const startTime = new Date();
    startTime.setHours(8, 30, 0, 0);
    const status = now <= startTime ? "On Time" : "Late";

    setAttendanceData({
      date: currentDate,
      clockIn: currentTime,
      clockOut: null,
      status,
      workHours: 0,
    });

    setShowToast({
      show: true,
      message: "You have successfully clocked in.",
      type: "success",
    });
  };

  const clockOut = ({ attendanceData, setAttendanceData }) => {
    // Employee must clock in first
    if (!attendanceData.clockIn) {
      setShowToast({
        show: true,
        message: "You have not clocked in yet.",
        type: "error",
      });
      return;
    }

    // Prevent multiple clock-outs
    if (attendanceData.clockOut) {
      setShowToast({
        show: true,
        message: "You have already clocked out today.",
        type: "error",
      });
      return;
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Get clock-in time
    const [hours, minutes] = attendanceData.clockIn.split(":").map(Number);
    const clockInTime = new Date();
    clockInTime.setHours(hours, minutes, 0, 0);

    // Calculate work hours
    const millisecondsWorked = now.getTime() - clockInTime.getTime();
    const workHours = millisecondsWorked / (1000 * 60 * 60);
    const formattedWorkHours = Number(workHours.toFixed(2));

    setAttendanceData((prev) => ({
      ...prev,
      clockOut: currentTime,
      workHours: formattedWorkHours,
    }));

    setShowToast({
      show: true,
      message: "You have successfully clocked out.",
      type: "success",
    });
  };

  // Helper methods for flexible toast usage
  const triggerToast = useCallback((message, type = "success") => {
    setShowToast({
      show: true,
      message: typeof message === "string" ? message : (message?.message || "Notification"),
      type: type || (message?.type || "success"),
    });
  }, []);

  const toast = {
    success: (msg) => triggerToast(msg, "success"),
    error: (msg) => triggerToast(msg, "error"),
    warning: (msg) => triggerToast(msg, "warning"),
    info: (msg) => triggerToast(msg, "info"),
  };

  const value = {
    user,
    setUser,
    admin: (role === "admin" || user?.role === "admin" || user?.role === "super_admin") ? user : null,
    setAdmin: (newAdminData) => {
      if (typeof newAdminData === "function") {
        setUser((prev) => newAdminData(prev));
      } else {
        setUser((prev) => ({ ...prev, ...newAdminData }));
      }
    },
    role,
    setRole,
    isLoadingUser,
    fetchCurrentUser,
    logout: handleUserLogout,
    isSidebarOpen,
    setIsSidebarOpen,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    isMobileSidebarOpen: isSidebarOpen,
    setIsMobileSidebarOpen: setIsSidebarOpen,
    toggleMobileSidebar: toggleSidebar,
    closeMobileSidebar: closeSidebar,
    openMobileSidebar: openSidebar,
    settings,
    setSettings,
    fetchSettings,
    companySettings: settings,
    showEmployeeModal,
    setShowEmployeeModal,
    showPayslipsModal,
    setShowPayslipsModal,
    clockIn,
    clockOut,
    showToast: triggerToast,
    toastState: showToast,
    setShowToast,
    triggerToast,
    toast,
    notificationService,
  };


  return (
    <ManagementContext.Provider value={value}>
      {children}
      {showToast?.show && (
        <Toaster
          message={showToast.message}
          type={showToast.type}
          onClose={() => setShowToast({ show: false, message: "", type: "success" })}
        />
      )}
    </ManagementContext.Provider>
  );
};

export const useManagement = () => {
  const context = useContext(ManagementContext);
  if (!context) {
    throw new Error("Check your context provider");
  }
  return context;
};

export const useToast = () => {
  const context = useContext(ManagementContext);
  if (!context) {
    throw new Error("useToast must be used within ManagementContextProvider");
  }
  return {
    showToast: context.triggerToast,
    setShowToast: context.setShowToast,
    toast: context.toast,
    toastState: context.showToast,
  };
};

export default ManagementContextProvider;
