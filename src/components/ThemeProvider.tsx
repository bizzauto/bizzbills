"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";
type Locale = "en" | "hi";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  locale: "en",
  setLocale: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function useLocale() {
  const { locale, setLocale } = useContext(ThemeContext);
  return { locale, setLocale };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const storedTheme = localStorage.getItem("bizzbills-theme") as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle("light", storedTheme === "light");
    }

    const storedLocale = localStorage.getItem("bizzbills:locale") as Locale | null;
    if (storedLocale && (storedLocale === "en" || storedLocale === "hi")) {
      setLocaleState(storedLocale);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("bizzbills-theme", next);
      document.documentElement.classList.toggle("light", next === "light");
      return next;
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("bizzbills:locale", newLocale);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, locale, setLocale }}>
      {children}
    </ThemeContext.Provider>
  );
}
