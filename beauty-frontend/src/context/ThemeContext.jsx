import { createContext, useState, useContext, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("miles_admin_theme") === "dark";
    }
    return false;
  });

  // حفظ التفضيل
  useEffect(() => {
    localStorage.setItem("miles_admin_theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};