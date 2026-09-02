import { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  Fingerprint,
  Sparkles,
} from "lucide-react";
import { bulkUploadBiometricAttendance } from "../apis/fontApis";

export const BiometricBulkUploadModal = ({
  isOpen,
  onClose,
  onSuccess,
  employeesList = [],
}) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [parsedRecords, setParsedRecords] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deviceId, setDeviceId] = useState("BIO-TERM-01");
  const [autoCalculateStatus, setAutoCalculateStatus] = useState(true);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Download Sample Biometric CSV Template
  const handleDownloadTemplate = () => {
    const today = new Date().toISOString().split("T")[0];
    const sampleEmp1 = employeesList[0]?.employeeId || "EMP001";
    const sampleEmp2 = employeesList[1]?.employeeId || "EMP002";
    const sampleEmp3 = employeesList[2]?.employeeId || "EMP003";

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "Employee ID,Date,Clock In,Clock Out,Status,Device ID,Notes",
        `${sampleEmp1},${today},08:00:00,17:00:00,On Time,BIO-TERM-01,Regular shift`,
        `${sampleEmp2},${today},08:45:00,17:15:00,Late,BIO-TERM-01,Traffic delay`,
        `${sampleEmp3},${today},,,Absent,BIO-TERM-01,Unexcused absence`,
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `biometric_attendance_template_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV text
  const parseCSV = (csvText) => {
    const lines = csvText
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setParseErrors(["The selected CSV file is empty or missing a header row."]);
      setParsedRecords([]);
      return;
    }

    // Split headers and sanitize
    const rawHeaders = lines[0].split(",").map((h) => h.replace(/["']/g, "").trim().toLowerCase());

    // Map header indices
    const headerMap = {
      empId: rawHeaders.findIndex((h) =>
        ["employee id", "employeeid", "staff id", "staffid", "id", "code", "emp_id", "badge no", "badgeno"].includes(h)
      ),
      date: rawHeaders.findIndex((h) =>
        ["date", "attendance date", "log date", "attendance_date", "day"].includes(h)
      ),
      clockIn: rawHeaders.findIndex((h) =>
        ["clock in", "clockin", "time in", "timein", "in time", "intime", "punch in", "clock_in"].includes(h)
      ),
      clockOut: rawHeaders.findIndex((h) =>
        ["clock out", "clockout", "time out", "timeout", "out time", "outtime", "punch out", "clock_out"].includes(h)
      ),
      status: rawHeaders.findIndex((h) => ["status", "state"].includes(h)),
      deviceId: rawHeaders.findIndex((h) =>
        ["device id", "deviceid", "terminal", "terminal id", "device_id"].includes(h)
      ),
      notes: rawHeaders.findIndex((h) => ["notes", "remark", "remarks", "note"].includes(h)),
    };

    if (headerMap.empId === -1 || headerMap.date === -1) {
      setParseErrors([
        "CSV header must contain at least 'Employee ID' (or Staff ID) and 'Date' columns.",
      ]);
      setParsedRecords([]);
      return;
    }

    const records = [];
    const errors = [];

    // Helper map for fast employee name resolution
    const empLookup = new Map();
    employeesList.forEach((e) => {
      if (e.employeeId) empLookup.set(e.employeeId.toUpperCase(), e.fullName);
      if (e._id) empLookup.set(e._id.toString(), e.fullName);
      if (e.email) empLookup.set(e.email.toLowerCase(), e.fullName);
    });

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Regex split to handle quotes
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) =>
        v.replace(/^["']|["']$/g, "").trim()
      );

      const rawEmpId = values[headerMap.empId] || "";
      const rawDate = values[headerMap.date] || "";

      if (!rawEmpId && !rawDate) continue; // skip blank rows

      if (!rawEmpId || !rawDate) {
        errors.push(`Row ${i + 1}: Missing Employee ID or Date.`);
        continue;
      }

      const rawClockIn = headerMap.clockIn !== -1 ? values[headerMap.clockIn] : "";
      const rawClockOut = headerMap.clockOut !== -1 ? values[headerMap.clockOut] : "";
      const rawStatus = headerMap.status !== -1 ? values[headerMap.status] : "";
      const rowDevId = headerMap.deviceId !== -1 ? values[headerMap.deviceId] : "";
      const rowNotes = headerMap.notes !== -1 ? values[headerMap.notes] : "";

      const resolvedName = empLookup.get(rawEmpId.toUpperCase()) || "Unmatched Staff";

      // Basic local status suggestion
      let localStatus = rawStatus;
      if (!localStatus) {
        if (!rawClockIn && !rawClockOut) {
          localStatus = "Absent";
        } else if (rawClockIn) {
          // Compare with 08:00
          const timeParts = rawClockIn.split(":");
          if (timeParts.length >= 2) {
            const h = parseInt(timeParts[0], 10);
            const m = parseInt(timeParts[1], 10);
            if (h > 8 || (h === 8 && m > 0)) {
              localStatus = "Late";
            } else {
              localStatus = "On Time";
            }
          } else {
            localStatus = "Present";
          }
        } else {
          localStatus = "Present";
        }
      }

      records.push({
        rowNum: i + 1,
        employeeId: rawEmpId,
        employeeName: resolvedName,
        date: rawDate,
        clockIn: rawClockIn || null,
        clockOut: rawClockOut || null,
        status: localStatus,
        deviceId: rowDevId || deviceId,
        notes: rowNotes,
      });
    }

    setParsedRecords(records);
    setParseErrors(errors);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith(".csv") && !selected.type.includes("csv") && !selected.type.includes("text")) {
      setParseErrors(["Please upload a valid CSV (.csv) file."]);
      return;
    }

    setFile(selected);
    setFileName(selected.name);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        parseCSV(text);
      }
    };
    reader.readAsText(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (!dropped.name.endsWith(".csv") && !dropped.type.includes("csv") && !dropped.type.includes("text")) {
        setParseErrors(["Please upload a valid CSV (.csv) file."]);
        return;
      }
      setFile(dropped);
      setFileName(dropped.name);
      setUploadResult(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          parseCSV(text);
        }
      };
      reader.readAsText(dropped);
    }
  };

  const handleUploadSubmit = async () => {
    if (parsedRecords.length === 0) return;

    setIsUploading(true);
    setParseErrors([]);
    try {
      const payload = {
        records: parsedRecords.map((r) => ({
          employeeId: r.employeeId,
          date: r.date,
          clockIn: r.clockIn,
          clockOut: r.clockOut,
          status: r.status,
          deviceId: r.deviceId || deviceId,
          notes: r.notes,
        })),
        deviceId,
        autoCalculateStatus,
      };

      const res = await bulkUploadBiometricAttendance(payload);
      if (res?.data?.success) {
        setUploadResult(res.data);
        if (onSuccess) {
          onSuccess(res.data);
        }
      } else {
        setParseErrors([res?.data?.message || "Failed to complete bulk attendance sync."]);
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to upload biometric attendance records.";
      setParseErrors([msg]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileName("");
    setParsedRecords([]);
    setParseErrors([]);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Status badge styling helper
  const getStatusBadge = (status) => {
    switch (status) {
      case "On Time":
      case "Present":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200";
      case "Late":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200";
      case "Absent":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200";
    }
  };

  return (
    <div
      id="biometric-upload-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="biometric-upload-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-t-[28px] sm:rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors animate-fade-in"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-orange-50/30 dark:from-slate-900 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#002185]/10 dark:bg-blue-950 flex items-center justify-center text-[#002185] dark:text-blue-400 shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#002185] dark:text-white flex items-center gap-2 truncate">
                Biometric Bulk Import
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-[#002185] dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold shrink-0">
                  CSV
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 truncate">
                Upload daily biometric attendance logs to auto-calculate lateness & update status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Success State View */}
          {uploadResult ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Bulk Attendance Synced Successfully!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 max-w-md mx-auto">
                  {uploadResult.message || "All biometric logs have been processed and database records updated."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Created</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {uploadResult.stats?.createdCount || 0}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Updated</span>
                  <span className="text-base font-bold text-[#002185] dark:text-blue-400">
                    {uploadResult.stats?.updatedCount || 0}
                  </span>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Skipped</span>
                  <span className="text-base font-bold text-slate-500">
                    {uploadResult.stats?.errorCount || 0}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-colors shadow-xs"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Upload Dropzone */}
              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                    isDragging
                      ? "border-[#002185] bg-blue-50/50 dark:bg-blue-950/20"
                      : "border-slate-300 dark:border-slate-700 hover:border-[#002185] hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-[#002185] dark:text-blue-400 shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      Click to browse or drag & drop biometric CSV log
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                      Supports formats with Employee ID, Date, Clock In, and Clock Out
                    </p>
                  </div>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadTemplate();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-[#002185] font-medium shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-[#ff5500]" />
                      <span>Download Sample CSV Template</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* File Selected & Preview Bar */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-sm">
                          {fileName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {parsedRecords.length} records ready for processing
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReset}
                        className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg font-medium transition-colors"
                      >
                        Change File
                      </button>
                    </div>
                  </div>

                  {/* Settings & Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-blue-50/40 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Biometric Terminal / Device ID
                      </label>
                      <input
                        type="text"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        placeholder="e.g. BIO-TERM-MAIN-LOBBY"
                        className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:border-[#002185]"
                      />
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoCalculateStatus}
                          onChange={(e) => setAutoCalculateStatus(e.target.checked)}
                          className="w-4 h-4 rounded text-[#002185] accent-[#002185] focus:ring-0"
                        />
                        <span>Auto-calculate Late / On-Time status from 08:00 AM shift start</span>
                      </label>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" />
                        Parsed Record Preview ({parsedRecords.length} rows)
                      </span>
                      <span className="text-[11px]">Showing first 10 rows</span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto max-h-60">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                            <tr>
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Employee</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Clock In</th>
                              <th className="py-2.5 px-3">Clock Out</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {parsedRecords.slice(0, 10).map((r, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-2 px-3 text-slate-400 text-[11px]">{r.rowNum}</td>
                                <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                                  <div>{r.employeeName}</div>
                                  <div className="text-[10px] text-slate-500">{r.employeeId}</div>
                                </td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{r.date}</td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                  {r.clockIn || "--"}
                                </td>
                                <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                  {r.clockOut || "--"}
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                                      r.status
                                    )}`}
                                  >
                                    {r.status || "Present"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors Display */}
              {parseErrors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Upload & Parsing Notices:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                    {parseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!uploadResult && (
          <div className="p-3.5 sm:p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs text-[#002185] dark:text-blue-400 hover:text-[#ff5500] font-semibold flex items-center justify-center sm:justify-start gap-1.5 py-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample Template</span>
            </button>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={parsedRecords.length === 0 || isUploading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#002185] hover:bg-[#ff5500] rounded-xl transition-colors disabled:opacity-50 shadow-xs cursor-pointer text-center"
              >
                {isUploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Syncing Logs...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Sync {parsedRecords.length} Records</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometricBulkUploadModal;
