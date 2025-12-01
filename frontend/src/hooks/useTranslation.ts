import { useLanguageStore } from "../store/languageStore";
import trTranslations from "../locales/tr.json";
import enTranslations from "../locales/en.json";
import arTranslations from "../locales/ar.json";
import deTranslations from "../locales/de.json";

type TranslationKey = 
  | keyof typeof trTranslations
  | `${keyof typeof trTranslations}.${string}`
  | `${keyof typeof trTranslations}.${string}.${string}`
  | `${keyof typeof trTranslations}.${string}.${string}.${string}`;

const translations = {
  tr: trTranslations,
  en: enTranslations,
  ar: arTranslations,
  de: deTranslations
};

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  
  const t = (key: string): string => {
    const keys = key.split(".");
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof value === "string" ? value : key;
  };
  
  return { t, language };
}

