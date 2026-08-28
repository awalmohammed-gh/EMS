import { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const PRESET_EXCUSES = [
  { id: "medical", label: "Medical Emergency / Doctor's Note" },
  { id: "transit", label: "Severe Weather / Public Transit Delay" },
  { id: "duty", label: "Approved External Client Meeting / Official Duty" },
  { id: "biometric", label: "Biometric Device / Scanner Glitch" },
  { id: "manager", label: "Manager Discretionary Exception" },
  { id: "custom", label: "Custom Justification..." },
];

const ExcuseLatenessModal = ({
  isOpen,
  onClose,
  record,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedPreset, setSelectedPreset] = useState("medical");
  const [customReason, setCustomReason] = useState("");
  const [targetStatus, setTargetStatus] = useState("Present");
  const [waivePenalty, setWaivePenalty] = useState(true);

  useEffect(() => {
    if (record) {
      setSelectedPreset("medical");
      setCustomReason(record.excuseReason || "");
      setTargetStatus("Present");
      setWaivePenalty(true);
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
  const lateMin = record.delayMinutes || record.lateMinutes || 0;
  const lateFee = record.latePenalty || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason =
      selectedPreset === "custom" || !selectedPreset
        ? customReason.trim() || "Excused by manager"
        : PRESET_EXCUSES.find((p) => p.id === selectedPreset)?.label +
          (customReason.trim() ? ` — ${customReason.trim()}` : "");

    onConfirm({
      reason: finalReason,
      status: targetStatus,
      waivePenalty,
    });
  };

  return (
    <div
      id="modal-excuse-lateness"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#E2E8F0] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002185]">
                Excuse Lateness Entry
              </h3>
              <p className="text-xs text-[#64748B]">
                Waive payroll penalties and record management justification
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-excuse-modal"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#002185] hover:bg-[#E2E8F0]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3" />
                {lateMin > 0 ? `${lateMin} min delay` : "Marked Late"}
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
                <span className="text-[#64748B]">Current Penalty: </span>
                <span className="font-bold text-rose-600">
                  GH₵ {Number(lateFee).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Preset Reasons */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#002185] uppercase tracking-wider">
              Select Justification Reason
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_EXCUSES.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold shadow-2xs"
                        : "bg-[#FFFFFF] border-[#E2E8F0] text-[#334155] hover:border-emerald-300 hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="truncate pr-1">{preset.label}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes / Custom Explanation */}
          <div className="space-y-1.5">
            <label
              htmlFor="excuse-custom-notes"
              className="block text-xs font-bold text-[#002185]"
            >
              Manager Notes / Specific Details
            </label>
            <textarea
              id="excuse-custom-notes"
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="e.g. Doctor's receipt confirmed via email. Waived per HR policy."
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#334155] placeholder-[#94A3B8] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden transition-all"
            />
          </div>

          {/* Configuration Options */}
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between">
              <label
                htmlFor="target-status-select"
                className="text-xs font-semibold text-[#334155]"
              >
                Update Attendance Status to:
              </label>
              <select
                id="target-status-select"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-semibold text-[#002185] focus:outline-hidden focus:border-emerald-500"
              >
                <option value="Present">Present (Excused)</option>
                <option value="On Time">On Time</option>
                <option value="Late">Keep 'Late' (Penalty 0 Only)</option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 cursor-pointer">
              <input
                type="checkbox"
                checked={waivePenalty}
                onChange={(e) => setWaivePenalty(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span className="text-xs text-emerald-900 font-medium">
                Waive payroll lateness deduction (Sets penalty to GH₵ 0.00)
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              id="btn-cancel-excuse"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#002185] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-confirm-excuse"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Excuse Lateness</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExcuseLatenessModal;
