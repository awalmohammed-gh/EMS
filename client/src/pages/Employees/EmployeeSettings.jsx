import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Shield,
  Save,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useManagement } from "../../context/ManagementContextProvider";
import { getEmployeeMe, updateEmployeeMe } from "../../apis/fontApis";
import Loading from "../../ui/Loading";
import ErrorMessage from "../../ui/ErrorMessage";

const EmployeeSettings = () => {
  const { user, setUser, setShowToast } = useManagement();
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
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

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
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateEmployeeMe({
        fullName: profile.fullName,
        phone: profile.phone,
      });

      if (res?.data?.success) {
        const updated = res.data.employee || profile;
        setUser((prev) => ({ ...prev, ...updated }));
        localStorage.setItem("employeeData", JSON.stringify({ ...profile, ...updated }));
        setShowToast({
          show: true,
          message: "Profile details updated successfully in database!",
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
        message: err.response?.data?.message || err.message || "Failed to save profile.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setShowToast({
        show: true,
        message: "Please fill in all password fields.",
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

    setShowToast({
      show: true,
      message: "Password updated successfully!",
      type: "success",
    });
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const avatarUrl =
    profile.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile.fullName || user?.fullName || "Employee",
    )}&background=002185&color=fff&bold=true`;

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
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#002185] tracking-tight">
          Account & Profile Settings
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Manage your personal information, contact info, and account preferences
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm hover:border-[#ff5500] transition-all duration-300">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md ring-4 ring-[#002185]/10 shrink-0">
            <img
              src={avatarUrl}
              alt={profile.fullName || user?.fullName || "Employee"}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-[#002185]">
                {profile.fullName || user?.fullName || "Staff Member"}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#002185]/10 text-[#002185] w-fit mx-auto sm:mx-0">
                <Shield className="w-3 h-3" />
                {profile.position || user?.position || "Staff Member"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-[#64748B]">
              {(profile.department || user?.department) && (
                <>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#002185]" />
                    {profile.department || user?.department}
                  </span>
                  <span>•</span>
                </>
              )}
              {(profile.position || user?.position) && (
                <>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-[#002185]" />
                    {profile.position || user?.position}
                  </span>
                  <span>•</span>
                </>
              )}
              {(profile.employeeId || user?.employeeId) && (
                <span className="font-mono text-[#002185] font-semibold">
                  ID: {profile.employeeId || user?.employeeId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Form */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-[#002185] mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-[#ff5500]" />
          Personal & Contact Information
        </h3>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) =>
                    setProfile({ ...profile, fullName: e.target.value })
                  }
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#002185] focus:bg-white transition-all"
                  placeholder="Full Name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-sm text-[#64748B] cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#002185] focus:bg-white transition-all"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                Department
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  type="text"
                  value={profile.department}
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-sm text-[#64748B] cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                Position / Designation
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  type="text"
                  value={profile.position}
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-sm text-[#64748B] cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                Employment ID
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <input
                  type="text"
                  value={profile.employeeId}
                  disabled
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-sm text-[#64748B] font-mono cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#002185] text-white text-xs font-bold hover:bg-[#ff5500] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-[#002185] mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#ff5500]" />
          Security & Password
        </h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#002185] focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#002185] focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#002185] focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#002185] text-[#002185] text-xs font-bold hover:bg-[#002185] hover:text-white transition-all duration-200 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeSettings;
