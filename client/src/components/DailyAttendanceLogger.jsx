import { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Clock,
  LogIn,
  LogOut,
  Search,
  Filter,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Download,
  Users,
  X,
} from "lucide-react";
import { allEmployees } from "../apis/fontApis";
import WeeklyAttendanceChart from "./WeeklyAttendanceChart";

export const DailyAttendanceLogger = ({
  initialData = null,
  onLogEntry = null,
  title = "Daily Employee Attendance Logger",
  showAddForm = true,
}) => {
  const [logs, setLogs] = useState(() => {
    if (initialData && Array.isArray(initialData)) {
      return initialData;
    }
    return [];
  });

  const [employeesList, setEmployeesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedDate, setSelectedDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // New Log Form State
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    date: new Date().toISOString().split("T")[0],
    checkIn: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    checkOut: "",
    status: "Present",
    notes: "",
  });

  useEffect(() => {
    if (initialData && Array.isArray(initialData)) {
      setLogs(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await allEmployees();
        if (data && data.success && Array.isArray(data.employees)) {
          setEmployeesList(data.employees);
          if (data.employees.length > 0) {
            setFormData((prev) => ({
              ...prev,
              employeeId: data.employees[0].employeeId || data.employees[0]._id,
              employeeName: data.employees[0].fullName,
              department: data.employees[0].department,
            }));
          }
        }
      } catch (err) {
        console.warn("Could not load employee directory for logger:", err.message);
      }
    };
    fetchEmployees();
  }, []);

  // Filtered attendance data
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        (log.employeeName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (log.employeeId || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (log.department || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === "All" ||
        (log.status || "").toLowerCase() === selectedStatus.toLowerCase();

      const matchesDate = !selectedDate || log.date === selectedDate;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [logs, searchTerm, selectedStatus, selectedDate]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const present = logs.filter((l) => l.status === "Present").length;
    const late = logs.filter((l) => l.status === "Late").length;
    const onLeave = logs.filter(
      (l) => l.status === "On Leave" || l.status === "Absent",
    ).length;
    return { total, present, late, onLeave };
  }, [logs]);

  // Handle new log submission
  const handleSubmitLog = (e) => {
    e.preventDefault();
    if (!formData.employeeName || !formData.date || !formData.checkIn) return;

    // Calculate approx work hours if checkOut is provided
    let calculatedHours = "-";
    if (formData.checkIn && formData.checkOut) {
      calculatedHours = "8h 00m";
    }

    const newEntry = {
      id: `ATT-${Date.now().toString().slice(-4)}`,
      employeeId: formData.employeeId || "EMP-NEW",
      employeeName: formData.employeeName,
      department: formData.department || "General",
      date: formData.date,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut || "-",
      workHours: calculatedHours,
      status: formData.status,
      notes: formData.notes || "Logged via attendance tracker",
    };

    setLogs((prev) => [newEntry, ...prev]);

    if (onLogEntry) {
      onLogEntry(newEntry);
    }

    // Reset Form
    setFormData({
      employeeId: "EMP001",
      employeeName: "Kwame Mensah",
      department: "Engineering",
      date: new Date().toISOString().split("T")[0],
      checkIn: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      checkOut: "",
      status: "Present",
      notes: "",
    });

    setIsModalOpen(false);
  };

  // Quick Clock Out Action for a row
  const handleQuickClockOut = (id) => {
    const nowTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    setLogs((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            checkOut: nowTime,
            workHours: "8h 15m",
          };
        }
        return item;
      }),
    );
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Employee ID",
      "Employee Name",
      "Department",
      "Date",
      "Check In",
      "Check Out",
      "Work Hours",
      "Status",
    ];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.employeeId,
      `"${l.employeeName}"`,
      `"${l.department}"`,
      l.date,
      l.checkIn,
      l.checkOut,
      l.workHours,
      l.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `daily_attendance_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Present":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Late":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Absent":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "On Leave":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E2E8F0] p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#002185] flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[#ff5500]" />
            {title}
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            Log real-time employee check-ins and monitor daily attendance
            records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#002185] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:bg-[#EEF2F6] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {showAddForm && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl shadow-sm transition-all duration-200"
            >
              <PlusCircle className="w-4 h-4" />
              Log Check-In
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Total Records</span>
            <Users className="w-4 h-4 text-[#002185]" />
          </div>
          <p className="text-2xl font-bold text-[#002185] mt-1.5">
            {stats.total}
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1.5">
            {stats.present}
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Late Check-ins</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1.5">
            {stats.late}
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
            <span>Absent / Leave</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-1.5">
            {stats.onLeave}
          </p>
        </div>
      </div>

      {/* Weekly Attendance Trends Chart Section */}
      <WeeklyAttendanceChart
        attendanceLogs={logs}
        title="Weekly Employee Attendance Trends & Analysis"
        subtitle="Live bar chart visualization tracking on-time presence, tardiness, and leaves across days"
      />

      {/* Table Filter Controls */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] p-4 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#002185] focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#64748B]" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#64748B]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  className="text-xs text-[#64748B] hover:text-[#ff5500] underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Check-In Data Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Employee</th>
                <th className="py-3.5 px-4 font-semibold">Department</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold">Check In</th>
                <th className="py-3.5 px-4 font-semibold">Check Out</th>
                <th className="py-3.5 px-4 font-semibold">Work Hours</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-[#FFFFFF]">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F8FAFC] transition-colors"
                  >
                    {/* Employee Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#002185]">
                        {item.employeeName}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        {item.employeeId}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-[#64748B]">
                      {item.department || "General"}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-medium text-[#002185]">
                      {item.date}
                    </td>

                    {/* Check In */}
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">
                      <div className="flex items-center gap-1.5">
                        <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                        {item.checkIn || "--:--"}
                      </div>
                    </td>

                    {/* Check Out */}
                    <td className="py-3.5 px-4 text-[#64748B]">
                      <div className="flex items-center gap-1.5">
                        <LogOut className="w-3.5 h-3.5 text-[#ff5500]" />
                        {item.checkOut && item.checkOut !== "-"
                          ? item.checkOut
                          : "--:--"}
                      </div>
                    </td>

                    {/* Work Hours */}
                    <td className="py-3.5 px-4 font-medium text-[#002185]">
                      {item.workHours || "-"}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {(!item.checkOut || item.checkOut === "-") &&
                      item.status !== "Absent" ? (
                        <button
                          onClick={() => handleQuickClockOut(item.id)}
                          className="px-2.5 py-1 text-xs font-medium text-white bg-[#ff5500] hover:bg-[#e04b00] rounded-lg transition-colors"
                        >
                          Clock Out
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedLog(item)}
                          className="text-xs text-[#002185] hover:text-[#ff5500] font-medium underline"
                        >
                          Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-sm text-[#64748B]"
                  >
                    No attendance records found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-[#64748B] pt-2 px-1">
          <span>
            Showing {filteredLogs.length} of {logs.length} total check-in
            records
          </span>
          <span>Records synchronized</span>
        </div>
      </div>

      {/* Modal: Log New Check-In */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-bold text-[#002185] flex items-center gap-2">
                <LogIn className="w-5 h-5 text-[#ff5500]" />
                Log Daily Attendance
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#64748B] hover:text-[#002185] p-1 rounded-lg hover:bg-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLog} className="mt-4 space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                  Select Employee
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => {
                    const emp = employeesList.find(
                      (d) => (d.employeeId || d._id) === e.target.value,
                    );
                    setFormData((prev) => ({
                      ...prev,
                      employeeId: e.target.value,
                      employeeName: emp ? emp.fullName : "Employee",
                      department: emp ? emp.department : prev.department,
                    }));
                  }}
                  className="w-full text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#002185] focus:outline-none focus:border-[#002185]"
                >
                  {employeesList.length === 0 && (
                    <option value="">No employees found</option>
                  )}
                  {employeesList.map((emp) => (
                    <option key={emp._id || emp.employeeId} value={emp.employeeId || emp._id}>
                      {emp.fullName} ({emp.employeeId || "EMP"}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              {/* Check-In & Check-Out Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Check-In Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 08:30 AM"
                    value={formData.checkIn}
                    onChange={(e) =>
                      setFormData({ ...formData, checkIn: e.target.value })
                    }
                    className="w-full text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                    Check-Out Time (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 05:00 PM"
                    value={formData.checkOut}
                    onChange={(e) =>
                      setFormData({ ...formData, checkOut: e.target.value })
                    }
                    className="w-full text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional check-in remark"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full text-sm bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#002185] focus:outline-none focus:border-[#002185]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#002185] rounded-xl hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl shadow-xs transition-colors"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Record Details */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#002185]">
                Attendance Record Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#64748B] hover:text-[#002185] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Employee:</span>
                <span className="font-semibold text-[#002185]">
                  {selectedLog.employeeName} ({selectedLog.employeeId})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Department:</span>
                <span className="text-[#002185]">{selectedLog.department}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Date:</span>
                <span className="text-[#002185]">{selectedLog.date}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Check-In:</span>
                <span className="font-medium text-emerald-700">
                  {selectedLog.checkIn}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Check-Out:</span>
                <span className="font-medium text-[#ff5500]">
                  {selectedLog.checkOut || "--:--"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Work Hours:</span>
                <span className="text-[#002185]">{selectedLog.workHours}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                <span className="text-[#64748B]">Status:</span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                    selectedLog.status,
                  )}`}
                >
                  {selectedLog.status}
                </span>
              </div>
              <div className="py-1.5">
                <span className="text-[#64748B] block mb-1">Notes:</span>
                <p className="text-xs bg-[#F8FAFC] p-2.5 rounded-lg text-[#002185] border border-[#E2E8F0]">
                  {selectedLog.notes || "No additional remarks."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyAttendanceLogger;
