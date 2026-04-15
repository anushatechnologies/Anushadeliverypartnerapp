import React, { createContext, useContext, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Light Theme ─────────────────────────────────────────────────────────────
export const lightTheme = {
  mode: "light" as const,
  bg: "#F5F6FA",
  bgAlt: "#ECEEF5",
  surface: "#FFFFFF",
  surfaceAlt: "#F9FAFB",
  surfaceMuted: "#F1F5F9",
  card: "#FFFFFF",
  cardBorder: "#E8ECF4",
  text: "#0F172A",
  textMuted: "#475569",
  textSoft: "#94A3B8",
  textInverse: "#FFFFFF",
  primary: "#F97316",
  primaryDark: "#C2410C",
  primaryLight: "#FED7AA",
  primaryGlow: "rgba(249,115,22,0.12)",
  accent: "#FBBF24",
  accentSoft: "#FEF9C3",
  success: "#16A34A",
  successSoft: "#DCFCE7",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  info: "#2563EB",
  infoSoft: "#DBEAFE",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  divider: "#F1F5F9",
  shadow: "rgba(15,23,42,0.08)",
  tabBg: "#FFFFFF",
  tabActive: "#F97316",
  tabInactive: "#94A3B8",
  tabBorder: "#E2E8F0",
  statusBar: "dark" as const,
  headerBg: "#FFFFFF",
  headerText: "#0F172A",
  inputBg: "#F8FAFC",
  inputBorder: "#E2E8F0",
  inputText: "#0F172A",
  inputPlaceholder: "#94A3B8",
  switchTrack: "#CBD5E1",
  switchThumb: "#FFFFFF",
  switchTrackActive: "#F97316",
  badge: "#F97316",
  badgeText: "#FFFFFF",
  skeleton: "#E2E8F0",
  mapOverlay: "rgba(255,255,255,0.95)",
};

// ─── Dark Theme ───────────────────────────────────────────────────────────────
export const darkTheme = {
  mode: "dark" as const,
  bg: "#0D1117",
  bgAlt: "#010409",
  surface: "#161B22",
  surfaceAlt: "#1C2128",
  surfaceMuted: "#21262D",
  card: "#161B22",
  cardBorder: "#30363D",
  text: "#E6EDF3",
  textMuted: "#8B949E",
  textSoft: "#484F58",
  textInverse: "#0D1117",
  primary: "#F97316",
  primaryDark: "#EA580C",
  primaryLight: "#431407",
  primaryGlow: "rgba(249,115,22,0.18)",
  accent: "#FBBF24",
  accentSoft: "#3B2A00",
  success: "#2EA043",
  successSoft: "#0D2818",
  danger: "#F85149",
  dangerSoft: "#2D0E0D",
  info: "#388BFD",
  infoSoft: "#0C1D38",
  border: "#30363D",
  borderStrong: "#484F58",
  divider: "#21262D",
  shadow: "rgba(0,0,0,0.4)",
  tabBg: "#161B22",
  tabActive: "#F97316",
  tabInactive: "#484F58",
  tabBorder: "#30363D",
  statusBar: "light" as const,
  headerBg: "#161B22",
  headerText: "#E6EDF3",
  inputBg: "#21262D",
  inputBorder: "#30363D",
  inputText: "#E6EDF3",
  inputPlaceholder: "#484F58",
  switchTrack: "#30363D",
  switchThumb: "#8B949E",
  switchTrackActive: "#F97316",
  badge: "#F97316",
  badgeText: "#FFFFFF",
  skeleton: "#21262D",
  mapOverlay: "rgba(13,17,23,0.95)",
};

export type AppTheme = typeof lightTheme;

interface ThemeContextValue {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  // Load saved preference on mount
  React.useEffect(() => {
    AsyncStorage.getItem("@anusha_dark_mode")
      .then((val) => { if (val === "true") setIsDark(true); })
      .catch(() => {});
  }, []);

  const setDark = useCallback((dark: boolean) => {
    setIsDark(dark);
    AsyncStorage.setItem("@anusha_dark_mode", String(dark)).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setDark(!isDark);
  }, [isDark, setDark]);

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
