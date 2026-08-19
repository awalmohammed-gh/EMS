import { useState, useEffect } from "react";
import {
  Search,
  Building2,
  CalendarDays,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  EllipsisVertical,
  Users,
  ArrowRight,
  SlidersHorizontal,
  CalendarClock,
} from "lucide-react";
import { allLeaves, updateStatus } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const Leave = () => {
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const { setShowToast } = useManagement();

  const fetchLeaveRequests = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await allLeaves();

      if (data.success) {
        let leaves = [];
        if (Array.isArray(data.leaves)) {
          leaves = data.leaves;
        } else if (data.leaves && typeof data.leaves === "object") {
          leaves = [data.leaves];
        } else if (Array.isArray(data.data)) {
          leaves = data.data;
        } else {
          leaves = [];
        }
        setRequests(leaves);
      } else {
        setIsError(data.message || "Failed to fetch leave requests.");
        setShowToast({
          show: true,
          message: data.message || "Failed to fetch leave requests.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to fetch leave requests.";
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

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const handleStatusChange = async (id, status) => {
    // Find the leave request
    const leaveToUpdate = requests.find((leave) => leave._id === id);
    if (!leaveToUpdate) return;

    // Don't update if status is the same
    if (leaveToUpdate.status === status) return;

    try {
      setUpdatingStatus(id);
      const { data } = await updateStatus(id, status);

      if (data.success) {
        setRequests((prev) =>
          prev.map((leave) =>
            leave._id === id ? { ...leave, status: status } : leave,
          ),
        );

        setShowToast({
          show: true,
          message:
            data.message ||
            `Leave request ${status.toLowerCase()} successfully!`,
          type: "success",
        });
      } else {
        setShowToast({
          show: true,
          message: data.message || "Failed to update status.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update status.";
      setShowToast({
        show: true,
        message: errorMessage,
        type: "error",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filteredData = requests.filter((leave) => {
    const employeeName = leave.employee?.fullName || "";
    const department = leave.employee?.department || "";
    const leaveType = leave.leaveType || "";

    const matchesSearch =
      employeeName.toLowerCase().includes(search.toLowerCase()) ||
      department.toLowerCase().includes(search.toLowerCase()) ||
      leaveType.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      filterStatus === "All" || leave.status === filterStatus;

    const matchesType = filterType === "All" || leave.leaveType === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusSelectStyles = (status) => {
    switch (status) {
      case "Approved":
        return "bg-[#F0FDF4] text-[#16A34A] border-[#16A34A]/30 focus:ring-[#16A34A]/30";
      case "Pending":
        return "bg-[#FFFBEB] text-[#B45309] border-[#F59E0B]/30 focus:ring-[#F59E0B]/30";
      case "Rejected":
        return "bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]/30 focus:ring-[#DC2626]/30";
      default:
        return "bg-[#F8FAFC] text-[#64748B] border-[#64748B]/30 focus:ring-[#64748B]/30";
    }
  };

  const statusOptions = ["All", "Approved", "Pending", "Rejected"];
  const leaveTypes = [
    "All",
    ...new Set(requests.map((leave) => leave.leaveType).filter(Boolean)),
  ];

  // Calculate summary stats
  const totalRequests = filteredData.length;
  const approvedRequests = filteredData.filter(
    (leave) => leave.status === "Approved",
  ).length;
  const pendingRequests = filteredData.filter(
    (leave) => leave.status === "Pending",
  ).length;
  const rejectedRequests = filteredData.filter(
    (leave) => leave.status === "Rejected",
  ).length;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message={isError}
        onRetry={fetchLeaveRequests}
        onClose={() => setIsError(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#002185] shrink-0">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
              Leave Requests
            </h1>
            <p className="text-sm text-[#64748B] mt-0.5">
              Manage and track employee leave requests
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                Total Requests
              </p>
              <p className="text-2xl font-bold text-[#002185] mt-1.5">
                {totalRequests}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#002185] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                Approved
              </p>
              <p className="text-2xl font-bold text-[#16A34A] mt-1.5">
                {approvedRequests}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#F0FDF4] flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#16A34A]" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                Pending
              </p>
              <p className="text-2xl font-bold text-[#F59E0B] mt-1.5">
                {pendingRequests}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#FFFBEB] flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-[#F59E0B]" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                Rejected
              </p>
              <p className="text-2xl font-bold text-[#DC2626] mt-1.5">
                {rejectedRequests}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#FEF2F2] flex items-center justify-center">
              <XCircle className="w-5 h-5 text-[#DC2626]" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#64748B]" />
            </div>
            <input
              type="text"
              placeholder="Search by employee, department, or leave type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 pl-1 pr-2 text-[#94A3B8]">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3.5 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition-all duration-200 text-sm cursor-pointer hover:border-[#ff5500]"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All statuses" : status}
                </option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3.5 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition-all duration-200 text-sm cursor-pointer hover:border-[#ff5500]"
            >
              {leaveTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All leave types" : type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-[#64748B]">
        <span>
          Showing{" "}
          <span className="font-medium text-[#002185]">
            {filteredData.length}
          </span>{" "}
          of{" "}
          <span className="font-medium text-[#002185]">{requests.length}</span>{" "}
          leave requests
        </span>
      </div>

      {/* Table Container */}
      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
          <div className="col-span-3">Employee</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-2">Date Range</div>
          <div className="col-span-1 text-center">Days</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Requested</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Main Content */}
        <div className="divide-y divide-[#E2E8F0] bg-[#FFFFFF]">
          {filteredData.length > 0 ? (
            filteredData.map((leave) => {
              const leaveId = leave._id;
              const employeeName = leave.employee?.fullName || "Unknown";
              const employeeId = leave.employee?.employeeId || "N/A";
              const department = leave.employee?.department || "N/A";
              const leaveType = leave.leaveType || "N/A";
              const status = leave.status || "Pending";
              const totalDays = leave.totalDays || 0;
              const requestedDate = leave.createdAt || new Date().toISOString();

              return (
                <div
                  key={leaveId}
                  className="hover:bg-[#F8FAFC] transition-colors duration-150"
                >
                  {/* Desktop View */}
                  <div className="hidden lg:grid grid-cols-12 gap-2 items-center px-4 py-4">
                    <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#002185] flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">
                          {employeeName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#002185] truncate">
                          {employeeName}
                        </p>
                        <p className="text-xs text-[#64748B]">{employeeId}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-[#334155] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                        {department}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-medium text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-2 py-0.5">
                        {leaveType}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex items-center gap-1">
                          {formatDate(leave.startDate)}
                          <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                          {formatDate(leave.endDate)}
                        </span>
                      </p>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] text-sm font-semibold text-[#002185] tabular-nums bg-[#F8FAFC] rounded-md px-2 py-1">
                        {totalDays}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={status}
                        onChange={(e) =>
                          handleStatusChange(leaveId, e.target.value)
                        }
                        disabled={updatingStatus === leaveId}
                        className={`text-xs font-medium pl-3 pr-7 py-1.5 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 transition-colors duration-150 ${getStatusSelectStyles(status)} ${updatingStatus === leaveId ? "opacity-50 cursor-not-allowed" : ""}`}
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 8px center",
                          backgroundSize: "10px",
                        }}
                      >
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      {updatingStatus === leaveId && (
                        <span className="block mt-1 text-[11px] text-[#64748B]">
                          Updating...
                        </span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {formatDate(requestedDate)}
                      </p>
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button className="p-1.5 text-[#64748B] hover:text-[#ff5500] hover:bg-[#FFFFFF] border border-transparent hover:border-[#E2E8F0] rounded-lg transition-all duration-200">
                        <EllipsisVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="lg:hidden p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-full bg-[#002185] flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-white">
                            {employeeName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#002185]">
                            {employeeName}
                          </p>
                          <p className="text-xs text-[#64748B] flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {department}
                          </p>
                        </div>
                      </div>
                      <button className="p-1.5 text-[#64748B] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-all duration-200">
                        <EllipsisVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={status}
                        onChange={(e) =>
                          handleStatusChange(leaveId, e.target.value)
                        }
                        disabled={updatingStatus === leaveId}
                        className={`text-xs font-medium pl-3 pr-7 py-1.5 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 transition-colors duration-150 flex-1 ${getStatusSelectStyles(status)} ${updatingStatus === leaveId ? "opacity-50 cursor-not-allowed" : ""}`}
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 8px center",
                          backgroundSize: "10px",
                        }}
                      >
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      <span className="text-sm font-semibold text-[#002185] tabular-nums whitespace-nowrap bg-[#F8FAFC] rounded-md px-2.5 py-1.5">
                        {totalDays} days
                      </span>
                    </div>
                    {updatingStatus === leaveId && (
                      <p className="text-xs text-[#64748B] text-center">
                        Updating status...
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2.5 text-sm bg-[#F8FAFC] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[#64748B] col-span-2">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs">{leaveType}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#64748B] col-span-2">
                        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs flex items-center gap-1">
                          {formatDate(leave.startDate)}
                          <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                          {formatDate(leave.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#64748B] col-span-2">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs">
                          Requested: {formatDate(requestedDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            /* Empty State */
            <div className="text-center py-14 bg-[#FFFFFF]">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                  <FileText className="w-6 h-6 text-[#94A3B8]" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-[#002185]">
                No leave requests found
              </h3>
              <p className="text-sm text-[#64748B] mt-1">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leave;
