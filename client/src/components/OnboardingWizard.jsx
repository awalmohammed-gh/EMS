import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Users,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  UploadCloud,
  ImageIcon,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
} from "lucide-react";
import { authService } from "../services/authService";
import { brandingService } from "../services/brandingService";
import { useBranding } from "../context/BrandingContext";
import { useManagement } from "../context/ManagementContextProvider";
import { useAuth } from "../context/AuthContext";
import { MotionSpinner } from "./ui/MotionSpinner";

const INDUSTRIES = [
  "Technology & Software",
  "Healthcare & Life Sciences",
  "Financial Services & Banking",
  "Manufacturing & Logistics",
  "Retail & E-Commerce",
  "Education & EdTech",
  "Professional Services & Consulting",
  "Construction & Real Estate",
  "Hospitality & Tourism",
  "Media & Entertainment",
  "Government & Non-Profit",
  "Other",
];

const EMPLOYEE_RANGES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

/**
 * OnboardingWizard
 * Strict 3-step registration sequence:
 * - Step 1: Company Details
 * - Step 2: Brand Identity (Company Logo is MANDATORY; Welcome Background is OPTIONAL)
 * - Step 3: Admin Credentials (Manager Profile & Finalization with Confirmation Callout)
 */
export const OnboardingWizard = ({ onComplete }) => {
  const navigate = useNavigate();
  const { setBranding } = useBranding();
  const { setShowToast, setUser: setManagementUser, setRole: setManagementRole } = useManagement();
  const { login: contextLogin } = useAuth();

  // Helper to convert base64 Data URL to a File object for multipart form upload if refreshed
  const dataUrlToFile = (dataUrl, filename) => {
    try {
      if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
      const parts = dataUrl.split(",");
      if (parts.length < 2) return null;
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/png";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch {
      return null;
    }
  };

  // Multi-step Wizard Navigation State (1, 2, 3) cached in sessionStorage
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = sessionStorage.getItem("workpulse_onboarding_step");
      if (saved) {
        const stepNum = parseInt(saved, 10);
        if (stepNum >= 1 && stepNum <= 3) return stepNum;
      }
    } catch {}
    return 1;
  });
  const [stepDirection, setStepDirection] = useState(1); // 1 = forward, -1 = back

  // Step 1: Company Information cached in sessionStorage
  const [companyData, setCompanyData] = useState(() => {
    const defaultData = {
      companyName: "",
      companyEmail: "",
      companyPhone: "",
      companyAddress: "",
      industry: "Technology & Software",
      numberOfEmployees: "11-50",
    };
    try {
      const saved = sessionStorage.getItem("workpulse_onboarding_company");
      if (saved) {
        return { ...defaultData, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultData;
  });

  // Step 2: Branding Assets
  // Company Logo is strictly MANDATORY
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(() => {
    try {
      const saved = sessionStorage.getItem("workpulse_onboarding_branding");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.logoPreview || null;
      }
    } catch {}
    return null;
  });
  // Welcome Portal Background is EXPLICITLY OPTIONAL
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundPreview, setBackgroundPreview] = useState(() => {
    try {
      const saved = sessionStorage.getItem("workpulse_onboarding_branding");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.backgroundPreview || null;
      }
    } catch {}
    return null;
  });

  // Step 3: Manager Credentials cached in sessionStorage
  const [managerData, setManagerData] = useState(() => {
    const defaultManager = {
      fullName: "",
      managerEmail: "",
      managerPhone: "",
      managerPassword: "",
      confirmPassword: "",
    };
    try {
      const saved = sessionStorage.getItem("workpulse_onboarding_manager");
      if (saved) {
        return { ...defaultManager, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultManager;
  });

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hidden File Input Refs
  const logoInputRef = useRef(null);
  const bgInputRef = useRef(null);

  // Persist input data to sessionStorage between steps and across refreshes
  useEffect(() => {
    try {
      sessionStorage.setItem("workpulse_onboarding_company", JSON.stringify(companyData));
    } catch {}
  }, [companyData]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "workpulse_onboarding_branding",
        JSON.stringify({ logoPreview, backgroundPreview })
      );
    } catch {}
  }, [logoPreview, backgroundPreview]);

  useEffect(() => {
    try {
      sessionStorage.setItem("workpulse_onboarding_manager", JSON.stringify(managerData));
    } catch {}
  }, [managerData]);

  useEffect(() => {
    try {
      sessionStorage.setItem("workpulse_onboarding_step", String(currentStep));
    } catch {}
  }, [currentStep]);

  // Handlers for Step 1 input changes
  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  // Handlers for Step 3 input changes
  const handleManagerChange = (e) => {
    const { name, value } = e.target;
    setManagerData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  // Logo file selection & validation (MANDATORY: PNG, JPG, WebP, SVG <= 2MB)
  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type) && !file.type.startsWith("image/")) {
      setError("Please select a valid image file for the company logo (PNG, JPG, WebP, SVG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Company logo file size must be 2MB or less.");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
    setError(null);
  };

  const removeLogo = (e) => {
    if (e) e.stopPropagation();
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // Background file selection & validation (OPTIONAL: JPG, PNG, WebP <= 5MB)
  const handleBackgroundFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file for the portal wallpaper (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Welcome portal background file size must be 5MB or less.");
      return;
    }

    setBackgroundFile(file);
    const reader = new FileReader();
    reader.onload = () => setBackgroundPreview(reader.result);
    reader.readAsDataURL(file);
    setError(null);
  };

  const removeBackground = (e) => {
    if (e) e.stopPropagation();
    setBackgroundFile(null);
    setBackgroundPreview(null);
    if (bgInputRef.current) bgInputRef.current.value = "";
  };

  // Validate Step 1 and advance to Step 2
  const handleStep1Next = (e) => {
    if (e) e.preventDefault();
    setError(null);

    const { companyName, companyEmail, companyPhone, companyAddress } = companyData;

    if (!companyName.trim()) {
      setError("Company Name is required.");
      return;
    }
    if (!companyEmail.trim()) {
      setError("Company Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail.trim())) {
      setError("Please enter a valid company email address.");
      return;
    }
    if (!companyPhone.trim()) {
      setError("Company Telephone Number is required.");
      return;
    }
    if (!companyAddress.trim()) {
      setError("Company Physical Address is required.");
      return;
    }

    setStepDirection(1);
    setCurrentStep(2);
  };

  // Validate Step 2 and advance to Step 3
  const handleStep2Next = (e) => {
    if (e) e.preventDefault();
    setError(null);

    // Enforce MANDATORY company logo
    if (!logoFile && !logoPreview) {
      setError("Company logo is required to establish your brand identity.");
      return;
    }

    setStepDirection(1);
    setCurrentStep(3);
  };

  // Navigate back one step
  const handlePrevStep = () => {
    setError(null);
    setStepDirection(-1);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Final Form Submission in Step 3
  const handleSubmitStep3 = async (e) => {
    e.preventDefault();
    setError(null);

    const { fullName, managerEmail, managerPhone, managerPassword, confirmPassword } = managerData;

    // Validate Manager Credentials
    if (!fullName.trim()) {
      setError("Full Name is required.");
      return;
    }
    if (!managerEmail.trim()) {
      setError("Manager Personal Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(managerEmail.trim())) {
      setError("Please enter a valid manager email address.");
      return;
    }
    if (!managerPhone.trim()) {
      setError("Phone Number is required.");
      return;
    }
    if (!managerPassword) {
      setError("Password is required.");
      return;
    }
    if (managerPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (managerPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify and confirm password.");
      return;
    }

    // Safety check: ensure logo is present
    if (!logoFile && !logoPreview) {
      setCurrentStep(2);
      setError("Company logo is required to establish your brand identity.");
      return;
    }

    try {
      setIsLoading(true);

      // Construct multipart form data for file uploads
      const payloadFormData = new FormData();
      payloadFormData.append("companyName", companyData.companyName.trim());
      payloadFormData.append("companyEmail", companyData.companyEmail.trim().toLowerCase());
      payloadFormData.append("contactEmail", companyData.companyEmail.trim().toLowerCase());
      payloadFormData.append("companyPhone", companyData.companyPhone.trim());
      payloadFormData.append("contactPhone", companyData.companyPhone.trim());
      payloadFormData.append("companyAddress", companyData.companyAddress.trim());
      payloadFormData.append("industry", companyData.industry);
      payloadFormData.append("numberOfEmployees", companyData.numberOfEmployees);

      // Manager credentials
      payloadFormData.append("fullName", fullName.trim());
      payloadFormData.append("adminName", fullName.trim());
      payloadFormData.append("email", managerEmail.trim().toLowerCase());
      payloadFormData.append("adminEmail", managerEmail.trim().toLowerCase());
      payloadFormData.append("phone", managerPhone.trim());
      payloadFormData.append("password", managerPassword);
      payloadFormData.append("confirmPassword", confirmPassword);

      // Files
      if (logoFile) {
        payloadFormData.append("logo", logoFile);
      } else if (logoPreview) {
        const reconstructedLogo = dataUrlToFile(logoPreview, "company_logo.png");
        if (reconstructedLogo) {
          payloadFormData.append("logo", reconstructedLogo);
        }
      }
      if (logoPreview) {
        payloadFormData.append("logoPreview", logoPreview);
      }

      if (backgroundFile) {
        payloadFormData.append("welcomeBackground", backgroundFile);
      } else if (backgroundPreview) {
        const reconstructedBg = dataUrlToFile(backgroundPreview, "welcome_background.jpg");
        if (reconstructedBg) {
          payloadFormData.append("welcomeBackground", reconstructedBg);
        }
      }
      if (backgroundPreview) {
        payloadFormData.append("backgroundPreview", backgroundPreview);
      }

      // Try brandingService or authService
      let result;
      try {
        result = await brandingService.registerOrganization(payloadFormData);
      } catch (err) {
        if (!err.response) {
          result = await authService.registerOrganization(payloadFormData);
        } else {
          throw err;
        }
      }

      if (result?.success) {
        // Synchronize branding context
        if (typeof setBranding === "function") {
          setBranding({
            companyName: result.organization?.companyName || companyData.companyName.trim(),
            logoUrl: result.organization?.logoUrl || logoPreview || "/eyenit_logo.png",
            welcomeBackgroundUrl:
              result.organization?.welcomeBackgroundUrl || backgroundPreview || "",
            primaryColor: result.organization?.primaryColor || "#0B1E48",
            isConfigured: true,
            hasExistingCompany: true,
            requiresSetup: false,
          });
        }

        // Auto-authenticate manager session
        const authUser = result.admin || result.user || {
          fullName: fullName.trim(),
          email: managerEmail.trim().toLowerCase(),
          role: "admin",
        };
        const userToken = result.token;

        if (typeof contextLogin === "function") {
          contextLogin(authUser, "admin", userToken);
        }
        if (typeof setManagementUser === "function") {
          setManagementUser(authUser);
        }
        if (typeof setManagementRole === "function") {
          setManagementRole("admin");
        }

        if (typeof setShowToast === "function") {
          setShowToast({
            show: true,
            message: `Organization registered successfully! Welcome, ${fullName.trim()}.`,
            type: "success",
          });
        }

        // Clear cached onboarding progress
        try {
          sessionStorage.removeItem("workpulse_onboarding_step");
          sessionStorage.removeItem("workpulse_onboarding_company");
          sessionStorage.removeItem("workpulse_onboarding_branding");
          sessionStorage.removeItem("workpulse_onboarding_manager");
        } catch {}

        if (typeof onComplete === "function") {
          onComplete(result);
        } else {
          navigate("/admin/dashboard", {
            replace: true,
            state: { role: "admin", freshSetup: true },
          });
        }
      } else {
        setError(
          result?.message ||
            "Unable to register organization. Please review your information and try again."
        );
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.normalizedMessage ||
        err.message ||
        "An unexpected error occurred while registering your organization.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Framer Motion Step Transition Variants
  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 35 : -35,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
    },
    exit: (direction) => ({
      x: direction > 0 ? -35 : 35,
      opacity: 0,
      transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
    }),
  };

  return (
    <div id="onboarding-wizard-container" className="w-full">
      {/* 3-Step Horizontal Stepper Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between max-w-lg mx-auto mb-2 px-2">
          {/* Step 1 Milestone */}
          <div className="flex items-center gap-2">
            <div
              id="stepper-step-1"
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep > 1
                  ? "bg-emerald-600 text-white"
                  : currentStep === 1
                  ? "bg-[#0B1E48] text-white ring-4 ring-[#0B1E48]/10"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep === 1 ? "text-[#0B1E48]" : "text-slate-500"
              }`}
            >
              Company Details
            </span>
          </div>

          {/* Stepper Divider 1 -> 2 */}
          <div
            className={`flex-1 h-0.5 mx-2 sm:mx-3 transition-colors ${
              currentStep >= 2 ? "bg-[#0B1E48]" : "bg-slate-200"
            }`}
          />

          {/* Step 2 Milestone */}
          <div className="flex items-center gap-2">
            <div
              id="stepper-step-2"
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep > 2
                  ? "bg-emerald-600 text-white"
                  : currentStep === 2
                  ? "bg-[#0B1E48] text-white ring-4 ring-[#0B1E48]/10"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : "2"}
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep === 2 ? "text-[#0B1E48]" : "text-slate-500"
              }`}
            >
              Brand Identity
            </span>
          </div>

          {/* Stepper Divider 2 -> 3 */}
          <div
            className={`flex-1 h-0.5 mx-2 sm:mx-3 transition-colors ${
              currentStep === 3 ? "bg-[#0B1E48]" : "bg-slate-200"
            }`}
          />

          {/* Step 3 Milestone */}
          <div className="flex items-center gap-2">
            <div
              id="stepper-step-3"
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 3
                  ? "bg-[#0B1E48] text-white ring-4 ring-[#0B1E48]/10"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              3
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep === 3 ? "text-[#0B1E48]" : "text-slate-500"
              }`}
            >
              Admin Credentials
            </span>
          </div>
        </div>
      </div>

      {/* Main Wizard Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
        {/* Error Alert Box */}
        {error && (
          <div
            id="wizard-error-alert"
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}

        <AnimatePresence mode="wait" custom={stepDirection}>
          {/* ========================================================
              STEP 1: ORGANIZATION INFORMATION
             ======================================================== */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              custom={stepDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
                <div className="w-9 h-9 rounded-xl bg-[#0B1E48] text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0B1E48] tracking-tight">
                    Step 1: Organization Information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Collect the core corporate metadata for your workspace.
                  </p>
                </div>
              </div>

              <form onSubmit={handleStep1Next} noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {/* COMPANY NAME * */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="input-company-name"
                      className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1.5"
                    >
                      Company Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="input-company-name"
                        name="companyName"
                        required
                        value={companyData.companyName}
                        onChange={handleCompanyChange}
                        placeholder="e.g., Acme Technologies Ltd."
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* COMPANY EMAIL * */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="input-company-email"
                        className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase"
                      >
                        Company Email <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-blue-700 font-medium">
                        Admin Identifier
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        id="input-company-email"
                        name="companyEmail"
                        required
                        value={companyData.companyEmail}
                        onChange={handleCompanyChange}
                        placeholder="info@acmecorp.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Authorized admin login identifier for management sign-in.
                    </p>
                  </div>

                  {/* COMPANY PHONE * */}
                  <div>
                    <label
                      htmlFor="input-company-phone"
                      className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1.5"
                    >
                      Company Phone <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        id="input-company-phone"
                        name="companyPhone"
                        required
                        value={companyData.companyPhone}
                        onChange={handleCompanyChange}
                        placeholder="+1 (555) 019-2834"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* COMPANY ADDRESS * */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="input-company-address"
                      className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1.5"
                    >
                      Company Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        id="input-company-address"
                        name="companyAddress"
                        required
                        value={companyData.companyAddress}
                        onChange={handleCompanyChange}
                        placeholder="Suite 400, 100 Financial Boulevard, New York, NY 10005"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* INDUSTRY * */}
                  <div>
                    <label
                      htmlFor="select-industry"
                      className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1.5"
                    >
                      Industry <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <select
                        id="select-industry"
                        name="industry"
                        required
                        value={companyData.industry}
                        onChange={handleCompanyChange}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none cursor-pointer"
                      >
                        {INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind}>
                            {ind}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* NUMBER OF EMPLOYEES * */}
                  <div>
                    <label
                      htmlFor="select-number-of-employees"
                      className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1.5"
                    >
                      Number of Employees <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <select
                        id="select-number-of-employees"
                        name="numberOfEmployees"
                        required
                        value={companyData.numberOfEmployees}
                        onChange={handleCompanyChange}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none cursor-pointer"
                      >
                        {EMPLOYEE_RANGES.map((rng) => (
                          <option key={rng} value={rng}>
                            {rng} employees
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Step 1 Action Button */}
                <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    id="btn-next-brand-identity"
                    className="w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-bold text-white bg-[#0B1E48] hover:bg-[#081738] shadow-md shadow-[#0B1E48]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Next: Brand Identity</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================
              STEP 2: COMPANY IDENTITY & VISUAL BRANDING
             ======================================================== */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              custom={stepDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className="pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0B1E48] text-white flex items-center justify-center shadow-xs">
                    <UploadCloud className="w-4 h-4 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0B1E48] tracking-tight">
                      Step 2 of 3: Company Identity & Visual Branding
                    </h2>
                    <p className="text-xs text-slate-500">
                      Upload your official brand assets to configure your organization's workspace and employee portal.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleStep2Next} noValidate className="space-y-6">
                {/* CARD 1: COMPANY LOGO (MANDATORY *) */}
                <div className="border border-slate-200/90 rounded-xl p-5 sm:p-6 bg-slate-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-bold tracking-wider text-slate-800 uppercase">
                      Company Logo <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      PNG, JPG, WebP, SVG &le; 2MB
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Official company mark displayed on payslips, reports, and portal headers.
                  </p>

                  {/* Logo Preview & Dropzone */}
                  {logoPreview ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                      <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 overflow-hidden shrink-0">
                        <img
                          src={logoPreview}
                          alt="Company Logo Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 text-center sm:text-left min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-600 text-xs font-bold mb-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Logo Uploaded</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {logoFile?.name || "Corporate Mark"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {logoFile ? `${(logoFile.size / 1024).toFixed(1)} KB` : "Asset ready"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id="btn-replace-logo"
                          onClick={() => logoInputRef.current?.click()}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          id="btn-remove-logo"
                          onClick={removeLogo}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          aria-label="Remove logo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      id="dropzone-company-logo"
                      onClick={() => logoInputRef.current?.click()}
                      className="p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0B1E48] hover:bg-blue-50/20 text-center cursor-pointer transition-all group"
                    >
                      <input
                        ref={logoInputRef}
                        type="file"
                        id="input-file-logo"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-[#0B1E48]/10 text-slate-600 group-hover:text-[#0B1E48] mx-auto flex items-center justify-center mb-2 transition-colors">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        Choose Company Logo <span className="text-rose-500">*</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Drag and drop your vector or high-res image here, or click to browse
                      </p>
                    </div>
                  )}

                  {/* Red helper warning if missing logo */}
                  {!logoFile && !logoPreview && (
                    <p className="mt-2 text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Company logo is required to establish your brand identity.</span>
                    </p>
                  )}
                </div>

                {/* CARD 2: WELCOME PORTAL BACKGROUND (EXPLICITLY OPTIONAL) */}
                <div className="border border-slate-200/90 rounded-xl p-5 sm:p-6 bg-slate-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="block text-[11px] font-bold tracking-wider text-slate-800 uppercase">
                        Welcome Portal Background
                      </label>
                      <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-md">
                        OPTIONAL
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                      JPG, PNG, WebP &le; 5MB
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Used as the backdrop for your employee and management login portals. You can configure this later.
                  </p>

                  {/* Background Preview & Dropzone */}
                  {backgroundPreview ? (
                    <div className="relative rounded-xl border border-slate-200 overflow-hidden shadow-2xs group">
                      <div className="h-28 w-full bg-slate-100">
                        <img
                          src={backgroundPreview}
                          alt="Welcome Portal Wallpaper Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 bg-white flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {backgroundFile?.name || "Welcome Wallpaper"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {backgroundFile ? `${(backgroundFile.size / (1024 * 1024)).toFixed(2)} MB` : "Optional image"}
                          </p>
                        </div>
                        <button
                          type="button"
                          id="btn-remove-background"
                          onClick={removeBackground}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                        >
                          Skip / Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      id="dropzone-background"
                      onClick={() => bgInputRef.current?.click()}
                      className="p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100/40 text-center cursor-pointer transition-all group"
                    >
                      <input
                        ref={bgInputRef}
                        type="file"
                        id="input-file-background"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleBackgroundFileChange}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-2">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        Upload Wallpaper <span className="text-slate-400 font-normal">(Optional)</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Browse scenic banner or corporate office photograph
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 2 Actions */}
                <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    id="btn-back-step-1"
                    onClick={handlePrevStep}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    id="btn-next-manager-credentials"
                    disabled={!logoFile && !logoPreview}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-bold text-white bg-[#0B1E48] hover:bg-[#081738] shadow-md shadow-[#0B1E48]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next: Manager Credentials</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================
              STEP 3: MANAGER / ADMIN ACCOUNT SETUP & FINALIZATION
             ======================================================== */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              custom={stepDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
                <div className="w-9 h-9 rounded-xl bg-[#0B1E48] text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0B1E48] tracking-tight">
                    Step 3 of 3: Manager / Admin Account Setup
                  </h2>
                  <p className="text-xs text-slate-500">
                    Create the master administrative profile that controls the workspace.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitStep3} noValidate className="space-y-6">
                {/* Form Fields for Admin Profile */}
                <div className="border border-slate-200/90 rounded-xl p-5 sm:p-6 bg-slate-50/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {/* FULL NAME * */}
                    <div>
                      <label
                        htmlFor="input-full-name"
                        className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1.5"
                      >
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          id="input-full-name"
                          name="fullName"
                          required
                          value={managerData.fullName}
                          onChange={handleManagerChange}
                          placeholder="e.g., Alexandra Vance"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                        />
                      </div>
                    </div>

                    {/* MANAGER PERSONAL EMAIL * */}
                    <div>
                      <label
                        htmlFor="input-manager-email"
                        className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1.5"
                      >
                        Manager Personal Email <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          id="input-manager-email"
                          name="managerEmail"
                          required
                          value={managerData.managerEmail}
                          onChange={handleManagerChange}
                          placeholder="alexandra.vance@company.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                        />
                      </div>
                    </div>

                    {/* PHONE NUMBER * */}
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="input-manager-phone"
                        className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1.5"
                      >
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          id="input-manager-phone"
                          name="managerPhone"
                          required
                          value={managerData.managerPhone}
                          onChange={handleManagerChange}
                          placeholder="+1 (555) 432-8765"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                        />
                      </div>
                    </div>

                    {/* PASSWORD * WITH VISIBILITY TOGGLE */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="input-manager-password"
                          className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase"
                        >
                          Password <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400">Min. 6 characters</span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          id="input-manager-password"
                          name="managerPassword"
                          required
                          value={managerData.managerPassword}
                          onChange={handleManagerChange}
                          placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                          className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                        />
                        <button
                          type="button"
                          id="btn-toggle-manager-password"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* CONFIRM PASSWORD * WITH VISIBILITY TOGGLE & MISMATCH VALIDATION */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="input-confirm-password"
                          className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase"
                        >
                          Confirm Password <span className="text-rose-500">*</span>
                        </label>
                        {managerData.confirmPassword && (
                          <span
                            className={`text-[10px] font-semibold ${
                              managerData.managerPassword === managerData.confirmPassword
                                ? "text-emerald-600"
                                : "text-rose-500"
                            }`}
                          >
                            {managerData.managerPassword === managerData.confirmPassword
                              ? "Passwords Match"
                              : "Mismatch"}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          id="input-confirm-password"
                          name="confirmPassword"
                          required
                          value={managerData.confirmPassword}
                          onChange={handleManagerChange}
                          placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                          className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border border-slate-200/90 focus:border-[#0B1E48] focus:ring-2 focus:ring-[#0B1E48]/10 transition-all outline-none"
                        />
                        <button
                          type="button"
                          id="btn-toggle-confirm-password"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          tabIndex={-1}
                          aria-label={
                            showConfirmPassword ? "Hide password" : "Show password"
                          }
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
                </div>

                {/* SUMMARY CALLOUT BOX */}
                <div
                  id="summary-callout-box"
                  className="rounded-xl border border-blue-200/70 bg-blue-50/50 p-4 sm:p-5"
                >
                  <div className="flex items-center gap-4">
                    {/* Logo thumbnail preview */}
                    <div className="w-12 h-12 rounded-xl bg-white border border-blue-100 shadow-2xs flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo Thumbnail"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-blue-900" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-[#0B1E48]">
                          {companyData.companyName || "Organization"}
                        </span>
                        <span className="text-[10px] bg-white border border-blue-200 px-2 py-0.5 rounded text-blue-800 font-medium">
                          {companyData.industry}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">
                        Registered Identifier: <span className="font-semibold text-slate-800">{companyData.companyEmail}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-950 font-medium leading-relaxed">
                      You will be able to log in using either your Company Email (<span className="font-semibold">{companyData.companyEmail || "company"}</span>) or your Personal Admin Email (<span className="font-semibold">{managerData.managerEmail || "personal"}</span>).
                    </p>
                  </div>
                </div>

                {/* Step 3 Actions */}
                <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    id="btn-back-step-2"
                    onClick={handlePrevStep}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    id="btn-create-organization"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-bold text-white bg-[#0B1E48] hover:bg-[#081738] shadow-md shadow-[#0B1E48]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <MotionSpinner size="sm" className="text-white" />
                        <span>Creating Organization & Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Organization & Enter Admin Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingWizard;
