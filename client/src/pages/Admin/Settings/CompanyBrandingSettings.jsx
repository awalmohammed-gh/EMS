import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Palette,
  CheckCircle2,
  AlertCircle,
  Building2,
  RotateCcw,
  Sparkles,
  Eye,
  Check,
} from "lucide-react";
import { useBranding } from "../../../context/BrandingContext";
import { brandingService } from "../../../services/brandingService";

/**
 * CompanyBrandingSettings Component
 * 
 * Manages active organization visual identity: company name, custom uploaded logo,
 * welcome backdrop, and primary theme hue.
 * 
 * Immediately triggers `await refreshBranding()` upon successful `PUT /api/company/branding`
 * response, causing the updated `logoUrl` to propagate dynamically to the dashboard
 * sidebars with smooth Framer Motion layout transitions without requiring a hard refresh.
 */
export const CompanyBrandingSettings = ({ onSaveSuccess }) => {
  const {
    companyName: activeName,
    logoUrl: activeLogo,
    welcomeBackgroundUrl: activeBg,
    primaryColor: activeColor,
    refreshBranding,
  } = useBranding();

  const [companyName, setCompanyName] = useState(activeName || "");
  const [primaryColor, setPrimaryColor] = useState(activeColor || "#0B1E48");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(activeLogo || "");
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(activeBg || "");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const logoInputRef = useRef(null);
  const bgInputRef = useRef(null);

  // Synchronize local draft state when global context updates
  useEffect(() => {
    if (activeName) setCompanyName(activeName);
    if (activeLogo && !logoFile) setLogoPreview(activeLogo);
    if (activeBg && !bgFile) setBgPreview(activeBg);
    if (activeColor) setPrimaryColor(activeColor);
  }, [activeName, activeLogo, activeBg, activeColor, logoFile, bgFile]);

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage({ type: "error", text: "Please select a valid image file (PNG, JPG, SVG, WebP)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: "error", text: "Image size must be under 5MB." });
      return;
    }

    setLogoFile(file);
    setStatusMessage(null);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleBgSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage({ type: "error", text: "Please select a valid image file." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setStatusMessage({ type: "error", text: "Backdrop image size must be under 8MB." });
      return;
    }

    setBgFile(file);
    setStatusMessage(null);
    const reader = new FileReader();
    reader.onload = () => setBgPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleResetDraft = () => {
    setLogoFile(null);
    setBgFile(null);
    setLogoPreview(activeLogo || "");
    setBgPreview(activeBg || "");
    setCompanyName(activeName || "WorkPulse");
    setPrimaryColor(activeColor || "#0B1E48");
    setStatusMessage(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (bgInputRef.current) bgInputRef.current.value = "";
  };

  const handleSave = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("companyName", companyName.trim() || "WorkPulse");
      formData.append("primaryColor", primaryColor || "#0B1E48");

      if (logoFile) {
        formData.append("logo", logoFile);
      }
      if (bgFile) {
        formData.append("welcomeBackground", bgFile);
      }

      // 1. Submit branding update to backend
      const res = await brandingService.updateAdminBranding(formData);

      if (res?.success) {
        // 2. Immediate real-time invalidation: re-fetch active company branding
        await refreshBranding();

        setLogoFile(null);
        setBgFile(null);
        setStatusMessage({
          type: "success",
          text: "Brand identity updated! Sidebar logo and company styling refreshed instantly.",
        });

        if (typeof onSaveSuccess === "function") {
          onSaveSuccess(res);
        }
      } else {
        throw new Error(res?.message || "Failed to update branding.");
      }
    } catch (err) {
      console.error("[CompanyBrandingSettings] Save error:", err);
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to save branding assets.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const PRESET_COLORS = [
    { name: "Navy Blue", value: "#0B1E48" },
    { name: "Royal Indigo", value: "#1E3A8A" },
    { name: "Emerald Slate", value: "#065F46" },
    { name: "Crimson Maroon", value: "#881337" },
    { name: "Deep Violet", value: "#4C1D95" },
    { name: "Charcoal Titanium", value: "#1E293B" },
  ];

  return (
    <motion.div
      layout
      className="space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Real-Time Live Sidebar Brand Badge Preview */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-800/80 dark:to-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Live Sidebar Brand Badge Preview
            </h4>
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Real-time Synchronized
          </span>
        </div>

        {/* Replica of the exact Sidebar Brand Header */}
        <div className="max-w-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-3">
          <div className="flex items-center gap-3">
            <motion.div layout key={logoPreview || companyName} className="shrink-0">
              {logoPreview ? (
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-center p-1 overflow-hidden">
                  <motion.img
                    layout
                    src={logoPreview}
                    alt={companyName || "Company Logo"}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = "flex";
                      }
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center bg-[#0B1E48] text-white font-bold text-sm rounded-lg">
                    {companyName ? companyName.charAt(0).toUpperCase() : "W"}
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#0B1E48] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {companyName ? companyName.charAt(0).toUpperCase() : "W"}
                </div>
              )}
            </motion.div>

            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {companyName || "Workspace"}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Management Suite
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invalidation / Feedback Status Banner */}
      <AnimatePresence mode="wait">
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 font-medium ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Workspace Organization Name */}
        <div className="space-y-2">
          <label
            htmlFor="branding-company-name-input"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Organization / Workspace Name
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="branding-company-name-input"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Global Logistics"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            This name appears prominently across all dashboard sidebar headers, navigation drawers, and generated payslips.
          </p>
        </div>

        {/* Brand Asset Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Logo Uploader */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Company Emblem / Logo
                </span>
                <span className="text-[10px] text-slate-400">
                  Recommended: Transparent PNG or SVG (square or 4:3)
                </span>
              </div>
              <button
                id="branding-upload-logo-btn"
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0B1E48] text-white hover:bg-opacity-90 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                Select File
              </button>
            </div>

            <input
              ref={logoInputRef}
              id="branding-logo-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoSelect}
              className="hidden"
            />

            {/* Drop / Preview Area */}
            <div
              onClick={() => logoInputRef.current?.click()}
              className="h-32 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {logoPreview ? (
                <div className="w-full h-full flex items-center justify-center relative group">
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="max-h-24 max-w-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                    Change Logo
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Click to upload custom logo
                  </p>
                  <p className="text-[10px] text-slate-400">PNG, JPG, WebP or SVG up to 5MB</p>
                </div>
              )}
            </div>
            {logoFile && (
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate">
                Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Welcome Background Uploader (Optional) */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Portal Welcome Backdrop
                </span>
                <span className="text-[10px] text-slate-400">
                  Optional backdrop for login and onboarding screens
                </span>
              </div>
              <button
                id="branding-upload-bg-btn"
                type="button"
                onClick={() => bgInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-white hover:bg-slate-600 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                Select File
              </button>
            </div>

            <input
              ref={bgInputRef}
              id="branding-bg-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleBgSelect}
              className="hidden"
            />

            <div
              onClick={() => bgInputRef.current?.click()}
              className="h-32 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {bgPreview ? (
                <div className="w-full h-full relative group rounded-lg overflow-hidden">
                  <img
                    src={bgPreview}
                    alt="Backdrop Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                    Change Backdrop
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Palette className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    Click to upload portal backdrop
                  </p>
                  <p className="text-[10px] text-slate-400">High-res 16:9 wallpaper recommended</p>
                </div>
              )}
            </div>
            {bgFile && (
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate">
                Selected: {bgFile.name} ({(bgFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>

        {/* Primary Color Palette */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Primary Brand Color & Theme Accent
            </span>
            <div className="flex items-center gap-2">
              <input
                id="branding-color-picker"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-7 h-7 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
              />
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {primaryColor}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_COLORS.map((preset) => {
              const isSelected = primaryColor.toLowerCase() === preset.value.toLowerCase();
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setPrimaryColor(preset.value)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-1 ring-blue-600 font-bold"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: preset.value }}
                  />
                  <span>{preset.name}</span>
                  {isSelected && <Check className="w-3 h-3 ml-0.5 text-blue-600 dark:text-blue-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            id="branding-reset-btn"
            type="button"
            onClick={handleResetDraft}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            id="branding-save-btn"
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating Brand Assets...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Apply Branding Changes
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default CompanyBrandingSettings;
