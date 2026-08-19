import { useState, useEffect } from "react";
import {
  Search,
  User,
  Mail,
  Building2,
  Briefcase,
  Clock,
  EllipsisVertical,
} from "lucide-react";
import { allEmployees } from "../../apis/fontApis";
import ErrorMessage from "../../ui/ErrorMessage";
import Loading from "../../ui/Loading";

const Employees = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployee = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await allEmployees();
      if (data.success) {
        setEmployees(data.employees);
      } else {
        setError(data.message || "Failed to fetch employees.");
      }
    } catch (error) {
      setError(error.message || "An error occurred while fetching employees.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = employees.filter((employee) => {
    const matchesSearch =
      employee.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      employee.email?.toLowerCase().includes(search.toLowerCase()) ||
      employee.department?.toLowerCase().includes(search.toLowerCase()) ||
      employee.position?.toLowerCase().includes(search.toLowerCase()) ||
      employee.employeeId?.toLowerCase().includes(search.toLowerCase());

    const statusMap = {
      true: "Active",
      false: "Inactive",
    };
    const employeeStatus = statusMap[employee.isActive] || "Inactive";

    const matchesStatus =
      filterStatus === "All" || employeeStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    fetchEmployee();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-[#16A34A] text-white";
      case "On Leave":
        return "bg-[#F59E0B] text-white";
      case "Inactive":
        return "bg-[#64748B] text-white";
      case "Terminated":
        return "bg-[#DC2626] text-white";
      default:
        return "bg-[#64748B] text-white";
    }
  };

  const statusOptions = ["All", "Active", "On Leave", "Inactive", "Terminated"];

  // Loading State
  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#002185]">Employees</h1>
          <p className="text-[#64748B] mt-1">
            Manage your employee records and information
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <ErrorMessage
          message={error}
          onRetry={fetchEmployee}
          onClose={() => setError(null)}
        />
      )}

      {/* Search Bar & Filters */}
      {!error && (
        <>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-[#64748B]" />
              </div>
              <input
                type="text"
                placeholder="Search employees by name, email, department, or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition-all duration-200"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    filterStatus === status
                      ? "bg-[#002185] text-white shadow-md"
                      : "bg-[#FFFFFF] text-[#64748B] border border-[#E2E8F0] hover:border-[#ff5500] hover:text-[#002185]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-[#64748B]">
            Showing {filteredData.length} of {employees.length} employees
          </div>

          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            <div className="col-span-3">Employee</div>
            <div className="col-span-2">Employee ID</div>
            <div className="col-span-2">Department</div>
            <div className="col-span-2">Position</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* Main Content */}
          <div className="space-y-3">
            {filteredData.map((employee) => {
              // Determine status from isActive
              const employeeStatus =
                employee.isActive === true ? "Active" : "Inactive";

              return (
                <div
                  key={employee.id}
                  className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg hover:border-[#ff5500] hover:shadow-md transition-all duration-300"
                >
                  {/* Desktop View */}
                  <div className="hidden lg:grid grid-cols-12 gap-3 items-center px-4 py-3">
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#002185] flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {employee.fullName?.charAt(0).toUpperCase() || "E"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#002185]">
                          {employee.fullName}
                        </p>
                        <p className="text-xs text-[#64748B] flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {employee.email}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-[#002185] font-mono">
                        {employee.employeeId || employee.id}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-[#0F172A] flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-[#64748B]" />
                        {employee.department}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-[#0F172A] flex items-center gap-1">
                        <Briefcase className="w-4 h-4 text-[#64748B]" />
                        {employee.position}
                      </p>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs px-2 py-1 bg-[#F8FAFC] text-[#002185] border border-[#E2E8F0] rounded-full">
                        {employee.employmentType || "Full-time"}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(employeeStatus)}`}
                      >
                        {employeeStatus}
                      </span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button className="p-1.5 text-[#64748B] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-all">
                        <EllipsisVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="lg:hidden p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#002185] flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {employee.fullName?.charAt(0).toUpperCase() || "E"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#002185]">
                            {employee.fullName}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {employee.employeeId || employee.id}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(employeeStatus)}`}
                      >
                        {employeeStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-[#64748B]">
                        <Mail className="w-4 h-4" />
                        <span className="text-xs truncate">
                          {employee.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[#64748B]">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs">{employee.department}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#64748B]">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-xs">{employee.position}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#64748B]">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">
                          {employee.employmentType || "Full-time"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                      <button className="px-3 py-1 text-xs text-[#002185] hover:bg-[#F8FAFC] rounded-lg transition-all">
                        View
                      </button>
                      <button className="px-3 py-1 text-xs text-[#ff5500] hover:bg-[#FFF7ED] rounded-lg transition-all">
                        Edit
                      </button>
                      <button className="px-3 py-1 text-xs text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-all">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredData.length === 0 && (
            <div className="text-center py-12 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg hover:border-[#ff5500] transition-all duration-300">
              <div className="flex justify-center mb-4">
                <User className="w-12 h-12 text-[#64748B] opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-[#002185]">
                No employees found
              </h3>
              <p className="text-[#64748B] mt-1">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Employees;
