import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  CalendarDays,
  ArrowRight,
  MessageSquare,
  CheckCheck,
  ShieldCheck,
} from "lucide-react";

export const PendingLeavesDashboard = ({
  pendingRequests = [],
  onUpdateStatus,
  updatingId = null,
}) => {
  const [remarksState, setRemarksState] = useState({});
  const [expandedRemarkId, setExpandedRemarkId] = useState(null);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  const handleRemarkChange = (id, text) => {
    setRemarksState((prev) => ({
      ...prev,
      [id]: text,
    }));
  };

  const handleApprove = async (id) => {
    const remark = remarksState[id] || "";
    await onUpdateStatus(id, "Approved", remark);
  };

  const handleReject = async (id) => {
    const remark = remarksState[id] || "";
    await onUpdateStatus(id, "Rejected", remark);
  };

  const handleBatchApproveAll = async () => {
    if (!window.confirm(`Are you sure you want to approve all ${pendingRequests.length} pending leave request(s)?`)) {
      return;
    }
    setBatchActionLoading(true);
    for (const req of pendingRequests) {
      await onUpdateStatus(req._id, "Approved", "Batch approved by administrator");
    }
    setBatchActionLoading(false);
  };

  // Metrics
  const totalPendingDays = pendingRequests.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);
  const uniqueDepts = new Set(pendingRequests.map((r) => r.employee?.department).filter(Boolean)).size;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getLeaveTypeBadge = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("sick")) return "bg-red-50 text-red-700 border-red-200";
    if (t.includes("annual")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (t.includes("casual")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (t.includes("maternity") || t.includes("paternity")) return "bg-pink-50 text-pink-700 border-pink-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  if (pendingRequests.length === 0) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-8 text-center shadow-xs">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-[#002185]">
          All Caught Up! Zero Pending Leave Requests
        </h3>
        <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
          Every submitted leave request has been reviewed. Newly applied leave requests will appear in this action queue instantly.
        </p>
      </div>
    );
  }

  return (
    <div id="pending-leave-dashboard" className="space-y-4">
      {/* Top Banner with Summary & Batch Action */}
      <div className="bg-gradient-to-r from-[#002185] to-[#0A2E9E] rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ff5500] text-white uppercase tracking-wider">
              Action Required
            </span>
            <span className="text-xs text-white/80 font-medium">
              {pendingRequests.length} Request{pendingRequests.length !== 1 ? "s" : ""} Awaiting Review
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Pending Leave Requests Status Dashboard
          </h2>
          <p className="text-xs text-white/70 mt-0.5">
            Review applicant details, stated reasons, and click <strong>Approve</strong> or <strong>Reject</strong> to update the database in real-time.
          </p>
        </div>

        {/* Quick KPI stats & Batch action */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs text-center">
            <div className="text-base font-black text-white">{totalPendingDays}</div>
            <div className="text-[10px] uppercase font-semibold text-white/70">Total Days</div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur-xs text-center">
            <div className="text-base font-black text-white">{uniqueDepts}</div>
            <div className="text-[10px] uppercase font-semibold text-white/70">Dept{uniqueDepts !== 1 ? "s" : ""}</div>
          </div>
          <button
            type="button"
            onClick={handleBatchApproveAll}
            disabled={batchActionLoading}
            className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{batchActionLoading ? "Approving..." : "Approve All"}</span>
          </button>
        </div>
      </div>

      {/* Grid of Pending Leave Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingRequests.map((leave) => {
          const leaveId = leave._id;
          const employeeName = leave.employee?.fullName || "Employee";
          const employeeId = leave.employee?.employeeId || "EMP";
          const department = leave.employee?.department || "General";
          const leaveType = leave.leaveType || "Leave";
          const totalDays = leave.totalDays || 1;
          const isUpdating = updatingId === leaveId;
          const isRemarkOpen = expandedRemarkId === leaveId;
          const remarkValue = remarksState[leaveId] || "";

          return (
            <div
              key={leaveId}
              id={`pending-leave-card-${leaveId}`}
              className="bg-[#FFFFFF] border-2 border-[#E2E8F0] hover:border-[#ff5500] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4"
            >
              {/* Card Header: Employee Avatar & Badge */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#002185] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {employeeName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#002185] line-clamp-1">
                        {employeeName}
                      </h3>
                      <p className="text-[11px] text-[#64748B] flex items-center gap-1">
                        <span>{employeeId}</span>
                        <span>•</span>
                        <span className="line-clamp-1">{department}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${getLeaveTypeBadge(
                      leaveType
                    )}`}
                  >
                    {leaveType}
                  </span>
                </div>

                {/* Date Duration Box */}
                <div className="mt-3.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B] flex items-center gap-1.5 font-medium">
                      <CalendarDays className="w-3.5 h-3.5 text-[#002185]" />
                      Duration
                    </span>
                    <span className="font-bold text-[#002185] bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                      {totalDays} Day{totalDays !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                    <span>{formatDate(leave.startDate)}</span>
                    <ArrowRight className="w-3 h-3 text-[#ff5500]" />
                    <span>{formatDate(leave.endDate)}</span>
                  </div>
                </div>

                {/* Stated Reason */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    Reason Provided:
                  </span>
                  <div className="mt-1 p-2.5 rounded-xl bg-[#FFFBEB]/60 border border-[#F59E0B]/30 text-xs text-[#92400E] leading-relaxed italic">
                    "{leave.reason || "No reason specified"}"
                  </div>
                </div>

                {/* Optional Admin Remark Toggle */}
                {isRemarkOpen && (
                  <div className="mt-3 space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#002185] flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-[#ff5500]" />
                      Admin Decision Note (Optional)
                    </label>
                    <textarea
                      value={remarkValue}
                      onChange={(e) => handleRemarkChange(leaveId, e.target.value)}
                      placeholder="Add note for employee (e.g. Handover approved)..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#002185] resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons: Direct Approve & Reject */}
              <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <button
                    type="button"
                    onClick={() => setExpandedRemarkId(isRemarkOpen ? null : leaveId)}
                    className="text-[#002185] hover:text-[#ff5500] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{isRemarkOpen ? "Close Note" : "Attach Admin Note"}</span>
                  </button>
                  <span className="text-[10px]">
                    Applied: {formatDate(leave.createdAt)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Reject Button */}
                  <button
                    type="button"
                    onClick={() => handleReject(leaveId)}
                    disabled={isUpdating}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#FEF2F2] border border-[#DC2626]/40 hover:border-[#DC2626] text-[#DC2626] text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-[#DC2626]" />
                    <span>{isUpdating ? "Updating..." : "Reject"}</span>
                  </button>

                  {/* Approve Button */}
                  <button
                    type="button"
                    onClick={() => handleApprove(leaveId)}
                    disabled={isUpdating}
                    className="py-2.5 px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>{isUpdating ? "Updating..." : "Approve"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingLeavesDashboard;
