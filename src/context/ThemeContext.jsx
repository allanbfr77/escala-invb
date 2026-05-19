import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = "theme-preference";

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    // Sem preferência salva → dark por padrão
    const dark = stored !== null ? stored === "dark" : true;

    // Aplica imediatamente para evitar flash
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    return dark;
  });

  // Atualiza DOM e localStorage sempre que mudar
  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}