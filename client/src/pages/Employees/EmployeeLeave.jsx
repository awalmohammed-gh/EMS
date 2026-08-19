import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  FileText,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  User,
  Building2,
  AlertCircle,
  X,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import ApplyLeaveModal from "../../components/modal/ApplyLeaveModal";
import { myLeave } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const EmployeeLeave = () => {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { setShowToast } = useManagement();

  const fetchLeaveData = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await myLeave();
      console.log("Leave data response:", data);

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
        setLeaveRequests(leaves);
      } else {
        setIsError(data.message || "Failed to fetch leave requests.");
        setShowToast({
          show: true,
          message: data.message || "Failed to fetch leave requests.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching leave data:", error);
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
    fetchLeaveData();
  }, []);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20";
      case "rejected":
        return "bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/20";
      case "pending":
        return "bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/20";
      default:
        return "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <CheckCircle className="w-3.5 h-3.5" />;
      case "rejected":
        return <XCircle className="w-3.5 h-3.5" />;
      case "pending":
        return <ClockIcon className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "text-[#16A34A]";
      case "rejected":
        return "text-[#DC2626]";
      case "pending":
        return "text-[#D97706]";
      default:
        return "text-[#64748B]";
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return date;
    }
  };

  const formatDateLong = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return date;
    }
  };

  // Calculate summary stats
  const totalRequests = leaveRequests.length;
  const approvedRequests = leaveRequests.filter(
    (leave) => leave.status?.toLowerCase() === "approved",
  ).length;
  const pendingRequests = leaveRequests.filter(
    (leave) => leave.status?.toLowerCase() === "pending",
  ).length;
  const rejectedRequests = leaveRequests.filter(
    (leave) => leave.status?.toLowerCase() === "rejected",
  ).length;

  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
    setShowDetailsModal(true);
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message={isError}
        onRetry={fetchLeaveData}
        onClose={() => setIsError(null)}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
              Leave Requests
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              Apply for leave and view your leave request history
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#002185] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#ff5500] hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Apply for Leave
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300">
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
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300">
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

          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                  Pending
                </p>
                <p className="text-2xl font-bold text-[#D97706] mt-1.5">
                  {pendingRequests}
                </p>
              </div>
              <div className="w-11 h-11 rounded-full bg-[#FFFBEB] flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-[#D97706]" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300">
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

        {/* Leave Requests List */}
        {leaveRequests.length > 0 ? (
          <div className="space-y-4">
            {leaveRequests.map((leave) => (
              <div
                key={leave.id || leave._id || Math.random()}
                className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-sm hover:shadow-md hover:border-[#ff5500] transition-all duration-300"
              >
                {/* Top Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#002185] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-white">
                        {leave.employeeName?.charAt(0).toUpperCase() ||
                          leave.employee?.fullName?.charAt(0).toUpperCase() ||
                          "E"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#002185]">
                        {leave.leaveType || "Leave Request"}
                      </h3>
                      <p className="text-sm text-[#64748B] flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#002185]" />
                        {leave.employeeName ||
                          leave.employee?.fullName ||
                          "Employee"}
                        <span className="mx-1">•</span>
                        <Building2 className="w-3.5 h-3.5 text-[#002185]" />
                        {leave.department ||
                          leave.employee?.department ||
                          "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#64748B]">
                      ID: {leave.id || leave._id?.slice(-6) || "N/A"}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 w-fit rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                        leave.status,
                      )}`}
                    >
                      {getStatusIcon(leave.status)}
                      {leave.status || "Pending"}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[#E2E8F0] pt-5 sm:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                      <Calendar className="h-4 w-4 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Leave Period</p>
                      <p className="text-sm font-medium text-[#002185]">
                        {formatDate(leave.startDate)} -{" "}
                        {formatDate(leave.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                      <Clock className="h-4 w-4 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Duration</p>
                      <p className="text-sm font-medium text-[#002185]">
                        {leave.days || leave.numberOfDays || 0}{" "}
                        {leave.days === 1 ? "Day" : "Days"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                      <ClockIcon className="h-4 w-4 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Requested Date</p>
                      <p className="text-sm font-medium text-[#002185]">
                        {formatDate(leave.requestedDate || leave.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {leave.reason && (
                  <div className="mt-4 rounded-lg bg-[#F8FAFC] p-3 border border-[#E2E8F0]">
                    <p className="text-xs font-medium text-[#64748B]">Reason</p>
                    <p className="mt-1 text-sm text-[#334155] line-clamp-2">
                      {leave.reason}
                    </p>
                  </div>
                )}

                {/* Action */}
                <div className="mt-4 flex justify-end border-t border-[#E2E8F0] pt-4">
                  <button
                    type="button"
                    onClick={() => handleViewDetails(leave)}
                    className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#334155] transition hover:bg-[#F8FAFC] hover:text-[#002185] hover:border-[#002185] duration-300"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-14 text-center shadow-sm transition-all duration-300">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#94A3B8]" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-[#002185]">
              No leave requests
            </h3>
            <p className="text-sm text-[#64748B] mt-1">
              You have not submitted any leave requests yet.
            </p>
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-[#002185] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#ff5500] hover:shadow-lg mx-auto"
            >
              <Plus className="h-4 w-4" />
              Apply for Leave
            </button>
          </div>
        )}
      </div>

      {/* Leave Details Modal */}
      {showDetailsModal && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => setShowDetailsModal(false)}
            className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#FFFFFF] shadow-2xl border-2 border-[#002185] animate-fade-in"
          >
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5 bg-[#FFFFFF] rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#002185]">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#002185]">
                    Leave Request Details
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    ID: {selectedLeave.id || selectedLeave._id || "N/A"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#ff5500]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6 p-6">
              {/* Status Banner */}
              <div
                className={`rounded-lg p-4 border ${
                  selectedLeave.status?.toLowerCase() === "approved"
                    ? "bg-[#F0FDF4] border-[#16A34A]/20"
                    : selectedLeave.status?.toLowerCase() === "rejected"
                      ? "bg-[#FEF2F2] border-[#DC2626]/20"
                      : "bg-[#FFFBEB] border-[#F59E0B]/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm">
                    {getStatusIcon(selectedLeave.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#002185]">
                      Request Status
                    </p>
                    <p
                      className={`text-lg font-semibold ${getStatusColor(selectedLeave.status)}`}
                    >
                      {selectedLeave.status || "Pending"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee Information */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Employee Information
                </h3>
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-[#F8FAFC] p-4 sm:grid-cols-2 border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#002185] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">
                        {selectedLeave.employeeName?.charAt(0).toUpperCase() ||
                          "E"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Employee</p>
                      <p className="text-sm font-medium text-[#002185]">
                        {selectedLeave.employeeName ||
                          selectedLeave.employee?.fullName ||
                          "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                      <FileText className="h-3.5 w-3.5 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Employee ID</p>
                      <p className="text-sm font-medium text-[#002185] font-mono">
                        {selectedLeave.employeeId ||
                          selectedLeave.employee?._id ||
                          "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                      <Building2 className="h-3.5 w-3.5 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Department</p>
                      <p className="text-sm font-medium text-[#002185]">
                        {selectedLeave.department ||
                          selectedLeave.employee?.department ||
                          "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                      <Briefcase className="h-3.5 w-3.5 text-[#64748B]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Position</p>
                      <p className="text-sm font-medium text-[#002185]">
                        {selectedLeave.position ||
                          selectedLeave.employee?.position ||
                          "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leave Details */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Leave Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-[#E2E8F0] p-4 bg-[#FFFFFF]">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#64748B]" />
                      <p className="text-xs text-[#64748B]">Leave Type</p>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#002185]">
                      {selectedLeave.leaveType || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#E2E8F0] p-4 bg-[#FFFFFF]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#64748B]" />
                      <p className="text-xs text-[#64748B]">Duration</p>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#002185]">
                      {selectedLeave.days || selectedLeave.numberOfDays || 0}{" "}
                      {selectedLeave.days === 1 ? "Day" : "Days"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#E2E8F0] p-4 bg-[#FFFFFF] sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#64748B]" />
                      <p className="text-xs text-[#64748B]">Leave Period</p>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#002185]">
                      {formatDateLong(selectedLeave.startDate)} -{" "}
                      {formatDateLong(selectedLeave.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              {selectedLeave.reason && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Reason
                  </h3>
                  <div className="rounded-lg border border-[#E2E8F0] p-4 bg-[#F8FAFC]">
                    <p className="text-sm text-[#334155]">
                      {selectedLeave.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Request Metadata */}
              <div className="grid grid-cols-2 gap-4 border-t border-[#E2E8F0] pt-4">
                <div>
                  <p className="text-xs text-[#64748B]">Requested Date</p>
                  <p className="text-sm font-medium text-[#002185]">
                    {formatDateLong(
                      selectedLeave.requestedDate || selectedLeave.createdAt,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Request ID</p>
                  <p className="text-sm font-medium text-[#002185] font-mono">
                    {selectedLeave.id || selectedLeave._id || "N/A"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end border-t border-[#E2E8F0] pt-5">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="rounded-lg border border-[#E2E8F0] px-5 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#002185]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <ApplyLeaveModal
          onClose={() => setShowLeaveModal(false)}
          onSuccess={fetchLeaveData}
        />
      )}
    </>
  );
};

export default EmployeeLeave;
