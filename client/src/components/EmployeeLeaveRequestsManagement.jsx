import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Send,
  AlertCircle,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { myLeave, applyForLeave } from "../apis/fontApis";
import { useManagement } from "../context/ManagementContextProvider";
import CustomSelect from "./CustomSelect";

const LEAVE_TYPES = [
  { value: "Annual Leave", label: "Annual Leave (Paid)" },
  { value: "Sick Leave", label: "Sick Leave (Medical)" },
  { value: "Casual Leave", label: "Casual Leave" },
  { value: "Maternity Leave", label: "Maternity Leave" },
  { value: "Paternity Leave", label: "Paternity Leave" },
  { value: "Study Leave", label: "Study / Professional Leave" },
  { value: "Compassionate Leave", label: "Compassionate / Bereavement" },
  { value: "Unpaid Leave", label: "Unpaid Leave" },
];

export const EmployeeLeaveRequestsManagement = ({
  title = "Leave Requests Management",
  subtitle = "Submit time-off requests, track management approvals, and monitor your annual leave balance",
  onLeaveApplied = null,
  initialData = null,
}) => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [balance, setBalance] = useState({
    totalDays: 20,
    usedDays: 0,
    availableDays: 20,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    leaveType: "Annual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Table Filter & Search State
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState(null);

  const { setShowToast } = useManagement();

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Helper date range calculator
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    const diff = Math.abs(e - s);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const requestedDuration = calculateDays(formData.startDate, formData.endDate);

  // Fetch leave requests and balance
  const fetchLeaveData = useCallback(async (isSilent = false) => {
    try {
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const res = await myLeave();
      const data = res?.data;

      if (data?.success || Array.isArray(data?.leaves) || Array.isArray(data?.data)) {
        let list = [];
        if (Array.isArray(data?.leaves)) {
          list = data.leaves;
        } else if (Array.isArray(data?.data)) {
          list = data.data;
        } else if (Array.isArray(data)) {
          list = data;
        }

        setLeaveRequests(list);

        if (data?.employeeBalance) {
          setBalance({
            totalDays: Number(data.employeeBalance.totalDays) || 20,
            usedDays: Number(data.employeeBalance.usedDays) || 0,
            availableDays:
              data.employeeBalance.availableDays !== undefined
                ? Number(data.employeeBalance.availableDays)
                : Math.max(0, (Number(data.employeeBalance.totalDays) || 20) - (Number(data.employeeBalance.usedDays) || 0)),
          });
        } else {
          // Compute balance from approved requests
          const used = list
            .filter((l) => String(l.status || "").toLowerCase() === "approved")
            .reduce((sum, item) => sum + (Number(item.totalDays) || Number(item.days) || 1), 0);
          setBalance({
            totalDays: 20,
            usedDays: used,
            availableDays: Math.max(0, 20 - used),
          });
        }
      } else {
        const msg = data?.message || "Failed to load leave requests.";
        if (!isSilent) setError(msg);
      }
    } catch (err) {
      console.error("Error fetching leave requests:", err);
      const msg = err.response?.data?.message || err.message || "Failed to load leave records.";
      if (!isSilent) setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  // Handle Form Input Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  // Submit New Leave Request
  const handleSubmitLeave = async (e) => {
    e.preventDefault();

    if (!formData.leaveType) {
      setFormError("Please select a leave category.");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setFormError("Please select both start and end dates.");
      return;
    }

    const s = new Date(formData.startDate);
    const eDate = new Date(formData.endDate);
    if (eDate < s) {
      setFormError("End date cannot be prior to start date.");
      return;
    }

    if (!formData.reason || formData.reason.trim().length < 5) {
      setFormError("Please provide a reason (minimum 5 characters).");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload = {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
        totalDays: requestedDuration,
      };

      const res = await applyForLeave(payload);
      const data = res?.data;

      if (data?.success || res?.status === 200 || res?.status === 201) {
        setShowToast({
          show: true,
          message: data?.message || "Leave request submitted successfully!",
          type: "success",
        });

        // Reset Form
        setFormData({
          leaveType: "Annual Leave",
          startDate: "",
          endDate: "",
          reason: "",
        });
        setShowApplyForm(false);

        // Refresh data
        await fetchLeaveData(true);

        if (typeof onLeaveApplied === "function") {
          onLeaveApplied(data?.leave);
        }
      } else {
        setFormError(data?.message || "Failed to submit leave request.");
      }
    } catch (err) {
      console.error("Error submitting leave request:", err);
      setFormError(err.response?.data?.message || err.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Styling & Badges
  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "approved":
        return {
          label: "Approved",
          icon: CheckCircle2,
          className: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
        };
      case "rejected":
        return {
          label: "Rejected",
          icon: XCircle,
          className: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
        };
      case "pending":
      default:
        return {
          label: "Pending Review",
          icon: Clock,
          className: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
        };
    }
  };

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((leave) => {
      const s = String(leave.status || "Pending").toLowerCase();
      const type = String(leave.leaveType || "").toLowerCase();
      const reason = String(leave.reason || "").toLowerCase();
      const search = searchTerm.toLowerCase().trim();

      const matchesStatus =
        statusFilter === "all" ||
        s === statusFilter.toLowerCase();

      const matchesSearch =
        !search ||
        type.includes(search) ||
        reason.includes(search) ||
        s.includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [leaveRequests, statusFilter, searchTerm]);

  // Aggregate stats
  const pendingCount = leaveRequests.filter(
    (l) => String(l.status || "").toLowerCase() === "pending"
  ).length;
  const approvedCount = leaveRequests.filter(
    (l) => String(l.status || "").toLowerCase() === "approved"
  ).length;
  const rejectedCount = leaveRequests.filter(
    (l) => String(l.status || "").toLowerCase() === "rejected"
  ).length;

  const usedPercentage =
    balance.totalDays > 0
      ? Math.min(100, Math.round((balance.usedDays / balance.totalDays) * 100))
      : 0;

  return (
    <div id="employee-leave-requests-management-section" className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111927] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#002185] dark:text-blue-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => fetchLeaveData(true)}
            disabled={isLoading || isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-[#162033] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowApplyForm(!showApplyForm)}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              showApplyForm
                ? "bg-slate-100 dark:bg-[#162033] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                : "bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{showApplyForm ? "Close Form" : "Request Time Off"}</span>
          </button>
        </div>
      </div>

      {/* Summary of Remaining Leave Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Available Remaining Balance */}
        <div className="bg-white dark:bg-[#111927] p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Remaining Balance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {balance.availableDays}
            </p>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">Days Available</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(0, 100 - usedPercentage)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            {100 - usedPercentage}% of annual quota intact
          </p>
        </div>

        {/* Used Leave Days */}
        <div className="bg-white dark:bg-[#111927] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Used Leave Days</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {balance.usedDays}
            </p>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Days Logged</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${usedPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            {usedPercentage}% of quota consumed
          </p>
        </div>

        {/* Total Annual Entitlement */}
        <div className="bg-white dark:bg-[#111927] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Annual Entitlement</span>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {balance.totalDays}
            </p>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Days Total</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3.5">
            Standard paid leave policy allotment
          </p>
        </div>

        {/* Pending Requests */}
        <div className="bg-white dark:bg-[#111927] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Pending Requests</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingCount}
            </p>
            <span className="text-xs font-medium text-amber-700/80 dark:text-amber-400">Awaiting Decision</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3.5">
            {approvedCount} Approved · {rejectedCount} Rejected
          </p>
        </div>
      </div>

      {/* Interactive Time-off Request Submission Form */}
      {showApplyForm && (
        <div className="bg-white dark:bg-[#111927] rounded-2xl border border-blue-200 dark:border-blue-900/60 p-5 sm:p-6 shadow-md transition-all">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#002185] dark:text-blue-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Submit New Time-off Request
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowApplyForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Leave Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Leave Category <span className="text-rose-500">*</span>
                </label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#162033] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {LEAVE_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#162033] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={formData.startDate}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#162033] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Duration calculation banner */}
            {requestedDuration > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>
                    Requested Duration: <strong>{requestedDuration} Day{requestedDuration !== 1 ? "s" : ""}</strong>
                  </span>
                </div>
                {requestedDuration > balance.availableDays && (
                  <span className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Exceeds available balance ({balance.availableDays} days)
                  </span>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reason &amp; Additional Details <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={3}
                placeholder="State the reason for taking leave, emergency contact info or coverage arrangement..."
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#162033] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Submitting Application..." : "Submit Leave Request"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#111927] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Requests", count: leaveRequests.length },
            { id: "pending", label: "Pending", count: pendingCount },
            { id: "approved", label: "Approved", count: approvedCount },
            { id: "rejected", label: "Rejected", count: rejectedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-[#002185] text-white shadow-xs dark:bg-blue-600"
                  : "bg-slate-50 dark:bg-[#162033] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reason or type..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#162033] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Leave Requests Table View */}
      <div className="bg-white dark:bg-[#111927] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#002185] dark:text-blue-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Loading leave records...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{error}</p>
            <button
              type="button"
              onClick={() => fetchLeaveData()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 rounded-xl cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#162033] flex items-center justify-center mx-auto text-slate-400">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No leave requests found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "all"
                ? "No leave requests matched your filter criteria."
                : "You haven't submitted any time-off requests yet. Use the 'Request Time Off' button above to apply."}
            </p>
            {!showApplyForm && (
              <button
                type="button"
                onClick={() => setShowApplyForm(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#002185] hover:bg-[#001760] dark:bg-blue-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/75 dark:bg-[#162033]/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Duration &amp; Period</th>
                  <th className="py-3.5 px-4">Applied Date</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredRequests.map((leave, index) => {
                  const statusInfo = getStatusBadge(leave.status);
                  const StatusIcon = statusInfo.icon;
                  const days = leave.totalDays || leave.days || calculateDays(leave.startDate, leave.endDate);
                  const hasRemarks = Boolean(leave.adminRemark || leave.adminNotes);
                  const isRejected = String(leave.status || "").toLowerCase() === "rejected";

                  return (
                    <tr
                      key={leave._id || leave.id || index}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Leave Type */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {leave.leaveType || "Leave Request"}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: #{String(leave._id || leave.id || index).slice(-6).toUpperCase()}
                        </span>
                      </td>

                      {/* Period */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                          {days} Day{days !== 1 ? "s" : ""}
                        </div>
                      </td>

                      {/* Applied Date */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {formatDate(leave.createdAt || leave.appliedAt || leave.startDate)}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="truncate text-slate-700 dark:text-slate-300" title={leave.reason}>
                          {leave.reason || "No description provided"}
                        </p>
                        {hasRemarks && (
                          <div
                            className={`text-[11px] mt-1 p-1.5 rounded-lg border flex items-start gap-1 ${
                              isRejected
                                ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300"
                                : "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300"
                            }`}
                          >
                            <span className="font-semibold shrink-0">Note:</span>
                            <span className="truncate">{leave.adminRemark || leave.adminNotes}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.className}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLeaveDetails(leave)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-[#002185] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs font-semibold"
                        >
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLeaveDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedLeaveDetails(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#111927] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Leave Request Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLeaveDetails(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Leave Type</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedLeaveDetails.leaveType}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Duration</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(selectedLeaveDetails.startDate)} – {formatDate(selectedLeaveDetails.endDate)} (
                  {selectedLeaveDetails.totalDays || selectedLeaveDetails.days || calculateDays(selectedLeaveDetails.startDate, selectedLeaveDetails.endDate)} days)
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Submitted On</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatDate(selectedLeaveDetails.createdAt || selectedLeaveDetails.appliedAt)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Approval Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    getStatusBadge(selectedLeaveDetails.status).className
                  }`}
                >
                  {getStatusBadge(selectedLeaveDetails.status).label}
                </span>
              </div>

              <div className="pt-2">
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Your Reason:</span>
                <div className="p-3 bg-slate-50 dark:bg-[#162033] rounded-xl text-slate-800 dark:text-slate-200">
                  {selectedLeaveDetails.reason || "No reason specified."}
                </div>
              </div>

              {(selectedLeaveDetails.adminRemark || selectedLeaveDetails.adminNotes) && (
                <div className="pt-2">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">
                    Management Decision / Remarks:
                  </span>
                  <div
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      String(selectedLeaveDetails.status).toLowerCase() === "rejected"
                        ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 font-medium"
                        : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-medium"
                    }`}
                  >
                    {selectedLeaveDetails.adminRemark || selectedLeaveDetails.adminNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLeaveDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
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

export default EmployeeLeaveRequestsManagement;
