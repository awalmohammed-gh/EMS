import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  X,
  ShieldCheck,
  Users,
  Building2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/**
 * SignInToOrganizationModal
 * Commercial portal switcher modal allowing existing users to navigate
 * directly to the dedicated Management Login or Employee Portal.
 */
export const SignInToOrganizationModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="portal-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      >
        <motion.div
          id="sign-in-to-organization-modal"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200/90 shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0B1E48] text-white flex items-center justify-center shadow-xs">
                <Lock className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0B1E48] tracking-tight">
                  Access Workspace
                </h3>
                <p className="text-xs text-slate-500">
                  Select your authorized credential portal
                </p>
              </div>
            </div>
            <button
              type="button"
              id="modal-btn-close"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              aria-label="Close portal modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Tiles */}
          <div className="mt-5 space-y-3">
            {/* 1. Management / Admin Login */}
            <button
              type="button"
              id="modal-btn-management-login"
              onClick={() => {
                onClose();
                navigate("/admin/login");
              }}
              className="w-full text-left p-4 rounded-xl border border-slate-200/90 hover:border-[#0B1E48] hover:bg-blue-50/40 transition-all flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B1E48] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0B1E48] flex items-center gap-1.5">
                    <span>Management Login</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-[#0B1E48]">
                      Admin / Manager
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Administrative oversight, workforce tracking, & payroll
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0B1E48] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>

            {/* 2. Employee Login */}
            <button
              type="button"
              id="modal-btn-employee-login"
              onClick={() => {
                onClose();
                navigate("/login");
              }}
              className="w-full text-left p-4 rounded-xl border border-slate-200/90 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Employee Logins</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      Staff
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Staff self-service clock-in/out, work hours, & payslips
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>

            {/* 3. Welcome Portals Gateway */}
            <button
              type="button"
              id="modal-btn-welcome-portal"
              onClick={() => {
                onClose();
                navigate("/welcome");
              }}
              className="w-full text-left p-3.5 rounded-xl border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-[#0B1E48]">
                  Organization Welcome Hub
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Brand Gateway
              </span>
            </button>
          </div>

          {/* Footer Callout */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <Link
              to="/register-organization"
              onClick={onClose}
              id="modal-link-register-org"
              className="text-xs font-semibold text-[#0B1E48] hover:underline inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>New to WorkPulse? Register your organization &rarr;</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SignInToOrganizationModal;
