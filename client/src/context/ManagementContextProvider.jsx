import { createContext, useContext, useState } from "react"


const ManagementContext = createContext();
export const ManagementContextProvider = ({children}) => {

  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [showPayslipsModal, setShowPayslipsModal] = useState(false);
  const [showToast, setShowToast] = useState({
    message:"",
    show:false,
    type:"success"
  })


    const clockIn = ({ attendanceData, setAttendanceData }) => {
      // Prevent multiple clock-ins
      if (attendanceData.clockIn) {
       setShowToast("You have already clocked in today.");
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

     setShowToast("You have successfully clocked in.");
     return;
    };

    const clockOut = ({ attendanceData, setAttendanceData }) => {
      // Employee must clock in first
      if (!attendanceData.clockIn) {
        setShowToast("You have not clocked in yet.");
        return;
      }

      // Prevent multiple clock-outs
      if (attendanceData.clockOut) {
        setShowToast("You have already clocked out today.");
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

      setShowToast("You have successfully clocked out.");
      return;
    };

  const value = {
    showEmployeeModal,
    setShowEmployeeModal,
    showPayslipsModal,
    setShowPayslipsModal,
    clockIn,
    clockOut,
    showToast,
    setShowToast,
  };
  return (
    <ManagementContext.Provider value={value}>
       {children}
    </ManagementContext.Provider>
  )
}

export const useManagement = () => {
   const context = useContext(ManagementContext);

   if(!context){
    throw new Error("Check your context provider")
   }

   return context;
}
