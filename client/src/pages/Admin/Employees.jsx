import { useState, useEffect } from "react";
import { UserPlus, Download, Check } from "lucide-react";
import { allEmployees } from "../../apis/fontApis";
import { EmployeeDirectory } from "../../components/EmployeeDirectory";
import AddEmployee from "../../components/modal/AddEmployee";
import { useManagement } from "../../context/ManagementContextProvider";
import { exportEmployeesToCSV } from "../../utils/exportCsv";
import ErrorMessage from "../../ui/ErrorMessage";
import Loading from "../../ui/Loading";

const Employees = () => {
  const { showEmployeeModal, setShowEmployeeModal } = useManagement();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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
        setError(data?.message || "Failed to fetch employee directory.");
      }
    } catch (err) {
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

  const handleDownloadAllCSV = () => {
    if (!employees || employees.length === 0) return;
    try {
      setIsExporting(true);
      const success = exportEmployeesToCSV(
        employees,
        `eyenit_employee_records_${new Date().toISOString().split("T")[0]}.csv`
      );
      if (success) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2500);
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
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Employee Directory
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {employees.length} Staff Members
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Searchable staff directory linked with database records, roles, contact info, and availability.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
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
              onClick={() => setShowEmployeeModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={fetchEmployees}
          onClose={() => setError(null)}
        />
      )}

      {/* Loading state indicator */}
      {isLoading && employees.length === 0 ? (
        <Loading />
      ) : (
        /* Searchable Employee Directory Component */
        <EmployeeDirectory
          employees={employees}
          isLoading={isLoading}
          onRefresh={fetchEmployees}
        />
      )}

      {/* Add Employee Modal */}
      {showEmployeeModal && (
        <AddEmployee onEmployeeAdded={fetchEmployees} />
      )}
    </div>
  );
};

export default Employees;
