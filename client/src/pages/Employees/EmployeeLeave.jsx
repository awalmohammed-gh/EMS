import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  X,
  CalendarDays,
  ShieldCheck,
  MessageSquare,
  Search,
  RefreshCw,
} from "lucide-react";
import ApplyLeaveModal from "../../components/modal/ApplyLeaveModal";
import LeaveRequestForm from "../../components/LeaveRequestForm";
import { myLeave } from "../../apis/fontApis";
import { useManagement } from "../../context/ManagementContextProvider";
import { getSocket, registerSocketUser } from "../../utils/socket";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const EmployeeLeave = () => {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [balanceStats, setBalanceStats] = useState({
    totalDays: 20,
    usedDays: 0,
    availableDays: 20,
  });

  const { setShowToast, employee } = useManagement();

  const fetchLeaveData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      setIsError(null);
      const { data } = await myLeave();

      if (data.success || Array.isArray(data.leaves) || Array.isArray(data)) {
        let leaves = [];
        if (Array.isArray(data.leaves)) {
          leaves = data.leaves;
        } else if (Array.isArray(data.data)) {
          leaves = data.data;
        } else if (Array.isArray(data)) {
          leaves = data;
        } else if (data.leaves && typeof data.leaves === "object") {
          leaves = [data.leaves];
        }

        setLeaveRequests(leaves);

        if (data.employeeBalance) {
          setBalanceStats(data.employeeBalance);
        } else {
          // Compute balance stats from requests
          const approvedDays = leaves
            .filter((l) => (l.status || "").toLowerCase() === "approved")
            .reduce((acc, curr) => acc + (Number(curr.totalDays) || Number(curr.days) || 1), 0);
          setBalanceStats({
            totalDays: 20,
            usedDays: approvedDays,
            availableDays: Math.max(0, 20 - approvedDays),
          });
        }
      } else {
        if (!isSilent) {
          setIsError(data.message || "Failed to fetch leave requests.");
          setShowToast({
            show: true,
            message: data.message || "Failed to fetch leave requests.",
            type: "error",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching leave data:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to fetch leave requests.";
      if (!isSilent) {
        setIsError(errorMessage);
        setShowToast({
          show: true,
          message: errorMessage,
          type: "error",
        });
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [setShowToast]);

  // Initial load and Socket.io real-time listener setup
  useEffect(() => {
    fetchLeaveData();

    // Register user with socket room
    const currentEmpId = employee?._id || employee?.id || employee?.employeeId;
    if (currentEmpId) {
      registerSocketUser(currentEmpId, "employee");
    }

    const socket = getSocket();

    const handleLeaveStatusChanged = (eventData) => {
      console.log("[Socket.io] Real-time leave_status_changed event received:", eventData);
      
      const updatedLeave = eventData.leave || eventData;
      const updatedId = eventData.leaveId || updatedLeave._id || updatedLeave.id;
      const newStatus = eventData.status || updatedLeave.status || "Updated";
      const isApproved = (newStatus || "").toLowerCase() === "approved";
      const isRejected = (newStatus || "").toLowerCase() === "rejected";

      // 1. Instantly update the state list
      setLeaveRequests((prevList) => {
        const found = prevList.some((item) => String(item._id || item.id) === String(updatedId));
        if (found) {
          return prevList.map((item) =>
            String(item._id || item.id) === String(updatedId)
              ? {
                  ...item,
                  ...updatedLeave,
                  status: newStatus,
                  adminNotes: eventData.adminNotes || updatedLeave.adminNotes || item.adminNotes,
                  adminRemark: eventData.adminNotes || updatedLeave.adminRemark || item.adminRemark,
                  approvedBy: eventData.reviewedBy || updatedLeave.approvedBy || item.approvedBy,
                  reviewedAt: eventData.reviewedAt || updatedLeave.reviewedAt || new Date().toISOString(),
                  approvedAt: eventData.reviewedAt || updatedLeave.approvedAt || new Date().toISOString(),
                }
              : item
          );
        }
        return [updatedLeave, ...prevList];
      });

      // 2. If modal is viewing this leave, update modal in real-time
      setSelectedLeave((prev) => {
        if (prev && String(prev._id || prev.id) === String(updatedId)) {
          return {
            ...prev,
            ...updatedLeave,
            status: newStatus,
            adminNotes: eventData.adminNotes || updatedLeave.adminNotes || prev.adminNotes,
            adminRemark: eventData.adminNotes || updatedLeave.adminRemark || prev.adminRemark,
            approvedBy: eventData.reviewedBy || updatedLeave.approvedBy || prev.approvedBy,
            reviewedAt: eventData.reviewedAt || updatedLeave.reviewedAt || new Date().toISOString(),
          };
        }
        return prev;
      });

      // 3. Trigger instant toast notification
      const dateRangeStr = updatedLeave.startDate && updatedLeave.endDate
        ? ` for ${new Date(updatedLeave.startDate).toLocaleDateString()} to ${new Date(updatedLeave.endDate).toLocaleDateString()}`
        : "";
      
      setShowToast({
        show: true,
        message: isApproved
          ? `Your leave request${dateRangeStr} has been approved by management!`
          : isRejected
          ? `Your leave request${dateRangeStr} was rejected by management.${eventData.adminNotes ? ` Note: "${eventData.adminNotes}"` : ""}`
          : `Leave request status updated to ${newStatus}.`,
        type: isApproved ? "success" : isRejected ? "error" : "info",
      });

      // 4. Background re-fetch to ensure complete sync with database
      fetchLeaveData(true);
    };

    socket.on("leave_status_changed", handleLeaveStatusChanged);
    socket.on("leave_approved", handleLeaveStatusChanged);
    socket.on("leave_rejected", handleLeaveStatusChanged);

    return () => {
      socket.off("leave_status_changed", handleLeaveStatusChanged);
      socket.off("leave_approved", handleLeaveStatusChanged);
      socket.off("leave_rejected", handleLeaveStatusChanged);
    };
  }, [fetchLeaveData, employee, setShowToast]);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/25 font-bold";
      case "rejected":
        return "bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/25 font-bold";
      case "pending":
        return "bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/30 font-bold";
      default:
        return "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] font-semibold";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <CheckCircle className="w-3.5 h-3.5 text-[#16A34A]" />;
      case "rejected":
        return <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />;
      case "pending":
        return <ClockIcon className="w-3.5 h-3.5 text-[#D97706]" />;
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

  // Filtered requests
  const filteredRequests = leaveRequests.filter((leave) => {
    const status = (leave.status || "Pending").toLowerCase();
    const type = (leave.leaveType || "").toLowerCase();
    const reason = (leave.reason || "").toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = type.includes(search) || reason.includes(search);
    const matchesFilter =
      statusFilter === "All" || status === statusFilter.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  // Calculate summary stats
  const approvedRequests = leaveRequests.filter(
    (leave) => (leave.status || "").toLowerCase() === "approved",
  ).length;
  const pendingRequests = leaveRequests.filter(
    (leave) => (leave.status || "").toLowerCase() === "pending",
  ).length;
  const rejectedRequests = leaveRequests.filter(
    (leave) => (leave.status || "").toLowerCase() === "rejected",
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
      <div id="employee-leave-portal" className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E48] dark:text-blue-100">
              My Leave Requests & Tracking
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Apply for leave, track approval decisions in real-time, and manage your annual balances
            </p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => fetchLeaveData(false)}
              className="p-2.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#002185] transition"
              title="Refresh requests"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowInlineForm(!showInlineForm)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs ${
                showInlineForm
                  ? "bg-[#F8FAFC] text-[#002185] border border-[#002185]"
                  : "bg-[#002185] text-white hover:bg-[#ff5500]"
              }`}
            >
              <Plus className="h-4 w-4" />
              {showInlineForm ? "Hide Application Form" : "+ Apply for Leave"}
            </button>
          </div>
        </div>

        {/* Inline Leave Request Form Component */}
        {showInlineForm && (
          <LeaveRequestForm
            inline={true}
            onSuccess={() => {
              fetchLeaveData();
              setShowInlineForm(false);
            }}
            onCancel={() => setShowInlineForm(false)}
            title="Submit New Leave Application"
            subtitle="Fill out your desired dates and reason. Once submitted, your request is automatically queued for management approval."
          />
        )}

        {/* Leave Balance & Status Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Entitlement */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md hover:border-[#002185] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Available Balance
                </p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-[#002185]">
                    {balanceStats.availableDays}
                  </span>
                  <span className="text-xs font-semibold text-[#64748B]">
                    / {balanceStats.totalDays} Days
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#002185]/10 flex items-center justify-center text-[#002185]">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#002185] h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (balanceStats.availableDays / (balanceStats.totalDays || 20)) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Approved Requests */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md hover:border-[#16A34A] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Approved Leaves
                </p>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-2xl font-bold text-[#16A34A]">
                    {approvedRequests}
                  </span>
                  <span className="text-xs text-[#16A34A] font-semibold">
                    ({balanceStats.usedDays} Days used)
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#F0FDF4] flex items-center justify-center text-[#16A34A]">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-[#64748B] mt-2">
              Excluded from attendance penalties
            </p>
          </div>

          {/* Pending Approval */}
          <div className="rounded-xl border-2 border-[#F59E0B]/40 bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md hover:border-[#F59E0B] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#B45309] uppercase tracking-wide flex items-center gap-1">
                  <span>Pending Approval</span>
                  {pendingRequests > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                  )}
                </p>
                <p className="text-2xl font-bold text-[#D97706] mt-1.5">
                  {pendingRequests}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#FFFBEB] flex items-center justify-center text-[#D97706]">
                <ClockIcon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-[#64748B] mt-2">
              Awaiting manager review & approval
            </p>
          </div>

          {/* Rejected */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md hover:border-[#DC2626] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Rejected / Unapproved
                </p>
                <p className="text-2xl font-bold text-[#DC2626] mt-1.5">
                  {rejectedRequests}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#FEF2F2] flex items-center justify-center text-[#DC2626]">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-[#64748B] mt-2">
              View admin remarks in details
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3.5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search your leave requests by type or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#002185]"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto pb-1 sm:pb-0">
              {["All", "Approved", "Pending", "Rejected"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    statusFilter === status
                      ? "bg-[#002185] text-white shadow-2xs"
                      : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#002185] border border-[#E2E8F0]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leave Requests History List */}
        {filteredRequests.length > 0 ? (
          <div className="space-y-3.5">
            {filteredRequests.map((leave) => {
              const leaveId = leave._id || leave.id;
              const statusNormalized = (leave.status || "Pending").toLowerCase();
              const isApproved = statusNormalized === "approved";
              const isRejected = statusNormalized === "rejected";
              const daysCount = leave.totalDays || leave.days || leave.numberOfDays || 1;
              const reviewer = leave.approvedBy || leave.reviewedBy || (isApproved || isRejected ? "Management" : null);
              const reviewDate = leave.reviewedAt || leave.approvedAt;
              const adminNote = leave.adminNotes || leave.adminRemark;

              return (
                <div
                  key={leaveId || Math.random()}
                  className={`rounded-xl border bg-[#FFFFFF] p-5 shadow-sm hover:shadow-md transition-all duration-300 ${
                    isApproved
                      ? "border-emerald-200/80 hover:border-emerald-400"
                      : isRejected
                      ? "border-rose-200/80 hover:border-rose-400"
                      : "border-amber-200/80 hover:border-amber-400"
                  }`}
                >
                  {/* Top Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar / Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isApproved
                            ? "bg-[#F0FDF4] text-[#16A34A]"
                            : isRejected
                            ? "bg-[#FEF2F2] text-[#DC2626]"
                            : "bg-[#FFFBEB] text-[#D97706]"
                        }`}
                      >
                        {getStatusIcon(leave.status)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[#002185] text-sm">
                            {leave.leaveType || "Leave Request"}
                          </h3>
                          <span className="text-[11px] font-bold text-[#ff5500] bg-[#ff5500]/10 px-2 py-0.5 rounded-md">
                            {daysCount} Day{daysCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-[#002185]" />
                          <span className="font-semibold text-[#0F172A]">
                            {formatDate(leave.startDate)}
                          </span>
                          <span>to</span>
                          <span className="font-semibold text-[#0F172A]">
                            {formatDate(leave.endDate)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusStyle(
                          leave.status,
                        )}`}
                      >
                        {getStatusIcon(leave.status)}
                        {leave.status || "Pending"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleViewDetails(leave)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#002185] hover:bg-[#F8FAFC] hover:border-[#002185] transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </div>
                  </div>

                  {/* Stated Reason */}
                  {leave.reason && (
                    <div className="mt-3 rounded-lg bg-[#F8FAFC] px-3.5 py-2.5 border border-[#E2E8F0]">
                      <p className="text-[11px] font-semibold text-[#64748B]">
                        Applicant Reason:
                      </p>
                      <p className="mt-0.5 text-xs text-[#334155] leading-relaxed">
                        {leave.reason}
                      </p>
                    </div>
                  )}

                  {/* Review Audit & Admin Notes (Shown when Approved or Rejected) */}
                  {(reviewer || adminNote || reviewDate) && (
                    <div
                      className={`mt-3 rounded-lg px-3.5 py-2.5 text-xs border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isApproved
                          ? "bg-[#F0FDF4]/60 border-[#16A34A]/20 text-[#166534]"
                          : isRejected
                          ? "bg-[#FEF2F2]/60 border-[#DC2626]/20 text-[#991B1B]"
                          : "bg-[#FFFBEB]/60 border-[#F59E0B]/20 text-[#92400E]"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" />
                        <div>
                          {adminNote ? (
                            <p className="font-medium text-xs">
                              <span className="font-bold">Manager Feedback:</span> "{adminNote}"
                            </p>
                          ) : (
                            <p className="font-medium text-xs">
                              Decision recorded by {reviewer || "Management"}
                            </p>
                          )}
                        </div>
                      </div>

                      {reviewDate && (
                        <span className="text-[11px] text-[#64748B] font-medium shrink-0">
                          Reviewed: {formatDate(reviewDate)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#FFFFFF] py-16 px-4 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-4 text-[#002185]">
              <CalendarDays className="w-8 h-8 text-[#002185]" />
            </div>
            <h3 className="text-lg font-bold text-[#002185]">
              {searchTerm || statusFilter !== "All"
                ? "No matching leave requests"
                : "No leave requests submitted yet"}
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto leading-relaxed">
              {searchTerm || statusFilter !== "All"
                ? "Try clearing your search query or selecting 'All' statuses to view your complete record history."
                : "When you submit a leave application, you can track its review progress in real-time right here without needing to refresh."}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {searchTerm || statusFilter !== "All" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("All");
                  }}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-xs font-bold text-[#002185] hover:bg-[#E2E8F0] transition"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-[#002185] hover:bg-[#ff5500] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Apply for Leave</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leave Details Modal */}
      {showDetailsModal && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FFFFFF] shadow-2xl border border-[#E2E8F0] space-y-5 p-6 animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#002185] flex items-center justify-center text-white">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#002185]">
                    Leave Request Details
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    ID: {selectedLeave.id || selectedLeave._id || "N/A"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#DC2626] transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Banner */}
            <div
              className={`rounded-xl p-4 border flex items-center justify-between ${
                (selectedLeave.status || "").toLowerCase() === "approved"
                  ? "bg-[#F0FDF4] border-[#16A34A]/25"
                  : (selectedLeave.status || "").toLowerCase() === "rejected"
                  ? "bg-[#FEF2F2] border-[#DC2626]/25"
                  : "bg-[#FFFBEB] border-[#F59E0B]/25"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-2xs">
                  {getStatusIcon(selectedLeave.status)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#64748B]">Current Status</p>
                  <p className={`text-base font-bold capitalize ${getStatusColor(selectedLeave.status)}`}>
                    {selectedLeave.status || "Pending"}
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-[#E2E8F0] text-[#002185]">
                {selectedLeave.totalDays || selectedLeave.days || 1} Day(s)
              </span>
            </div>

            {/* Leave Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-[#64748B] font-medium">Leave Category</p>
                <p className="text-sm font-bold text-[#002185] mt-1">
                  {selectedLeave.leaveType || "Annual Leave"}
                </p>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-[#64748B] font-medium">Leave Period</p>
                <p className="text-sm font-bold text-[#002185] mt-1">
                  {formatDate(selectedLeave.startDate)} — {formatDate(selectedLeave.endDate)}
                </p>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-[#64748B] font-medium">Submitted Date</p>
                <p className="text-sm font-bold text-[#0F172A] mt-1">
                  {formatDateLong(selectedLeave.requestedDate || selectedLeave.createdAt)}
                </p>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <p className="text-[#64748B] font-medium">Review Status</p>
                <p className="text-sm font-bold text-[#0F172A] mt-1">
                  {selectedLeave.reviewedAt || selectedLeave.approvedAt
                    ? `Reviewed on ${formatDate(selectedLeave.reviewedAt || selectedLeave.approvedAt)}`
                    : "Pending Review"}
                </p>
              </div>
            </div>

            {/* Stated Reason */}
            {selectedLeave.reason && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-[#64748B]">Applicant Reason:</p>
                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] leading-relaxed">
                  {selectedLeave.reason}
                </div>
              </div>
            )}

            {/* Admin Notes / Remarks */}
            {(selectedLeave.adminNotes || selectedLeave.adminRemark) && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-[#002185] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#002185]" />
                  <span>Management Feedback / Notes:</span>
                </p>
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 text-xs text-[#0F172A] leading-relaxed">
                  "{selectedLeave.adminNotes || selectedLeave.adminRemark}"
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#002185] text-white text-xs font-bold hover:bg-[#ff5500] transition cursor-pointer"
              >
                Close Details
              </button>
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
