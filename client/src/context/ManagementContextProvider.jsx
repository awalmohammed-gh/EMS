import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getAdminMe, getEmployee, adminLogout, employeeLogout } from "../apis/fontApis";
import { notificationService } from "../services/notificationService";

const ManagementContext = createContext();

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


  // Role and User state
  const [role, setRole] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/employee")) return "employee";
      if (window.location.pathname.startsWith("/admin")) return "admin";
      return localStorage.getItem("userRole") || "admin";
    }
    return "admin";
  });

  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const isEmpPath = window.location.pathname.startsWith("/employee");
        const storedRole = localStorage.getItem("userRole");
        if (isEmpPath || storedRole === "employee") {
          const storedEmp = localStorage.getItem("employeeData");
          if (storedEmp) return JSON.parse(storedEmp);
        } else {
          const storedAdmin = localStorage.getItem("adminData");
          if (storedAdmin) return JSON.parse(storedAdmin);
        }
      } catch (e) {
        console.warn("Error reading stored user:", e);
      }
    }
    return null;
  });

  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Fetch current logged in user from backend based on role
  const fetchCurrentUser = useCallback(async (currentRole) => {
    try {
      setIsLoadingUser(true);
      let activeRole = currentRole;
      if (!activeRole) {
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/employee")) {
          activeRole = "employee";
        } else if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
          activeRole = "admin";
        } else {
          activeRole = localStorage.getItem("userRole") || "admin";
        }
      }
      setRole(activeRole);

      if (activeRole === "employee") {
        const res = await getEmployee();
        if (res?.data?.success && res.data.employee) {
          const empData = res.data.employee;
          setUser(empData);
          localStorage.setItem("employeeData", JSON.stringify(empData));
        }
      } else {
        const res = await getAdminMe();
        if (res?.data?.success && res.data.admin) {
          const adminData = res.data.admin;
          setUser(adminData);
          localStorage.setItem("adminData", JSON.stringify(adminData));
        }
      }
    } catch (err) {
      console.warn("fetchCurrentUser failed:", err.message);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Logout handler
  const handleUserLogout = async (targetRole = role) => {
    try {
      if (targetRole === "admin") {
        await adminLogout();
      } else {
        await employeeLogout();
      }
    } catch (e) {
      console.warn("Logout error:", e.message);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("employeeToken");
      localStorage.removeItem("employeeData");
      localStorage.removeItem("adminData");
      setShowToast({
        show: true,
        message: "You have been logged out successfully.",
        type: "success",
      });
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

  const value = {
    user,
    setUser,
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
    showEmployeeModal,
    setShowEmployeeModal,
    showPayslipsModal,
    setShowPayslipsModal,
    clockIn,
    clockOut,
    showToast,
    setShowToast,
    notificationService,
  };


  return (
    <ManagementContext.Provider value={value}>
      {children}
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

