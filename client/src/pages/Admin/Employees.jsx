import { useState, useEffect } from "react";
import { UserPlus, RefreshCw, Download, Check } from "lucide-react";
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-[#002185] tracking-tight">
              Employee Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#002185]/10 text-[#002185] border border-[#002185]/20">
              {employees.length} Staff Members
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Searchable staff directory linked with database records, roles, contact info, and availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadAllCSV}
            disabled={isExporting || employees.length === 0}
            title="Download complete employee directory CSV"
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 ${
              exportSuccess
                ? "bg-green-600 text-white border-green-600"
                : "border-[#E2E8F0] hover:border-[#002185] text-[#002185] bg-white hover:bg-[#F8FAFC]"
            }`}
          >
            {exportSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>CSV Exported!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={fetchEmployees}
            disabled={isLoading}
            className="px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] hover:border-[#002185] text-xs font-bold text-[#002185] bg-white hover:bg-[#F8FAFC] transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#ff5500]" : ""}`} />
            <span>Sync Database</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEmployeeModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#002185] hover:bg-[#ff5500] text-xs font-bold text-white transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
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
