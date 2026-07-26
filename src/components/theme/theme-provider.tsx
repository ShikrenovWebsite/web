"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme | null;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  root.dataset.theme = preference;

  return resolved;
}

export function ThemeProvider({
  children,
  initialPreference,
}: {
  children: React.ReactNode;
  initialPreference: ThemePreference;
}) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(initialPreference);

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme | null>(
    null,
  );

  useEffect(() => {
    const stored = window.localStorage.getItem("portfolio-theme");

    const validStoredPreference: ThemePreference | null =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : null;

    const nextPreference = validStoredPreference ?? initialPreference;

    const frame = window.requestAnimationFrame(() => {
      setPreferenceState(nextPreference);
      setResolvedTheme(applyTheme(nextPreference));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [initialPreference]);

  const setPreference = useCallback((next: ThemePreference) => {
    const resolved = applyTheme(next);

    setPreferenceState(next);
    setResolvedTheme(resolved);

    window.localStorage.setItem("portfolio-theme", next);
    document.cookie = `portfolio-theme=${next};path=/;max-age=31536000;samesite=lax`;
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemChange = () => {
      if (preference === "system") {
        setResolvedTheme(applyTheme("system"));
      }
    };

    media.addEventListener("change", handleSystemChange);

    return () => {
      media.removeEventListener("change", handleSystemChange);
    };
  }, [preference]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return value;
}
