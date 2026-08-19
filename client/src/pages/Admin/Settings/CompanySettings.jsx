// components/admin/settings/CompanySettings.js
import { useState } from "react";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Upload,
} from "lucide-react";

const companySettings = {
  companyName: "EYENIT Technologies",
  companyLogo: "/logo.png",
  address: "Accra, Ghana",
  phone: "0302123456",
  email: "info@eyenit.com",
  website: "https://www.eyenit.com",
  registrationNumber: "REG-2026-001",
};

const CompanySettings = () => {
  const [company, setCompany] = useState(companySettings);

  const handleChange = (field, value) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Company Logo */}
      <div className="flex items-center gap-6 pb-6 border-b border-[#E2E8F0]">
        <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[#E2E8F0] flex items-center justify-center bg-[#F8FAFC]">
          <Building2 className="w-10 h-10 text-[#94A3B8]" />
        </div>
        <div>
          <button className="flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm hover:bg-[#F8FAFC] transition-colors">
            <Upload className="w-4 h-4" />
            Upload Logo
          </button>
          <p className="text-xs text-[#64748B] mt-1">
            PNG, JPG or SVG. Max 2MB
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Company Name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              value={company.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Registration Number
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              value={company.registrationNumber}
              onChange={(e) =>
                handleChange("registrationNumber", e.target.value)
              }
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              value={company.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              value={company.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="email"
              value={company.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#002185]">
            Website
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <input
              type="text"
              value={company.website}
              onChange={(e) => handleChange("website", e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-sm focus:border-[#ff5500] focus:outline-none focus:ring-2 focus:ring-[#ff5500]/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;
