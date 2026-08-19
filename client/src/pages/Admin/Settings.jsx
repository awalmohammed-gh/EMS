// pages/admin/AdminSettings.js
import { useState } from "react";
import { Save, CheckCircle } from "lucide-react";
import { useManagement } from "../../context/ManagementContextProvider";
import ProfileSettings from "./Settings/ProfileSettings";
import CompanySettings from "./Settings/CompanySettings";
import EmployeeSettings from "./Settings/EmployeeSettings";
import PayrollSettings from "./Settings/PayrollSettings";
import LeaveSettings from "./Settings/LeaveSettings";
import AttendanceSettings from "./Settings/AttendanceSettings";
import SecuritySettings from "./Settings/SecuritySettings";


const tabs = [
  { name: "Profile", key: "profile" },
  { name: "Company", key: "company" },
  { name: "Employee", key: "employee" },
  { name: "Payroll", key: "payroll" },
  { name: "Leave", key: "leave" },
  { name: "Attendance", key: "attendance" },
  { name: "Security", key: "security" },
];

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const { setShowToast } = useManagement();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setShowSaved(true);
      setShowToast({
        show: true,
        message: "Settings saved successfully!",
        type: "success",
      });
      setTimeout(() => setShowSaved(false), 3000);
    } catch (error) {
      setShowToast({
        show: true,
        message: "Failed to save settings. Please try again.",
        type: "error",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings />;
      case "company":
        return <CompanySettings />;
      case "employee":
        return <EmployeeSettings />;
      case "payroll":
        return <PayrollSettings />;
      case "leave":
        return <LeaveSettings />;
      case "attendance":
        return <AttendanceSettings />;
      case "security":
        return <SecuritySettings />;
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage your system settings and configurations
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-[#002185] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#ff5500] shadow-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isLoading ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Success Banner */}
      {showSaved && (
        <div className="flex items-center gap-3 rounded-lg bg-[#F0FDF4] border border-[#16A34A]/20 p-4 text-[#16A34A]">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">
            Settings saved successfully!
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[#E2E8F0] bg-[#FFFFFF] rounded-t-xl p-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#002185] text-white shadow-sm"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#002185]"
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-[#FFFFFF] rounded-b-xl border border-t-0 border-[#E2E8F0] p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminSettings;
