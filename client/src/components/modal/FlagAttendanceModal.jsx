import { useState, useEffect } from "react";
import {
  X,
  Flag,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const FLAG_CATEGORIES = [
  { id: "unverified", label: "Unverified / Chronic Tardiness Pattern" },
  { id: "discrepancy", label: "Clock Punch Discrepancy / Early Departure" },
  { id: "unapproved_ot", label: "Unapproved Overtime / Irregular Hours" },
  { id: "disciplinary", label: "Escalated for HR Disciplinary Hearing" },
  { id: "policy", label: "Time & Attendance Policy Violation" },
  { id: "custom", label: "Custom Review Notice..." },
];

const FlagAttendanceModal = ({
  isOpen,
  onClose,
  record,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("unverified");
  const [customReason, setCustomReason] = useState("");
  const [severity, setSeverity] = useState("warning");

  useEffect(() => {
    if (record) {
      setSelectedCategory("unverified");
      setCustomReason(record.flagReason || "");
      setSeverity("warning");
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const empName =
    record.employee?.fullName ||
    record.employee?.name ||
    record.employeeName ||
    "Employee";
  const empCode =
    record.employee?.employeeId ||
    record.employeeId ||
    record.employee?._id ||
    "EMP";
  const empDept = record.employee?.department || "General";

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason =
      selectedCategory === "custom" || !selectedCategory
        ? customReason.trim() || "Flagged for administrative review"
        : FLAG_CATEGORIES.find((c) => c.id === selectedCategory)?.label +
          (customReason.trim() ? ` — ${customReason.trim()}` : "");

    onConfirm({
      reason: finalReason,
      severity,
    });
  };

  return (
    <div
      id="modal-flag-attendance"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002185]">
                Flag Attendance Record
              </h3>
              <p className="text-xs text-[#64748B]">
                Mark entry for HR investigation, supervisor audit, or policy enforcement
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-flag-modal"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#002185] hover:bg-[#E2E8F0]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm">
          {/* Employee & Record Brief */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#002185] text-white flex items-center justify-center text-xs font-bold">
                  {empName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-[#002185] text-sm">{empName}</p>
                  <p className="text-xs text-[#64748B]">
                    ID: {empCode} • {empDept}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-3 h-3" />
                {record.status || "Attendance Log"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] text-xs">
              <div>
                <span className="text-[#64748B]">Log Date: </span>
                <span className="font-semibold text-[#334155]">
                  {record.date}
                </span>
              </div>
              <div>
                <span className="text-[#64748B]">Hours: </span>
                <span className="font-semibold text-[#334155]">
                  {record.workHours || 0} hrs
                </span>
              </div>
            </div>
          </div>

          {/* Preset Categories */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#002185] uppercase tracking-wider">
              Flag Reason Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FLAG_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-amber-50 border-amber-500 text-amber-900 font-semibold shadow-2xs"
                        : "bg-[#FFFFFF] border-[#E2E8F0] text-[#334155] hover:border-amber-300 hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="truncate pr-1">{cat.label}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#002185]">
              Alert Severity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSeverity("info")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  severity === "info"
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-2xs"
                    : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                Informational
              </button>
              <button
                type="button"
                onClick={() => setSeverity("warning")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  severity === "warning"
                    ? "bg-amber-50 border-amber-500 text-amber-700 shadow-2xs"
                    : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                Warning / Notice
              </button>
              <button
                type="button"
                onClick={() => setSeverity("high")}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  severity === "high"
                    ? "bg-rose-50 border-rose-500 text-rose-700 shadow-2xs"
                    : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                Disciplinary / High
              </button>
            </div>
          </div>

          {/* Detailed Comment */}
          <div className="space-y-1.5">
            <label
              htmlFor="flag-custom-notes"
              className="block text-xs font-bold text-[#002185]"
            >
              Auditor / Manager Investigation Note
            </label>
            <textarea
              id="flag-custom-notes"
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="e.g. Employee clocked in 45m after shift start without advance notice. Escalate to HR."
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#334155] placeholder-[#94A3B8] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-hidden transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              id="btn-cancel-flag"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#002185] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-confirm-flag"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Flagging...</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5" />
                  <span>Flag for Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlagAttendanceModal;
