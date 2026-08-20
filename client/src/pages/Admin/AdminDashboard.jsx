import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminDashboardOverview } from "../../apis/fontApis";
import {
  Users,
  UserCheck,
  CalendarCheck,
  Building2,
  Clock,
  BanknoteIcon,
} from "lucide-react";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const { data } = await adminDashboardOverview();
      console.log("Dashboard data:", data);

      if (data.success) {
        setDashboardData(data.overview);
      } else {
        setIsError(data.message || "Failed to fetch dashboard data.");
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to fetch dashboard data.";
      setIsError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return (
      amount?.toLocaleString("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) || "GHS 0.00"
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message={isError}
        onRetry={fetchDashboardData}
        onClose={() => setIsError(null)}
      />
    );
  }

  // If no data, show empty state
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#64748B]">No dashboard data available</p>
      </div>
    );
  }

  // Prepare stats cards data from API response
  const statsCards = [
    {
      title: "Total Employees",
      value: dashboardData.cards?.totalEmployees || 0,
      icon: Users,
      color: "bg-[#002185]",
      textColor: "text-[#002185]",
      link: "/admin/employees",
    },
    {
      title: "Present Today",
      value: dashboardData.cards?.presentToday || 0,
      icon: UserCheck,
      color: "bg-[#16A34A]",
      textColor: "text-[#16A34A]",
      link: "/admin/attendance",
    },
    {
      title: "On Leave",
      value: dashboardData.cards?.onLeave || 0,
      icon: CalendarCheck,
      color: "bg-[#F59E0B]",
      textColor: "text-[#F59E0B]",
      link: "/admin/leave",
    },
    {
      title: "Pending Leaves",
      value: dashboardData.cards?.pendingLeaves || 0,
      icon: Clock,
      color: "bg-[#ff5500]",
      textColor: "text-[#ff5500]",
      link: "/admin/leave",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#002185]">Dashboard</h1>
          <p className="text-[#64748B] mt-1">
            Welcome back! Here's an overview of your system.
          </p>
        </div>
        <div className="text-sm text-[#64748B] bg-[#FFFFFF] px-4 py-2 rounded-lg border border-[#E2E8F0] transition-colors duration-300">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-GH", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              onClick={() => stat.link && navigate(stat.link)}
              className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm hover:shadow-lg hover:border-[#ff5500] transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B]">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-[#002185] mt-2">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-lg bg-[#F8FAFC] flex items-center justify-center group-hover:${stat.color} transition-colors duration-300`}
                >
                  <IconComponent
                    className={`w-6 h-6 ${stat.textColor} group-hover:text-white transition-colors duration-300`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll Stats */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
          <h3 className="text-lg font-semibold text-[#002185] mb-4 flex items-center gap-2">
            <BanknoteIcon className="w-5 h-5 text-[#ff5500]" />
            Payroll Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Total Employees</span>
              <span className="text-sm font-semibold text-[#002185]">
                {dashboardData.payroll?.totalEmployees || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Total Payroll</span>
              <span className="text-sm font-semibold text-[#002185]">
                {formatCurrency(dashboardData.payroll?.totalPayroll)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Paid</span>
              <span className="text-sm font-semibold text-[#16A34A]">
                {formatCurrency(dashboardData.payroll?.paid)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">Pending</span>
              <span className="text-sm font-semibold text-[#F59E0B]">
                {formatCurrency(dashboardData.payroll?.pending)}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Stats */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
          <h3 className="text-lg font-semibold text-[#002185] mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#ff5500]" />
            Attendance Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Total Employees</span>
              <span className="text-sm font-semibold text-[#002185]">
                {dashboardData.attendance?.totalEmployees || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Present</span>
              <span className="text-sm font-semibold text-[#16A34A]">
                {dashboardData.attendance?.present || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">On Leave</span>
              <span className="text-sm font-semibold text-[#F59E0B]">
                {dashboardData.attendance?.onLeave || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Late</span>
              <span className="text-sm font-semibold text-[#F97316]">
                {dashboardData.attendance?.late || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">Absent</span>
              <span className="text-sm font-semibold text-[#DC2626]">
                {dashboardData.attendance?.absent || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Leave Stats */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
          <h3 className="text-lg font-semibold text-[#002185] mb-4 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#ff5500]" />
            Leave Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Total Requests</span>
              <span className="text-sm font-semibold text-[#002185]">
                {dashboardData.leave?.totalRequests || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Approved</span>
              <span className="text-sm font-semibold text-[#16A34A]">
                {dashboardData.leave?.approved || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <span className="text-sm text-[#64748B]">Pending</span>
              <span className="text-sm font-semibold text-[#F59E0B]">
                {dashboardData.leave?.pending || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">Rejected</span>
              <span className="text-sm font-semibold text-[#DC2626]">
                {dashboardData.leave?.rejected || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee By Department */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300">
        <h3 className="text-lg font-semibold text-[#002185] mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#ff5500]" />
          Employees by Department
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {dashboardData.departments && dashboardData.departments.length > 0 ? (
            dashboardData.departments.map((dept, index) => (
              <div
                key={index}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 text-center hover:shadow-md transition-all duration-300 group"
              >
                <h4 className="text-sm font-medium text-[#64748B] group-hover:text-[#002185] transition-colors duration-300">
                  {dept._id || "Unknown Department"}
                </h4>
                <p className="text-2xl font-bold text-[#002185] mt-2">
                  {dept.total || 0}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-[#64748B] py-8">
              No department data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
