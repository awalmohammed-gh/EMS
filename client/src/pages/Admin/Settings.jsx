import { useState, useEffect, useCallback } from "react";
import {
  User,
  Shield,
  Building2,
  CreditCard,
  Clock,
  Calendar,
  Users,
  Settings as SettingsIcon,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useManagement } from "../../context/ManagementContextProvider";
import { getAdminProfile, getSettings } from "../../apis/fontApis";
import ErrorBoundary from "../../components/ErrorBoundary";

// Tab Sub-Components
import ProfileSettings from "./Settings/ProfileSettings";
import SecuritySettings from "./Settings/SecuritySettings";
import CompanySettings from "./Settings/CompanySettings";
import PayrollSettings from "./Settings/PayrollSettings";
import AttendanceSettings from "./Settings/AttendanceSettings";
import LeaveSettings from "./Settings/LeaveSettings";
import EmployeeSettings from "./Settings/EmployeeSettings";

const TABS = [
  { id: "profile", label: "Profile Info", icon: User, desc: "Personal & admin account credentials" },
  { id: "security", label: "Security", icon: Shield, desc: "2FA, session policies & login defense" },
  { id: "company", label: "Company", icon: Building2, desc: "Organization profile, hours & currency" },
  { id: "payroll", label: "Payroll", icon: CreditCard, desc: "Payment cycles, taxes & disbursement" },
  { id: "attendance", label: "Attendance", icon: Clock, desc: "Work schedules, grace periods & overtime" },
  { id: "leave", label: "Leave Policy", icon: Calendar, desc: "Annual, sick leave quotas & approvals" },
  { id: "employee", label: "Employee Rules", icon: Users, desc: "ID prefixes, probation & notice periods" },
];

const SettingsContent = () => {
  const { user, setUser, setShowToast } = useManagement();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Safe fetch data on mount without triggering re-render loops
  const fetchAllSettings = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [profileRes] = await Promise.allSettled([
        getAdminProfile(),
        getSettings(),
      ]);

      // Handle profile data
      if (profileRes.status === "fulfilled" && profileRes.value?.data?.success && profileRes.value.data.admin) {
        const adm = profileRes.value.data.admin;
        setUser((prev) => {
          // Prevent unnecessary context updates if data is identical
          if (
            prev?.id === adm.id &&
            prev?.fullName === adm.fullName &&
            prev?.email === adm.email
          ) {
            return prev;
          }
          return { ...prev, ...adm };
        });
      }
    } catch (err) {
      console.warn("Failed to load settings data:", err?.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setUser]);

  useEffect(() => {
    fetchAllSettings();
  }, [fetchAllSettings]);

  const handleRefresh = () => {
    fetchAllSettings(true);
    setShowToast({
      show: true,
      message: "Syncing settings with database...",
      type: "info",
    });
  };

  const handleSaveNotification = () => {
    // Silently re-sync in background after tab saves
    fetchAllSettings(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative mb-4">
          <div className="h-12 w-12 rounded-2xl bg-[#002185]/10 dark:bg-blue-900/30 flex items-center justify-center text-[#002185] dark:text-blue-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#002185] dark:border-blue-400 border-t-transparent" />
          </div>
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Loading System Settings
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Fetching live administration configuration and account parameters from database...
        </p>
      </div>
    );
  }

  const activeTabMeta = TABS.find((t) => t.id === activeTab) || TABS[0];
  const ActiveIcon = activeTabMeta.icon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#002185] to-[#001566] text-white flex items-center justify-center shadow-sm shrink-0">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                System & Admin Settings
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#002185]/10 dark:bg-blue-950/60 text-[#002185] dark:text-blue-400 border border-[#002185]/20">
                <Sparkles className="w-2.5 h-2.5" />
                Live Cloud Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage organization preferences, administrator credentials, security, and automated workflows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Reload settings from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#002185]" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Sync DB"}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Grid: Navigation Sidebar + Tab Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-xs space-y-1.5">
          <div className="px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Configuration Modules
            </span>
          </div>

          <div className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#002185] text-white shadow-md shadow-[#002185]/20 font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate leading-tight">
                      {tab.label}
                    </div>
                    <div
                      className={`text-[10px] truncate mt-0.5 ${
                        isActive
                          ? "text-blue-100 font-medium"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {tab.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick User Identity Badge in Sidebar */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff5500] to-amber-500 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0">
              {(user?.fullName || user?.full_name || "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {user?.fullName || user?.full_name || "Administrator"}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {user?.email || "admin@eyenit.com"}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Canvas Area */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          {/* Active Tab Subheader */}
          <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-[#002185]/10 dark:bg-blue-900/30 text-[#002185] dark:text-blue-400 flex items-center justify-center shrink-0">
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {activeTabMeta.label}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTabMeta.desc}
              </p>
            </div>
          </div>

          {/* Tab Component Renderers */}
          {activeTab === "profile" && (
            <ProfileSettings onSaveSuccess={handleSaveNotification} />
          )}
          {activeTab === "security" && (
            <SecuritySettings onSaveSuccess={handleSaveNotification} />
          )}
          {activeTab === "company" && (
            <CompanySettings onSaveSuccess={handleSaveNotification} />
          )}
          {activeTab === "payroll" && (
            <PayrollSettings onSaveSuccess={handleSaveNotification} />
          )}
          {activeTab === "attendance" && (
            <AttendanceSettings onSaveSuccess={handleSaveNotification} />
          )}
          {activeTab === "leave" && (
            <LeaveSettings onSaveSuccess={handleSaveNotification} />
          )}
          {activeTab === "employee" && (
            <EmployeeSettings onSaveSuccess={handleSaveNotification} />
          )}
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  return (
    <ErrorBoundary title="Admin Settings View">
      <SettingsContent />
    </ErrorBoundary>
  );
};

export default Settings;
