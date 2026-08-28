import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Shield,
  Save,
  Lock,
  Eye,
  EyeOff,
  Palette,
  Bell,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Clock,
  Globe,
  Coins,
  ShieldCheck,
  Volume2,
  Loader2,
  Hash,
} from "lucide-react";
import { useManagement } from "../../context/ManagementContextProvider";
import { useTheme } from "../../context/ThemeContext";
import {
  getEmployeeMe,
  updateEmployeeMe,
  changeEmployeePassword,
} from "../../apis/fontApis";
import ProfilePictureUploader from "../../components/ProfilePictureUploader";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const TABS = [
  { id: "profile", label: "Profile & Avatar", icon: User },
  { id: "security", label: "Security & Password", icon: Shield },
  { id: "preferences", label: "Theme & Preferences", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const PREFERENCES_STORAGE_KEY = "employee_user_preferences";
const NOTIFICATIONS_STORAGE_KEY = "employee_user_notifications";

const EmployeeSettings = () => {
  const { user, setUser, setShowToast } = useManagement();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form State
  const [profile, setProfile] = useState({
    fullName: user?.fullName || user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    department: user?.department || "",
    position: user?.position || "",
    employeeId: user?.employeeId || user?.employee_id || "",
    employmentDate: user?.employmentDate || user?.employment_date || "",
    role: user?.role || "employee",
    avatar: user?.avatar || user?.profile_image_url || user?.profile_picture || "",
    status: user?.status || "active",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isError, setIsError] = useState(null);

  // Security Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Theme & Preferences State
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return {
      currency: "GHS",
      timeFormat: "12h",
      dateFormat: "DD/MM/YYYY",
      weekStart: "monday",
      language: "en-US",
    };
  });
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return {
      emailPayslip: true,
      emailLeaveStatus: true,
      emailAnnouncements: true,
      emailAttendanceReminders: false,
      inAppUrgentAlerts: true,
      inAppSound: true,
      weeklySummary: false,
    };
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Fetch initial profile
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setIsError(null);
      const res = await getEmployeeMe();
      if (res?.data?.success && res.data.employee) {
        const emp = res.data.employee;
        const resolvedData = {
          fullName: emp.fullName || emp.full_name || "",
          email: emp.email || "",
          phone: emp.phone || "",
          department: emp.department || "",
          position: emp.position || "",
          employeeId: emp.employeeId || emp.employee_id || "",
          employmentDate: emp.employmentDate || emp.employment_date || "",
          role: emp.role || "employee",
          avatar: emp.avatar || emp.profile_image_url || emp.profile_picture || "",
          status: emp.status || "active",
        };
        setProfile(resolvedData);
        setUser((prev) => ({ ...prev, ...resolvedData }));
        localStorage.setItem("employeeData", JSON.stringify(resolvedData));
      } else if (user) {
        setProfile({
          fullName: user.fullName || user.full_name || "",
          email: user.email || "",
          phone: user.phone || "",
          department: user.department || "",
          position: user.position || "",
          employeeId: user.employeeId || user.employee_id || "",
          employmentDate: user.employmentDate || user.employment_date || "",
          role: user.role || "employee",
          avatar: user.avatar || user.profile_image_url || user.profile_picture || "",
          status: user.status || "active",
        });
      }
    } catch (err) {
      console.warn("Error fetching employee profile:", err.message);
      if (user) {
        setProfile({
          fullName: user.fullName || user.full_name || "",
          email: user.email || "",
          phone: user.phone || "",
          department: user.department || "",
          position: user.position || "",
          employeeId: user.employeeId || user.employee_id || "",
          employmentDate: user.employmentDate || user.employment_date || "",
          role: user.role || "employee",
          avatar: user.avatar || user.profile_image_url || user.profile_picture || "",
          status: user.status || "active",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Save Profile Handler
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const avatarUrlToSave =
        profile.avatar ||
        profile.profilePicture ||
        profile.profile_image_url ||
        "";

      const res = await updateEmployeeMe({
        fullName: profile.fullName,
        phone: profile.phone,
        avatar: avatarUrlToSave,
        profilePicture: avatarUrlToSave,
        profile_picture: avatarUrlToSave,
        profile_image_url: avatarUrlToSave,
      });

      if (res?.data?.success) {
        const updated = res.data.employee || profile;
        const merged = {
          ...profile,
          ...updated,
          avatar: avatarUrlToSave,
          profilePicture: avatarUrlToSave,
        };
        setUser((prev) => ({ ...prev, ...merged }));
        localStorage.setItem("employeeData", JSON.stringify(merged));
        localStorage.setItem("userData", JSON.stringify(merged));
        setShowToast({
          show: true,
          message: "Profile details updated successfully!",
          type: "success",
        });
      } else {
        setShowToast({
          show: true,
          message: res?.data?.message || "Failed to update profile details.",
          type: "error",
        });
      }
    } catch (err) {
      setShowToast({
        show: true,
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to save profile.",
        type: "error",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Password Strength Calculation
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "None", color: "bg-slate-200 dark:bg-slate-700", text: "text-slate-400" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
      case 2:
        return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
      case 3:
        return { score: 3, label: "Good", color: "bg-blue-600", text: "text-blue-600 dark:text-blue-400" };
      case 4:
        return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
      default:
        return { score: 0, label: "Very Weak", color: "bg-rose-400", text: "text-rose-500" };
    }
  };

  const passwordStrength = calculatePasswordStrength(passwordForm.newPassword);

  // Update Password Handler
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setShowToast({
        show: true,
        message: "Please fill in all password fields.",
        type: "error",
      });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setShowToast({
        show: true,
        message: "New password must be at least 6 characters long.",
        type: "error",
      });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setShowToast({
        show: true,
        message: "New passwords do not match.",
        type: "error",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await changeEmployeePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res?.data?.success) {
        setShowToast({
          show: true,
          message: res.data.message || "Password updated successfully!",
          type: "success",
        });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setShowToast({
          show: true,
          message: res?.data?.message || "Failed to update password.",
          type: "error",
        });
      }
    } catch (err) {
      setShowToast({
        show: true,
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to update password.",
        type: "error",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Save Preferences Handler
  const handleSavePreferences = (e) => {
    e.preventDefault();
    setIsSavingPreferences(true);
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
      setTimeout(() => {
        setIsSavingPreferences(false);
        setShowToast({
          show: true,
          message: "Preferences saved successfully!",
          type: "success",
        });
      }, 300);
    } catch {
      setIsSavingPreferences(false);
      setShowToast({
        show: true,
        message: "Failed to save preferences to local storage.",
        type: "error",
      });
    }
  };

  // Save Notifications Handler
  const handleSaveNotifications = (e) => {
    e.preventDefault();
    setIsSavingNotifications(true);
    try {
      localStorage.setItem(
        NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(notifications)
      );
      setTimeout(() => {
        setIsSavingNotifications(false);
        setShowToast({
          show: true,
          message: "Notification preferences updated successfully!",
          type: "success",
        });
      }, 300);
    } catch {
      setIsSavingNotifications(false);
      setShowToast({
        show: true,
        message: "Failed to save notification settings.",
        type: "error",
      });
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message={isError}
        onRetry={fetchProfile}
        onClose={() => setIsError(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden relative">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Account & Profile Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal profile, credentials, workspace preferences, and alerts
        </p>
      </div>

      {/* Modern Responsive Segmented Tabs Header */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#002185] dark:bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Top Identity & Avatar Card */}
      <div className="w-full flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <ProfilePictureUploader
          currentAvatarUrl={
            profile.avatar || user?.profilePicture || user?.avatar
          }
          userName={profile.fullName || user?.fullName}
          userRole="Employee"
          onAvatarUpdated={(newUrl) => {
            setProfile((prev) => ({
              ...prev,
              avatar: newUrl,
              profilePicture: newUrl,
              profile_image_url: newUrl,
            }));
          }}
          size="lg"
        />

        {/* Identity & Status Badges */}
        <div className="text-center sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-200 dark:border-slate-800 w-full sm:w-auto">
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Account
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              <Shield className="w-3.5 h-3.5" />
              {profile.role ? profile.role.toUpperCase() : "EMPLOYEE"}
            </span>
            {(profile.employeeId || user?.employeeId) && (
              <span className="font-mono text-[#002185] dark:text-blue-300 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                ID: {profile.employeeId || user?.employeeId}
              </span>
            )}
          </div>

          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
            {(profile.department || user?.department) && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400" />
                {profile.department || user?.department}
              </span>
            )}
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400" />
              {profile.email || user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: Profile & Avatar Details Form */}
      {activeTab === "profile" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-[#002185] dark:text-blue-400" />
                Personal & Employment Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                View your official credentials and update your direct contact phone number.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
              <Lock className="w-3 h-3 text-slate-400" />
              Protected Fields Locked by HR
            </span>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Full Legal Name (Read-only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Full Legal Name
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Read-only</span>
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={profile.fullName}
                    disabled
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 font-medium cursor-not-allowed select-all"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              {/* Official Work Email (Read-only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Official Work Email
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Read-only</span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 font-medium cursor-not-allowed select-all"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              {/* Direct Phone Contact (Editable) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#002185] dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
                    Direct Phone Contact
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Editable
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#002185] dark:text-blue-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#002185]/15 transition-all font-medium"
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
              </div>

              {/* Department (Read-only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Assigned Department
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Read-only</span>
                </div>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={profile.department}
                    disabled
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 font-medium cursor-not-allowed"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              {/* Position (Read-only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Designation / Role Title
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Read-only</span>
                </div>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={profile.position}
                    disabled
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 font-medium cursor-not-allowed"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              {/* Staff ID / System ID (Read-only) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Official Staff ID
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Read-only</span>
                </div>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={profile.employeeId}
                    disabled
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 font-mono font-medium cursor-not-allowed"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Changes take effect immediately across all employee services
              </span>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#002185] dark:bg-blue-600 text-white text-xs font-bold hover:bg-[#001760] dark:hover:bg-blue-700 shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSavingProfile ? "Saving Profile..." : "Save Profile Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Security & Password */}
      {activeTab === "security" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#002185] dark:text-blue-400" />
              Change Account Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ensure your account is protected with a strong, unique password.
            </p>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: e.target.value,
                      })
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Password Strength Indicator */}
            {passwordForm.newPassword && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Password Strength:
                  </span>
                  <span className={`font-bold ${passwordStrength.text}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 h-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`rounded-full transition-all duration-300 ${
                        passwordStrength.score >= step
                          ? passwordStrength.color
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className={`flex items-center gap-1 ${passwordForm.newPassword.length >= 8 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}>
                    <CheckCircle2 className="w-3 h-3" /> 8+ characters
                  </span>
                  <span className={`flex items-center gap-1 ${/[A-Z]/.test(passwordForm.newPassword) ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}>
                    <CheckCircle2 className="w-3 h-3" /> Uppercase letter
                  </span>
                  <span className={`flex items-center gap-1 ${/[0-9]/.test(passwordForm.newPassword) ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}>
                    <CheckCircle2 className="w-3 h-3" /> Number
                  </span>
                  <span className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(passwordForm.newPassword) ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}>
                    <CheckCircle2 className="w-3 h-3" /> Special symbol
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Password is encrypted with secure salted hashing
              </span>
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#002185] dark:bg-blue-600 text-white text-xs font-bold hover:bg-[#001760] dark:hover:bg-blue-700 shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {isUpdatingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {isUpdatingPassword ? "Updating Password..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Theme & Preferences */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          {/* Appearance / Theme Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#002185] dark:text-blue-400" />
                Color Theme & Mode
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize appearance or sync automatically with your system preference.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Light Mode Option */}
              <button
                type="button"
                id="theme-option-light"
                onClick={() => setTheme("light")}
                className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                  theme === "light"
                    ? "border-[#002185] dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-[#002185]/20 dark:ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                  {theme === "light" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#002185] dark:bg-blue-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Light Mode
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Clean, high-contrast light surfaces for bright environments
                  </p>
                </div>
              </button>

              {/* Dark Mode Option */}
              <button
                type="button"
                id="theme-option-dark"
                onClick={() => setTheme("dark")}
                className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                  theme === "dark"
                    ? "border-[#002185] dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-[#002185]/20 dark:ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  {theme === "dark" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#002185] dark:bg-blue-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Dark Mode
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Comfortable dark palette designed to reduce eye strain
                  </p>
                </div>
              </button>

              {/* System Option */}
              <button
                type="button"
                id="theme-option-system"
                onClick={() => setTheme("system")}
                className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                  theme === "system"
                    ? "border-[#002185] dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-[#002185]/20 dark:ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center">
                    <Laptop className="w-4 h-4" />
                  </div>
                  {theme === "system" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#002185] dark:bg-blue-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    System Sync
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Automatically matches your OS ({resolvedTheme} active)
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Regional & Format Preferences */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#002185] dark:text-blue-400" />
                Regional & Localization Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set your preferred time representation, calendar orientation, and currency symbols.
              </p>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Currency Display */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400" />
                    Currency Display
                  </label>
                  <select
                    value={preferences.currency}
                    onChange={(e) =>
                      setPreferences({ ...preferences, currency: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="GHS">GHS (GH₵) - Ghanaian Cedi</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                  </select>
                </div>

                {/* Time Format */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400" />
                    Time Display Format
                  </label>
                  <select
                    value={preferences.timeFormat}
                    onChange={(e) =>
                      setPreferences({ ...preferences, timeFormat: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="12h">12-Hour Format (09:30 AM / 05:00 PM)</option>
                    <option value="24h">24-Hour Format (09:30 / 17:00)</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400" />
                    Calendar Date Format
                  </label>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) =>
                      setPreferences({ ...preferences, dateFormat: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 28/08/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/28/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-08-28)</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#002185] dark:text-blue-400" />
                    Interface Language
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences({ ...preferences, language: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#002185] dark:focus:border-blue-500 transition-colors"
                  >
                    <option value="en-US">English (United States)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="fr-FR">Français (French)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isSavingPreferences}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#002185] dark:bg-blue-600 text-white text-xs font-bold hover:bg-[#001760] dark:hover:bg-blue-700 shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPreferences ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSavingPreferences ? "Saving Preferences..." : "Save Preferences"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: Notification Preferences */}
      {activeTab === "notifications" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#002185] dark:text-blue-400" />
              Notification & Alert Delivery
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose what updates you want delivered to your email inbox and in-app activity bell.
            </p>
          </div>

          <form onSubmit={handleSaveNotifications} className="space-y-6">
            {/* Email Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#002185] dark:text-blue-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email Notifications
              </h4>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {/* Payslip published */}
                <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Monthly Payslip Published
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Receive an email notification as soon as your monthly salary payslip is released.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.emailPayslip}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          emailPayslip: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#002185] dark:peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Leave status update */}
                <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Leave Request Decisions
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Get notified immediately when management approves or updates your leave applications.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.emailLeaveStatus}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          emailLeaveStatus: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#002185] dark:peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Announcements */}
                <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Company Bulletins & Announcements
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Receive important executive updates and official staff announcements.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.emailAnnouncements}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          emailAnnouncements: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#002185] dark:peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Attendance reminders */}
                <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Daily Attendance Reminders
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Receive subtle morning reminders to clock in before shift starts.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.emailAttendanceReminders}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          emailAttendanceReminders: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#002185] dark:peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* In-App Alerts Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#002185] dark:text-blue-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                In-App Audio & Visual Alerts
              </h4>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {/* Urgent Bell Alerts */}
                <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Top Navigation Bell Badges
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Display real-time notification count badges in the top navigation bar.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.inAppUrgentAlerts}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          inAppUrgentAlerts: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#002185] dark:peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Subtle Sound Effects */}
                <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Audible Cue on Clock In & Out
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Play subtle chime confirmation when shifts are clocked in and out.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.inAppSound}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          inAppSound: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#002185] dark:peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSavingNotifications}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#002185] dark:bg-blue-600 text-white text-xs font-bold hover:bg-[#001760] dark:hover:bg-blue-700 shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {isSavingNotifications ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSavingNotifications
                  ? "Saving Notifications..."
                  : "Save Notification Preferences"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default EmployeeSettings;
