import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Clock,
  Banknote,
  Calendar,
  Megaphone,
  Settings,
  User,
  X,
} from "lucide-react";

export const MobileFeaturesDrawer = ({
  isOpen = false,
  onClose = () => {},
  userRole = "employee",
}) => {
  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const adminNavItems = [
    {
      to: "/admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      color:
        "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60",
    },
    {
      to: "/admin/dashboard/employees",
      label: "Employees",
      icon: Users,
      color:
        "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60",
    },
    {
      to: "/admin/dashboard/attendance",
      label: "Attendance",
      icon: Clock,
      color:
        "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60",
    },
    {
      to: "/admin/dashboard/payroll",
      label: "Payroll",
      icon: Banknote,
      color:
        "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60",
    },
    {
      to: "/admin/dashboard/leave",
      label: "Leave Approvals",
      icon: Calendar,
      color:
        "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/60",
    },
    {
      to: "/admin/dashboard/announcements",
      label: "Announcements",
      icon: Megaphone,
      color:
        "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/60",
    },
    {
      to: "/admin/dashboard/settings",
      label: "Settings",
      icon: Settings,
      color:
        "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700",
    },
  ];

  const employeeNavItems = [
    {
      to: "/employee/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      color:
        "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/60",
    },
    {
      to: "/employee/dashboard/attendance",
      label: "Attendance",
      icon: Clock,
      color:
        "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60",
    },
    {
      to: "/employee/dashboard/payslips",
      label: "Payslips",
      icon: Banknote,
      color:
        "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60",
    },
    {
      to: "/employee/dashboard/leave",
      label: "Leave Requests",
      icon: Calendar,
      color:
        "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/60",
    },
    {
      to: "/employee/dashboard/settings",
      label: "Settings",
      icon: User,
      color:
        "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60",
    },
  ];

  const currentNavItems = userRole === "admin" ? adminNavItems : employeeNavItems;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop Overlay with Smooth Blur & Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-Up Sheet Container with Natural Swipe-To-Dismiss Touch Gestures */}
          <motion.div
            id="mobile-features-drawer-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 300, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragSnapToOrigin={true}
            dragElastic={{ top: 0.05, bottom: 0.75 }}
            onDragEnd={(_event, info) => {
              // Swipe down threshold: downward offset > 50px or rapid velocity > 150px/s
              if (info.offset.y > 50 || info.velocity.y > 150) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-50 w-full rounded-t-[32px] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden touch-pan-y pt-2 pb-8 sm:pb-10 safe-bottom cursor-grab active:cursor-grabbing"
          >
            {/* Centered Top Handle Drag Area */}
            <div
              className="pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none flex justify-center items-center select-none"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 transition-colors hover:bg-slate-400 dark:hover:bg-slate-600" />
            </div>

            {/* Centered Icon Flexbox Grid Container with Comfortable Breathing Room */}
            <div className="flex flex-col items-center justify-center px-6 pt-4 pb-8 sm:pb-10">
              <div
                style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}
                className="gap-4 w-[280px] max-w-[280px] mx-auto items-center"
              >
                {currentNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.to} className="relative group flex items-center justify-center">
                      {/* Floating Animated Tooltip Badge on Hover/Focus */}
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-30 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-150 transform group-hover:-translate-y-1">
                        <div className="bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-lg border border-slate-700 whitespace-nowrap">
                          {item.label}
                        </div>
                      </div>

                      {/* Square Icon Tile with Respective Color */}
                      <NavLink
                        to={item.to}
                        end={item.to.endsWith("/dashboard")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                        }}
                        className={({ isActive }) =>
                          `w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs ${
                            isActive
                              ? "ring-2 ring-[#0B1E48] dark:ring-blue-400 ring-offset-2 dark:ring-offset-slate-900 shadow-md scale-105 font-bold"
                              : "hover:scale-105"
                          } ${item.color}`
                        }
                        aria-label={item.label}
                        title={item.label}
                      >
                        <Icon className="w-6 h-6 shrink-0" />
                      </NavLink>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Centered Standalone Close ("X") Button */}
              <div className="flex justify-center items-center mt-6 pt-2 pb-2">
                <button
                  type="button"
                  id="btn-drawer-bottom-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  aria-label="Close menu"
                  className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-transform active:scale-90 shadow-2xs cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MobileFeaturesDrawer;
