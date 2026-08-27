import { createContext, useContext, useState, useEffect, useCallback } from "react";

const THEME_STORAGE_KEY = "theme_preference";
const LEGACY_THEME_KEY = "eyenit_theme";
const STANDARD_THEME_KEY = "theme";

const ThemeContext = createContext();

export const ThemeContextProvider = ({ children }) => {
  // 1. Initial preference: 'light' | 'dark' | 'system'
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored =
          localStorage.getItem(THEME_STORAGE_KEY) ||
          localStorage.getItem(LEGACY_THEME_KEY) ||
          localStorage.getItem(STANDARD_THEME_KEY);
        if (stored === "dark" || stored === "light" || stored === "system") {
          return stored;
        }
      } catch (e) {
        console.warn("Failed to read theme preference from storage:", e);
      }
    }
    return "system";
  });

  // 2. Track OS system preference
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // 3. Listen to OS system color scheme changes in real-time
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // 4. Synchronize across tabs and Admin/Employee portals via storage event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e) => {
      if (
        e.key === THEME_STORAGE_KEY ||
        e.key === LEGACY_THEME_KEY ||
        e.key === STANDARD_THEME_KEY
      ) {
        const newTheme = e.newValue;
        if (newTheme === "dark" || newTheme === "light" || newTheme === "system") {
          setThemeState(newTheme);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 5. Determine resolved active theme ('light' or 'dark')
  const resolvedTheme = theme === "system" ? (systemIsDark ? "dark" : "light") : theme;
  const isDark = resolvedTheme === "dark";

  // 6. Update DOM <html> and <body> elements with transition-none anti-flicker and persist preference
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    // Temporarily add transition-none to body and root to prevent flickering during toggles
    if (body) body.classList.add("transition-none");
    root.classList.add("transition-none");

    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      if (body) body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      if (body) body.classList.remove("dark");
    }

    // Force a DOM layout reflow so class changes apply instantly without CSS transitions
    void root.offsetHeight;

    // Remove transition-none cleanly on next frame
    const timer = setTimeout(() => {
      if (body) body.classList.remove("transition-none");
      root.classList.remove("transition-none");
    }, 50);

    // Ensure all localStorage keys are consistently synced across Admin & Employee portals
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(LEGACY_THEME_KEY, resolvedTheme);
      localStorage.setItem(STANDARD_THEME_KEY, resolvedTheme);
    } catch (e) {
      console.warn("Failed to save theme to storage:", e);
    }

    return () => clearTimeout(timer);
  }, [theme, resolvedTheme]);

  // Set specific mode ('light' | 'dark' | 'system')
  const setTheme = useCallback((newTheme) => {
    if (newTheme === "dark" || newTheme === "light" || newTheme === "system") {
      setThemeState(newTheme);
    }
  }, []);

  // Toggle between light, dark, and system or cycle
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  }, []);

  const value = {
    theme, // 'light' | 'dark' | 'system'
    resolvedTheme, // 'light' | 'dark'
    isDark, // boolean
    systemTheme: systemIsDark ? "dark" : "light",
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    return {
      theme: "system",
      resolvedTheme: isDark ? "dark" : "light",
      isDark,
      systemTheme: isDark ? "dark" : "light",
      toggleTheme: () => {
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("dark");
        }
      },
      setTheme: () => {},
    };
  }
  return context;
};

export default ThemeContextProvider;
