import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Building2,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  LogIn,
  Check,
  X,
  Globe,
} from "lucide-react";
import { brandingService } from "../../services/brandingService";
import { useBranding } from "../../context/BrandingContext";
import { useManagement } from "../../context/ManagementContextProvider";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";

const BRAND_PALETTES = [
  { name: "Navy Blue", value: "#0B1E48" },
  { name: "Royal Blue", value: "#2563EB" },
  { name: "Deep Teal", value: "#0D9488" },
  { name: "Emerald", value: "#059669" },
  { name: "Indigo", value: "#4F46E5" },
  { name: "Slate", value: "#334155" },
];

export const SetupCompanyPage = () => {
  const navigate = useNavigate();
  const { refreshBranding } = useBranding();
  const { setShowToast, setUser: setManagementUser, setRole: setManagementRole } = useManagement();
  const { login: contextLogin } = useAuth();

  // Mode: "register" (Option A) vs "signin" (Option B)
  const [activeTab, setActiveTab] = useState("register");

  // Multi-step state for Option A
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Step 1: Organization Details
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 2: Master Administrator Account
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 3: Brand & Identity
  const [primaryColor, setPrimaryColor] = useState("#0B1E48");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState("");

  const logoInputRef = useRef(null);
  const bgInputRef = useRef(null);

  // Option B: Sign In to Existing Organization state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Logo file selection handler
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file (PNG, SVG, JPEG, WEBP) for the company logo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError("Logo file size must be less than 10MB.");
      return;
    }

    setFormError(null);
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Background image selection handler
  const handleBgChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file for the welcome background.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setFormError("Background image file size must be less than 12MB.");
      return;
    }

    setFormError(null);
    setBgFile(file);
    const reader = new FileReader();
    reader.onload = () => setBgPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Drag and drop helpers
  const handleLogoDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setFormError(null);
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBgDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setFormError(null);
      setBgFile(file);
      const reader = new FileReader();
      reader.onload = () => setBgPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Step Validation & Forward Navigation for Option A
  const handleNextStep = () => {
    setFormError(null);
    if (step === 1) {
      if (!companyName.trim()) {
        setFormError("Please enter your Company / Organization name.");
        return;
      }
      if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        setFormError("Please enter a valid work contact email address.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!adminFullName.trim()) {
        setFormError("Please enter the Master Administrator's full name.");
        return;
      }
      if (!adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
        setFormError("Please provide a valid work email for the administrator account.");
        return;
      }
      if (!adminPassword || adminPassword.length < 6) {
        setFormError("Password must be at least 6 characters long.");
        return;
      }
      if (adminPassword !== confirmPassword) {
        setFormError("Passwords do not match. Please verify both fields.");
        return;
      }
      setStep(3);
    }
  };

  // Option A Submission: Register New Organization
  const handleRegisterOrganization = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormError(null);

    if (!companyName.trim()) {
      setFormError("Company name is required.");
      setStep(1);
      return;
    }
    if (!adminFullName.trim() || !adminEmail.trim() || !adminPassword) {
      setFormError("Master administrator name, email, and password are required.");
      setStep(2);
      return;
    }
    if (adminPassword !== confirmPassword) {
      setFormError("Administrator passwords do not match.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("companyName", companyName.trim());
      formData.append("adminName", adminFullName.trim());
      formData.append("adminFullName", adminFullName.trim());
      formData.append("fullName", adminFullName.trim());
      formData.append("adminEmail", adminEmail.trim().toLowerCase());
      formData.append("email", adminEmail.trim().toLowerCase());
      formData.append("password", adminPassword);
      formData.append("adminPassword", adminPassword);
      formData.append("contactEmail", (contactEmail.trim() || adminEmail.trim()).toLowerCase());
      if (contactPhone.trim()) {
        formData.append("contactPhone", contactPhone.trim());
        formData.append("phone", contactPhone.trim());
      }
      formData.append("primaryColor", primaryColor);

      if (logoFile) {
        formData.append("logo", logoFile);
      }
      if (bgFile) {
        formData.append("welcomeBackground", bgFile);
      }

      const result = await brandingService.registerOrganization(formData);

      if (result.success) {
        if (result.token) {
          authService.setStoredToken(result.token);
          authService.saveAuthSession(result.token, result.user || result.admin, "admin");
        }
        const activeUser = result.user || result.admin;
        if (activeUser) {
          if (typeof contextLogin === "function") {
            contextLogin(result.token, activeUser);
          }
          if (typeof setManagementUser === "function") {
            setManagementUser(activeUser);
          }
          if (typeof setManagementRole === "function") {
            setManagementRole("admin");
          }
        }

        await refreshBranding();

        if (typeof setShowToast === "function") {
          setShowToast({
            type: "success",
            message: `Organization "${companyName}" created and administrator account configured successfully!`,
          });
        }

        // Direct navigation to Management Dashboard
        navigate("/admin/dashboard", { replace: true });
      } else {
        setFormError(result.message || "Failed to initialize organization. Please try again.");
      }
    } catch (err) {
      console.error("[SetupCompanyPage] Registration error:", err);
      setFormError(
        err.response?.data?.message || err.message || "An unexpected error occurred during organization registration."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Option B Submission: Sign In to Existing Organization
  const handleSignInExisting = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmail = signInEmail.trim().toLowerCase();
    const cleanPassword = signInPassword.trim();

    if (!cleanEmail) {
      setFormError("Please enter your administrator email address.");
      return;
    }
    if (!cleanPassword) {
      setFormError("Please enter your account password.");
      return;
    }

    setIsSigningIn(true);
    try {
      const response = await authService.adminLogin({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (response.success && response.token) {
        authService.setStoredToken(response.token);
        const adminUser = response.admin || response.user;
        authService.saveAuthSession(response.token, adminUser, "admin");

        if (typeof contextLogin === "function") {
          contextLogin(response.token, adminUser);
        }
        if (typeof setManagementUser === "function") {
          setManagementUser(adminUser);
        }
        if (typeof setManagementRole === "function") {
          setManagementRole("admin");
        }

        await refreshBranding();

        if (typeof setShowToast === "function") {
          setShowToast({
            type: "success",
            message: `Welcome back, ${adminUser?.fullName || adminUser?.name || "Administrator"}!`,
          });
        }

        // Direct navigation to Management Dashboard
        navigate("/admin/dashboard", { replace: true });
      } else {
        setFormError(response.message || "Invalid credentials. Please verify your email and password.");
      }
    } catch (err) {
      console.error("[SetupCompanyPage] Sign-in error:", err);
      setFormError(
        err.response?.data?.message || err.message || "Authentication failed. Please verify credentials."
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div
      id="setup-company-page"
      className="min-h-screen bg-[#F4F7FB] dark:bg-[#F4F7FB] text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-x-hidden font-sans"
    >
      {/* Dynamic Background Effects: Soft light blue tint and subtle luminous glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-100/30 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-400/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Header Bar & Navigation Surface */}
      <header className="relative z-10 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Enterprise Initialization Suite
              </h1>
              <p className="text-xs text-slate-500 font-normal">Master Onboarding & Workspace Access Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50/80 border border-blue-200/60 text-blue-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Enterprise Setup
            </span>
            <Link
              to="/welcome"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Public Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Dual-Branch Container */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {/* Header Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50/80 text-blue-700 border border-blue-200/60 mb-3 shadow-xs">
            <span>Workspace Setup Gateway</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Organization Access & Identity Hub
          </h2>
          <p className="text-sm text-slate-500 font-normal leading-relaxed max-w-md mx-auto mt-2">
            Configure your company identity and master administrator account, or sign in to an existing deployment.
          </p>
        </div>

        {/* Dual Branch Selector (Segmented Pill Toggle) */}
        <div
          id="setup-branch-selector"
          className="bg-slate-200/60 p-1.5 rounded-2xl flex items-center max-w-md mx-auto border border-slate-200 mb-8 shadow-xs"
        >
          <button
            type="button"
            id="tab-register-org"
            onClick={() => {
              setActiveTab("register");
              setFormError(null);
            }}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "register"
                ? "bg-blue-600 text-white shadow-sm font-semibold rounded-xl"
                : "text-slate-600 hover:text-slate-900 font-medium rounded-xl transition-colors"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Register New Organization</span>
          </button>

          <button
            type="button"
            id="tab-signin-existing"
            onClick={() => {
              setActiveTab("signin");
              setFormError(null);
            }}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "signin"
                ? "bg-blue-600 text-white shadow-sm font-semibold rounded-xl"
                : "text-slate-600 hover:text-slate-900 font-medium rounded-xl transition-colors"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Existing</span>
          </button>
        </div>

        {/* Form Error Banner */}
        {formError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 max-w-4xl mx-auto w-full bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm px-4 py-3 rounded-2xl flex items-start gap-3 shadow-xs"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{formError}</div>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Setup Wizard Card Container */}
        <div className="w-full max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 sm:p-10 mt-2">
          {/* BRANCH A: REGISTER NEW ORGANIZATION */}
          {activeTab === "register" && (
            <div>
              {/* Stepper Indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    Step {step} of 3
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {step === 1 && "Organization Details"}
                    {step === 2 && "Master Administrator"}
                    {step === 3 && "Initial Branding & Assets"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { num: 1, label: "Organization" },
                    { num: 2, label: "Admin Account" },
                    { num: 3, label: "Brand Identity" },
                  ].map((s) => (
                    <div
                      key={s.num}
                      className="cursor-pointer"
                      onClick={() => {
                        if (step > s.num) setStep(s.num);
                      }}
                    >
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          step >= s.num
                            ? "bg-blue-600 shadow-xs shadow-blue-500/30"
                            : "bg-slate-100"
                        }`}
                      />
                      <p
                        className={`text-xs mt-2 text-center transition-colors ${
                          step === s.num
                            ? "text-blue-600 font-semibold"
                            : step > s.num
                            ? "text-slate-700 font-medium"
                            : "text-slate-400 font-medium"
                        }`}
                      >
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 1: ORGANIZATION DETAILS */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Organization Details
                    </h3>
                    <p className="text-xs text-slate-500 font-normal mt-1">
                      Provide your official company title and primary contact information.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                        Company Name <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          id="input-company-name"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Apex Logistics Ltd"
                          className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-4 py-3 text-sm transition-all shadow-xs"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                        Work Contact Email <span className="text-slate-400 font-normal lowercase text-[11px]">(optional)</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          id="input-contact-email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="operations@apexlogistics.com"
                          className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-4 py-3 text-sm transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                        Phone Contact <span className="text-slate-400 font-normal lowercase text-[11px]">(optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          id="input-contact-phone"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+1 (555) 234-5678"
                          className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-4 py-3 text-sm transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      id="btn-next-step-1"
                      onClick={handleNextStep}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-sm shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Proceed to Admin Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: MASTER ADMINISTRATOR ACCOUNT */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      Master Administrator Account
                    </h3>
                    <p className="text-xs text-slate-500 font-normal mt-1">
                      Create the superuser credentials that govern this workspace deployment.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                        Administrator Full Name <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          id="input-admin-name"
                          value={adminFullName}
                          onChange={(e) => setAdminFullName(e.target.value)}
                          placeholder="e.g. Alex Morgan"
                          className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-4 py-3 text-sm transition-all shadow-xs"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                        Admin Work Email <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          id="input-admin-email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="alex.morgan@apexlogistics.com"
                          className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-4 py-3 text-sm transition-all shadow-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                          Admin Password <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? "text" : "password"}
                            id="input-admin-password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-10 py-3 text-sm transition-all shadow-xs"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                          Confirm Password <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            id="input-admin-confirm-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-10 py-3 text-sm transition-all shadow-xs"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      id="btn-next-step-2"
                      onClick={handleNextStep}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-sm shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Proceed to Branding</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: INITIAL BRANDING & IDENTITY */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      Initial Branding & Identity
                    </h3>
                    <p className="text-xs text-slate-500 font-normal mt-1">
                      Upload your organization logo and login screen background asset.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {/* Logo Upload Card */}
                    <div className="bg-slate-50/50 border border-slate-200/90 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          Company Logo (Light & Dark Friendly)
                        </label>
                        {logoFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview("");
                            }}
                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleLogoDrop}
                        onClick={() => logoInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                          logoPreview
                            ? "border-blue-400 bg-blue-50/30"
                            : "border-slate-200 bg-slate-50/40 hover:bg-blue-50/20 hover:border-blue-300"
                        }`}
                      >
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />

                        {logoPreview ? (
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                              <img
                                src={logoPreview}
                                alt="Logo Preview"
                                className="h-12 max-w-[140px] object-contain"
                              />
                            </div>
                            <div className="text-left text-xs">
                              <p className="text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for upload
                              </p>
                              <p className="text-slate-600 text-[11px] truncate max-w-[200px]">
                                {logoFile?.name}
                              </p>
                              <span className="text-blue-600 text-[11px] font-medium underline">Click or drop to replace</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-3 flex flex-col items-center gap-1.5">
                            <Upload className="w-6 h-6 text-slate-400" />
                            <p className="text-xs text-slate-700 font-medium">
                              Drag and drop your logo, or <span className="text-blue-600 font-semibold">browse files</span>
                            </p>
                            <p className="text-[11px] text-slate-400">PNG, SVG, or WEBP (Max 10MB)</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Welcome Background Upload Card */}
                    <div className="bg-slate-50/50 border border-slate-200/90 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                          Welcome / Login Screen Background Image
                        </label>
                        {bgFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setBgFile(null);
                              setBgPreview("");
                            }}
                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleBgDrop}
                        onClick={() => bgInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                          bgPreview
                            ? "border-blue-400 bg-blue-50/30"
                            : "border-slate-200 bg-slate-50/40 hover:bg-blue-50/20 hover:border-blue-300"
                        }`}
                      >
                        <input
                          ref={bgInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBgChange}
                          className="hidden"
                        />

                        {bgPreview ? (
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
                            <div className="w-24 h-14 rounded-xl overflow-hidden border border-slate-200 relative shadow-xs">
                              <img
                                src={bgPreview}
                                alt="Background Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-left text-xs">
                              <p className="text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Background image selected
                              </p>
                              <p className="text-slate-600 text-[11px] truncate max-w-[200px]">
                                {bgFile?.name}
                              </p>
                              <span className="text-blue-600 text-[11px] font-medium underline">Click or drop to replace</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-3 flex flex-col items-center gap-1.5">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                            <p className="text-xs text-slate-700 font-medium">
                              Upload corporate backdrop, or <span className="text-blue-600 font-semibold">browse files</span>
                            </p>
                            <p className="text-[11px] text-slate-400">High-resolution JPEG or WEBP (Max 12MB)</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Brand Palette Preset Selector */}
                    <div>
                      <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-2 block">
                        Primary Brand Accent Color
                      </label>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {BRAND_PALETTES.map((palette) => (
                          <button
                            key={palette.value}
                            type="button"
                            onClick={() => setPrimaryColor(palette.value)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                              primaryColor === palette.value
                                ? "border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs"
                                : "border-slate-200 text-slate-700 hover:border-slate-300 bg-white"
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                              style={{ backgroundColor: palette.value }}
                            />
                            <span>{palette.name}</span>
                            {primaryColor === palette.value && <Check className="w-3 h-3 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Review Summary Box */}
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 text-xs text-slate-700 space-y-1.5 shadow-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Setup Review Summary:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] pt-1">
                        <div>
                          <span className="text-slate-500">Company:</span>{" "}
                          <span className="text-slate-900 font-semibold">{companyName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Master Admin:</span>{" "}
                          <span className="text-slate-900 font-semibold">{adminFullName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Admin Email:</span>{" "}
                          <span className="text-slate-900 font-semibold">{adminEmail}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Brand Logo:</span>{" "}
                          <span className="text-blue-600 font-semibold">
                            {logoFile ? logoFile.name : "Default Enterprise Logo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission Buttons */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={isSubmitting}
                      className="text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      id="btn-complete-setup"
                      onClick={handleRegisterOrganization}
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Provisioning Organization...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Complete Setup & Create Organization</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* BRANCH B: SIGN IN TO EXISTING ORGANIZATION */}
          {activeTab === "signin" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-blue-600" />
                  Sign In to Existing Organization
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-1">
                  Authenticate as a master administrator to access your company dashboard and staff roster.
                </p>
              </div>

              <form onSubmit={handleSignInExisting} className="space-y-4">
                <div>
                  <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                    Administrator Email Address <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      id="input-signin-email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-4 py-3 text-sm transition-all shadow-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                    Administrator Password <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showSignInPassword ? "text" : "password"}
                      id="input-signin-password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-10 py-3 text-sm transition-all shadow-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 block">
                    Organization Domain / Code{" "}
                    <span className="text-slate-400 font-normal lowercase text-[11px]">(optional for single-deployment)</span>
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="input-signin-domain"
                      value={orgDomain}
                      onChange={(e) => setOrgDomain(e.target.value)}
                      placeholder="e.g. apex-logistics"
                      className="w-full bg-slate-50/50 border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl pl-10.5 pr-4 py-3 text-sm transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    id="btn-authenticate-existing"
                    disabled={isSigningIn}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSigningIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Authenticate & Enter Management Suite</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Cross-Link back to Register */}
              <div className="pt-4 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-500">
                  First time deploying?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("register");
                      setFormError(null);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Register your organization above.
                  </button>
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 py-4 px-6 text-center text-xs text-slate-400 bg-white/50 backdrop-blur-xs">
        Enterprise Management Portal &copy; {new Date().getFullYear()}. All Rights Reserved.
      </footer>
    </div>
  );
};

export const OrganizationAccessHub = SetupCompanyPage;
export default SetupCompanyPage;
