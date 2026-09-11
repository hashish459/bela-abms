"use client";

import { usePreferences } from "./preferences";

/**
 * Deliberately scoped: translates the app's chrome (shell, login, appearance
 * panel, error/404 pages) — the surfaces every user sees regardless of which
 * module they work in. Translating every dashboard page's content is a much
 * larger effort (each module's own copy) and is not attempted here; those
 * pages render in English regardless of this setting until that follow-up
 * work happens.
 */
const dict = {
  en: {
    search: "Search",
    notifications: "Notifications",
    signOut: "Sign out",
    admin: "Admin",
    appearance: "Appearance",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    accentColor: "Accent color",
    fontFamily: "Font",
    textSize: "Text size",
    reduceMotion: "Reduce motion",
    reduceMotionHint: "Minimize animations and transitions",
    language: "Language",
    resetDefaults: "Reset to defaults",
    close: "Close",
    loginTitle: "Login",
    loginSubtitle: "Accounting & Business Management System",
    emailAddress: "Email address",
    password: "Password",
    login: "Login",
    notFoundTitle: "Page not found",
    notFoundBody: "The page you're looking for doesn't exist or may have moved.",
    backToDashboard: "Back to Dashboard",
    backToLogin: "Back to Login",
    errorTitle: "Something went wrong",
    errorBody: "An unexpected error occurred. Try again, or head back to safety.",
    tryAgain: "Try again",
    loading: "Loading…",
  },
  ne: {
    search: "खोज्नुहोस्",
    notifications: "सूचनाहरू",
    signOut: "साइन आउट",
    admin: "प्रशासक",
    appearance: "रूपरेखा",
    theme: "थिम",
    themeLight: "उज्यालो",
    themeDark: "अँध्यारो",
    themeSystem: "प्रणाली अनुसार",
    accentColor: "रङ",
    fontFamily: "फन्ट",
    textSize: "अक्षर आकार",
    reduceMotion: "गति घटाउनुहोस्",
    reduceMotionHint: "एनिमेसन र ट्रान्जिसनहरू कम गर्नुहोस्",
    language: "भाषा",
    resetDefaults: "पूर्वनिर्धारितमा फर्काउनुहोस्",
    close: "बन्द गर्नुहोस्",
    loginTitle: "लगइन",
    loginSubtitle: "लेखा तथा व्यवसाय व्यवस्थापन प्रणाली",
    emailAddress: "इमेल ठेगाना",
    password: "पासवर्ड",
    login: "लगइन गर्नुहोस्",
    notFoundTitle: "पृष्ठ फेला परेन",
    notFoundBody: "तपाईंले खोज्नुभएको पृष्ठ अवस्थित छैन वा सारिएको हुन सक्छ।",
    backToDashboard: "ड्यासबोर्डमा फर्कनुहोस्",
    backToLogin: "लगइनमा फर्कनुहोस्",
    errorTitle: "केही गडबड भयो",
    errorBody: "अप्रत्याशित त्रुटि भयो। फेरि प्रयास गर्नुहोस्, वा सुरक्षित ठाउँमा फर्कनुहोस्।",
    tryAgain: "फेरि प्रयास गर्नुहोस्",
    loading: "लोड हुँदैछ…",
  },
} as const;

export type TranslationKey = keyof (typeof dict)["en"];

export function useTranslation() {
  const { prefs } = usePreferences();
  const lang = prefs.language === "ne" ? "ne" : "en";
  return {
    lang,
    t: (key: TranslationKey) => dict[lang][key] ?? dict.en[key],
  };
}
