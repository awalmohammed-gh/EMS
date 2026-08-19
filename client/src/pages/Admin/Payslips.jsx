import { useState } from "react";
// import { payslips } from "../../assets/data";
import {
  Search,
  User,
  Building2,
  Calendar,
  Clock,
  FileText,
  MoreVertical,
  BanknoteIcon,
  Eye,
} from "lucide-react";
import { useManagement } from "../../context/ManagementContextProvider";
import PayslipsModal from "../../components/modal/PayslipsModal";
import { getAllPayslips } from "../../apis/fontApis";
import { useEffect } from "react";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const Payslips = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All Months");
  const { showPayslipsModal, setShowPayslipsModal } = useManagement();
  const [payslips, setPayslips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setShowToast } = useManagement();

  // Get current month and year
  const getCurrentMonth = () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentDate = new Date();
    return months[currentDate.getMonth()];
  };

  // Get current year
  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  // All months from January to December
  const allMonths = [
    "All Months",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Set default month to current month
  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();

  const fetchPayslips = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await getAllPayslips();
      if (data.success) {
        setPayslips(data.list || []);
        console.log(data?.list);
      } else {
        setError(data.message || "Failed to fetch payslips.");
        setShowToast({
          message: data.message,
          show: true,
          type: "error",
        });
      }
    } catch (error) {
      console.error(error);
      setError(error.message || "An error occurred while fetching payslips.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = payslips.filter((pay) => {
    // Safely handle undefined or null values
    const employeeName = pay?.employee?.fullName || "";
    const department = pay?.employee?.department || "";
    const month = pay?.payMonth || "";
    const status = pay?.status || "";

    const matchesSearch =
      employeeName.toLowerCase().includes(search.toLowerCase()) ||
      department.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === "All" || status === filterStatus;

    // For month filtering, check both payMonth and extract from paymentDate
    let payMonth = month;
    if (!payMonth && pay?.paymentDate) {
      try {
        const date = new Date(pay.paymentDate);
        const months = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        payMonth = months[date.getMonth()];
      } catch {
        payMonth = "";
      }
    }

    const matchesMonth =
      filterMonth === "All Months" || payMonth === filterMonth;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  useEffect(() => {
    fetchPayslips();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "bg-[#16A34A] text-white";
      case "Pending":
        return "bg-[#F59E0B] text-white";
      case "Failed":
        return "bg-[#DC2626] text-white";
      default:
        return "bg-[#64748B] text-white";
    }
  };

  const statusOptions = ["All", "Paid", "Pending", "Failed"];

  // Calculate summary stats
  const totalEmployees = filteredData.length;
  const totalPaid = filteredData
    .filter((pay) => pay?.status === "Paid")
    .reduce((sum, pay) => sum + (pay?.netSalary || 0), 0);
  const totalPending = filteredData
    .filter((pay) => pay?.status === "Pending")
    .reduce((sum, pay) => sum + (pay?.netSalary || 0), 0);

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-GH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getInitials = (name) => {
    if (!name) return "E";
    return name.charAt(0).toUpperCase();
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
              Payslips
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              Manage employee payroll and payslip records
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-[#64748B] bg-[#FFFFFF] px-4 py-2 rounded-lg border border-[#E2E8F0] shadow-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#ff5500]" />
              <span className="font-medium text-[#002185]">
                {currentMonth} {currentYear}
              </span>
            </div>
            <button
              onClick={() => setShowPayslipsModal(true)}
              className="px-4 py-2.5 bg-[#002185] hover:bg-[#ff5500] text-white rounded-lg transition-all duration-300 shadow-sm hover:shadow-lg text-sm font-medium flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Generate Payslip
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={fetchPayslips}
            onClose={() => setError(null)}
          />
        )}

        {/* Summary Cards - No hover effect */}
        {!error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                      Total Employees
                    </p>
                    <p className="text-2xl font-bold text-[#002185] mt-1.5">
                      {totalEmployees}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-full bg-[#002185] flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                      Total Paid
                    </p>
                    <p className="text-2xl font-bold text-[#16A34A] mt-1.5">
                      {formatCurrency(totalPaid)}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-full bg-[#F0FDF4] flex items-center justify-center">
                    <BanknoteIcon className="w-5 h-5 text-[#16A34A]" />
                  </div>
                </div>
              </div>
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">
                      Total Pending
                    </p>
                    <p className="text-2xl font-bold text-[#F59E0B] mt-1.5">
                      {formatCurrency(totalPending)}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-full bg-[#FFFBEB] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-[#64748B]" />
                </div>
                <input
                  type="text"
                  placeholder="Search by employee name or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] text-sm placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition-all duration-200"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3.5 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition-all duration-200 text-sm cursor-pointer hover:border-[#ff5500]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3.5 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#FFFFFF] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition-all duration-200 text-sm cursor-pointer hover:border-[#ff5500]"
                >
                  {allMonths.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-[#64748B]">
              Showing{" "}
              <span className="font-medium text-[#002185]">
                {filteredData.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[#002185]">
                {payslips.length}
              </span>{" "}
              payslips
            </div>

            {/* Table Container */}
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm transition-all duration-300">
              {/* Table Header - With Status Column */}
              <div className="hidden lg:grid grid-cols-7 gap-2 px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                <div className="col-span-2">Employee</div>
                <div className="col-span-1">Department</div>
                <div className="col-span-1">Month</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1 text-right">Net Salary</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Main Content */}
              <div className="divide-y divide-[#E2E8F0] bg-[#FFFFFF]">
                {filteredData.map((pay, index) => (
                  <div
                    key={pay?._id || index}
                    className="hover:bg-[#F8FAFC] transition-colors duration-150"
                  >
                    {/* Desktop View - With Status Column */}
                    <div className="hidden lg:grid grid-cols-7 gap-2 items-center px-4 py-3.5">
                      <div className="col-span-2 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#002185] flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-white">
                            {getInitials(pay?.employee?.fullName)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#002185]">
                            {pay?.employee?.fullName || "Unknown"}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            ID: {pay?.employee?.employeeId || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <p className="text-sm text-[#334155] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          {pay?.employee?.department || "N/A"}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-sm text-[#0F172A]">
                          {pay?.payMonth || "N/A"}
                        </p>
                      </div>
                      <div className="col-span-1">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(pay?.status || "Unknown")}`}
                        >
                          {pay?.status || "Unknown"}
                        </span>
                      </div>
                      <div className="col-span-1 text-right">
                        <p className="text-sm font-semibold text-[#002185] tabular-nums">
                          {formatCurrency(pay?.netSalary)}
                        </p>
                      </div>
                      <div className="col-span-1 flex items-center justify-end gap-1">
                        <button
                          onClick={() => {}}
                          className="p-1.5 text-[#002185] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-all duration-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-[#64748B] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-all duration-200">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile View */}
                    <div className="lg:hidden p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-[#002185] flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-white">
                              {getInitials(pay?.employee?.fullName)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#002185]">
                              {pay?.employee?.fullName || "Unknown"}
                            </p>
                            <p className="text-xs text-[#64748B]">
                              {pay?.employee?.department || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {}}
                            className="p-1.5 text-[#002185] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-all duration-200"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-[#64748B] hover:text-[#ff5500] hover:bg-[#F8FAFC] rounded-lg transition-all duration-200">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#64748B]">
                            {pay?.payMonth || "N/A"}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(pay?.status || "Unknown")}`}
                          >
                            {pay?.status || "Unknown"}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#002185] tabular-nums">
                          {formatCurrency(pay?.netSalary)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Payment: {formatDate(pay?.paymentDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {filteredData.length === 0 && (
                <div className="text-center py-14 bg-[#FFFFFF]">
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                      <FileText className="w-6 h-6 text-[#94A3B8]" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-[#002185]">
                    No payslips found for{" "}
                    {filterMonth !== "All Months" ? filterMonth : "this period"}
                  </h3>
                  <p className="text-sm text-[#64748B] mt-1">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal - Generate Payslip */}
      {showPayslipsModal && (
        <PayslipsModal onClose={() => setShowPayslipsModal(false)} />
      )}
    </>
  );
};

export default Payslips;
