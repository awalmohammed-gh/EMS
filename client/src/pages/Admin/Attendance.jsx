import { useState, useEffect } from "react";
import {
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock as ClockIcon,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarDays,
  ArrowRight,
  X,
} from "lucide-react";
import { useManagement } from "../../context/ManagementContextProvider";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";
import Toaster from "../../ui/Toaster";
import { getAllAttendance } from "../../apis/fontApis";

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onTimeToday: 0,
    averageHours: 0,
  });
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { showToast, setShowToast } = useManagement();

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await getAllAttendance();
      console.log("Attendance data:", data);

      if (data.success) {
        setAttendance(data.attendance || []);
        setFilteredAttendance(data.attendance || []);

        // Calculate stats
        if (data.attendance && data.attendance.length > 0) {
          calculateStats(data.attendance);
        }
      } else {
        setIsError(data.message || "Failed to fetch attendance.");
        setShowToast({
          show: true,
          message: data.message || "Failed to fetch attendance.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to fetch attendance.";
      setIsError(errorMessage);
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate attendance statistics
  const calculateStats = (attendanceData) => {
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = attendanceData.filter(
      (item) => item.date === today,
    );

    // Get unique employees from the populated employee object
    const employees = new Set();
    attendanceData.forEach((item) => {
      if (item.employee && item.employee._id) {
        employees.add(item.employee._id);
      }
    });

    const totalEmployees = employees.size;
    const presentToday = todayAttendance.filter((item) => item.clockIn).length;
    const lateToday = todayAttendance.filter(
      (item) => item.status === "Late",
    ).length;
    const onTimeToday = todayAttendance.filter(
      (item) => item.status === "On Time",
    ).length;
    const absentToday = totalEmployees - presentToday;

    // Calculate average work hours
    const totalHours = attendanceData.reduce(
      (sum, item) => sum + (item.workHours || 0),
      0,
    );
    const averageHours =
      attendanceData.length > 0
        ? (totalHours / attendanceData.length).toFixed(2)
        : 0;

    setStats({
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onTimeToday,
      averageHours: parseFloat(averageHours),
    });
  };

  // Filter attendance based on search, status, and date
  useEffect(() => {
    let filtered = [...attendance];

    // Search by employee name or ID
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const fullName = item.employee?.fullName?.toLowerCase() || "";
        const employeeId = item.employee?._id?.toLowerCase() || "";
        return fullName.includes(term) || employeeId.includes(term);
      });
    }

    // Filter by status
    if (statusFilter !== "All") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter((item) => item.date === dateFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    setFilteredAttendance(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, attendance]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Helper function to safely get employee data
  const getEmployeeName = (item) => {
    return item.employee?.fullName || "Unknown";
  };

  const getEmployeeDepartment = (item) => {
    return item.employee?.department || "N/A";
  };

  const getEmployeePosition = (item) => {
    return item.employee?.position || "N/A";
  };

  const getEmployeeInitial = (item) => {
    const name = getEmployeeName(item);
    return name.charAt(0).toUpperCase() || "E";
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "-";
    try {
      return new Date(date).toLocaleDateString("en-GH", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return "-";
    try {
      // If time is already in HH:MM format
      if (timeString.includes(":")) {
        const [hours, minutes] = timeString.split(":");
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
      // If it's a date string
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString || "-";
    }
  };

  // Get status style
  const getStatusStyle = (status) => {
    switch (status) {
      case "On Time":
        return "bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20";
      case "Late":
        return "bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/20";
      case "Absent":
        return "bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20";
      default:
        return "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "On Time":
        return <CheckCircle className="w-4 h-4 text-[#16A34A]" />;
      case "Late":
        return <AlertCircle className="w-4 h-4 text-[#D97706]" />;
      case "Absent":
        return <XCircle className="w-4 h-4 text-[#DC2626]" />;
      default:
        return <ClockIcon className="w-4 h-4 text-[#64748B]" />;
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredAttendance.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Employee",
      "Department",
      "Position",
      "Clock In",
      "Clock Out",
      "Work Hours",
      "Status",
    ];
    const rows = filteredAttendance.map((item) => [
      formatDate(item.date),
      getEmployeeName(item),
      getEmployeeDepartment(item),
      getEmployeePosition(item),
      formatTime(item.clockIn),
      formatTime(item.clockOut),
      item.workHours || 0,
      item.status || "Absent",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#002185] shrink-0">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
                Attendance Management
              </h1>
              <p className="text-sm text-[#64748B] mt-0.5">
                Monitor and manage employee attendance records
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#64748B] bg-[#FFFFFF] px-4 py-2 rounded-lg border border-[#E2E8F0] shadow-sm">
            <CalendarDays className="h-4 w-4 text-[#ff5500]" />
            {new Date().toLocaleDateString("en-GH", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Error Message */}
        {isError && (
          <ErrorMessage
            message={isError}
            onRetry={fetchAttendance}
            onClose={() => setIsError(null)}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1" />
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#002185] p-2 text-white shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] truncate">
                  Total Employees
                </p>
                <p className="text-xl font-bold text-[#002185]">
                  {stats.totalEmployees}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1" />
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F0FDF4] p-2 text-[#16A34A] shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] truncate">
                  Present Today
                </p>
                <p className="text-xl font-bold text-[#16A34A]">
                  {stats.presentToday}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1" />
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#FEF2F2] p-2 text-[#DC2626] shrink-0">
                <XCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] truncate">
                  Absent Today
                </p>
                <p className="text-xl font-bold text-[#DC2626]">
                  {stats.absentToday}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1" />
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#FFFBEB] p-2 text-[#D97706] shrink-0">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] truncate">
                  Late Today
                </p>
                <p className="text-xl font-bold text-[#D97706]">
                  {stats.lateToday}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1" />
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F0FDF4] p-2 text-[#16A34A] shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] truncate">
                  On Time
                </p>
                <p className="text-xl font-bold text-[#16A34A]">
                  {stats.onTimeToday}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1" />
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F8FAFC] p-2 text-[#64748B] shrink-0">
                <ClockIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#64748B] truncate">
                  Avg Hours
                </p>
                <p className="text-xl font-bold text-[#002185]">
                  {stats.averageHours}h
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-4 shadow-sm">
          <div className="flex-1 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search by employee name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#ff5500]"
              />
            </div>
          </div>

          <div className="hidden lg:block h-9 w-px bg-[#E2E8F0]" />

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#64748B] shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#ff5500]"
              >
                <option value="All">All Status</option>
                <option value="On Time">On Time</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#64748B] shrink-0" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-1 focus:ring-[#ff5500]"
              />
            </div>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 rounded-lg bg-[#002185] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff5500] transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-[#64748B]">
          Showing{" "}
          <span className="font-medium text-[#002185]">
            {filteredAttendance.length}
          </span>{" "}
          of{" "}
          <span className="font-medium text-[#002185]">
            {attendance.length}
          </span>{" "}
          records
        </div>

        {/* Attendance Table */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Position
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Clock In / Out
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {currentItems.length > 0 ? (
                  currentItems.map((item) => (
                    <tr
                      key={item._id || item.id || Math.random()}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-[#334155] whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#002185]/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-[#002185]">
                              {getEmployeeInitial(item)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#002185] truncate">
                              {item.employee?.fullName || "Unknown"}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              ID: {item.employee?._id?.slice(-6) || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">
                        {item.employee?.department || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">
                        {item.employee?.position || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#334155] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          {formatTime(item.clockIn)}
                          <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                          {formatTime(item.clockOut)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center justify-center min-w-[2.75rem] font-semibold text-[#002185] tabular-nums bg-[#F8FAFC] rounded-md px-2 py-1">
                          {item.workHours || 0}h
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(item.status || "Absent")}`}
                        >
                          {getStatusIcon(item.status || "Absent")}
                          {item.status || "Absent"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedAttendance(item);
                            setShowDetailsModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm text-[#002185] hover:bg-[#F8FAFC] hover:border-[#E2E8F0] hover:text-[#ff5500] transition-all duration-200"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-14 text-center text-sm text-[#64748B]"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-[#94A3B8]" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-[#002185]">
                            No attendance records found
                          </p>
                          <p className="text-sm text-[#64748B] mt-1">
                            Try adjusting your search or filter criteria
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredAttendance.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E2E8F0] px-4 py-3 bg-[#F8FAFC]">
              <div className="text-sm text-[#64748B]">
                Showing{" "}
                <span className="font-medium text-[#002185]">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-[#002185]">
                  {Math.min(endIndex, filteredAttendance.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-[#002185]">
                  {filteredAttendance.length}
                </span>{" "}
                entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8FAFC] hover:border-[#ff5500] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#002185] text-white"
                          : "bg-[#FFFFFF] border border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8FAFC] hover:border-[#ff5500] transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-[#FFFFFF] shadow-2xl border-2 border-[#002185] max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E2E8F0] bg-[#FFFFFF] px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002185]">
                  <CalendarDays className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#002185]">
                    Attendance Details
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    {formatDate(selectedAttendance.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedAttendance(null);
                }}
                className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#ff5500]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Employee Information
                </h3>
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-[#F8FAFC] p-4 sm:grid-cols-2 border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#002185] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">
                        {getEmployeeInitial(selectedAttendance)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Employee</p>
                      <p className="text-sm font-medium text-[#002185]">
                        {selectedAttendance.employee?.fullName || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Department</p>
                    <p className="text-sm font-medium text-[#002185]">
                      {selectedAttendance.employee?.department || "N/A"}
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {selectedAttendance.employee?.position || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Time Log
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-[#E2E8F0] p-3 bg-[#FFFFFF]">
                    <p className="text-xs text-[#64748B]">Date</p>
                    <p className="mt-1 text-sm font-semibold text-[#002185]">
                      {formatDate(selectedAttendance.date)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] p-3 bg-[#FFFFFF]">
                    <p className="text-xs text-[#64748B]">Clock In</p>
                    <p className="mt-1 text-sm font-semibold text-[#002185]">
                      {formatTime(selectedAttendance.clockIn)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#E2E8F0] p-3 bg-[#FFFFFF]">
                    <p className="text-xs text-[#64748B]">Clock Out</p>
                    <p className="mt-1 text-sm font-semibold text-[#002185]">
                      {formatTime(selectedAttendance.clockOut)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-[#E2E8F0] p-4 bg-[#F8FAFC]">
                  <p className="text-xs font-medium text-[#64748B] uppercase">
                    Work Hours
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#002185]">
                    {selectedAttendance.workHours || 0} hours
                  </p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] p-4 bg-[#F8FAFC]">
                  <p className="text-xs font-medium text-[#64748B] uppercase">
                    Status
                  </p>
                  <div className="mt-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${getStatusStyle(selectedAttendance.status || "Absent")}`}
                    >
                      {getStatusIcon(selectedAttendance.status || "Absent")}
                      {selectedAttendance.status || "Absent"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedAttendance.notes && (
                <div className="border-t border-[#E2E8F0] pt-4">
                  <p className="text-xs font-medium text-[#64748B] uppercase">
                    Notes
                  </p>
                  <p className="mt-1.5 text-sm text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
                    {selectedAttendance.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast?.show && (
        <Toaster
          onClose={() =>
            setShowToast({
              show: false,
              message: "",
              type: "success",
            })
          }
          message={showToast.message}
          type={showToast.type}
        />
      )}
    </>
  );
};

export default Attendance;
