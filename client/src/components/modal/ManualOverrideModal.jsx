import { useState, useEffect } from "react";
import { Edit3, Clock, X, AlertCircle, CheckCircle2 } from "lucide-react";

// Strict Regex pattern for 24-hour HH:MM format (00:00 to 23:59)
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
// Optional extended pattern supporting 12-hour AM/PM or seconds
const TIME_FLEX_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(\s*(?:AM|PM|am|pm))?$/;

/**
 * Validates whether a given time string is in a valid format.
 * Returns true if valid or empty, false otherwise.
 */
export const isValidTimeFormat = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return true;
  const trimmed = timeStr.trim();
  if (!trimmed) return true;
  return TIME_24H_REGEX.test(trimmed) || TIME_FLEX_REGEX.test(trimmed);
};

export const ManualOverrideModal = ({
  isOpen,
  onClose,
  formData = {},
  setFormData,
  onSave,
  employeesList = [],
  isSaving = false,
}) => {
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateField = (name, value) => {
    let err = "";
    if (name === "clockIn" || name === "clockOut") {
      if (value && !isValidTimeFormat(value)) {
        err = "Please enter a valid time (e.g. 08:30 or 17:00)";
      }
    }
    return err;
  };

  const handleTimeChange = (field, value) => {
    const newErrors = { ...errors };
    const fieldError = validateField(field, value);
    if (fieldError) {
      newErrors[field] = fieldError;
    } else {
      delete newErrors[field];
    }
    setErrors(newErrors);

    if (setFormData) {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleBlur = (field) => {
    const err = validateField(field, formData[field]);
    setErrors((prev) => ({
      ...prev,
      [field]: err,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (formData.clockIn && !isValidTimeFormat(formData.clockIn)) {
      newErrors.clockIn = "Invalid Clock In format (use HH:MM in 24-hour time)";
    }
    if (formData.clockOut && !isValidTimeFormat(formData.clockOut)) {
      newErrors.clockOut = "Invalid Clock Out format (use HH:MM in 24-hour time)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (onSave) {
      onSave(e);
    }
  };

  return (
    <div
      id="manual-override-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="manual-override-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[90vh] rounded-t-[28px] sm:rounded-3xl sm:max-w-lg bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1E48] text-white shadow-xs shrink-0">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0B1E48] dark:text-blue-100 tracking-tight">
                {formData.id ? "Admin Attendance Adjustment" : "Manual Attendance Override"}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {formData.id
                  ? `Adjusting attendance record for ${formData.employeeName || "selected employee"}`
                  : "Create a verified retroactive attendance entry"}
              </p>
            </div>
          </div>
          <button
            id="close-manual-override-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[85vh] sm:max-h-[80vh] flex-1">
          {/* Employee Selector (Only shown for new records) */}
          {!formData.id && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Select Employee <span className="text-rose-500">*</span>
              </label>
              <select
                id="override-employee-select"
                value={formData.employeeId || ""}
                onChange={(e) =>
                  setFormData &&
                  setFormData((prev) => ({
                    ...prev,
                    employeeId: e.target.value,
                  }))
                }
                required
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B1E48]/20 focus:border-[#0B1E48] dark:focus:border-blue-500 transition-colors"
              >
                <option value="">-- Choose an employee --</option>
                {employeesList.map((emp) => (
                  <option key={emp._id || emp.employeeId} value={emp.employeeId || emp._id}>
                    {emp.fullName} ({emp.employeeId || "EMP"}) - {emp.department || "General"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Attendance Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="override-date-input"
                type="date"
                required
                value={formData.date || ""}
                onChange={(e) =>
                  setFormData &&
                  setFormData((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B1E48]/20 focus:border-[#0B1E48] dark:focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Attendance Status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Attendance Status <span className="text-rose-500">*</span>
              </label>
              <select
                id="override-status-select"
                value={formData.status || "On Time"}
                onChange={(e) =>
                  setFormData &&
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B1E48]/20 focus:border-[#0B1E48] dark:focus:border-blue-500 transition-colors"
              >
                <option value="On Time">On Time</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>

          {/* Time Fields with type="time" and Regex Validation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Clock In Time
                </label>
                <span className="text-[10px] text-slate-400">24-hour (HH:MM)</span>
              </div>
              <div className="relative">
                <input
                  id="override-clockin-input"
                  type="time"
                  step="60"
                  pattern="^([01]\d|2[0-3]):[0-5]\d$"
                  placeholder="08:30"
                  value={formData.clockIn || ""}
                  onChange={(e) => handleTimeChange("clockIn", e.target.value)}
                  onBlur={() => handleBlur("clockIn")}
                  className={`w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 transition-colors ${
                    errors.clockIn
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-200 dark:border-slate-700 focus:ring-[#0B1E48]/20 focus:border-[#0B1E48] dark:focus:border-blue-500"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              {errors.clockIn && (
                <p className="flex items-center gap-1 text-[11px] text-rose-500 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.clockIn}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Clock Out Time
                </label>
                <span className="text-[10px] text-slate-400">24-hour (HH:MM)</span>
              </div>
              <div className="relative">
                <input
                  id="override-clockout-input"
                  type="time"
                  step="60"
                  pattern="^([01]\d|2[0-3]):[0-5]\d$"
                  placeholder="17:00"
                  value={formData.clockOut || ""}
                  onChange={(e) => handleTimeChange("clockOut", e.target.value)}
                  onBlur={() => handleBlur("clockOut")}
                  className={`w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 transition-colors ${
                    errors.clockOut
                      ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                      : "border-slate-200 dark:border-slate-700 focus:ring-[#0B1E48]/20 focus:border-[#0B1E48] dark:focus:border-blue-500"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              {errors.clockOut && (
                <p className="flex items-center gap-1 text-[11px] text-rose-500 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.clockOut}
                </p>
              )}
            </div>
          </div>

          {/* Reason / Adjustment Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Adjustment Reason & Audit Log Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="override-notes-input"
              rows={2}
              required
              placeholder="e.g. Approved manual correction by HR administrator due to biometric reader maintenance."
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData &&
                setFormData((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B1E48]/20 focus:border-[#0B1E48] dark:focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Action Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="cancel-override-btn"
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-override-btn"
              type="submit"
              disabled={isSaving || Object.keys(errors).some((k) => Boolean(errors[k]))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#0B1E48] hover:bg-[#002185] active:scale-[0.98] rounded-xl transition-all shadow-xs disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isSaving ? (
                <span>Saving Record...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Override</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualOverrideModal;

