import { create } from "zustand";

type Language = "tr" | "en" | "ar" | "de";

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const getStoredLanguage = (): Language => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("language");
    if (stored === "tr" || stored === "en" || stored === "ar" || stored === "de") {
      return stored as Language;
    }
  }
  return "tr";
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: getStoredLanguage(),
  setLanguage: (lang: Language) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
    }
    set({ language: lang });
  }
}));

