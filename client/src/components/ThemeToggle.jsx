import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useManagement } from "../context/ManagementContextProvider";

export const ThemeToggle = ({ className = "" }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { showToast } = useManagement();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const themeOptions = [
    {
      id: "light",
      label: "Light Mode",
      icon: Sun,
      description: "Clean high-contrast daytime interface",
      iconColor: "text-amber-500 dark:text-amber-400",
    },
    {
      id: "dark",
      label: "Dark Mode",
      icon: Moon,
      description: "Sleek low-glare nighttime palette",
      iconColor: "text-[#002185] dark:text-blue-400",
    },
    {
      id: "system",
      label: "System Sync",
      icon: Monitor,
      description: "Follows your operating system theme",
      iconColor: "text-slate-600 dark:text-slate-300",
    },
  ];

  const handleSelectTheme = (modeId, modeLabel) => {
    setTheme(modeId);
    setIsOpen(false);

    if (typeof showToast === "function") {
      showToast(`Theme switched to ${modeLabel}`, "info");
    }
  };

  // Get current display icon
  const CurrentIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="theme-toggle-dropdown-trigger"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Current theme: ${theme}. Click to change theme.`}
        title={`Current theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to switch)`}
        className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center shadow-2xs group focus:outline-none focus:ring-2 focus:ring-[#002185]/30 dark:focus:ring-blue-500/40 ${
          isOpen
            ? "border-[#002185] dark:border-blue-500 bg-[#002185]/5 dark:bg-slate-800 text-[#002185] dark:text-blue-400"
            : "border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
        }`}
      >
        <CurrentIcon
          className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
            theme === "light"
              ? "text-amber-500"
              : theme === "dark"
              ? "text-[#002185] dark:text-blue-400"
              : "text-slate-600 dark:text-slate-300"
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="theme-toggle-dropdown-menu"
          className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/10 dark:shadow-black/40 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md transition-colors"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Appearance & Theme
            </p>
          </div>

          <div className="p-1 space-y-0.5">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.id;

              return (
                <button
                  key={option.id}
                  id={`theme-option-${option.id}`}
                  type="button"
                  onClick={() => handleSelectTheme(option.id, option.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer group ${
                    isSelected
                      ? "bg-[#002185]/10 dark:bg-blue-600/20 text-[#002185] dark:text-blue-400 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-[#002185] dark:bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block leading-tight">{option.label}</span>
                      <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {option.id === "system"
                          ? `OS default (${resolvedTheme})`
                          : option.id === "light"
                          ? "Light theme"
                          : "Dark theme"}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#002185] dark:bg-blue-600 text-white shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
