import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check, ChevronDown } from "lucide-react";
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

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const themeOptions = [
    {
      id: "light",
      label: "Light",
      icon: Sun,
      description: "Light mode interface",
      iconColor: "text-amber-500",
    },
    {
      id: "dark",
      label: "Dark",
      icon: Moon,
      description: "Dark mode interface",
      iconColor: "text-blue-500 dark:text-blue-400",
    },
    {
      id: "system",
      label: "System",
      icon: Monitor,
      description: "Follows system preference",
      iconColor: "text-slate-500 dark:text-slate-400",
    },
  ];

  const handleSelectTheme = (modeId, modeLabel) => {
    setTheme(modeId);
    setIsOpen(false);

    if (typeof showToast === "function") {
      showToast(`Theme switched to ${modeLabel}`, "info");
    }
  };

  // Get current active theme config
  const activeOption =
    themeOptions.find((opt) => opt.id === theme) || themeOptions[2];
  const ActiveIcon = activeOption.icon;

  return (
    <div
      className={`relative inline-block text-left ${className}`}
      ref={dropdownRef}
      id="theme-dropdown-container"
    >
      {/* Trigger Button */}
      <button
        id="theme-dropdown-trigger"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Current theme: ${activeOption.label}. Click to open theme menu.`}
        title={`Current theme: ${activeOption.label} (Click to change)`}
        className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-2xs group focus:outline-none focus:ring-2 focus:ring-[#002185]/30 dark:focus:ring-blue-500/40 ${
          isOpen
            ? "border-[#002185] dark:border-blue-500 bg-slate-50 dark:bg-slate-800 text-[#002185] dark:text-blue-400 shadow-sm"
            : "border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
        }`}
      >
        <ActiveIcon
          className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            theme === "light"
              ? "text-amber-500"
              : theme === "dark"
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-600 dark:text-slate-300"
          }`}
        />
        <span className="hidden sm:inline text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
          {activeOption.label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#002185] dark:text-blue-400" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="theme-dropdown-menu"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="theme-dropdown-trigger"
          className="absolute right-0 mt-2 w-48 sm:w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Theme Preference
            </span>
          </div>

          <div className="space-y-0.5">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;

              return (
                <button
                  key={opt.id}
                  id={`theme-dropdown-opt-${opt.id}`}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectTheme(opt.id, opt.label)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 text-left cursor-pointer group ${
                    isSelected
                      ? "bg-[#002185]/10 dark:bg-blue-600/20 text-[#002185] dark:text-blue-400 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                  }`}
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
                      <span className="block leading-tight">{opt.label}</span>
                      <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {opt.id === "system"
                          ? `OS default (${resolvedTheme})`
                          : opt.id === "light"
                          ? "Daytime palette"
                          : "Nighttime palette"}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#002185] dark:bg-blue-600 text-white shadow-2xs shrink-0">
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



