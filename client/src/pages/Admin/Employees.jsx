import { useState, useEffect } from "react";
import { UserPlus, Download, Check, RefreshCw, FileSpreadsheet } from "lucide-react";
import { allEmployees } from "../../apis/fontApis";
import { EmployeeDirectory } from "../../components/EmployeeDirectory";
import AddEmployee from "../../components/modal/AddEmployee";
import ExportHREmployeeModal from "../../components/ExportHREmployeeModal";
import { useManagement } from "../../context/ManagementContextProvider";
import { exportHREmployeeReportToCSV } from "../../utils/exportCsv";
import ErrorMessage from "../../ui/ErrorMessage";

const Employees = () => {
  const { showEmployeeModal, setShowEmployeeModal } = useManagement();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportNotice, setExportNotice] = useState(null);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await allEmployees();
      const data = res?.data;

      if (data && (data.success || Array.isArray(data.employees) || Array.isArray(data))) {
        const list = Array.isArray(data.employees)
          ? data.employees
          : Array.isArray(data)
          ? data
          : data.list || [];
        setEmployees(list);
      } else {
        setEmployees([]);
        if (data?.message) {
          setError(data.message);
        }
      }
    } catch (err) {
      setEmployees([]);
      setError(
        err.response?.data?.message ||
          err.message ||
          "An error occurred while fetching employees."
      );
      console.error("fetchEmployees error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeDeleted = (deletedEmployeeId) => {
    setEmployees((prev) =>
      prev.filter(
        (emp) =>
          emp._id !== deletedEmployeeId &&
          emp.employeeId !== deletedEmployeeId &&
          String(emp._id) !== String(deletedEmployeeId)
      )
    );
  };

  const handleDownloadAllCSV = () => {
    if (!employees || employees.length === 0) return;
    try {
      setIsExporting(true);
      const dateStr = new Date().toISOString().split("T")[0];
      const result = exportHREmployeeReportToCSV(employees, {
        filterStatus: "all",
        filename: `workpulse_hr_employee_records_${dateStr}.csv`,
      });
      if (result.success) {
        setExportSuccess(true);
        setExportNotice(`✓ Successfully exported ${result.count} employee records to CSV`);
        setTimeout(() => {
          setExportSuccess(false);
          setExportNotice(null);
        }, 4000);
      }
    } catch (err) {
      console.error("Download CSV error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
      {/* Page Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E48] dark:text-blue-100">
                Employee Directory
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {employees.length} Staff Members
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Searchable staff directory linked with database records, roles, contact info, and availability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={fetchEmployees}
              disabled={isLoading}
              title="Refresh staff records"
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all flex items-center gap-1.5 shadow-2xs text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAllCSV}
              disabled={isExporting || employees.length === 0}
              title="Download complete employee directory CSV"
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50 ${
                exportSuccess
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750"
              }`}
            >
              {exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>CSV Exported!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Download CSV</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              disabled={employees.length === 0}
              title="Open full HR employee database export wizard"
              className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all flex items-center gap-2 shadow-2xs text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>HR Reporting Export...</span>
            </button>

            <button
              id="btn-new-employee"
              type="button"
              onClick={() => setShowEmployeeModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              title="Add a new employee to directory"
            >
              <UserPlus className="w-4 h-4" />
              <span>New Employee</span>
            </button>
          </div>
        </div>
      </div>

      {/* Export Success Notification Banner */}
      {exportNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <span>{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={fetchEmployees}
          onClose={() => setError(null)}
        />
      )}

      {/* Searchable Employee Directory Component with Skeleton Loading & Empty State */}
      <EmployeeDirectory
        employees={employees}
        setEmployees={setEmployees}
        onEmployeeDeleted={handleEmployeeDeleted}
        onDeleteSuccess={handleEmployeeDeleted}
        isLoading={isLoading}
        onRefresh={fetchEmployees}
      />

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <AddEmployee onEmployeeAdded={fetchEmployees} />
      )}

      {/* Full HR Employee Database CSV Export Wizard */}
      <ExportHREmployeeModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        employeeList={employees}
        onSuccessNotice={(msg) => {
          setExportNotice(msg);
          setTimeout(() => setExportNotice(null), 5000);
        }}
      />
    </div>
  );
};

export default Employees;
