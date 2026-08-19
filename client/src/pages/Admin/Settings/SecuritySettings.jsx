// components/admin/settings/SecuritySettings.js
import { useState } from "react";
import { Shield,  Clock, Key,  AlertTriangle } from "lucide-react";

 const securitySettings = {
  twoFactorAuthentication: false,
  maxLoginAttempts: 5,
  sessionTimeout: 30,
  passwordExpiryDays: 90,
  loginNotifications: true,
};

const SecuritySettings = () => {
  const [security, setSecurity] = useState(securitySettings);

  const handleChange = (field, value) => {
    setSecurity((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Max Login Attempts
          </label>
          <div className="relative">
            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={security.maxLoginAttempts}
              onChange={(e) =>
                handleChange("maxLoginAttempts", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Session Timeout (Minutes)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={security.sessionTimeout}
              onChange={(e) =>
                handleChange("sessionTimeout", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Password Expiry (Days)
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="number"
              value={security.passwordExpiryDays}
              onChange={(e) =>
                handleChange("passwordExpiryDays", parseInt(e.target.value))
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={security.twoFactorAuthentication}
            onChange={(e) =>
              handleChange("twoFactorAuthentication", e.target.checked)
            }
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">
            Enable Two-Factor Authentication
          </span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={security.loginNotifications}
            onChange={(e) =>
              handleChange("loginNotifications", e.target.checked)
            }
            className="w-4 h-4 text-[#ff5500] border-[#E2E8F0] rounded focus:ring-[#ff5500]"
          />
          <span className="text-sm text-[#334155]">
            Send Login Notifications
          </span>
        </label>
      </div>

      {/* Security Info */}
      <div className="bg-[#FFFBEB] p-4 rounded-lg border border-[#F59E0B]/30">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#D97706] mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-[#D97706]">
              Security Recommendations
            </h4>
            <ul className="text-xs text-[#64748B] mt-1 space-y-1">
              <li>• Enable two-factor authentication for enhanced security</li>
              <li>• Set session timeout to 30 minutes or less</li>
              <li>• Require password changes every 90 days</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
