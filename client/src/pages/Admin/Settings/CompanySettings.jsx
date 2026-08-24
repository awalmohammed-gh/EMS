import { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Banknote,
  Bell,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { useManagement } from "../../../context/ManagementContextProvider";
import { getSettings, updateCompanySettings } from "../../../apis/fontApis";

const defaultCompany = {
  companyName: "EYENIT Technologies",
  logo: "/logo.png",
  address: "Accra, Ghana",
  phone: "+233 30 212 3456",
  email: "info@eyenit.com",
  website: "https://www.eyenit.com",
  workStartTime: "08:00",
  workEndTime: "17:00",
  defaultCurrency: "GHS",
  emailNotifications: true,
  systemAlerts: true,
};

const CompanySettings = ({ onSaveSuccess }) => {
  const { setShowToast } = useManagement();
  const [company, setCompany] = useState(defaultCompany);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const res = await getSettings();
        if (isMounted && res?.data?.success && res.data.settings) {
          const comp = res.data.settings.company || {};
          const att = res.data.settings.attendance || {};
          const pay = res.data.settings.payroll || {};
          setCompany((prev) => ({
            ...prev,
            ...comp,
            workStartTime: att.workStartTime || prev.workStartTime,
            workEndTime: att.workEndTime || prev.workEndTime,
            defaultCurrency: pay.currency || prev.defaultCurrency,
          }));
        }
      } catch (err) {
        console.warn("Failed to load company settings:", err?.message);
      }
    };
    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field, value) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    setIsSaving(true);
    try {
      const res = await updateCompanySettings({
        companyName: company.companyName,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        logo: company.logo,
        workStartTime: company.workStartTime,
        workEndTime: company.workEndTime,
        defaultCurrency: company.defaultCurrency,
        emailNotifications: company.emailNotifications,
        systemAlerts: company.systemAlerts,
      });

      if (res?.data?.success) {
        setShowToast({
          show: true,
          message: "Company preferences saved successfully!",
          type: "success",
        });
        if (typeof onSaveSuccess === "function") {
          onSaveSuccess();
        }
      }
    } catch (err) {
      console.error("Failed to save company settings:", err);
      setShowToast({
        show: true,
        message: err?.response?.data?.message || "Failed to update company settings.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Brand Identity / Logo Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800/80 text-[#002185] dark:text-blue-400 shrink-0">
          <Building2 className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {company.companyName || "Organization Profile"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure company identity, default operational work hours, and communication preferences
          </p>
          <div className="pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Logo
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Company / Organization Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={company.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#002185] dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-[#002185]/20 dark:focus:ring-blue-500/20"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Business Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={company.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#002185] dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-[#002185]/20 dark:focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Phone Contact
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={company.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#002185] dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-[#002185]/20 dark:focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Physical Office Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={company.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#002185] dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-[#002185]/20 dark:focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Website URL
          </label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={company.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://www.example.com"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#002185] dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-[#002185]/20 dark:focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Default Operating Currency
          </label>
          <div className="relative">
            <Banknote className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={company.defaultCurrency}
              onChange={(e) => handleChange("defaultCurrency", e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#002185] dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-[#002185]/20 dark:focus:ring-blue-500/20"
            >
              <option value="GHS">GHS (Ghana Cedis - GH₵)</option>
              <option value="USD">USD (US Dollar - $)</option>
              <option value="EUR">EUR (Euro - €)</option>
              <option value="GBP">GBP (British Pound - £)</option>
            </select>
          </div>
        </div>

        {/* Work Hours Configuration */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Standard Work Start Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="time"
              value={company.workStartTime}
              onChange={(e) => handleChange("workStartTime", e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#002185] dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-[#002185]/20 dark:focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Standard Work End Time
          </label>
          <div className="relative">
            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="time"
              value={company.workEndTime}
              onChange={(e) => handleChange("workEndTime", e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-[#002185] dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-[#002185]/20 dark:focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Notification Toggles */}
      <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-[#002185] dark:text-blue-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            System & Notification Toggles
          </h4>
        </div>

        <label className="flex items-center gap-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={company.emailNotifications}
            onChange={(e) =>
              handleChange("emailNotifications", e.target.checked)
            }
            className="w-4 h-4 text-[#002185] dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-[#002185] cursor-pointer"
          />
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Enable Email Dispatch Notifications
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Send automatic email alerts for payroll approvals and leave requests
            </span>
          </div>
        </label>

        <label className="flex items-center gap-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={company.systemAlerts}
            onChange={(e) =>
              handleChange("systemAlerts", e.target.checked)
            }
            className="w-4 h-4 text-[#002185] dark:text-blue-500 border-slate-300 dark:border-slate-600 rounded focus:ring-[#002185] cursor-pointer"
          />
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Enable Real-time Dashboard Bell Alerts
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Show pop-up and badge notifications in the top bar for instant awareness
            </span>
          </div>
        </label>
      </div>

      {/* Save Action Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-[#002185] dark:bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#ff5500] dark:hover:bg-blue-700 shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>{isSaving ? "Saving Company Settings..." : "Save Company Preferences"}</span>
        </button>
      </div>
    </form>
  );
};

export default CompanySettings;
