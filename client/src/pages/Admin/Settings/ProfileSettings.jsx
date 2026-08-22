// components/admin/settings/ProfileSettings.js
import { useState, useEffect } from "react";
import { User, Mail, Phone, Briefcase, Key, Camera } from "lucide-react";
import { useManagement } from "../../../context/ManagementContextProvider";
import { getAdminProfile } from "../../../apis/fontApis";

const ProfileSettings = () => {
  const { user, setUser } = useManagement();
  const [profile, setProfile] = useState({
    fullName: user?.fullName || user?.full_name || "Administrator",
    email: user?.email || "admin@eyenit.com",
    phone: user?.phone || "",
    role: user?.role === "super_admin" ? "Super Admin" : "Administrator",
    avatar: user?.avatar || "",
  });
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await getAdminProfile();
        if (res?.data?.success && res.data.admin) {
          const adm = res.data.admin;
          setProfile({
            fullName: adm.fullName || adm.full_name || "Administrator",
            email: adm.email || "admin@eyenit.com",
            phone: adm.phone || "",
            role: adm.role === "super_admin" ? "Super Admin" : "Administrator",
            avatar: adm.avatar || "",
          });
          setUser((prev) => ({ ...prev, ...adm }));
        }
      } catch (err) {
        console.warn("Failed to fetch admin profile:", err.message);
      }
    };
    fetchAdmin();
  }, [setUser]);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture */}
      <div className="flex items-center gap-6 pb-6 border-b border-[#E2E8F0]">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#002185] flex items-center justify-center text-3xl font-bold text-white">
            {profile.fullName.charAt(0)}
          </div>
          <button className="absolute bottom-0 right-0 p-1.5 bg-[#ff5500] rounded-full text-white hover:bg-[#002185] transition-colors">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#002185]">
            {profile.fullName}
          </h3>
          <p className="text-sm text-[#64748B]">{profile.role}</p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="email"
              value={profile.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Role
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <select
              value={profile.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30 appearance-none"
            >
              <option value="Administrator">Administrator</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
            </select>
          </div>
        </div>
      </div>

      {/* Change Password Button */}
      <div className="pt-4 border-t border-[#E2E8F0]">
        <button
          onClick={() => setShowChangePassword(!showChangePassword)}
          className="flex items-center gap-2 text-[#ff5500] hover:text-[#002185] transition-colors text-sm font-medium"
        >
          <Key className="w-4 h-4" />
          Change Password
        </button>
        {showChangePassword && (
          <div className="mt-4 p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                Current Password
              </label>
              <input
                type="password"
                placeholder="Enter current password"
                className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter new password"
                className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#002185]">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
              />
            </div>
            <button className="px-4 py-2 bg-[#002185] text-white rounded-lg text-sm hover:bg-[#ff5500] transition-colors">
              Update Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;
