"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type AccentKey = "orange" | "ocean" | "forest" | "violet" | "rose";
export type FontKey = "dm-sans" | "inter" | "poppins" | "noto-sans";
export type TextSizeKey = "sm" | "md" | "lg" | "xl";
export type Language = "en" | "ne";

export type Preferences = {
  theme: ThemeMode;
  accent: AccentKey;
  font: FontKey;
  textSize: TextSizeKey;
  reduceMotion: boolean;
  language: Language;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  accent: "orange",
  font: "dm-sans",
  textSize: "md",
  reduceMotion: false,
  language: "en",
};

export const PREFERENCES_STORAGE_KEY = "bela-abms:preferences";

export const ACCENT_OPTIONS: { key: AccentKey; label: string; swatch: string }[] = [
  { key: "orange", label: "Bela Orange", swatch: "#f5821f" },
  { key: "ocean", label: "Ocean", swatch: "#00a8e8" },
  { key: "forest", label: "Forest", swatch: "#16a34a" },
  { key: "violet", label: "Violet", swatch: "#7c3aed" },
  { key: "rose", label: "Rose", swatch: "#e11d48" },
];

export const FONT_OPTIONS: { key: FontKey; label: string; sample: string }[] = [
  { key: "dm-sans", label: "DM Sans", sample: "var(--font-dm-sans)" },
  { key: "inter", label: "Inter", sample: "var(--font-inter)" },
  { key: "poppins", label: "Poppins", sample: "var(--font-poppins)" },
  { key: "noto-sans", label: "Noto Sans", sample: "var(--font-noto-sans)" },
];

export const TEXT_SIZE_OPTIONS: { key: TextSizeKey; label: string }[] = [
  { key: "sm", label: "Small" },
  { key: "md", label: "Default" },
  { key: "lg", label: "Large" },
  { key: "xl", label: "Extra Large" },
];

function applyToDom(prefs: Preferences) {
  const root = document.documentElement;
  if (prefs.theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", prefs.theme);
  root.setAttribute("data-accent", prefs.accent);
  root.setAttribute("data-font", prefs.font);
  root.setAttribute("data-text-size", prefs.textSize);
  root.setAttribute("data-reduce-motion", String(prefs.reduceMotion));
  root.setAttribute("lang", prefs.language === "ne" ? "ne" : "en");
}

type Ctx = {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
};

const PreferencesContext = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  // The blocking script in layout.tsx already applied the stored prefs to the DOM
  // before paint; this just syncs React state (one tick after mount, so the
  // initial client render still matches the server's default-props render —
  // no hydration mismatch on the panel's "selected" highlighting) so the
  // Appearance panel UI reflects reality.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (raw) setPrefsState({ ...DEFAULT_PREFERENCES, ...JSON.parse(raw) });
      } catch {
        /* ignore corrupt storage */
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Gated on `hydrated`: without this, this effect's first run (with `prefs`
  // still at DEFAULT_PREFERENCES) would write those defaults to storage
  // BEFORE the load effect above gets a chance to read the real saved
  // values back out — silently resetting every returning visitor's choices
  // to defaults on every single page load.
  useEffect(() => {
    if (!hydrated) return;
    applyToDom(prefs);
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* private browsing / storage full — preference just won't persist */
    }
  }, [prefs, hydrated]);

  const setPref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefsState((s) => ({ ...s, [key]: value }));
  }, []);

  const reset = useCallback(() => setPrefsState(DEFAULT_PREFERENCES), []);

  return <PreferencesContext.Provider value={{ prefs, setPref, reset }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}

/** Inlined verbatim into a blocking <script> in layout.tsx — must stay dependency-free. */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var raw = localStorage.getItem(${JSON.stringify(PREFERENCES_STORAGE_KEY)});
    var p = raw ? JSON.parse(raw) : {};
    var root = document.documentElement;
    if (p.theme === "dark" || p.theme === "light") root.setAttribute("data-theme", p.theme);
    if (p.accent) root.setAttribute("data-accent", p.accent);
    if (p.font) root.setAttribute("data-font", p.font);
    if (p.textSize) root.setAttribute("data-text-size", p.textSize);
    if (typeof p.reduceMotion === "boolean") root.setAttribute("data-reduce-motion", String(p.reduceMotion));
    if (p.language) root.setAttribute("lang", p.language === "ne" ? "ne" : "en");
  } catch (e) {}
})();
`;
